'use strict';

var _ = require('lodash');
var db = require('../db');

// TODO: add a temp property to Place that can
// be used to determine if this is a saved object
// or one we are just using for sorting/searching
// and may or may not be saved in the future
var Place = db.model('place', {
  name: db.attr(),
  google_place_id: db.attr(),
  location: db.attr(),
  icon_url: db.attr(),
  address: db.attr(),
  phone: db.attr(),
  intl_phone: db.attr(),
  locality: db.attr(),
  neighborhood: db.attr(),
  country: db.attr(),
  postal_code: db.attr(),
  timezone: db.attr(),
  website: db.attr(),
  type: db.attr(),  //TODO: change this to typeS
  lists: db.hasMany({ join: 'lists_places' }),
  commentaries: db.hasMany()
});


Place.reopenClass({
  /**
   * Create a Place from a Google Place
   *
   * Note that resulting Place object is not saved to the
   * database intentionally. It will only be saved at a later
   * time if and when it is added to at least one user list.
   *
   * @param {Object.<Google Place>} googlePlace
   * @return {Object.<Place>}
   */
  createFromGooglePlace: function(googlePlace) {
    console.log(googlePlace);
    if (!googlePlace.place_id) {
      throw new Error('Missing place id.');
    }

    if (!googlePlace.geometry.location) {
      throw new Error('Missing location data.');
    }
    return Place.create({
      name: googlePlace.name,
      google_place_id: googlePlace.place_id,
      location: googlePlace.geometry.location,
      address: googlePlace.vicinity,
      type: googlePlace.types
    });
  },
  /**
   * Convert an Array of Google Places to
   * an array of Place objects
   *
   * @param {Array.Object.<Google Place>} array of googlePlaces.
   * @return {Array.Object.<Place>} array of Place objects.
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
    console.log('merging');
    console.log(placesA);
    console.log(placesB);
    var merged = _.uniq(_.union(placesA, placesB), 'google_place_id');
    console.log(merged);
    return merged;
  }
});

module.exports = {
  Place: Place,
};
