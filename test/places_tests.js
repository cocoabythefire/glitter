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
var Place = db.model('place');
var List = db.model('list');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  beforeEach(function() {
    return BPromise.bind(this) // bind to mocha context
    .then(function() { return helpers.createAuthenticatedUser('Whitney'); })
    .then(function(user) { this.user = user; })
    .then(function(user) { this.tokenHeader = { 'x-glitter-token' : 'abc1234' }; })
  });

  afterEach(function() {
    return BPromise.resolve()
    .then(function() { return db.query.delete('list_places'); })
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

  describe('when the db throws errors', function() {
    beforeEach(function() {
      sinon.stub(pg.Client.prototype, 'query', function() {
        throw new Error('Intentional test db error.');
      });
    });

    afterEach(function() {
      pg.Client.prototype.query.restore();
    });

    it('GET /api/places with error', function() {
      return request({ url: baseURL + '/api/places', json: true })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });

    it('POST /api/places with error', function() {
      var requestBody = { name: 'salt and straw' };
      return request({ url: baseURL + '/api/places', method: 'post', json: true, body: requestBody })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });
  });

  it('GET /api/places with no places', function() {
    return request({ url: baseURL + '/api/places', json: true })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
    });
  });

  it('GET /api/lists/1/places with no places', function() {
    var listA = List.create({
      name: 'London Hot List',
      user: this.user
    });
    return BPromise.bind(this)
    .then(function() { return listA.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', headers: this.tokenHeader, json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
    });
  });

  it('POST /api/places', function() {
    var requestBody = { name: 'Salt and Straw' };
    return BPromise.resolve()
    .then(function() {
      return request({
        url: baseURL + '/api/places',
        method: 'post',
        json: true,
        body: requestBody,
        headers: { 'x-glitter-token' : 'abc1234' }
      });
    })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'Salt and Straw' });
    });
  });

  describe('when places exist', function() {
    beforeEach(function() {
      return BPromise.bind(this) // bind to mocha context
      .then(function() { return helpers.createSomePlaces.call(this); });
    });

    it('GET /api/places with places', function() {
      return BPromise.bind(this)
      .then(function() { return request({ url: baseURL + '/api/places', json: true }); })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ places: _.map(this.places, 'attrs') });
      });
    });

    it('DELETE /api/places/99 with invalid place', function() {
      return BPromise.bind(this)
      .then(function() { return request({ url: baseURL + '/api/places/', headers: this.tokenHeader, json: true }); })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ places: _.map(this.places, 'attrs') });
      })
      .then(function() {
        return request({ url: baseURL + '/api/places/99', method: 'delete', headers: this.tokenHeader, json: true });
      })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(404);
        expect(body).to.eql({ message: 'not found' });
      });
    });

    it('DELETE /api/places/2 with valid place', function() {
      return BPromise.bind(this)
      .then(function() { return request({ url: baseURL + '/api/places/', json: true }); })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ places: _.map(this.places, 'attrs') });
      })
      .then(function() {
        return request({ url: baseURL + '/api/places/2', method: 'delete', headers: this.tokenHeader, json: true });
      })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({
          status: "OK"
        });
      })
      .then(function() { return request({ url: baseURL + '/api/places/', json: true }); })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({
          places: [
            { id: 1, name: 'Alma Chocolates' },
            { id: 3, name: 'Coava Coffee' },
            { id: 4, name: 'Dunkin Donuts' },
            { id: 5, name: 'Eb & Bean' },
            { id: 6, name: 'Fire on the Mountain' },
            { id: 7, name: 'Girl and the Goat' },
            { id: 8, name: 'Hot Chocolate' }
          ]
        });
      });
    });
  });
});
