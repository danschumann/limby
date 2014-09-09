require('colors');

var
  _        = require('underscore'),
  events   = require('events'),
  join     = require('path').join,
  express  = require('express'),
  loaddir  = require('loaddir');
 
require('./lib/mysql_date_format');

var Limby = function(root, options) {

  var limby = this;

  // We don't care if they call `Limby()` or `new Limby`
  if (!(limby instanceof Limby)) return new Limby(unformattedConfig);

  options = options || {};
  this.root = root;

  // passing knex allows you to use sqlite3 or unify connections to db
  this.knex = options.knex;
  options.configPath = options.configPath || join(root, 'config');

  events.EventEmitter.call(limby);

  require('./lib/config-loader')(limby, options.configPath);
  _.extend(loaddir, limby.config.loaddir);
  require('./lib/database')(limby);
  require('./lib/email')(limby);
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
