'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');
var Token = require('../auth/models').Token;
var User = require('../users/models').User;

/**
 * Handles unexpected HTTP Response errors
 *
 * @param {http.Response} the response object.
 * @return {function(Error)} an error handler function.
 */
var handleError = function(res) {
  return function(e) {
    if (e.status) {
      res.status(e.status).send({ message: e.message });
    }
    else {
      res.status(500).send({ error: 'unhandled error' });
    }
  };
};

/**
 * Authentication Middleware
 *
 * @todo
 * @param {http.Request} req
 * @param {http.Response} res
 * @param {Function} next
 */
var auth = function(req, res, next) {
  var tokenValue = '';
  tokenValue = req.headers['x-glitter-token'];
  BPromise.bind({})
  .then(function() {
    return Token.objects.where({
      value: tokenValue,
    }).fetchOne();
  })
  .tap(function(token) { req.token = token; })
  .then(function(token) { return User.objects.find(token.userId); })
  .then(function(user) { req.user = user; })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      throw _.extend(new Error('invalid user'), { status: 401 });
    }
    else { throw e; }
  })
  .then(function() { next(); })
  .catch(handleError(res));

  // TODO: install real express error handling middleware
};

module.exports = {
  error: handleError,
  auth: auth,
};
