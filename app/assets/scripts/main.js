'use strict';

var config = require('./config');
require('./chart');

console.log.apply(console, config.consoleMessage);
if (config.environment === 'staging') {
  console.log('STAGING');
}
