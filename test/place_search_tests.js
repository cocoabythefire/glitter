'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var BPromise = require('bluebird');
var request = BPromise.promisifyAll(require('request'));
var helpers = require('./helpers');
var googleNearbySearch = require('../external-services/google').nearbySearch;

var pg = require('pg');
var app = require('../app');
var server;
var port = 54210;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');
var Place = db.model('place');

chai.use(require('sinon-chai'));

describe('place search', function() {

  describe('google place conversion', function() {
    it('converts a valid google place into a Place object', function() {
      var googlePlace = require('./fixtures/google_place_voodoo');
      return BPromise.resolve()
      .then(function() { return Place.createFromGooglePlace(googlePlace); })
      .then(function(newPlace) {
        expect(newPlace).to.exist;
        expect(newPlace.name).to.eql('Voodoo Doughnut');
        expect(newPlace.google_place_id).to.eql('ChIJ70AxJAcKlVQRde9D82gpfSU');
        expect(newPlace.location).to.eql({ 'lat': 45.5226206, 'lng': -122.6731105 });
        expect(newPlace.address).to.eql('22 Southwest 3rd Avenue, Portland');
        expect(newPlace.type).to.eql(
          ['store', 'cafe', 'food', 'point_of_interest', 'establishment']
        );
      });
    });

    it('throws if google place does not have a placeID property', function() {
      expect (function() {
        var googlePlace = require('./fixtures/google_place_missing_id');
        Place.createFromGooglePlace(googlePlace);
      }).to.throw(/missing.*place.*id/i);
    });

    it('throws if google place is missing the geography/location component', function() {
      expect (function() {
        var googlePlace = require('./fixtures/google_place_missing_location');
        Place.createFromGooglePlace(googlePlace);
      }).to.throw(/missing.*location/i);
    });
  });

  describe('merging place lists', function() {

    it('should work when both of the lists are empty', function() {
      return BPromise.resolve()
      .then(function() {
        return Place.merge([], []);
      })
      .then(function(result) {
        expect(result).to.eql([]);
      });
    });

    it.skip('should work when one of the lists is empty', function() {
      var arr = [];
      var listA = require('./fixtures/google_place_list_a');
      for (var i in listA) {
        arr.push(i);
      }
      var converted = Place.createFromGooglePlaces(arr);
      return BPromise.resolve()
      // .then(function() {
      //   return Place.createFromGooglePlaces(arr);
      // })
      .then(function(convertedList) {
        return Place.merge(convertedList, []);
      })
      .then(function(result) {
        expect(result).to.eql(listA);
      });
    });

    it('should remove a single overlap between lists ', function() {
    });

    it('should remove duplicates in one of the lists', function() {
    });

    it('should just combine lists when no overlap or duplicates are present', function() {
    });

    it('should remove multiple overlaps between lists', function() {
    });

    it('should remove multiple duplicates and overlaps between lists', function() {
    });

  });




  // TODO: test that making a call to the api for a neaby search returns
  // the right data sets (both google and db results)

});