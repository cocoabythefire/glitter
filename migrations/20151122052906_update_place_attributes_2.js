'use strict';

exports.up = function(schema) {
  return schema.alterTable('places', function(table) {
    table.drop('type');
    table.string('types');
    table.bool('temporary').notNull().default('false');
  });
};

exports.down = function(schema) {
  return schema.alterTable('places', function(table) {
    table.string('type');
    table.drop('types');
    table.drop('temporary');
  });
};
