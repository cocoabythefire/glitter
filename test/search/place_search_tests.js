'use strict';

var chai = require('chai');
var expect = chai.expect;
var BPromise = require('bluebird');

var app = require('../../app');

var db = app.get('db');
var Place = db.model('place');

chai.use(require('sinon-chai'));

describe('place search', function() {

  describe('google place conversion', function() {
    it('converts a valid google place into a Place object', function() {
      var googlePlace = require('../fixtures/google_place_voodoo');
      return BPromise.resolve()
      .then(function() { return Place.createFromGooglePlace(googlePlace); })
      .then(function(newPlace) {
        expect(newPlace).to.exist;
        expect(newPlace.name).to.eql('Voodoo Doughnut');
        expect(newPlace.id).to.eql('temp_ChIJ70AxJAcKlVQRde9D82gpfSU');
        expect(newPlace.googlePlaceId).to.eql('ChIJ70AxJAcKlVQRde9D82gpfSU');
        expect(newPlace.location).to.eql({
          lat: 45.5226206,
          lng: -122.6731105,
        });
        expect(newPlace.address).to.eql('22 Southwest 3rd Avenue, Portland');
        expect(newPlace.temporary).to.eql(true);
        expect(newPlace.types).to.eql(
          ['store', 'cafe', 'food', 'point_of_interest', 'establishment']
        );
      });
    });

    it('throws if google place does not have a placeID property', function() {
      expect(function() {
        var googlePlace = require('../fixtures/google_place_missing_id');
        Place.createFromGooglePlace(googlePlace);
      }).to.throw(/missing.*place.*id/i);
    });

    it('throws if google place is missing the geography/location', function() {
      expect(function() {
        var googlePlace = require('../fixtures/google_place_missing_location');
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

    it('should work when one of the lists is empty', function() {
      var googlePlaces = [];
      var listA = require('../fixtures/google_place_list_a');
      for (var i = 0; i < listA.length; i++) {
        googlePlaces.push(listA[i]);
      }
      return BPromise.resolve()
      .then(function() {
        return Place.createFromGooglePlaces(googlePlaces);
      })
      .then(function(convertedList) {
        return Place.merge(convertedList, []);
      })
      .then(function(result) {
        expect(result.length).to.eql(20);
      });
    });

    it('removes a single overlap between lists ', function() {
    });

    it('removes duplicates in one of the lists', function() {
    });

    it('combines lists when no overlap/duplicates are present', function() {
    });

    it('removes multiple overlaps between lists', function() {
    });

    it('removes multiple duplicates and overlaps between lists', function() {
    });

  });




  // TODO: test that making a call to the api for a neaby search returns
  // the right data sets (both google and db results)

});
