'use strict';

var db = require('../db');

var Commentary = db.model('commentary', {
  headline: db.attr(),
  rating: db.attr(),
  date_added: db.attr(),
  place: db.belongsTo(),
  user: db.belongsTo(),
});

module.exports = Commentary;
