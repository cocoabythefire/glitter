'use strict';

var db = require('../db');

var List = db.model('list', {
  name: db.attr(),
  places: db.hasMany({ join: 'lists_places' }),
  user: db.belongsTo()
});

module.exports = {
  List: List,
};
