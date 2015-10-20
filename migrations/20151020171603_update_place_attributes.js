'use strict';

exports.up = function(schema) {
  return schema.alterTable('places', function(table) {
    table.integer('google_place_id');
    table.string('location');
    table.string('icon_url');
    table.string('address');
    table.string('phone');
    table.string('intl_phone');
    table.string('locality');
    table.string('neighborhood');
    table.string('country');
    table.string('postal_code');
    table.string('timezone');
    table.string('website');
    table.string('type');
  });
};

exports.down = function(schema) {
  return schema.alterTable('places', function(table) {
    table.drop('google_place_id');
    table.drop('location');
    table.drop('icon_url');
    table.drop('address');
    table.drop('phone');
    table.drop('intl_phone');
    table.drop('locality');
    table.drop('neighborhood');
    table.drop('country');
    table.drop('postal_code');
    table.drop('timezone');
    table.drop('website');
    table.drop('type');
  });
};
