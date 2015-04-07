'use strict';

exports.up = function(schema) {
  return schema.alterTable('lists', function(table) {
    table.integer('user_id').references('users.id');
  });
};

exports.down = function(schema) {
  return schema.alterTable('lists', function(table) {
    table.drop('user_id');
  });
};
