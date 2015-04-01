var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var azul = require('azul');

/**
 * Setup database
 */

var env = process.env.NODE_ENV || 'development';
var config = require('./azulfile')[env];
var db = azul(config);
var Place = db.model('place', {
  name: db.attr()
});
var List = db.model('list', {
  name: db.attr()
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
});

module.exports = app;
