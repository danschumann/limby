module.exports = function(limby){

  var
    bookshelf,
    config      = limby.config,
    argsToArray = function(args) { return Array.prototype.slice.call(args, 0) },
    _           = require('underscore'),
    Validator   = require('validator').Validator,
    Bookshelf   = require('bookshelf'),
    when        = require('when'),
    join        = require('path').join;

  // Bookshelf Init -- DB connect
  limby.bookshelf = bookshelf = Bookshelf.initialize(limby.config.bookshelf);
  limby.knex = bookshelf.knex;
  limby.schema = bookshelf.schema = limby.knex.schema;

  var
    validator = new Validator(),
    check = _.bind(validator.check, validator);

  // TODO: separate from main limby module
  if (!GLOBAL.limbyBin && config.ldap && config.ldap.enabled){
    // Add ldapAuthenticate method to bookshelf
    require('../lib/ldap')(limby);
  };

  bookshelf.Model = bookshelf.Model.extend({

    initialize: function () {

      if (_.isObject(this.mailers)) this._bindMailers();

      if (this.mapAttributes) {
        this.on('saving', function(model, attrs){
          _.each(this.mapAttributes, function(dbVal, modelVal){
            model.set(dbVal, model.get(modelVal));
          });
        });

        this.on('fetched', function(model, attrs){
          _.each(this.mapAttributes, function(dbVal, modelVal){
            model.set(modelVal, model.get(dbVal));
          });
        });
      }

      this.on('saving', this.sanitizeAttributes, this);
    },

    _bindMailers: function(){
      // We have instance.mailers.send_some_username(), that should have context of this instance

      // Don't overwrite prototype
      var mailers = this.mailers;
      // new mailers object or instances could get crossed
      this.mailers = {};

      var instance = this;
      _.each(mailers, function(method, name){
        instance.mailers[name] = _.bind(method, instance);
      });
    },

    sanitizeAttributes: function () {
       // Remove any properties which don't belong on the model
      this.attributes = this.pick(this.permittedAttributes);
    },

    // For easy access
    check: check,

    // Args: ([empty runs all validations]) or
    // ( 'key1', 'key2'.....'keyx') or
    // ([ 'key1', 'key2'.....'keyx' ])
    //
    // returns promise -- rejected if errors
    validate: function() {

      this._validate.apply(this, arguments);

      if (this.errored())
        return this.reject();
      else
        return when(this);
    },

    validateSync: function(){

      this._validate.apply(this, arguments);

      if (this.errored())
        return this.errors;
    },

    _validate: function(){
      var
        self = this;
        keys = arguments;

      // No args mean all validations
      if (!arguments[0])
        keys = _.keys(this.validations);

      else if (_.isArray(arguments[0]))
        keys = arguments[0];

      _.each(keys, function(key) {
        self.singleValidation(key, self.get(key));
      });

    },

    singleValidation: function(key, val) {

      try {
        this.validations[key].call(this, val);
      } catch (er) {
        this.error(key, er);
      };
      return this;
    },

    errored: function() {
      return _.size(this.errors) > 0;
    },

    reject: function(errors) {
      if (errors) this.error.apply(this, arguments); // could be multiple args

      return when.reject(this.errors);
    },

  }, {

    //
    // Class methods
    //

    firstOrCreate: function(options) {
      var self = this;

      return this.forge(options).fetch()
        .then(function(model) {
          if (!model || !model.id)
            return self.forge(options).save();
        })
    },

  });

  // Allow models to easily push errors   modelInstance.error('doh')
  // see lib/error for possible format of args
  bookshelf.Model.prototype.error = require('../lib/error')(null, 'errors');

  {bookshelf: bookshelf};
};
