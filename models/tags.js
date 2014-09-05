module.exports = function(limby, models) {

  var
    Tag, Tags,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_tags',

    permittedAttributes: [
      'id',
      'name',
    ],

    taggings: function(){
      return this.hasMany(limby.models.Taggings);
    },

    validations: {
      name: function(val) {
        if (!this.validator.isLength(val || '', 2, 45))
          return when.reject('Must be between 2 and 45 characters');

        var tag = this;

        return Tag.forge({name: val}).fetch().then(function(t) {
          if (t && t.id && t.id != tag.id) {
            // add errors to `email` key
            tag.error('name', 'Already taken');
            // and use a blank `unique_email` key
            return when.reject();
          };
        });
      },
    },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  Tag = limby.Model.extend(instanceMethods, classMethods);
  Tags = bookshelf.Collection.extend({ model: Tag }, { });
      
  return {Tag: Tag, Tags: Tags};

};
