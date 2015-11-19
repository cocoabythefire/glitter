'use strict';

var _ = require('lodash');
var url = require('url');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var BPromise = require('bluebird');

// TODO: take env outta here?
var env = process.env.NODE_ENV || 'development';

var crypto = BPromise.promisifyAll(require('crypto'));
var bcrypt = BPromise.promisifyAll(require('bcrypt'));
var proxies = require('./proxies');
var googleAPIKey = 'AIzaSyBF0MrwABAJ_Nf1bbNjBMeSps0aigriEJg';

var googleNearbySearch = require('./external-services/google').nearbySearch;

/**
 * Setup database
 */

var db = require('./app/db');
var List = require('./app/lists/model');
var Place = require('./app/places/model');
var User = require('./app/users/model');







var Token = db.model('token', {
  value: db.attr(),
  user: db.belongsTo()
});

var Commentary = db.model('commentary', {
  headline: db.attr(),
  rating: db.attr(),
  date_added: db.attr(),
  place: db.belongsTo(),
  user: db.belongsTo(),
});


/**
 * Setup application routes
 */


/**
 * Handles unexpected HTTP Response errors
 *
 * @param {Object.<Response>} the response object.
 * @return {Function(error)} an error handler function.
 */
var handleError = function(res) {
  return function(e) {
    if (e.status) {
      res.status(e.status).send({ message: e.message });
    }
    else {
      res.status(500).send({ error: 'unhandled error' });
    }
  };
};


/**
 * Generate and save a new auth Token
 *
 * @return {Object.<Token>} a new Token object.
 */
var generateToken = function() {
  return crypto.randomBytesAsync(256).then(function(data) {
    var shasum = crypto.createHash('sha1');
    shasum.update(data);
    var tokenValue = shasum.digest('hex');
    var newToken = Token.create({
      value: tokenValue
    });
    return newToken.save();
  });
};


/**
 * Delete a Token
 * @param {Object.<Token value>} the value of the token to delete.
 * @return {Object.<Result>} the result of saving the delete for the Token.
 */
var deleteToken = function(tokenValue) {
  return BPromise.resolve()
  .then(function() {
    return Token.objects.where({ value: tokenValue }).limit(1).fetchOne();
  })
  .then(function(token) {
    token.delete();
    return token.save();
  })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      var errorMessage = 'could not logout: token is not a valid session';
      throw _.extend(new Error(errorMessage), { status: 401 });
    }
    else { throw e; }
  })
};

/**
 * Filter Place Details
 * @param {Object.<Place details>} the place details.
 * @return {Object.<Filtered details>} the place details filtered
 * to remove the google_place_id key/value.
 */
var filterPlaceDetails = function(placeDetails) {
  if (placeDetails) {
    return _.omit(placeDetails.attrs, 'google_place_id');
  }
  return {};
};


/**
 * Filter Commentary
 * @param {Object.<Commentary>} the commentary.
 * @return {Object.<Filtered commentary>} the commentary filtered
 * to remove the 'place_id', 'user_id' keys/values.
 */
var filterCommentary = function(commentary) {
  if(commentary) {
    return _.omit(commentary.attrs, 'place_id', 'user_id');
  }
  return {};
};


var app = express();
var api = express.Router();
var secureAPI = express.Router();

app.set('db', db);
if (env === 'development') {
  app.use(morgan('dev'));
}
else if (env === 'production') {
  app.use(morgan('combined'));
}
app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
  res.send('This is the glitter service!');
});

// Authentication Middleware
secureAPI.use(function(req, res, next) {
  var tokenValue = "";
  tokenValue = req.headers['x-glitter-token'];
  BPromise.bind({})
  .then(function() {
    return Token.objects.where({
      'value': tokenValue
    }).fetchOne();
  })
  .tap(function(token) { req.token = token; })
  .then(function(token) { return User.objects.find(token.userId); })
  .then(function(user) { req.user = user; })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      throw _.extend(new Error('invalid user'), { status: 401 });
    }
    else { throw e; }
  })
  .then(function() { next(); })
  .catch(handleError(res));
  // TODO: install real express error handling middleware
});

