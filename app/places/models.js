'use strict';

var BPromise = require('bluebird');
var _ = require('lodash');
var db = require('../db');
var azul = require('azul');
var property = azul.core.property;

var googlePlaceDetails = require('../../external-services/google').placeDetails;

var Place = db.model('place', {
  name: db.attr(),
  googlePlaceId: db.attr(),
  iconUrl: db.attr(),
  address: db.attr(),
  phone: db.attr(),
  intlPhone: db.attr(),
  locality: db.attr(),
  neighborhood: db.attr(),
  country: db.attr(),
  postalCode: db.attr(),
  temporary: db.attr(),
  timezone: db.attr(),
  website: db.attr(),
  lists: db.hasMany({ join: 'lists_places' }),
  commentaries: db.hasMany(),
  _location: db.attr('location'),
  _types: db.attr('types'),  // TODO: change this to typeS

  /**
   * Place constructor.
   *
   * @override
   */
  init: function(properties) {
    this._super(_.defaults(properties, {
      temporary: false,
    }));
  },

  types: property(function() { // getter
    return JSON.parse(this._types);
  }, function(types) { // setter
    this._types = JSON.stringify(types);
  }),

  location: property(function() { // getter
    return JSON.parse(this._location);
  }, function(location) { // setter
    this._location = JSON.stringify(location);
  }),
});


Place.reopenClass({
  /**
   * Places as they come back from the Google Places API.
   *
   * @typedef {Object} google.Place
   */

  /**
   * Create a Place from a Google Place
   *
   * Note that resulting Place object is not saved to the
   * database intentionally. It will only be saved at a later
   * time if and when it is added to at least one user list.
   *
   * @param {google.Place} googlePlace
   * @return {Place}
   */
  createFromGooglePlace: function(googlePlace) {
    if (!googlePlace['place_id']) {
      throw new Error('Missing place id.');
    }

    if (!googlePlace.geometry.location) {
      throw new Error('Missing location data.');
    }
    return Place.create({
      id: 'temp_' + googlePlace['place_id'],
      name: googlePlace.name,
      googlePlaceId: googlePlace['place_id'],
      location: googlePlace.geometry.location,
      address: googlePlace.vicinity,
      temporary: true,
      types: googlePlace.types,
    });
  },
  /**
   * Convert an Array of Google Places to an array of Place objects.
   *
   * @param {Array.<google.Place>} array of googlePlaces.
   * @return {Array.<Place>} array of Place objects.
   */
  createFromGooglePlaces: function(googlePlaces) {
    var places = [];
    for (var i = 0; i < googlePlaces.length; i++) {
      places.push(Place.createFromGooglePlace(googlePlaces[i]));
    }
    return places;
  },
  /**
   * Create Google Place details as a new Place.
   *
   * @param {google.PlaceDetails} placeDetails Google place details.
   * @return {Place} new Place object.
   */
  createFromGooglePlaceDetails: function(placeDetails) {
    // TODO: there are more attributes to take
    // advantage of here and better fill in the place
    return Place.create({
      name: placeDetails.name,
      googlePlaceId: placeDetails['place_id'],
      location: placeDetails.geometry.location,
      address: placeDetails.vicinity,
      temporary: false,
      types: placeDetails.types,
      website: placeDetails.website,
    });
  },
  /**
   * Request Google Place details, then save
   * result as a new Place object.
   *
   * @param {string} placeId - Google placeId.
   * @return {Promise.<Place>} new Place object.
   */
  findAndSaveGooglePlace: function(placeId) {
    return BPromise.resolve()
    .then(function() {
      return googlePlaceDetails(placeId);
    })
    .then(function(placeDetails) {
      return Place.createFromGooglePlaceDetails(placeDetails);
    })
    .then(function(newPlace) {
      return newPlace.save();
    })
    .catch(function(e) { // TODO: code review discuss
      throw e;
    });
  },
  /**
   * Merge two place lists and remove duplicates
   *
   * @param {Array.<Place>} placesA
   * @param {Array.<Place>} placesB
   * @return {Array.<Place>}
   */
  merge: function(placesA, placesB) {
    var merged = _.uniq(_.union(placesA, placesB), 'googlePlaceId');
    return merged;
  },
});

module.exports = {
  Place: Place,
};
