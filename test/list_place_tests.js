process.env.NODE_ENV = 'test';

var _ = require('lodash');
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
    .return().then(done).catch(done);
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
    .return().then(done).catch(done);
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
    .return().then(done).catch(done);
  });

  it('POST /api/lists/1/places with invalid place', function(done) {
    var requestBody = { id: '99' };
    request({ url: baseURL + '/api/lists/1/places', method: 'post', json: true, body: requestBody })
    .spread(function(response, body) {
     // expect(body).to.eql({});
    })
    .return().then(done).catch(done);
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
    .then(function() { return request({ url: baseURL + '/api/lists/1/places', json: true }); })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({
        places: [
          { id: 1, name: 'Alma Chocolates' }
        ]
      });
    })
    .return().then(done).catch(done);
  });

  it('DELETE /api/lists/1/places with invalid place', function(done) {
    var requestBody = { id: '99' };
    request({ url: baseURL + '/api/lists/1/places', method: 'delete', json: true, body: requestBody })
    .spread(function(response, body) {
      expect(response.statusCode).to.eql(500);
      //TODO: what should this error body be?
      // expect(body).to.eql({});
    })
    .return().then(done).catch(done);
  });

  it('DELETE /api/lists/1/places with valid place', function(done) {
    var list1 = List.create({
      name: 'list1'
    });
    var placeA = Place.create({
      name: 'Alma Chocolates'
    });
    var placeB = Place.create({
      name: 'Barista'
    });
    var baseRequest = {
      url: baseURL + '/api/lists/1/places',
      method: 'post',
      json: true,
    };
    var postRequest1 = _.extend({}, baseRequest, { body: { id: '1' } });
    var postRequest2 = _.extend({}, baseRequest, { body: { id: '2' } });
    var deleteRequest = _.extend({}, postRequest2, { method: 'delete' });
    var getRequest = _.extend({}, baseRequest, { method: 'get' });

    BPromise.resolve()
    .then(function() { return list1.save(); })
    .then(function() { return placeA.save(); })
    .then(function() { return placeB.save(); })
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
          { id: 1, name: 'Alma Chocolates' },
          { id: 2, name: 'Barista' }
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
          { id: 1, name: 'Alma Chocolates' }
        ]
      });
    })
    .return().then(done).catch(done);
  });
});
