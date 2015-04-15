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
  lists: db.hasMany({ through: 'list_places' })
});
var List = db.model('list', {
  name: db.attr(),
  places: db.hasMany({ through: 'list_places' }),
  user: db.belongsTo()
});
var User = db.model('user', {
  name: db.attr(),
  lists: db.hasMany()
});

// TODO: this should be removable and is related to issue https://github.com/wbyoung/azul/issues/8
var ListPlace = db.model('list_place', {
  place: db.belongsTo(),
  list: db.belongsTo()
});


/**
 * Setup application routes
 */

var handleError = function(res) {
  return function(e) {
    console.log(e)
    res.status(500).send({ error: 'unhandled error' });
  };
};

var app = express();

app.set('db', db);
app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
  res.send('Hello Whiiiiiiiiy Blair!');
});

app.get('/api/places', function (req, res) {
  var query = Place.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

app.get('/api/lists', function (req, res) {
  var query = List.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(lists) {
    res.send({ lists: _.map(lists, 'attrs') });
  })
  .catch(handleError(res));
});

// get the places for a specific list
app.get('/api/lists/:id/places', function (req, res) {

  // TODO: figure out if there's a better way to write this with azul
  var query = Place.objects
    .where({ 'list_places.list_id': req.params.id });

  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

app.post('/api/places', function (req, res) {
  var newPlace = Place.create({
    name: req.body.name
  });
  newPlace.save().then(function() {
    res.send(newPlace.attrs);
  })
  .catch(handleError(res));
});

app.post('/api/lists', function (req, res) {
  var newList = List.create({
    name: req.body.name
  });
  newList.save().then(function() {
    res.send(newList.attrs);
  })
  .catch(handleError(res));
});

app.post('/api/lists/:id/places', function (req, res) {
  BPromise.all([
    List.objects.find(req.params.id),
    Place.objects.find(req.body.id)
  ])
  .spread(function(list, place) {
    return list.addPlace(place);
  })
  .then(function() {
    res.send({ status: "OK" });
   })
  .catch(handleError(res));
});

app.post('/api/users/signup', function (req, res) {
  var newUser = User.create({
    name: req.body.name
  });
  newUser.save().then(function() {
    res.send(newUser.attrs);
  })
  .catch(handleError(res));
});

module.exports = app;
