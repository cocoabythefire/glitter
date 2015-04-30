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

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    BPromise.resolve()
    .then (function () { return db.query.delete('tokens'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE tokens_id_seq restart');
    })
    .then (function() { return db.query.delete('users'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE users_id_seq restart');
    })
    .then(function() { done(); }).catch(done);
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

    it('POST /api/users/signup with error', function(done) {
      var requestBody = { name: 'Brit McVillain' };
      request.post({ url: baseURL + '/api/users/signup', json: true, body: requestBody }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
    });
  });

  it ('GET /api/profile with valid token', function (done) {
    var tokenHeader = { 'X-Glitter-Token' : 'def6789' };
    var userA = User.create({
      name: 'Whit McNasty'
    });
    var userB = User.create({
      name: 'Brit McNastier'
    });
    var tokenA = Token.create({
      value: 'abc1234',
      user_id: userA
    });
    var tokenB = Token.create({
      value: 'def6789',
      user: userB
    });
    BPromise.resolve()
    .then(function() { return userA.save(); })
    .then(function() { return userB.save(); })
    .then(function() { return tokenA.save(); })
    .then(function() { return tokenB.save(); })
    .then(function() { return request({ url: baseURL + '/api/profile', headers: tokenHeader, json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 2, name: 'Brit McNastier' });
    })
    .then(function() { done(); }).catch(done);
  });

  it('POST /api/users/signup', function(done) {
    var requestBody = { name: 'Whit McNasty' };
    request.post({ url: baseURL + '/api/users/signup', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'Whit McNasty' });
      done();
    });
  });
});
