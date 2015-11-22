process.env.NODE_ENV = 'test';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var azulLogger = require('azul-logger');
var db = require('../app/db');

if (process.env.DEBUG) {
  azulLogger(db.query);
}

chai.use(require('sinon-chai'));

global.expect = expect;
global.sinon = sinon;
