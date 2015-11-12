'use strict';

var BPromise = require('bluebird');
var request = BPromise.promisifyAll(require('request'));

var API_KEY = 'AIzaSyBF0MrwABAJ_Nf1bbNjBMeSps0aigriEJg';
var NEARBY_SEARCH_URL = 'https://maps.googleapis.com' +
  '/maps/api/place/nearbysearch/json';
var TYPES = 'bakery|bar|cafe|food|grocery_or_supermarket|liquor_store|' +
  'meal_delivery|meal_takeaway|night_club|restaurant';

/**
 * Converts miles into meters.
 *
 * @param {Number} miles
 * @return {Number} Meters (rounded to nearest meter).
 */
var milesToMeters = function(miles) {
  return Math.round(miles/0.00062137);
};

/**
 * Make a request to Google for nearby places.
 *
 * This currently does not support fetching multiple pages of data, but if
 * needed in the future, we have a few options:
 *
 *  - This could automatically request 2 pages by making another request
 *  - Save the next page token somewhere so that the caller could decide if
 *    more results were needed (i.e. when the places API makes a request for
 *    google places and also some from the database, it will merge those.
 *    after the merge, it could decide that it needed more places because there
 *    was a large overlap and would need the token to request the second page).
 *    We decided to return just an array from this function, so storing the
 *    next page token may require creating a second version of this function
 *    that returns the results as well as that token & leaving the storage of
 *    the token up to the caller.
 *
 * @param {String} keywordSearch - The search string
 * @param {String} ll - Lat & long of location.
 * @param {Number} [radius=5] - in miles.
 * @return {Promise.<Array>}
 */
exports.nearbySearch = function(keywordSearch, ll, radius) {
  if (!keywordSearch) {
    throw new Error('Missing keywordSearch for nearbySearch');
  }

  if (!ll) {
    throw new Error('Missing lat/long (location) for nearbySearch');
  }

  return request.getAsync({
    url: NEARBY_SEARCH_URL,
    qs: {
      keyword: keywordSearch,
      location: ll,
      radius: milesToMeters(radius || 5),
      types: TYPES,
      key: API_KEY
    },
    json: true
  })
  .spread(function(response, apiResult) {
    return apiResult.results;
  });
};
