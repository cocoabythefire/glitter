'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');
var express = require('express');
var Place = require('../places/models').Place;
var List = require('./models').List;
var handleError = require('../middleware').error;

var router = express.Router();
var api = express.Router();
var secureAPI = express.Router();
secureAPI.use(require('../middleware').auth);

// Get all Lists for a specific User
secureAPI.get('/lists', function (req, res) {
  var query = List.objects
    .where({ user: req.user })
    .order('id')
    .limit(100);
  query.fetch().then(function(lists) {
    res.send({ lists: _.map(lists, 'attrs') });
  })
  .catch(handleError(res));
});

// Get a single list for a specific User
secureAPI.get('/lists/:id', function (req, res) {
  BPromise.bind({})
  .then(function() {
    var query = List.objects
    .where({ 'id' : req.params.id });
    return query.limit(1).fetchOne();
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    var query = Place.objects
    .where({ 'lists.id': req.params.id });
    return query.fetch();
  })
  .then(function(places) {
    res.send({ list: this.list, places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Get the Places for a specific List for a specific User
secureAPI.get('/lists/:id/places', function (req, res) {
  var query = Place.objects
  .where({ 'lists.user':req.user })
  .where({ 'lists.id': req.params.id });
  query.fetch().then(function(places) {
    res.send({ places: _.map(places, 'attrs') });
  })
  .catch(handleError(res));
});

// Create a new List
secureAPI.post('/lists', function (req, res) {
  var newList = List.create({
    name: req.body.name,
    user: req.user
  });
  newList.save().then(function() {
    res.send(newList.attrs);
  })
  .catch(handleError(res));
});

// Create a Place and Add to a List
secureAPI.post('/lists/:id/places/', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() {
    if (req.body.placeName) {
      return Place.objects.findOrCreate({name: req.body.placeName});
    } else {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function(place) {
    return this.list.addPlace(place);
  })
  .then(function() { res.send({ status: "OK" }); })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Add an Existing Place to a List
secureAPI.post('/lists/:id/places/:pid', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(list) { this.list = list; })
  .then(function() {
    if(this.list.userId !== req.user.id) {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function() {
    if (req.params.pid) {
      return Place.objects.find(req.params.pid);
    } else {
      throw _.extend(new Error('invalid action'), { status: 403 });
    }
  })
  .then(function(place) {
    return this.list.addPlace(place);
  })
  .then(function() { res.send({ status: "OK" }); })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Delete a List
secureAPI.delete('/lists/:id', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return List.objects.find(req.params.id);
  })
  .then(function(listToDelete) {
    this.list = listToDelete;
    this.list.clearPlaces();
    return this.list.save();
  })
  .then(function() {
    this.list.delete();
    return this.list.save();
  })
  .then(function() {
    res.send({ status: "OK" });
   })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});

// Remove a Place from a List
secureAPI.delete('/lists/:listId/places/:placeId', function (req, res) {
  BPromise.bind({})
  .then(function() {
    return Place.objects.find(req.params.placeId);
  })
  .then(function(place) {
    this.place = place;
    return List.objects.find(req.params.listId);
  })
  .then(function(list) {
    list.removePlace(this.place);
    return list.save();
  })
  .then(function() {
    res.send({ status: "OK" });
   })
  .catch(function(e) {
    if (e.code === 'NO_RESULTS_FOUND') {
      res.status(404).send({ message: 'not found' });
    }
    else { throw e; }
  })
  .catch(handleError(res));
});


router.use('/api', api);
router.use('/api', secureAPI);

module.exports = router;
