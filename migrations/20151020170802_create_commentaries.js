'use strict';

exports.up = function(schema) {
  return schema.createTable('commentaries', function(table) {
    table.serial('id').primaryKey();
    table.integer('user_id').references('users.id');
    table.integer('place_id').references('places.id');
    table.string('headline');
    table.integer('rating');
    table.date('date_added');
  });
};

exports.down = function(schema) {
  return schema.dropTable('commentaries');
};
