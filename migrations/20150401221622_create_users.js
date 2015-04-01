'use strict';

exports.up = function(schema) {
  return schema.createTable('users', function(table) {
    table.serial('id').primaryKey();
    table.string('name');
  });
};

exports.down = function(schema) {
  return schema.dropTable('users');
};
