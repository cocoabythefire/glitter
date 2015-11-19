'use strict';

var azul = require('azul');

var env = process.env.NODE_ENV || 'development';
var config = require('../azulfile')[env];
var db = azul(config);

module.exports = db;
