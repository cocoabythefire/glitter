'use strict';

var _ = require('lodash');
var db = require('../db');

var Place = db.model('place', {
  name: db.attr(),
  googlePlaceId: db.attr(),
  location: db.attr(),
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
  types: db.attr(),  // TODO: change this to typeS
  lists: db.hasMany({ join: 'lists_places' }),
  commentaries: db.hasMany(),

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
    for (var placeObject in googlePlaces) {
      console.log('place object');
      console.log(placeObject);
      places.push(Place.createFromGooglePlace(placeObject));
    }

    // console.log(places);
    return places;
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
