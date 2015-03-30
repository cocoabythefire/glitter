var chai = require('chai');
var expect = chai.expect;
var request = require('request');

var app = require('../app');
var server;
var port = 93845;
var baseURL = 'http://localhost:' + port;

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  it('GET /api/places', function(done) {
    request({ url: baseURL + '/api/places', json: true }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ places: [] });
      done();
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

  it('POST /api/places with arbitrary names', function(done) {
    var requestBody = { name: 'pine state biscuits' };
    request.post({ url: baseURL + '/api/places', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'pine state biscuits' });
      done();
    });
  });
});
