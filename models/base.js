module.exports = function(limby){
  var
    config    = limby.config,
    bookshelf,
    _         = require('underscore'),
    Validator = require('validator').Validator,
    Bookshelf = require('bookshelf'),
    when      = require('when'),
    join      = require('path').join;

  // Bookshelf Init -- Used primarily for migrations
  limby.bookshelf = bookshelf = Bookshelf.initialize(limby.config.bookshelf);

  limby.knex = bookshelf.knex;
  limby.validator = bookshelf.validator = new Validator();
  limby.check = bookshelf.check = _.bind(limby.validator.check, limby.validator);
  limby.schema = bookshelf.schema = limby.knex.schema;

  if (!GLOBAL.limbyBin && config.ldap && config.ldap.enabled){
    // Add ldapAuthenticate method to bookshelf
    require('../lib/ldap')(limby);
  };

  bookshelf.Model = bookshelf.Model.extend({

    initialize: function () {

      if (_.isObject(this.mailers)) this.bindMailers();

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

    bindMailers: function(){
      // We have instance.mailers.send_some_username(), that should have context instance
      
      // Don't overwrite prototype
      var mailers = this.mailers;
      this.mailers = {};

      var instance = this;
      _.each(mailers, function(method, name){
        instance.mailers[name] = _.bind(method, instance);
      });
    },

    sanitizeAttributes: function () {
       // Remove any properties which don't belong on the post model
      this.attributes = this.pick(this.permittedAttributes);
    },

    validate: function(){
      var instance = this;
      _.each(_.keys(instance.validations), _.bind(instance.check, instance))

      return this;
    },

    check: function(key) {
      // Runs a validation and adds errors to an instance errors method
      this.errors = this.errors || {};
      try {
        this.validations[key].call(this, this.get(key));
      } catch (er) {
        this.newError(key, er);
      };

      return this;
    },

    newError: function(key, er) {
      if ( _.isString(er) ) er = new Error(er);
      this.errors = this.errors || {};
      this.errors[key] = this.errors[key] || [];
      this.errors[key].push(er);
      return this;
    },

    hasError: function() {
      return _.size(this.errors) > 0;
    },

    reject: function(options) {
      return when.reject(options || this.errors);
    },

  }, {
    
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
