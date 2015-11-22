'use strict';

var BPromise = require('bluebird');
var app = require('../app');
var db = app.get('db');
var Token = db.model('token');
var User = db.model('user');
var Place = db.model('place');
var List = db.model('list');
var Commentary = db.model('commentary');

var assign = function(propertyName) {
  return function(result) {
    this[propertyName] = result;
  };
};

module.exports.testPlaceResults = function() {
  return [
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 1,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Alma Chocolates',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 2,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Barista',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 3,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Coava Coffee',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 4,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Dunkin Donuts',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 5,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Eb & Bean',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 6,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Fire on the Mountain',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 7,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Girl and the Goat',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
    {
      address: null,
      country: null,
      google_place_id: null,
      icon_url: null,
      id: 8,
      intl_phone: null,
      locality: null,
      location: null,
      name: 'Hot Chocolate',
      neighborhood: null,
      phone: null,
      postal_code: null,
      temporary: false,
      timezone: null,
      types: null,
      website: null,
    },
  ];
};

module.exports.createAuthenticatedUser = function(name) {
  // password is `ocean2space4planet`
  var digest = '$2a$10$b7nBSJ4fw.l91aAx8vQ4FOGNzJ201ab6uny9jx12W9jW0Py2TaNdy';
  var user = User.create({ name: name, passwordDigest: digest });
  var token = Token.create({ value: 'abc1234' });

  return BPromise.resolve()
  .then(function() { return user.save(); })
  .then(function() {
    token.user = user;
    return token.save();
  })
  .return(user);
};

module.exports.createSomePlaces = function() {
  var placeA = this.placeA = Place.create({ name: 'Alma Chocolates' });
  var placeB = this.placeB = Place.create({ name: 'Barista' });
  var placeC = this.placeC = Place.create({ name: 'Coava Coffee' });
  var placeD = this.placeD = Place.create({ name: 'Dunkin Donuts' });
  var placeE = this.placeE = Place.create({ name: 'Eb & Bean' });
  var placeF = this.placeF = Place.create({ name: 'Fire on the Mountain' });
  var placeG = this.placeG = Place.create({ name: 'Girl and the Goat' });
  var placeH = this.placeH = Place.create({ name: 'Hot Chocolate' });

  return BPromise.bind(this)
  .then(function() { return placeA.save(); })
  .then(function() { return placeB.save(); })
  .then(function() { return placeC.save(); })
  .then(function() { return placeD.save(); })
  .then(function() { return placeE.save(); })
  .then(function() { return placeF.save(); })
  .then(function() { return placeG.save(); })
  .then(function() { return placeH.save(); })
  .return([placeA, placeB, placeC, placeD, placeE, placeF, placeG, placeH])
  .tap(assign('places'));
};

module.exports.createSomeLists = function() {
  var list1 = this.list1 = List.create({ name: 'Coffee Shops' });
  var list2 = this.list2 = List.create({ name: 'Sweet Treats' });
  var list3 = this.list3 = List.create({ name: 'Date Night' });
  var list4 = this.list4 = List.create({ name: 'Bakeries' });
  var list5 = this.list5 = List.create({ name: 'Healthy Food' });

  return BPromise.bind(this)
  .then(function() { return list1.save(); })
  .then(function() { return list2.save(); })
  .then(function() { return list3.save(); })
  .then(function() { return list4.save(); })
  .then(function() { return list5.save(); })
  .return([list1, list2, list3, list4, list5])
  .tap(assign('lists'));
};

module.exports.createSomeCommentary = function() {
  var commentary1 = this.commentary1 =
    Commentary.create({ headline: 'this place rocks!' });
  var commentary2 = this.commentary2 =
    Commentary.create({ headline: 'on the fence' });
  var commentary3 = this.commentary3 =
    Commentary.create({ headline: 'SO GOOD I could die' });
  var commentary4 = this.commentary4 =
    Commentary.create({ headline: 'Ok I will definitely be going back.' });
  var commentary5 = this.commentary5 =
    Commentary.create({ headline: 'this was so much fun!' });

  return BPromise.bind(this)
  .then(function() { return commentary1.save(); })
  .then(function() { return commentary2.save(); })
  .then(function() { return commentary3.save(); })
  .then(function() { return commentary4.save(); })
  .then(function() { return commentary5.save(); })
  .return([commentary1, commentary2, commentary3, commentary4, commentary5])
  .tap(assign('commentary'));
};
