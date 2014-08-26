require('colors');

var

  sepReg   = require('./lib/regexes').sepReg,
  _        = require('underscore'),
  events   = require('events'),
  join     = require('path').join,
  express  = require('express'),
  loaddir  = require('loaddir'),
  debug    = require('debug')('limby:base'),

  x;
 
require('./lib/mysql_date_format');

var Limby = function(root, configPath) {

  var limby = this;

  // We don't care if they call `Limby()` or `new Limby`
  if (!(limby instanceof Limby)) return new Limby(unformattedConfig);

  this.root = root;
  configPath = configPath || join(root, 'config');
  events.EventEmitter.call(limby);
  require('./lib/config-loader')(limby, configPath);
  _.extend(loaddir, limby.config.loaddir);
  require('./lib/database')(limby);
  require('./lib/email')(limby);
  require('./lib/mask_passwords')(limby);
  require('./lib/render_flash').wrap(limby);
  require('./lib/templates').wrap(limby);

  limby.app = express();

  return this;

};

_.extend.apply(_, [
  Limby.prototype,

  // Helpers
  events.EventEmitter.prototype,

  // Process Flow
  require('./lib/load'),
  require('./lib/limbs'),
  require('./lib/route'),
  require('./lib/crud'),
])

Limby.prototype.migrate = function() {
  return this.models.Migrations.migrate();
};

module.exports = Limby;
