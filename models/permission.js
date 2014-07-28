module.exports = function(limby, models) {

  var
    Permission, Permissions,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permissions',

    permittedAttributes: [
      'id',
      'name',
      'seeded',
      'module',
      'parent_id',
      'parent_type',
    ],

    validations: { },

    morphParents: [ limby.bookshelf.Model ], // extend this in other files
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphParents));
    },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  Permission = bookshelf.Model.extend(instanceMethods, classMethods);
  Permissions = bookshelf.Collection.extend({ model: Permission }, { });
      
  return {Permission: Permission, Permissions: Permissions};

};
