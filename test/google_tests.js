'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var request = require('request');
var google = require('../external-services/google');
var googleNearbySearch = google.nearbySearch;

chai.use(require('sinon-chai'));

describe('google', function() {

  describe('nearby search for places', function() {

    beforeEach(function() {
      var response = require('./fixtures/google_nearby_coffee_portland_2_miles');
      sinon.stub(request, 'get').yieldsAsync(null, [{}, response]);
    });

    afterEach(function() {
      request.get.restore();
    });

    it('works with all possible parameters', function() {
      var searchURL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

      var keyword = 'coffee';
      var latlong = '45.523062,-122.676482';
      var radiusinMiles = 2.0;

      return googleNearbySearch(keyword, latlong, radiusinMiles)
      .then(function(results) {
        expect(request.get).to.have.been.calledOnce;
        var requestConfig = request.get.getCall(0).args[0];
        expect(requestConfig).to.have.property('url', searchURL);
        expect(requestConfig).to.have.property('qs');
        expect(requestConfig).to.have.property('json', true);
        expect(requestConfig.qs).to.have.property('keyword', keyword);
        expect(requestConfig.qs).to.have.property('location', latlong);
        expect(requestConfig.qs).to.have.property('radius', 3219);
        expect(requestConfig.qs).to.have.property('types')
          .with.match(/restaurant/);
        expect(requestConfig.qs).to.have.property('key')
          .with.match(/\w{39}/i);
        expect(results).to.be.an('Array').with.length(20);
      });
    });

    it('works with minimum required parameters', function() {
      var keyword = 'coffee';
      var latlong = '45.523062,-122.676482';

      return googleNearbySearch(keyword, latlong).then(function(results) {
        var requestConfig = request.get.getCall(0).args[0];
        expect(requestConfig.qs).to.have.property('keyword', keyword);
        expect(requestConfig.qs).to.have.property('location', latlong);
        expect(requestConfig.qs).to.have.property('radius', 8047);
      });
    });

    it('with no keyword fails', function() {
      expect(function() {
        googleNearbySearch();
      }).to.throw(/missing.*keyword.*nearby.*search/i);
    });

    it('with empty keyword fails', function() {
      expect(function() {
        googleNearbySearch('');
      }).to.throw(/missing.*keyword.*nearby.*search/i);
    });

    it('with no lat/long fails', function() {
      expect(function() {
        googleNearbySearch('coffee');
      }).to.throw(/missing.*lat.*long.*nearby.*search/i);
    });
  });
});