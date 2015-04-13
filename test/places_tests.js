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
var Place = db.model('place');
var List = db.model('list');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    BPromise.resolve()
    .then(function() { return db.query.delete('places'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE places_id_seq restart');
    })
    .then(function() { return db.query.delete('lists'); })
    .then(function() {
      return db.query.raw('ALTER SEQUENCE lists_id_seq restart');
    })
    .then(function() { done(); }).catch(done);
  });

  it('GET /api/places with no places', function(done) {
    request({ url: baseURL + '/api/places', json: true }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
      done();
    });
  });

  it('GET /api/lists/1/places with no places', function(done) {
    var listA = List.create({
      name: 'London Hot List'
    });

    BPromise.resolve()
    .then(function() { return listA.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', json: true }); })
    .spread(function (response, body) {
      // expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
    })
    .then(done).catch(done);
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

    it('GET /api/places with error', function(done) {
      request({ url: baseURL + '/api/places', json: true }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
    });

    it('POST /api/places with error', function(done) {
      var requestBody = { name: 'salt and straw' };
      request.post({ url: baseURL + '/api/places', json: true, body: requestBody }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
    });
  });

  it('GET /api/places with places', function(done) {
    var placeA = Place.create({
      name: 'pine state biscuits'
    });
    var placeB = Place.create({
      name: 'barista'
    });
    var placeC = Place.create({
      name: 'aviary'
    });

    BPromise.resolve()
    .then(function() { return placeA.save(); })
    .then(function() { return placeB.save(); })
    .then(function() { return placeC.save(); })
    .then(function() { return request({ url: baseURL + '/api/places', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'pine state biscuits' },
          { id: 2, name: 'barista' },
          { id: 3, name: 'aviary' }
        ]
      });
    })
    .then(function() { done(); }).catch(done);
  });

  it('POST /api/places', function(done) {
    var requestBody = { name: 'salt and straw' };
    request.post({ url: baseURL + '/api/places', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'salt and straw' });
      done();
    });
  });
});
