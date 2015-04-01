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
var User = db.model('user');

describe('glitter', function() {
  before(function(done) { server = app.listen(port, done); });
  after(function(done) { server.close(done); });

  afterEach(function(done) {
    db.query.delete('users').then(function() {
      return db.query.raw('ALTER SEQUENCE users_id_seq restart');
    })
    .then(function() { done(); }, done);
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

    it('POST /api/users/signup with error', function(done) {
      var requestBody = { name: 'Brit McVillain' };
      request.post({ url: baseURL + '/api/users/signup', json: true, body: requestBody }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
    });
  });

  it('POST /api/users/signup', function(done) {
    var requestBody = { name: 'Whit McNasty' };
    request.post({ url: baseURL + '/api/users/signup', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'Whit McNasty' });
      done();
    });
  });
});
