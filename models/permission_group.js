module.exports = function(limby, models) {

  var
    PermissionGroup, PermissionGroups,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permission_groups',

    permittedAttributes: [
      'id',
      'name',
      'default',
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

    validations: {
      name: function(val) {
        if (!this.validator.isLength(val || '', 2, 45))
          return when.reject('Must be between 2 and 45 characters');
      },
    },

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
