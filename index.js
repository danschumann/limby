require('colors');

var
  _        = require('underscore'),
  events   = require('events'),
  sequence = require('when/sequence'),
  join     = require('path').join,
  express  = require('express'),
  loaddir  = require('loaddir');
 
require('./lib/mysql_date_format');

var Limby = function(root, options) {

  // We don't care if they call `Limby()` or `new Limby`
  if (!(this instanceof Limby)) return new Limby(root, options);

  this.startTime = new Date

  this.options = options = options || {};

  // application's __dirname
  this.root = root;

  // OPTIONAL: passing knex allows you to use sqlite3 or unify connections to db
  this.knex = options.knex;

  events.EventEmitter.call(this);

  require('./lib/config-loader')(this, options);

  _.extend(loaddir, this.config.loaddir);

  if (options.configOnly) return this;

  // So you can require limby without nesting your whole file
  if (this.config.namespace)
    Limby[this.config.namespace] = this;

  require('./lib/database')(this);
  require('./lib/email')(this);
  require('./lib/templates').wrap(this);

  this.app = express();

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
]);

// init limby in sequence
// limby.init('load', 'loadLimbs', function(){ /* custom */ }, 'route')
Limby.prototype.init = function() {

  var methods;

  // Args can be init([...]) or init(...)
  if (_.isArray(arguments[0])) methods = arguments[0];
  else methods = Array.prototype.slice.call(arguments);

  methods = _.map(methods, function(m) {
    if (_.isString(m)) return this[m].bind(this);
    return m.bind(this)
  }.bind(this))

  return sequence(methods);

};

Limby.prototype.ready = function(){
  console.log('Start Startup time', ((((new Date).getTime() - this.startTime.getTime())/1000).toFixed(1) + 's').green);
  this.emit('ready');
  return this;
};

Limby.prototype.migrate = function() {
  return this.models.Migrations.migrate();
};

module.exports = Limby;
