'use strict';

var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var BPromise = require('bluebird');
var azul = require('azul');

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
  lists: db.hasMany()
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
      res.status(e.status).send({ status: e.message });
    }
    else {
      console.log(e);
      res.status(500).send({ error: 'unhandled error' });
    }
  };
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
app.get('/api/profile', function (req, res) {
  BPromise.resolve()
  .then(function() {
    return Token.objects.where({ 'value': req.headers['x-glitter-token'] }).fetchOne();
  })
  .then(function(token) {
    return User.objects.find(token.userId);
  })
  .then(function(user) {
    res.send(user.attrs);
  })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(403).send({ message: 'invalid token' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
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
  var newUser = User.create({
    name: req.body.name
  });
  newUser.save().then(function() {
    res.send(newUser.attrs);
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
