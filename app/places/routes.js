'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');
var express = require('express');
var Place = require('./models').Place;
var Commentary = require('../commentary/models').Commentary;
var handleError = require('../middleware').error;

var router = express.Router();
var api = express.Router();
var secure = require('../middleware').auth;

// TODO: there is an azul feature to replace these
// helper filter functions

/**
 * Filter Place Details
 * @param {Object.<Place details>} the place details.
 * @return {Object.<Filtered details>} the place details filtered
 * to remove the google_place_id key/value.
 */
var filterPlaceDetails = function(placeDetails) {
  if (placeDetails) {
    return _.omit(placeDetails.attrs, 'google_place_id');
  }
  return {};
};


/**
 * Filter Commentary
 * @param {Object.<Commentary>} the commentary.
 * @return {Object.<Filtered commentary>} the commentary filtered
 * to remove the 'place_id', 'user_id' keys/values.
 */
var filterCommentary = function(commentary) {
  if(commentary) {
    return _.omit(commentary.attrs, 'place_id', 'user_id');
  }
  return {};
};


// Get all Places - not a secure request
api.get('/places', function (req, res) {
  var query = Place.objects
    .order('id')
    .limit(100);
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Get details on a specific Place
api.get('/places/:id', secure, function (req, res) {
  BPromise.bind({})
  .then(function() {
    var query = Place.objects
    .where({ 'id' : req.params.id });
    return query.limit(1).fetchOne();
  })
  .then(function(placeResult) {
    this.placeResult = placeResult;
  })
  .then(function() {
    var query = Commentary.objects
    .where({ place: this.placeResult })
    .where({ user: req.user });
    return query.limit(1).fetch();
  })
  .then(function(commentaryResult) {
    res.send({ commentary: filterCommentary(commentaryResult[0]),
                  details: filterPlaceDetails(this.placeResult) });
  })
  .catch(handleError(res));
});


// Create a new Place
api.post('/places', secure, function (req, res) {
  var newPlace = Place.create({
    name: req.body.name,
  });
  newPlace.save().then(function() {
    res.send(newPlace.attrs);
  })
  .catch(handleError(res));
});

// Delete a Place and remove from all Lists
api.delete('/places/:id', secure, function (req, res) {
   BPromise.bind({})
  .then(function() {
    return Place.objects.find(req.params.id); })
  .then(function(place) { this.place = place; })
  .then(function() {
    this.place.removeLists();
    this.place.clearLists();
    return this.place.save();
  })
  .then(function() {
    this.place.delete();
    return this.place.save();
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

router.use('/api', api);

module.exports = router;
