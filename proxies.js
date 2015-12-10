'use strict';

var httpProxy = require('http-proxy');

// TODO: Delete this example when no longer needed
// https://maps.googleapis.com/maps/api/place/autocomplete/json?
//   input=Amoeba&
//   types=establishment&
//   location=37.76999,-122.44696&
//   radius=500&
//   key=API_KEY

var googleMapsProxy = httpProxy.createProxyServer({
  target: 'https://maps.googleapis.com/maps/api',
  changeOrigin: true,
});

googleMapsProxy.on('error', function(e) {
  console.log('Error proxying to Google Maps API');
  console.log(e);
});

module.exports = {
  googleMaps: googleMapsProxy,
};
