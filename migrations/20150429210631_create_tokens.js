'use strict';

exports.up = function(schema) {
  return schema.createTable('tokens', function(table) {
    table.serial('id').primaryKey();
    table.string('value');
    table.integer('user_id').references('users.id');
  });
};

exports.down = function(schema) {
  return schema.dropTable('tokens');
};
