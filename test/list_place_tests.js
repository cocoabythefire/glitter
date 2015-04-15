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
var Place = db.model('place');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    BPromise.resolve()
    .then(function() { return db.query.delete('list_places'); })
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

  it('GET /api/lists/2/places with no places', function(done) {
    var list1 = List.create({
      name: 'list1'
    });
    var list2 = List.create({
      name: 'list2'
    });
    BPromise.resolve()
    .then(function() { return list1.save(); })
    .then(function() { return list2.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists/2/places', json: true }); })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
    })
    // TODO: fix done syntax to match everywhere
    .then(function() { done(); }).catch(done);
  });

  it('GET /api/lists/2/places with places', function(done) {
    var list1 = List.create({
      name: 'list1'
    });
    var list2 = List.create({
      name: 'list2'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });
    var placeB = Place.create({
      name: 'Barista'
    });
    var placeC = Place.create({
      name: 'Coava'
    });

    BPromise.resolve()
    .then(function() { return list1.save(); })
    .then(function() { return list2.save(); })
    .then(function() { return placeA.save(); })
    .then(function() { return placeB.save(); })
    .then(function() { return placeC.save(); })
    .then(function() { return list1.addPlaces(placeB); })
    .then(function() { return list2.addPlaces(placeA, placeC); })
    .then(function() { return request({ url: baseURL + '/api/lists/2/places', json: true }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'Alma Chocolates' },
          { id: 3, name: 'Coava' }
        ]
      });
    })
    .then(function() { done(); }).catch(done);
  });

  it('POST /api/lists/1/places with invalid place', function(done) {
    var requestBody = { id: '99' };
    request.post({ url: baseURL + '/api/lists/1/places', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(500);
      // expect(body).to.eql({});
      done();
    });
  });

  it('POST /api/lists/1/places with valid place', function(done) {
    var list1 = List.create({
      name: 'list1'
    });
    var list2 = List.create({
      name: 'list2'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });

    var requestBody = { id: '1' };

    BPromise.resolve()
    .then(function() { return list1.save(); })
    .then(function() { return list2.save(); })
    .then(function() { return placeA.save(); })
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', method: 'post', json: true, body: requestBody }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        status: "OK"
      });
    })
    // TODO: check to see that the api call actually did what you want
    .then(function() { done(); }).catch(done);
  });
});
