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


/**
 * Setup application routes
 */

var app = express();

app.use(bodyParser.json()); // for parsing application/json

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/api/places', function (req, res) {
  res.send({ places: [] });
});

app.post('/api/places', function (req, res) {
  res.send({ id: 1, name: req.body.name });
});

module.exports = app;
