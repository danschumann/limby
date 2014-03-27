module.exports = function(limby, models) {

  var
    PermissionGroup, PermissionGroups,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),

    check      = bookshelf.check,
    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permission_groups',

    permittedAttributes: [
      'id',
      'name',
    ],

    permission_group_roles: function(){
      return this.hasMany(models.PermissionGroupRoles);
    },

    permission_group_users: function(){
      return this.hasMany(models.PermissionGroupUsers);
    },

    users: function(){
      return this.belongsToMany(models.Users).through(models.PermissionGroupUsers);
    },

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  PermissionGroup = bookshelf.Model.extend(instanceMethods, classMethods);
  PermissionGroups = bookshelf.Collection.extend({ model: PermissionGroup }, { });
      
  return {PermissionGroup: PermissionGroup, PermissionGroups: PermissionGroups};

};
