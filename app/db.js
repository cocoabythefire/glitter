'use strict';

var azul = require('azul');
var db = azul(require('./config').azul);

module.exports = db;
