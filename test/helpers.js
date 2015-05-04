'use strict';

process.env.NODE_ENV = 'test';

var BPromise = require('bluebird');
var app = require('../app');
var db = app.get('db');
var Token = db.model('token');
var User = db.model('user');
var Place = db.model('place');
var List = db.model('list');

var assign = function(propertyName) {
  return function(result) {
    this[propertyName] = result;
  };
};

module.exports.createAuthenticatedUser = function(name) {
  var user = User.create({ name: name });
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
