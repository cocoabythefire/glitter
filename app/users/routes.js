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
var secure = require('../middleware').auth;


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

// User Login - not secure request
api.post('/users/login', function (req, res) {
  var errorMessage = 'username and/or password incorrect';
  BPromise.bind({})
  .then(function() {
    this.username = req.body.username;
    this.password = req.body.password;
    return User.objects.where({name: this.username}).limit(1).fetchOne();
  })
  .then(function(theUser) {
    this.user = theUser;
    return bcrypt.compareAsync(this.password, theUser.passwordDigest);
  })
  .then(function(result) {
    if (!result) {
      throw _.extend(new Error(errorMessage), { status: 403 });
    }
    return Token.generateToken();
  })
  .then(function(token) {
    this.token = token;
    token.user = this.user;
    return token.save();
  })
  .then(function() {
    res.setHeader('x-glitter-token', this.token.value);
    res.send({ message: 'OK' });
  })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      throw _.extend(new Error(errorMessage), { status: 403 });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});


/**
 * Secure Routes
 */

// Get a User's Profile
api.get('/profile', secure, function (req, res) {
  res.send(_.omit(req.user.attrs, 'password_digest'));
});

// User Logout
api.delete('/users/logout', secure, function (req, res) {
  Token.deleteToken(req.headers['x-glitter-token']).then(function() {
    res.setHeader('x-glitter-token', '');
    res.send({ message: 'OK' });
  })
  .catch(handleError(res));
});


router.use('/api', api);

module.exports = router;
