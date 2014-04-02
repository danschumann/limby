module.exports = function(limby, models) {

  var
    Tagging, Taggings,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),

    check      = bookshelf.check,
    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_taggings',

    permittedAttributes: [
      'id',
      'limby_tag_id',
      'parent_id',
      'parent_type',
    ],

    tag: function() {
      return this.belongsTo(limby.models.Tag);
    },

    morphParents: [ ], // extend this in other tags
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphParents));
    },

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  Tagging = bookshelf.Model.extend(instanceMethods, classMethods);
  Taggings = bookshelf.Collection.extend({ model: Tagging }, { });
      
  return {Tagging: Tagging, Taggings: Taggings};

};
