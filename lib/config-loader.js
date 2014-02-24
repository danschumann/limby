var
  config,
  pm          = require('print-messages');

module.exports = function(path){

  try {
    config = require(path);
  } catch (er) {
    pm.crash(er, "Can't find config file");
  };

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  config = config[process.env.NODE_ENV];

  if ( !config )
    pm.crash('Environment(' + process.env.NODE_ENV + ') does not exist in config');

  return config;
}
