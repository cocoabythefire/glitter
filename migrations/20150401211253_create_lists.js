'use strict';

exports.up = function(schema) {
    return schema.createTable('lists', function(table) {
    table.serial('id').primaryKey();
    table.string('name');
  });
};

exports.down = function(schema) {
  return schema.dropTable('lists');
};
