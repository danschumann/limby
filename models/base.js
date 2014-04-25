module.exports = function(limby) {

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

  bookshelf.Model = bookshelf.Model.extend({

    initialize: function () {

      this.errors = {};

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

      var
        self = this;
        keys = arguments;

      // No args mean all validations
      if (!arguments[0])
        keys = _.keys(this.validations);

      else if (_.isArray(arguments[0]))
        keys = arguments[0];

      // Settle runs all validations even if some are rejected
      return when.settle(_.map(keys, function(key) {
        return self.singleValidation(key, self.get(key));
      }))
      .then(function(){
        if (self.errored()) return self.reject();
      })
      ;

    },

    // These are arrays that match `validations`
    // Used mainly for pages like editAccount that can have widgets add attributes to the form
    validationBatches: {
      //editAccount: ['first_name', 'last_name']
    },

    // Applies several validations from named sets
    validateBatch: function(setName) {
      return this.validate.apply(this, this.validationBatches[setName]);
    },

    singleValidation: function(key, val) {

      var self = this;

      var v;
      try {
        v = self.validations[key].call(self, val);
      } catch (er) {
        self.error(key, er)
      };

      // To use your own key, call this.error('mykey', '...') inside of the validation
      // and return when.reject(null)
      return when(v).otherwise(function(er){
        if (er) self.error(key, er);
      });

    },

    errored: function() {
      return _.size(this.errors) > 0;
    },

    // Allow models to easily push errors   modelInstance.error('doh')
    // see lib/error for possible format of args
    error: require('../lib/error')(null, 'errors'),

    reject: function(errors) {

      // They're adding errors as they reject
      if (errors)
        this.error.apply(this, arguments); 

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

  {bookshelf: bookshelf};

};
