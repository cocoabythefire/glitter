'use strict';

var _ = require('lodash');
var env = process.env.NODE_ENV || 'development';
var config = require('./_' + env);
var defaults = require('./_default');

module.exports = _.defaultsDeep(defaults, config, {
  azul: require('../../azulfile')[env],
});
