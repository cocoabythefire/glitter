'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');
var express = require('express');
var Place = require('../places/models').Place;
var secure = require('../middleware').auth;

var router = express.Router();
var api = express.Router();

var googleNearbySearch = require('../../external-services/google').nearbySearch;


/**
 * API resource for GET /place/nearbysearch.
 *
 * @param {String} keyword_search - search string. i.e. "coffee and tea".
 * @param {String} [location] - The location which must be a lat/long.
 * @param {Number} [radius=5] Number of miles radius to search in.
 */
api.get('/place/nearbysearch', secure, function(req, res) {
  var keywordSearch = req.query['keyword_search'];
  var location = req.query.location;
  var radius = req.query.radius || 5;

  var googleResults = [];

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
    // and have a better keyword match condition
    var query = Place.objects
    .order('id')
    .where({ name$contains: keywordSearch })
    .limit(20);
    return query.fetch();
  })
  .then(function(fetchResults) {
    // TODO: favor keeping places from our database over google results?
    return Place.merge(fetchResults, googleResults);
  })
  .then(function(places) {
    res.send(_.map(places, 'attrs'));
  })
  .catch(function() {
    res.status(500)
    .send('Could not complete nearby search due to unknown error.');
  });
});


router.use('/api', api);

module.exports = router;
