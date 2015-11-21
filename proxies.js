'use strict';

var httpProxy = require('http-proxy');

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
