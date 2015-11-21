'use strict';

var _ = require('lodash');
var db = require('../db');

var BPromise = require('bluebird');
var crypto = BPromise.promisifyAll(require('crypto'));

var Token = db.model('token', {
  value: db.attr(),
  user: db.belongsTo(),
});

Token.reopenClass({
  /**
   * Generate and save a new auth Token
   *
   * @return {Object.<Token>} a new Token object.
   */
  generateToken: function() {
    return crypto.randomBytesAsync(256).then(function(data) {
      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      var tokenValue = shasum.digest('hex');
      var newToken = Token.create({
        value: tokenValue,
      });
      return newToken.save();
    });
  },

  /**
   * Delete a Token
   *
   * @param {String} tokenValue The value of the token to delete.
   * @return {Promise} The result of saving the delete for the token.
   */
  deleteToken: function(tokenValue) {
    return BPromise.resolve()
    .then(function() {
      return Token.objects.where({ value: tokenValue }).limit(1).fetchOne();
    })
    .then(function(token) {
      token.delete();
      return token.save();
    })
    .catch(function(e) {
      if (e.code === 'NO_RESULTS_FOUND') {
        var errorMessage = 'could not logout: token is not a valid session';
        throw _.extend(new Error(errorMessage), { status: 401 });
      }
      else { throw e; }
    });
  },
});

module.exports = {
  Token: Token,
};
