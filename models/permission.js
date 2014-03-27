module.exports = function(limby, models) {

  var
    Permission, Permissions,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),

    check      = bookshelf.check,
    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permissions',

    permittedAttributes: [
      'id',
      'name',
      'seeded',
      'module',
    ],

    validations: { },

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
