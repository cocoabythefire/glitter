'use strict';

exports.up = function(schema) {
  return schema.createTable('lists_places', function(table) {
    table.serial('id').primaryKey();
    table.integer('list_id').references('lists.id');
    table.integer('place_id').references('places.id');
  });
};

exports.down = function(schema) {
  return schema.dropTable('lists_places');
};