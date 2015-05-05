'use strict';

process.env.NODE_ENV = 'test';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var BPromise = require('bluebird');
var request = BPromise.promisify(require('request'));

var pg = require('pg');
var app = require('../app');
var server;
var port = 93845;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');
var User = db.model('user');
var Token = db.model('token');
var List = db.model('list');
var Place = db.model('place');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

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

    it('POST /api/users/signup with error', function() {
      var requestBody = { name: 'Brit McVillain' };
      return request({ url: baseURL + '/api/users/signup', method: 'post', json: true, body: requestBody })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });
  });

  it ('GET /api/profile with valid token', function () {
    var tokenHeader = { 'x-glitter-token' : 'def6789' };
    var userA = User.create({
      name: 'Whit McNasty'
    });
    var userB = User.create({
      name: 'Brit McNastier'
    });
    var tokenA = Token.create({
      value: 'abc1234'
    });
    var tokenB = Token.create({
      value: 'def6789'
    });
    return BPromise.resolve()
    .then(function() { return userA.save(); })
    .then(function() { return userB.save(); })
    .then(function() {
      tokenA.user = userA;
      return tokenA.save();
    })
    .then(function() {
      tokenB.user = userB;
      return tokenB.save();
    })
    .then(function() {
      return request({ url: baseURL + '/api/profile', headers: tokenHeader, json: true });
    })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 2, name: 'Brit McNastier' });
    });
  });

  it ('GET /api/profile with invalid token', function () {
    var tokenHeader = { 'x-glitter-token' : 'goofy123' };
    var userA = User.create({
      name: 'Whit McNasty'
    });
    var userB = User.create({
      name: 'Brit McNastier'
    });
    var tokenA = Token.create({
      value: 'abc1234'
    });
    var tokenB = Token.create({
      value: 'def6789'
    });
    return BPromise.resolve()
    .then(function() { return userA.save(); })
    .then(function() { return userB.save(); })
    .then(function() {
      tokenA.user = userA;
      return tokenA.save();
    })
    .then(function() {
      tokenB.user = userB;
      return tokenB.save();
    })
    .then(function() {
      return request({ url: baseURL + '/api/profile', headers: tokenHeader, json: true });
    })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(403);
      expect(body).to.eql({ message: 'invalid token' });
    });
  });

  it('POST /api/users/signup', function() {
    var requestBody = { name: 'Whit McNasty' };
    return request({ url: baseURL + '/api/users/signup', method: 'post', json: true, body: requestBody })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'Whit McNasty' });
    });
  });

// test adding a place to your own list (should work fine)
  it ('POST /api/lists/1/places with valid user', function() {
    var list1 = List.create({
      name: 'list1'
    });
    var list2 = List.create({
      name: 'list2'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });
    var userA = User.create({
      name: 'Whitney'
    });
    var userB = User.create({
      name: 'Brittany'
    });
    var tokenA = Token.create({
      value: 'abc1234'
    });
    var tokenB = Token.create({
      value: 'def6789'
    });

    var requestBody = { id: '1' };
    var tokenHeader = { 'x-glitter-token' : 'def6789' };

    return BPromise.resolve()
    .then(function() { return placeA.save(); })
    .then(function() { return userA.save(); })
    .then(function() { return userB.save(); })
    .then(function() {
      tokenA.user = userA;
      return tokenA.save();
    })
    .then(function() {
      tokenB.user = userB;
      return tokenB.save();
    })
    .then(function() {
      list1.user = userB;
      return list1.save();
    })
    .then(function() {
      list2.user = userA;
      return list2.save();
    })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', headers: tokenHeader, method: 'post', json: true, body: requestBody }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', json: true }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'Alma Chocolates' }
        ]
      });
    });
  });

// Adding a Place to someone else's List (should fail)
  it ('POST /api/lists/1/places to another user\'s list', function() {
    var list1 = List.create({
      name: 'list1'
    });
    var list2 = List.create({
      name: 'list2'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });
    var userA = User.create({
      name: 'Whitney'
    });
    var userB = User.create({
      name: 'Brittany'
    });
    var tokenA = Token.create({
      value: 'abc1234'
    });
    var tokenB = Token.create({
      value: 'def6789'
    });

    var requestBody = { id: '1' };
    var tokenHeader = { 'x-glitter-token' : 'abc1234' };

    return BPromise.resolve()
    .then(function() { return placeA.save(); })
    .then(function() { return userA.save(); })
    .then(function() { return userB.save(); })
    .then(function() {
      tokenA.user = userA;
      return tokenA.save();
    })
    .then(function() {
      tokenB.user = userB;
      return tokenB.save();
    })
    .then(function() {
      list1.user = userB;
      return list1.save();
    })
    .then(function() {
      list2.user = userA;
      return list2.save();
    })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', headers: tokenHeader, method: 'post', json: true, body: requestBody }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(403);
      expect(body).to.eql({
        status: "invalid action"
      });
    });
  });

  // Adding a Place to a List when not logged in (should fail)
  it ('POST /api/lists/1/places when not logged in', function() {
    var list1 = List.create({
      name: 'list1'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });
    var userA = User.create({
      name: 'Whitney'
    });

    var requestBody = { id: '1' };
    var tokenHeader = { 'x-glitter-token' : 'abc1234' };

    return BPromise.resolve()
    .then(function() { return placeA.save(); })
    .then(function() { return userA.save(); })
    .then(function() {
      list1.user = userA;
      return list1.save();
    })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', headers: tokenHeader, method: 'post', json: true, body: requestBody }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(401);
      expect(body).to.eql({
        status: "invalid user"
      });
    });
  });
});
