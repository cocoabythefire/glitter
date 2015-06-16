'use strict';

var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var BPromise = require('bluebird');
var azul = require('azul');
var crypto = BPromise.promisifyAll(require('crypto'));
var bcrypt = BPromise.promisifyAll(require('bcrypt'));

/**
 * Setup database
 */

var env = process.env.NODE_ENV || 'development';
var config = require('./azulfile')[env];
var db = azul(config);
var Place = db.model('place', {
  name: db.attr(),
  lists: db.hasMany({ join: 'list_places' })
});
var List = db.model('list', {
  name: db.attr(),
  places: db.hasMany({ join: 'list_places' }),
  user: db.belongsTo()
});
var User = db.model('user', {
  name: db.attr(),
  passwordDigest: db.attr(),
  lists: db.hasMany(),
  tokens: db.hasMany()
});
var Token = db.model('token', {
  value: db.attr(),
  user: db.belongsTo()
});


/**
 * Setup application routes
 */

var handleError = function(res) {
  return function(e) {
    if (e.status) {
      res.status(e.status).send({ message: e.message });
    }
    else {
      console.log(e);
      res.status(500).send({ error: 'unhandled error' });
    }
  };
};

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

var deleteToken = function(tokenValue) {
  var errorMessage = 'could not logout: token is not a valid session';
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
      throw _.extend(new Error(errorMessage), { status: 401 });
    }
    else { throw e; }
  })
};


var app = express();
var api = express.Router();
var secureAPI = express.Router();

app.set('db', db);
app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
  res.send('Hello Whiiiiiiiiy Blair!');
});

// Authentication Middleware
secureAPI.use(function(req, res, next) {
  BPromise.bind({})
  .then(function() {
    return Token.objects.where({
      'value': req.headers['x-glitter-token']
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

// Get all Places
app.get('/api/places', function (req, res) {
  var query = Place.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Get all Lists
app.get('/api/lists', function (req, res) {
  var query = List.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(lists) {
    res.send({ lists: _.map(lists, 'attrs') });
  })
  .catch(handleError(res));
});

// Get the Places for a specific List
app.get('/api/lists/:id/places', function (req, res) {
  var query = Place.objects
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
app.post('/api/places', function (req, res) {
  var newPlace = Place.create({
    name: req.body.name
  });
  newPlace.save().then(function() {
    res.send(newPlace.attrs);
  })
  .catch(handleError(res));
});

// Create a new List
app.post('/api/lists', function (req, res) {
  var newList = List.create({
    name: req.body.name
  });
  newList.save().then(function() {
    res.send(newList.attrs);
  })
  .catch(handleError(res));
});

// Add a Place to a List
secureAPI.post('/lists/:id/places', function (req, res) {
  BPromise.bind({})
  .then(function() { return List.objects.find(req.params.id); })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() { return Place.objects.find(req.body.id); })
  .then(function(place) { return this.list.addPlace(place); })
  .then(function() { res.send({ status: "OK" }); })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// User Signup
app.post('/api/users/signup', function (req, res) {
  BPromise.bind({})
  .then(function() { return generateToken(); })
  .then(function(newToken) { this.newToken = newToken; })
  .then(function() { return bcrypt.genSaltAsync(); })
  .then(function(salt) { return bcrypt.hashAsync(req.body.password, salt); })
  .then(function(hash) { this.passwordDigest = hash; })
  .then(function() {
    var newUser = User.create({
      name: req.body.name,
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

// User Login
app.post('/api/users/login', function (req, res) {
  var errorMessage = 'username and/or password incorrect';
  BPromise.bind({})
  .then(function() {
    this.username = req.body.name;
    this.password = req.body.password;
    return User.objects.where({name: this.username}).limit(1).fetchOne();
  })
  .then(function(theUser) {
    return bcrypt.compareAsync(this.password, theUser.passwordDigest);
  })
  .then(function(result) {
    if (!result) {
      throw _.extend(new Error(errorMessage), { status: 403 });
    }
    return generateToken();
  })
  .then(function(token) {
    res.setHeader('x-glitter-token', token.value);
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
  deleteToken(req.headers['x-glitter-token'])
  .then(function(token) {
    res.setHeader('x-glitter-token', '');
    res.send({ message: 'OK' });
  })
  .catch(handleError(res));
});

// Delete a List
app.delete('/api/lists/:id', function (req, res) {
  BPromise.resolve()
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(listToDelete) {
    listToDelete.delete();
    return listToDelete.save();
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

// Delete a Place
app.delete('/api/places/:id', function (req, res) {
  BPromise.resolve()
  .then(function() {
    return Place.objects.find(req.params.id);
  })
  .then(function(placeToDelete) {
    placeToDelete.delete();
    return placeToDelete.save();
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
secureAPI.delete('/lists/:id/places', function (req, res) {
   BPromise.bind({})
  .then(function() { return List.objects.find(req.params.id); })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() {
    return Place.objects.find(req.body.id);
  })
  .then(function(place) {
    return this.list.removePlace(place);
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
