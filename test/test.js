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
});