// Get all Places - not a secure request
app.get('/api/places', function (req, res) {
  var query = Place.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});


// TODO: this should become a forwarder that uses the proxy
// for Google requests like auto-complete or future mapping
// functionality that the front-end will use
// format is https://maps.googleapis.com/maps/api/place/nearbysearch/json?parameters

app.all('/api/maps/*', function (req, res) {
  var parsedURL = url.parse(req.url, true);
  parsedURL.search = null;
  parsedURL.query.key = googleAPIKey;
  parsedURL.pathname = parsedURL.pathname.replace(/^\/api\/maps/, '');
  req.url = url.format(parsedURL);
  proxies.googleMaps.web(req, res);
});




/**
 * API resource for GET /place/nearbysearch.
 *
 * @param {String} keyword_search - search string. i.e. "coffee and tea".
 * @param {String} [location] - The location which must be a lat/long.
 * @param {Number} [radius=5] Number of miles radius to search in.
 */
secureAPI.get('/place/nearbysearch', function(req, res) {
  var keywordSearch = req.query['keyword_search'];
  var location = req.query.location;
  var radius = req.query.radius || 5;

  var googleResults = [];
  var dbResults = [];

  BPromise.resolve()
  .then(function() {
    return googleNearbySearch(keywordSearch, location, radius);
  })
  .then(function(googlePlaces) {
    for (var placeObject in googlePlaces) {
      googleResults.push(Place.createFromGooglePlace(placeObject));
    }
  })
  .then(function() {
    // TODO: search the glitter database for any places that are near
    // this geographic location & radius (use a default radius if not supplied)
    // and have a keyword match against name (if a keyword was supplied)
  })
  .then(function(fetchedPlaces) {
    dbResults = fetchedPlaces;

    // TODO: merge the google search with our place search results by
    // removing duplicates (favor keeping places from our database)
  })
  .then(function(places) {

    // TODO: send a response object that contains
    // both the google results and our place results
    // in the response body (keep separate so front-end can display accordingly)
    res.send(_.map(places, 'attrs'));
  })
  .catch(function(e) {
    res.status(500).send('error of some sort!');
  });
});

// Get details on a specific Place
secureAPI.get('/places/:id', function (req, res) {
  BPromise.bind({})
  .then(function() {
    var query = Place.objects
    .where({ 'id' : req.params.id });
    return query.limit(1).fetchOne();
  })
  .then(function(placeResult) {
    this.placeResult = placeResult;
  })
  .then(function() {
    var query = Commentary.objects
    .where({ place: this.placeResult })
    .where({ user: req.user });
    return query.limit(1).fetch();
  })
  .then(function(commentaryResult) {
    res.send({ commentary: filterCommentary(commentaryResult[0]),
                  details: filterPlaceDetails(this.placeResult) });
  })
  .catch(handleError(res));
});

// Get all Lists for a specific User
secureAPI.get('/lists', function (req, res) {
  var query = List.objects
    .where({ user: req.user })
    .order('id')
    .limit(100);
  query.fetch().then(function(lists) {
    res.send({ lists: _.map(lists, 'attrs') });
  })
  .catch(handleError(res));
});

