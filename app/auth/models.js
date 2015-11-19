'use strict';

var db = require('../db');

var Token = db.model('token', {
  value: db.attr(),
  user: db.belongsTo()
});

module.exports = {
  Token: Token,
};
