'use strict';

process.env.NODE_ENV = 'test';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var BPromise = require('bluebird');
var request = BPromise.promisify(require('request'));
var helpers = require('./helpers');

var pg = require('pg');
var app = require('../app');
var server;
var port = 93845;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');
var List = db.model('list');
var Place = db.model('place');
var Token = db.model('token');
var User = db.model('user');

// require('azul-logger')(db.query);

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  beforeEach(function() {
    return BPromise.bind(this) // bind to mocha context
    .then(function() { return helpers.createAuthenticatedUser('Whitney'); })
    .then(function(user) { this.user = user; })
    .then(function(user) { this.tokenHeader = { 'x-glitter-token' : 'abc1234' }; })
    .then(function() { return helpers.createSomePlaces.call(this); })
    .then(function() { return helpers.createSomeLists.call(this); });
  });

  afterEach(function() {
    return BPromise.resolve()
    .then(function() { return db.query.delete('lists_places'); })
    .then (function() { return db.query.delete('places'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE places_id_seq restart');
    })
    .then (function() { return db.query.delete('lists'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE lists_id_seq restart');
    })
    .then (function () { return db.query.delete('tokens'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE tokens_id_seq restart');
    })
    .then (function() { return db.query.delete('users'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE users_id_seq restart');
    });
  });

  it('GET /api/lists/2/places with no places', function() {
    return BPromise.bind(this)
    .then(function() {
      this.list2.user = this.user;
      return this.list2.save();
    })
    .then(function() { return request({ url: baseURL + '/api/lists/2/places', headers: this.tokenHeader, json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
    });
  });

  it('GET /api/lists/2/places with places', function() {
    var getRequest = { url: baseURL + '/api/lists/2/places', headers: this.tokenHeader, json: true, };
    return BPromise.bind(this)
    .then(function() {
      this.list2.user = this.user;
      return this.list2.save();
    })
    .then(function() { return this.list2.addPlaces(this.placeA, this.placeC); })
    .then(function() { return request(getRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'Alma Chocolates' },
          { id: 3, name: 'Coava Coffee' }
        ]
      });
    });
  });

  // Try to add a Place that doesn't exist to a List
  it('POST /api/lists/1/places with invalid place', function() {
    var postRequest = {
      url: baseURL + '/api/lists/1/places',
      method: 'post',
      headers: this.tokenHeader,
      body: { id: '99' },
      json: true,
    };

    return BPromise.bind(this)
    .then(function() {
      this.list1.user = this.user
      return this.list1.save();
    })
    .then(function() { return request(postRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(404);
      expect(body).to.eql({ message: 'not found' });
    });
  });

  // Try to add an Existing Place to a List
  it('POST /api/lists/1/places with valid place', function() {
    var baseRequest = {
      url: baseURL + '/api/lists/1/places',
      method: 'post',
      headers: this.tokenHeader,
      json: true,
    };
    var postRequest = _.extend({}, baseRequest, { body: { id: '1' } });
    var getRequest = _.extend({}, baseRequest, { method: 'get' });

    return BPromise.bind(this)
    .then(function() {
      this.list1.user = this.user;
      return this.list1.save();
    })
    .then(function() {
      this.list2.user = this.user;
      return this.list2.save();
    })
    .then(function() { return request(postRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request(getRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'Alma Chocolates' }
        ]
      });
    });
  });

  // Try to add Create and Add a New Place to a List
  it('POST /api/lists/1/places with new place', function() {
    var baseRequest = {
      url: baseURL + '/api/lists/1/places',
      method: 'post',
      headers: this.tokenHeader,
      json: true,
    };
    var postRequest = _.extend({}, baseRequest, { body: { placeName: 'New Place' } });
    var getRequest = _.extend({}, baseRequest, { method: 'get' });

    return BPromise.bind(this)
    .then(function() {
      this.list1.user = this.user;
      return this.list1.save();
    })
    .then(function() {
      this.list2.user = this.user;
      return this.list2.save();
    })
    .then(function() { return request(postRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request(getRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 9, name: 'New Place' } //id is 9 bc helpers created 8 already
        ]
      });
    });
  });

  // Try to remove a Place that does not exist from a List
  it('DELETE /api/lists/1/places with invalid place', function() {
    var deleteRequest = {
      url: baseURL + '/api/lists/1/places/99',
      method: 'delete',
      headers: this.tokenHeader,
      json: true,
    };
    return BPromise.bind(this)
    .then(function() {
      this.list1.user = this.user
      return this.list1.save();
    })
    .then(function(user) { return request(deleteRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(404);
      expect(body).to.eql({ message: 'not found' });
    });
  });

  // Try to remove a Place from a List
  it('DELETE /api/lists/1/places with valid place', function() {
    var baseRequest = {
      url: baseURL + '/api/lists/1/places',
      method: 'post',
      headers: this.tokenHeader,
      json: true,
    };
    var postRequest1 = _.extend({}, baseRequest, { body: { id: '2' } });
    var postRequest2 = _.extend({}, baseRequest, { body: { id: '4' } });
    var deleteRequest = _.extend({}, postRequest2, { url: baseURL + '/api/lists/1/places/4', method: 'delete' });
    var getRequest = _.extend({}, baseRequest, { method: 'get' });

    return BPromise.bind(this)
    .then(function() {
      this.list1.user = this.user
      return this.list1.save();
    })
    .then(function() { return helpers.createSomePlaces(); })
    .then(function() { return request(postRequest1); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request(postRequest2); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request(getRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 2, name: 'Barista' },
          { id: 4, name: 'Dunkin Donuts' }
        ]
      });
    })
    .then(function() { return request(deleteRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request(getRequest); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 2, name: 'Barista' }
        ]
      });
    });
  });
});
