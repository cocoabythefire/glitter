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
    .then(function() { done(); }, done);
  });

  it('GET /api/lists with no lists', function(done) {
    request({ url: baseURL + '/api/lists', json: true }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ lists: [] });
      done();
    });
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
      request({ url: baseURL + '/api/lists', json: true }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
    });

    it('POST /api/lists with error', function(done) {
      var requestBody = { name: 'favorite brunch spots' };
      request.post({ url: baseURL + '/api/lists', json: true, body: requestBody }, function (err, response, body) {
        expect(err).to.not.exist;
        expect(response.statusCode).to.eql(500);
        expect(body).to.eql({ error: 'unhandled error' });
        done();
      });
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
        lists: [
          { id: 1, name: 'romantic dinner spots' },
          { id: 2, name: 'sweet treats' },
          { id: 3, name: 'girly shops' }
        ]
      });
    })
    .then(done).catch(done);
  });

  it('POST /api/lists', function(done) {
    var requestBody = { name: 'best coffee' };
    request.post({ url: baseURL + '/api/lists', json: true, body: requestBody }, function (err, response, body) {
      expect(err).to.not.exist;
      expect(response.statusCode).to.eql(200);
      expect(body).to.eql({ id: 1, name: 'best coffee' });
      done();
    });

    // TODO: this uses promises instead of a callback. understand this code &
    // covert all callbacks in tests to promises.
    // var requestBody = { name: 'best coffee' };
    // request({
    //   url: baseURL + '/api/lists',
    //   method: 'post',
    //   json: true,
    //   body: requestBody
    // })
    // .spread(function (response, body) {
    //   expect(response.statusCode).to.eql(200);
    //   expect(body).to.eql({ id: 1, name: 'best coffee' });
    // })
    // .then(done).catch(done);
  });
});
