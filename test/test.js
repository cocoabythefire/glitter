process.env.NODE_ENV = 'test';

var chai = require('chai');
var expect = chai.expect;
var request = require('request');

var app = require('../app');
var server;
var port = 93845;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');
var Place = db.model('place');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    db.query.delete('places').then(function() {
      return db.query.raw('ALTER SEQUENCE places_id_seq restart');
    })
    .then(function() { done(); }, done);
  });

  it('GET /api/places with no places', function(done) {
    request({ url: baseURL + '/api/places', json: true }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
      done();
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

    placeA.save()
    .then(function() { return placeB.save(); })
    .then(function() { return placeC.save(); })
    .then(function() {
      // TODO: promisify
      request({ url: baseURL + '/api/places', json: true }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(200);
        expect(body).to.eql({
          places: [
            { id: 1, name: 'pine state biscuits' },
            { id: 2, name: 'barista' },
            { id: 3, name: 'aviary' }
          ]
        });
        done();
      });
    });
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
