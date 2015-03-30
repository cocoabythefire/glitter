var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/api/places', function (req, res) {
  res.send({ places: [] });
});

module.exports = app;
