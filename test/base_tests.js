'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var BPromise = require('bluebird');
var request = BPromise.promisify(require('request'));

var pg = require('pg');
var app = require('../app');
var server;
var port = 54210;
var baseURL = 'http://localhost:' + port;

var db = app.get('db');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  it('GET /', function() {
    return request({ url: baseURL + '/' })
    .spread(function (response, body) {
      expect(response.statusCode).to.eql(200);
    });
  });
});