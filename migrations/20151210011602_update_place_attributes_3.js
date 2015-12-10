'use strict';

exports.up = function(schema) {
  return schema.alterTable('places', function(table) {
    table.drop('google_place_id');
    table.string('google_place_id');
  });
};

exports.down = function(schema) {
  return schema.alterTable('places', function(table) {
    table.drop('google_place_id');
    table.integer('google_place_id');
  });
};
