'use strict';

var db = require('../db');

var User = db.model('user', {
  name: db.attr(),
  passwordDigest: db.attr(),
  lists: db.hasMany(),
  tokens: db.hasMany(),
  commentaries: db.hasMany(),
});

module.exports = {
  User: User,
};
