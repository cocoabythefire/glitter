
var BPromise = require('bluebird');

var developRelationship = function(personA, personB) {
  if (personA === 'brit' && personB === 'whit') {
    return BPromise.resolve(personA + ' got married to ' + personB);
  }
  else if (personA === 'brit') {
    return BPromise.reject(new Error(personA + ' cannot marry ' + personB))
  }
};




developRelationship('brit', 'john')
.then(function(status) {
  console.log(status);

  return developRelationship('brit', 'whit');
})
.then(function(status) {
  console.log(status);
})
.catch(function(e) {
  console.log('oh no!');
  console.log(e);
});

