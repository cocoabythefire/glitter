'use strict';

var url = require('url');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var proxies = require('./proxies');


/**
 * Setup database
 */

var config = require('./app/config');
var db = require('./app/db');


/**
 * Setup application routes
 */

var app = express();
var api = express.Router();

app.set('db', db);

if (config.MORGAN_LOG_LEVEL) {
  app.use(morgan(config.MORGAN_LOG_LEVEL));
}

app.use(bodyParser.json()); // for parsing application/json

app.get('/', function(req, res) {
  res.send('This is the glitter service!');
});

// TODO: this should become a forwarder that uses the proxy
// for Google requests like auto-complete or future mapping
// functionality that the front-end will use
// format is
// https://maps.googleapis.com/maps/api/place/nearbysearch/json?parameters

var googleAPIKey = 'AIzaSyBF0MrwABAJ_Nf1bbNjBMeSps0aigriEJg';

app.all('/api/maps/*', function(req, res) {
  var parsedURL = url.parse(req.url, true);
  parsedURL.search = null;
  parsedURL.query.key = googleAPIKey;
  parsedURL.pathname = parsedURL.pathname.replace(/^\/api\/maps/, '');
  req.url = url.format(parsedURL);
  proxies.googleMaps.web(req, res);
});

var features = [
  'places', 'lists', 'users', 'search',
];
features.forEach(function(feature) {
  app.use(require('./app/' + feature + '/routes'));
});


app.use('/api', api);

module.exports = app;