// Get a single list for a specific User
secureAPI.get('/lists/:id', function (req, res) {
  BPromise.bind({})
  .then(function() {
    var query = List.objects
    .where({ 'id' : req.params.id });
    return query.limit(1).fetchOne();
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    var query = Place.objects
    .where({ 'lists.id': req.params.id });
    return query.fetch();
  })
  .then(function(places) {
    res.send({ list: this.list, places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Get the Places for a specific List for a specific User
secureAPI.get('/lists/:id/places', function (req, res) {
  var query = Place.objects
  .where({ 'lists.user':req.user })
  .where({ 'lists.id': req.params.id });
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Get a User's Profile
secureAPI.get('/profile', function (req, res) {
  res.send(_.omit(req.user.attrs, 'password_digest'));
});

// Create a new Place
secureAPI.post('/places', function (req, res) {
  var newPlace = Place.create({
    name: req.body.name,
  });
  newPlace.save().then(function() {
    res.send(newPlace.attrs);
  })
  .catch(handleError(res));
});

// Create a new List
secureAPI.post('/lists', function (req, res) {
  var newList = List.create({
    name: req.body.name,
    user: req.user
  });
  newList.save().then(function() {
    res.send(newList.attrs);
  })
  .catch(handleError(res));
});

// Create a Place and Add to a List
secureAPI.post('/lists/:id/places/', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() {
    if (req.body.placeName) {
      return Place.objects.findOrCreate({name: req.body.placeName});
    } else {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function(place) {
    return this.list.addPlace(place);
  })
  .then(function() { res.send({ status: "OK" }); })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Add an Existing Place to a List
secureAPI.post('/lists/:id/places/:pid', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() {
    if (req.params.pid) {
      return Place.objects.find(req.params.pid);
    } else {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function(place) {
    return this.list.addPlace(place);
  })
  .then(function() { res.send({ status: "OK" }); })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// User Signup - not secure request
app.post('/api/users/signup', function (req, res) {
  BPromise.bind({})
  .then(function() { return generateToken(); })
  .then(function(newToken) { this.newToken = newToken; })
  .then(function() { return bcrypt.genSaltAsync(); })
  .then(function(salt) { return bcrypt.hashAsync(req.body.password, salt); })
  .then(function(hash) { this.passwordDigest = hash; })
  .then(function() {
    var newUser = User.create({
      name: req.body.username,
      passwordDigest: this.passwordDigest
    });
    newUser.addToken(this.newToken);
    res.setHeader('x-glitter-token', this.newToken.value);
    return newUser.save();
  })
  .then(function(newUser) {
    res.send(_.omit(newUser.attrs, 'password_digest'));
  })
  .catch(handleError(res));
});

// User Login - not secure request
app.post('/api/users/login', function (req, res) {
  var errorMessage = 'username and/or password incorrect';
  BPromise.bind({})
  .then(function() {
    this.username = req.body.username;
    this.password = req.body.password;
    return User.objects.where({name: this.username}).limit(1).fetchOne();
  })
  .then(function(theUser) {
    this.user = theUser;
    return bcrypt.compareAsync(this.password, theUser.passwordDigest);
  })
  .then(function(result) {
    if (!result) {
      throw _.extend(new Error(errorMessage), { status: 403 });
    }
    return generateToken();
  })
  .then(function(token) {
    this.token = token;
    token.user = this.user;
    return token.save();
  })
  .then(function() {
    res.setHeader('x-glitter-token', this.token.value);
    res.send({ message: 'OK' });
  })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      throw _.extend(new Error(errorMessage), { status: 403 });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});


// User Logout
secureAPI.delete('/users/logout', function (req, res) {
  deleteToken(req.headers['x-glitter-token']).then(function() {
    res.setHeader('x-glitter-token', '');
    res.send({ message: 'OK' });
  })
  .catch(handleError(res));
});

// Delete a List
secureAPI.delete('/lists/:id', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(listToDelete) {
    this.list = listToDelete;
    this.list.clearPlaces();
    return this.list.save();
  })
  .then(function() {
    this.list.delete();
    return this.list.save();
  })
  .then(function() {
    res.send({ status: "OK" });
   })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Remove a Place from a List
secureAPI.delete('/lists/:listId/places/:placeId', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return Place.objects.find(req.params.placeId);
  })
  .then(function(place) {
    this.place = place;
    return List.objects.find(req.params.listId);
  })
  .then(function(list) {
    list.removePlace(this.place);
    return list.save();
  })
  .then(function() {
    res.send({ status: "OK" });
   })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Delete a Place and remove from all Lists
secureAPI.delete('/places/:id', function (req, res) {
   BPromise.bind({})
  .then(function() {
    return Place.objects.find(req.params.id); })
  .then(function(place) { this.place = place; })
  .then(function() {
    this.place.removeLists();
    this.place.clearLists();
    return this.place.save();
  })
  .then(function() {
    this.place.delete();
    return this.place.save();
  })
  .then(function() {
    res.send({ status: "OK" });
  })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

app.use('/api', api);
app.use('/api', secureAPI);

module.exports = app;
