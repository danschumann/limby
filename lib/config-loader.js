var
  config,
  pm          = require('print-messages');

module.exports = function(limby, path) {

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  if (!path)
    throw new Error('Must pass [config|configPath] to Limby, `new Limby(config)`');

  if (_.isObject(path))
    limby.config = path;
  else {

    try {
      limby.config = require(path);
    } catch (er) {
      pm.crash(er, "Can't find config file");
    };

    limby.config = limby.config[process.env.NODE_ENV];

    if ( !limby.config )
      pm.crash('Environment(' + process.env.NODE_ENV + ') does not exist in config');

  }

  if (!limby.config.limby)
    throw new Error('setup a config.limby in your config settings');

  if (!limby.config.limby.base)
    throw new Error("Must pass a base path to your project, that contains limby(node_modules), your views, limbs, etc ( i.e. {base: join(__dirname, '..') } ) ");

  if (!limby.config.limby.module)
    throw new Error("Must pass a path to the limby module, relative to base, ( i.e. {module: join('node_modules/limby')");

  if (!limby.config.limby.limbs)
    throw new Error('setup a config.limby.limbs path for your Limby modules');

}
