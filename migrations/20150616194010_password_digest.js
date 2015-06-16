'use strict';

exports.up = function(schema) {
  return schema.alterTable('users', function(table) {
    table.string('password_digest');
  });
};

exports.down = function(schema) {
  return schema.alterTable('users', function(table) {
    table.drop('password_digest');
  });
};
