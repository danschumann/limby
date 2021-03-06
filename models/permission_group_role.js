module.exports = function(limby, models) {

  var
    PermissionGroupRole, PermissionGroupRoles,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permission_group_roles',

    permittedAttributes: [
      'id',
      'limby_permission_id',
      'limby_permission_group_id',
    ],

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  PermissionGroupRole = limby.Model.extend(instanceMethods, classMethods);
  PermissionGroupRoles = bookshelf.Collection.extend({ model: PermissionGroupRole }, { });
      
  return {PermissionGroupRole: PermissionGroupRole, PermissionGroupRoles: PermissionGroupRoles};

};
