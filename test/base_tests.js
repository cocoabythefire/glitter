'use strict';

var chai = require('chai');
var expect = chai.expect;
var BPromise = require('bluebird');
var request = BPromise.promisify(require('request'));

var app = require('../app');
var server;
var port = 54210;
var baseURL = 'http://localhost:' + port;

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  it('GET /', function() {
    return request({ url: baseURL + '/' })
    .spread(function(response/*, body*/) {
      expect(response.statusCode).to.eql(200);
    });
  });
});
