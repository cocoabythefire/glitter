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
var List = db.model('list');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    db.query.delete('lists').then(function() {
      return db.query.raw('ALTER SEQUENCE lists_id_seq restart');
    })
    .return().then(done).catch(done);
  });

  it('GET /api/lists with no lists', function(done) {
    request({ url: baseURL + '/api/lists', json: true })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ lists: [] });
    })
    .return().then(done).catch(done);
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

    it('GET /api/lists with error', function(done) {
      request({ url: baseURL + '/api/lists', json: true })
      .spread(function(response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      })
      .return().then(done).catch(done);
    });

    it('POST /api/lists with error', function(done) {
      var requestBody = { name: 'favorite brunch spots' };
      request({ url: baseURL + '/api/lists', method: 'post', json: true, body: requestBody })
      .spread(function (response, body) {
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
      })
      .return().then(done).catch(done);
    });
  });

  it('GET /api/lists with lists', function(done) {
    var listA = List.create({
      name: 'romantic dinner spots'
    });
    var listB = List.create({
      name: 'sweet treats'
    });
    var listC = List.create({
      name: 'girly shops'
    });

    BPromise.resolve()
    .then(function() { return listA.save(); })
    .then(function() { return listB.save(); })
    .then(function() { return listC.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        //TODO: fix this user id null thing
        lists: [
          { id: 1, name: 'romantic dinner spots', user_id: null },
          { id: 2, name: 'sweet treats', user_id: null  },
          { id: 3, name: 'girly shops', user_id: null  }
        ]
      });
    })
    .return().then(done).catch(done);
  });

  it('POST /api/lists', function(done) {
    var requestBody = { name: 'best coffee' };
    request({ url: baseURL + '/api/lists', method: 'post', json: true, body: requestBody })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'best coffee' });
    })
    .return().then(done).catch(done);
  });

  it('DELETE /api/lists/3 with valid list', function(done) {
    var listA = List.create({
      name: 'romantic dinner spots'
    });
    var listB = List.create({
      name: 'sweet treats'
    });
    var listC = List.create({
      name: 'girly shops'
    });

    BPromise.resolve()
    .then(function() { return listA.save(); })
    .then(function() { return listB.save(); })
    .then(function() { return listC.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        //TODO: fix this user id null thing
        lists: [
          { id: 1, name: 'romantic dinner spots', user_id: null },
          { id: 2, name: 'sweet treats', user_id: null  },
          { id: 3, name: 'girly shops', user_id: null  }
        ]
      });
    })
    .then(function() { return request({ url: baseURL + '/api/lists/3', method: 'delete', json: true }); })
    .spread(function (response, body) {
      expect(body).to.eql({ status: "OK" });
      expect(response.statusCode).to.eql(200);
    })
    .then(function() { return request({ url: baseURL + '/api/lists', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        //TODO: fix this user id null thing
        lists: [
          { id: 1, name: 'romantic dinner spots', user_id: null },
          { id: 2, name: 'sweet treats', user_id: null  }
        ]
      });
    })
    .return().then(done).catch(done);
  });

  it('DELETE /api/lists/99 with invalid list', function(done) {
    var listA = List.create({
      name: 'romantic dinner spots'
    });
    var listB = List.create({
      name: 'sweet treats'
    });
    var listC = List.create({
      name: 'girly shops'
    });

    BPromise.resolve()
    .then(function() { return listA.save(); })
    .then(function() { return listB.save(); })
    .then(function() { return listC.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        //TODO: fix this user id null thing
        lists: [
          { id: 1, name: 'romantic dinner spots', user_id: null },
          { id: 2, name: 'sweet treats', user_id: null  },
          { id: 3, name: 'girly shops', user_id: null  }
        ]
      });
    })
    .then(function() { return request({ url: baseURL + '/api/lists/99', method: 'delete', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(404);
      //TODO: what should this be?
      // expect(body).to.eql({
      // });
    })
    .return().then(done).catch(done);
  });
});
