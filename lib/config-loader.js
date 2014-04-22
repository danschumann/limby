var
  config,
  path        = require('path'),
  pm          = require('print-messages');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV == 'development')
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
      pm.crash(er, "Can't find config file");
    };

    limby.config = limby.config[process.env.NODE_ENV];

    if ( !limby.config )
      pm.crash('Environment(' + process.env.NODE_ENV + ') does not exist in config');

  }

  if (limby.config.limby) {
    limby.config.paths = limby.config.limby;
    delete limby.config.limby;
    pm.warn('You should change config.limby to config.paths');
  }

  limby.config.viewOptions = limby.config.viewOptions || {};

  limby.config.login = limby.config.login || {};
  limby.config.login.column = limby.config.login.column || 'username';

  limby.config.middleware = limby.config.middleware || {};

  if (!limby.config.paths)
    throw new Error('setup a config.paths in your config settings');

  limby.paths = limby.config.paths;

  if (!limby.paths.base)
    throw new Error("Must pass a base path to your project, that contains limby(node_modules), your views, limbs, etc ( i.e. {base: join(__dirname, '..') } ) ");

  if (limby.paths.module)
    pm.warn('You no longer need to set config.paths.module');

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
