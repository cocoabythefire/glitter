'use strict';

var db = require('../db');

var Commentary = db.model('commentary', {
  headline: db.attr(),
  rating: db.attr(),
  dateAdded: db.attr(),
  place: db.belongsTo(),
  user: db.belongsTo(),
});

module.exports = {
  Commentary: Commentary,
};
