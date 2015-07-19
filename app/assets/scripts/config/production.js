var logo = require('./logo');
/*
 * App config for production.
 */
module.exports = {
  environment: 'production',
  consoleMessage: logo,
  baseURL: 'https://api.openaq.org/v1/'
};
