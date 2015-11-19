'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var BPromise = require('bluebird');
var request = BPromise.promisify(require('request'));
var helpers = require('../helpers');

var pg = require('pg');
var app = require('../../app');
var server;
var port = 54210;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');
var List = db.model('list');
var Place = db.model('place');
var Token = db.model('token');
var User = db.model('user');
var Commentary = db.model('commentary');

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
    .then(function() { return helpers.createSomeLists.call(this); })
    .then(function() { return helpers.createSomeCommentary.call(this); });
  });

  afterEach(function() {
    return BPromise.resolve()
    .then(function() { return db.query.delete('commentaries'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE commentaries_id_seq restart');
    })
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

  it('GET /api/places/2 with no user commentary', function() {
    return BPromise.bind(this)
    .then(function() { return request({ url: baseURL + '/api/places/2', headers: this.tokenHeader, json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        details: {
          id: 2,
          name: 'Barista',
          location: null,
          icon_url: null,
          address: null,
          phone: null,
          intl_phone: null,
          locality: null,
          neighborhood: null,
          country: null,
          postal_code: null,
          timezone: null,
          website: null,
          type: null
        },
        commentary: {}
      });
    });
  });

  it('GET /api/places/2 with user commentary', function() {
    return BPromise.bind(this)
    .then(function() {
      this.commentary3.user = this.user;
      this.commentary3.place = this.placeB;
      return this.commentary3.save();
    })
    .then(function() { return request({ url: baseURL + '/api/places/2', headers: this.tokenHeader, json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        details: {
          id: 2,
          name: 'Barista',
          location: null,
          icon_url: null,
          address: null,
          phone: null,
          intl_phone: null,
          locality: null,
          neighborhood: null,
          country: null,
          postal_code: null,
          timezone: null,
          website: null,
          type: null
        },
        commentary: {
          id: 3,
          headline: 'SO GOOD I could die',
          rating: null,
          date_added: null
        } });
    });
  });
});
