'use strict';

var _ = require('lodash');
var url = require('url');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var BPromise = require('bluebird');

var bcrypt = BPromise.promisifyAll(require('bcrypt'));
var proxies = require('./proxies');

var googleAPIKey = 'AIzaSyBF0MrwABAJ_Nf1bbNjBMeSps0aigriEJg';
var googleNearbySearch = require('./external-services/google').nearbySearch;


/**
 * Setup database
 */

var config = require('./app/config');
var db = require('./app/db');
var List = require('./app/lists/models').List;
var Place = require('./app/places/models').Place;
var User = require('./app/users/models').User;
var Commentary = require('./app/commentary/models').Commentary;
var Token = require('./app/auth/models').Token;


/**
 * Setup application routes
 */

var handleError = require('./app/middleware').error;

var app = express();
var api = express.Router();
var secureAPI = express.Router();

app.set('db', db);

if (config.MORGAN_LOG_LEVEL) {
  app.use(morgan(config.MORGAN_LOG_LEVEL));
}

app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
  res.send('This is the glitter service!');
});

secureAPI.use(require('./app/middleware').auth);


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


// Get a User's Profile
secureAPI.get('/profile', function (req, res) {
  res.send(_.omit(req.user.attrs, 'password_digest'));
});


// User Signup - not secure request
app.post('/api/users/signup', function (req, res) {
  BPromise.bind({})
  .then(function() { return Token.generateToken(); })
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
    return Token.generateToken();
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
  Token.deleteToken(req.headers['x-glitter-token']).then(function() {
    res.setHeader('x-glitter-token', '');
    res.send({ message: 'OK' });
  })
  .catch(handleError(res));
});


var features = [
  'places', 'lists',
];
features.forEach(function(feature) {
  app.use(require('./app/' + feature + '/routes'));
});

app.use('/api', api);
app.use('/api', secureAPI);

module.exports = app;
