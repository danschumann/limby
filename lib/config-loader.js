var
  config,
  _    = require('underscore'),
  _lo  = require('lodash'),
  path = require('path'),
  fs   = require('fs'),
  join = path.join;

if (!process.env.NODE_ENV) {
  console.log('Loading default environment: '.yellow, 'development'.blue);
  process.env.NODE_ENV = 'development';
}

if (process.env.DEBUG || process.env.NODE_ENV == 'development')
  require('when/monitor/console');

module.exports = function(limby, options) {

  var configPath = options.config || join(limby.root, 'config');

  if (_.isObject(configPath))
    limby.config = configPath;
  else {

    try {
      limby.config = require(configPath);
    } catch (er) {
      console.log("error loading config".red, er, er.stack);
    };

    
    limby.config = limby.config[process.env.NODE_ENV];

    if ( !limby.config )
      throw new Error(
        'Environment(' + process.env.NODE_ENV + ') does not exist in config' + 
        ' -- did you forget an environment variable?'
      );

    try { 
      var defaults = require(join(configPath, 'defaults'));
      limby.config = _lo.merge({}, defaults, limby.config);
    } catch (er) { }

  }

  if (limby.config.debug === true || _.include(limby.config.debug, 'promises'))
    require('when/monitor/console');

  // Passed to req.view('template')
  limby.config.viewOptions = limby.config.viewOptions || {};

  // Used for nesting apps under apache, etc -- used by frontend for absolute URLs (ie '{{baseURL}}/home')
  limby.baseURL = limby.config.baseURL = limby.config.baseURL || '';

  // on signup post, what fields are allowed and what are validated?
  // signup: {
  //   attributes: ['first_name', 'last_name', 'email'],
  //   validate:   ['first_name', 'email'],
  // }
  limby.config.signup = limby.config.signup || {};
  limby.config.login = limby.config.login || {};
  limby.config.login.column = limby.config.login.column || 'email';

  limby.config.middleware = limby.config.middleware || {};

  require('./helpers/join').wrap(limby);

  setupPaths(limby);

};

function setupPaths(limby) {

  limby.paths = limby.config.paths || {};

  // limby.path._withUnderscore is local path
  limby.paths.module = path.join(__dirname, '..'); // absolute
  limby.paths._module = path.relative(limby.root, limby.paths.module); // local

  // {{root}}/core
  // {{root}}/core/limbs
  limby.paths.manifests = limby.paths.manifests || (limby.paths.manifests !== false && 'manifests');
  limby.paths.core      = limby.paths.core      || 'core';
  limby.paths.limbs     = limby.paths.limbs     || join(limby.paths.core, 'limbs');
  limby.paths.uploads   = limby.paths.uploads   || join(limby.paths.core, 'public/uploads');

  _.each(['manifests', 'core', 'limbs', 'uploads'], function(key) {
    if (!limby.paths[key]) return;

    // We move their config values into _local _variables
    if ( isRelative(limby.paths[key]) )
      limby.paths['_' + key] = limby.paths[key];
    else
      limby.paths['_' + key] = path.relative(limby.root, limby.paths[key]);

    limby.paths[key]  = join(limby.root, limby.paths['_' + key]);
  });

};

//   '/var/www/app'.split('/') == [ '', 'var', 'www', 'app' ]
function isRelative(p) {
  return !!p.split(path.sep)[0];
};
