var
  config,
  _           = require('underscore');
  path        = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.DEBUG || process.env.NODE_ENV == 'development')
  require('when/monitor/console');

module.exports = function(limby, configPath) {

  if (!configPath)
    throw new Error('Must pass [config|configPath] to Limby, `new Limby(config)`');

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
      throw new Error('Environment(' + process.env.NODE_ENV + ') does not exist in config');

  }

  if (limby.config.limby) {
    limby.config.paths = limby.config.limby;
    delete limby.config.limby;
    console.log('You should change config.limby to config.paths'.yellow);
  }

  // Passed to req.view('template')
  limby.config.viewOptions = limby.config.viewOptions || {};

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

  if (!limby.config.paths)
    throw new Error('setup a config.paths in your config settings');

  limby.paths = limby.config.paths;

  if (!limby.paths.base)
    throw new Error("Must pass a base path to your project, that contains limby(node_modules), your views, limbs, etc ( i.e. {base: join(__dirname, '..') } ) ");

  if (limby.paths.module)
    console.log('You no longer need to set config.paths.module'.yellow);

  limby.paths.module = path.join(__dirname, '..');
  limby.paths._module = path.relative(limby.paths.base, limby.paths.module);

  if (limby.paths.limbs)
    limby.paths._limbs = path.relative(limby.paths.base, limby.paths.limbs);
  else
    throw new Error('setup a config.limby.limbs path for your Limby modules');

  if (limby.paths.views)
    limby.paths._views = path.relative(limby.paths.base, limby.paths.views);

  if (limby.paths.core)
    limby.paths._core = path.relative(limby.paths.base, limby.paths.core);

}
