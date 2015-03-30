var express = require('express');
var app = express();
var bodyParser = require('body-parser');

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
