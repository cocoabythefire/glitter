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
var User = db.model('user');
var Token = db.model('token');
var List = db.model('list');
var Place = db.model('place');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

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

  describe('when the db throws errors', function() {
    beforeEach(function() {
      sinon.stub(pg.Client.prototype, 'query', function() {
        throw new Error('Intentional test db error.');
      });
    });

    afterEach(function() {
      pg.Client.prototype.query.restore();
    });

    // unsuccessful user signup
    it('POST /api/users/signup with error', function() {
      var requestBody = { name: 'Brit McVillain' };
      return request({ url: baseURL + '/api/users/signup', method: 'post', json: true, body: requestBody })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      });
    });
  });

  // successful user signup
  describe('POST /api/users/signup', function() {
    var response, body, token;
    beforeEach(function() {
      var requestBody = { username: 'Whit McNasty', password: 'ocean2space4planet' };
      return request({ url: baseURL + '/api/users/signup', method: 'post', json: true, body: requestBody })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
      });
    });

    it('results in 200', function() {
      expect(response.statusCode).to.eql(200);
    });

    it('has id 1', function() {
      expect(body.id).to.eql(1);
    });

    it('stores correct name', function() {
      expect(body.name).to.eql('Whit McNasty');
    });

    it('stores user in db', function() {
      return BPromise.resolve()
      .then(function() {
        return User.objects.find(1);
      })
      .then(function(user) {
        expect(user).to.exist;
      })
    });

    it('does not store password in db', function() {
      return BPromise.resolve()
      .then(function() {
        return User.objects.find(1);
      })
      .then(function(user) {
        expect(_.values(user.attrs))
          .to.not.contain('ocean2space4planet');
      })
    });

    it('includes id and name in body', function() {
      expect(body).to.have.keys('id', 'name');
    });

    it('gives a token in response headers', function() {
      expect(response.headers).to.have.property('x-glitter-token')
        .that.exist.and.has.length(40);
    });
  });

  // unsuccessful user login wrong password
  describe('POST /api/users/login with wrong password', function() {
    var response, body, token;
    beforeEach(_.partial(helpers.createAuthenticatedUser, 'Brit Tiger'));
    beforeEach(function() {
      var requestBody = { username: 'Brit Tiger', password: 'oceans4theplanet' };
      return request({ url: baseURL + '/api/users/login', method: 'post', json: true, body: requestBody })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
      });
    });

    it('results in 403', function() {
      expect(response.statusCode).to.eql(403);
    });

    it('has the right error message', function() {
      expect(body).to.eql({ message: 'username and/or password incorrect' });
    });
  });

  // unsuccessful user login wrong username
  describe('POST /api/users/login with wrong username', function() {
    var response, body, token;
    beforeEach(_.partial(helpers.createAuthenticatedUser, 'Brit Tiger'));
    beforeEach(function() {
      var requestBody = { username: 'Whit IsWrong', password: 'ocean2space4planet' };
      return request({ url: baseURL + '/api/users/login', method: 'post', json: true, body: requestBody })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
      });
    });

    it('results in 403', function() {
      expect(response.statusCode).to.eql(403);
    });

    it('has the right error message', function() {
      expect(body).to.eql({ message: 'username and/or password incorrect' });
    });
  });

  // successful user login
  describe('POST /api/users/login', function() {
    var response, body, token;
    beforeEach(_.partial(helpers.createAuthenticatedUser, 'Brit Lion'));
    beforeEach(function() {
      var requestBody = { username: 'Brit Lion', password: 'ocean2space4planet' };
      return request({ url: baseURL + '/api/users/login', method: 'post', json: true, body: requestBody })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
      });
    });

    it('results in 200', function() {
      expect(response.statusCode).to.eql(200);
    });

    it('has OK message', function() {
      expect(body).to.eql({ message:'OK' });
    });

    it('has valid token in headers', function() {
      expect(response.headers).to.have.property('x-glitter-token')
        .that.exist.and.has.length(40);
    });
  });

  // unsuccessful user logout with invalid token
  describe('POST /api/users/logout', function() {
    var response, body;
    beforeEach(_.partial(helpers.createAuthenticatedUser, 'Brit Bear'));
    beforeEach(function() {
      var tokenHeader = {'x-glitter-token': 'ihugbears'};
      return request({ url: baseURL + '/api/users/logout', method: 'delete', json: true, headers: tokenHeader })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
      });
    });
    it('results in 401', function() {
      expect(response.statusCode).to.eql(401);
    });

    it('has correct error message', function() {
      expect(body).to.eql({ message: 'invalid user' });
    });
  });

  // successful user logout
  describe('POST /api/users/logout', function() {
    var response, body, token;
    beforeEach(_.partial(helpers.createAuthenticatedUser, 'Brit OhMY'));
    beforeEach(function() {
      var tokenHeader = {'x-glitter-token': 'abc1234'};
      return request({ url: baseURL + '/api/users/logout', method: 'delete', json: true, headers: tokenHeader })
      .spread(function (_response, _body) {
        response = _response;
        body = _body;
        token = response.headers['x-glitter-token'];
      });
    });

    it('results in 200', function() {
      expect(response.statusCode).to.eql(200);
    });

    it('has correct error message', function() {
      expect(body).to.eql({ message: 'OK' });
    });

    it('has cleared the token from header', function() {
      expect(response.headers).to.have.property('x-glitter-token')
        .that.exist.and.has.length(0);
    });

    it('has cleared the token from the db', function() {
      return BPromise.resolve()
      .then(function() {
        return Token.objects.where({ value: token }).limit(1);
      })
      .then(function(tokenFound) {
        expect(tokenFound).to.eql([]);
      })
    });
  });
});
