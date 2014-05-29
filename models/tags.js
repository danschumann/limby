module.exports = function(limby, models) {

  var
    Tag, Tags,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
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

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  Tag = bookshelf.Model.extend(instanceMethods, classMethods);
  Tags = bookshelf.Collection.extend({ model: Tag }, {
  });
      
  return {Tag: Tag, Tags: Tags};

};
