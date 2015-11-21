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


// TODO: Add/edit tests to ensure that the GET for lists only
// returns the list of the authenticated user and not those
// belonging to other users

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  beforeEach(function() {
    return BPromise.bind(this) // bind to mocha context
    .then(function() { return helpers.createSomePlaces.call(this); })
    .then(function() { return helpers.createAuthenticatedUser('Whitney'); })
    .then(function(user) { this.user = user; })
    .then(function() { this.tokenHeader = { 'x-glitter-token': 'abc1234' }; });
  });

  afterEach(function() {
    return BPromise.resolve()
    .then(function() { return db.query.delete('lists_places'); })
    .then(function() { return db.query.delete('places'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE places_id_seq restart');
    })
    .then(function() { return db.query.delete('lists'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE lists_id_seq restart');
    })
    .then(function() { return db.query.delete('tokens'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE tokens_id_seq restart');
    })
    .then(function() { return db.query.delete('users'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE users_id_seq restart');
    });
  });

  it('GET /api/lists with no lists', function() {
    return request({
      url: baseURL + '/api/lists',
      headers: this.tokenHeader,
      json: true,
    })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ lists: [] });
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

    it('GET /api/lists with error', function() {
      return request({ url: baseURL + '/api/lists', json: true })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });

    it('POST /api/lists with error', function() {
      var requestBody = { name: 'favorite brunch spots' };
      return request({ url: baseURL + '/api/lists',
        method: 'post',
        json: true,
        headers: this.tokenHeader,
        body: requestBody,
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });
  });

  it('POST /api/lists', function() {
    var requestBody = { name: 'Best Coffee' };
    return request({
      url: baseURL + '/api/lists',
      method: 'post',
      headers: this.tokenHeader,
      json: true,
      body: requestBody,
    })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'Best Coffee', user_id: 1 });
    });
  });

  describe('when lists exist & are owned by authenticated user', function() {
    beforeEach(function() {
      return BPromise.bind(this)
      .then(function() { return helpers.createSomeLists.call(this); })
      .then(function() {
        this.list1.user = this.user;
        return this.list1.save();
      })
      .then(function() {
        this.list2.user = this.user;
        return this.list2.save();
      })
      .then(function() {
        this.list3.user = this.user;
        return this.list3.save();
      })
      .then(function() {
        this.list4.user = this.user;
        return this.list4.save();
      })
      .then(function() {
        this.list5.user = this.user;
        return this.list5.save();
      });
    });

    it('GET /api/lists with lists', function() {
      return BPromise.bind(this)
      .then(function() {
        return request({
          url: baseURL + '/api/lists',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ lists: _.map(this.lists, 'attrs') });
      });
    });

    it('DELETE /api/lists/3 with valid list and user', function() {
      return BPromise.bind(this)
      .then(function() {
        return request({
          url: baseURL + '/api/lists',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ lists: _.map(this.lists, 'attrs') });
      })
      .then(function() {
        return request({
          url: baseURL + '/api/lists/3',
          method: 'delete',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(body).to.eql({ status: 'OK' });
        expect(response.statusCode).to.eql(200);
      })
      .then(function() {
        return request({
          url: baseURL + '/api/lists',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({
          lists: [
            { id: 1, name: 'Coffee Shops', user_id: 1 },
            { id: 2, name: 'Sweet Treats', user_id: 1 },
            { id: 4, name: 'Bakeries', user_id: 1 },
            { id: 5, name: 'Healthy Food', user_id: 1 },
          ],
        });
      });
    });

    it('DELETE /api/lists/99 with invalid list', function() {
      return BPromise.bind(this)
      .then(function() {
        return request({
          url: baseURL + '/api/lists',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({ lists: _.map(this.lists, 'attrs') });
      })
      .then(function() {
        return request({
          url: baseURL + '/api/lists/99',
          method: 'delete',
          headers: this.tokenHeader,
          json: true,
        });
      })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(404);
        expect(body).to.eql({ message: 'not found' });
      });
    });
  });
});
