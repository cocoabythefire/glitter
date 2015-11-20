'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');
var express = require('express');
var bcrypt = BPromise.promisifyAll(require('bcrypt'));
var Token = require('../auth/models').Token;
var User = require('./models').User;
var handleError = require('../middleware').error;

var router = express.Router();
var api = express.Router();

// User Signup - not secure request
api.post('/users/signup', function (req, res) {
  BPromise.bind({})
  .then(function() { return Token.generateToken(); })
  .then(function(newToken) { this.newToken = newToken; })
  .then(function() { return bcrypt.genSaltAsync(); })
  .then(function(salt) { return bcrypt.hashAsync(req.body.password, salt); })
  .then(function(hash) { this.passwordDigest = hash; })
  .then(function() {
    var newUser = User.create({
      name: req.body.username,
      passwordDigest: this.passwordDigest
    });
    newUser.addToken(this.newToken);
    res.setHeader('x-glitter-token', this.newToken.value);
    return newUser.save();
  })
  .then(function(newUser) {
    res.send(_.omit(newUser.attrs, 'password_digest'));
  })
  .catch(handleError(res));
});

router.use('/api', api);

module.exports = router;
