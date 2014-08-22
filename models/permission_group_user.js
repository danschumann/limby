module.exports = function(limby, models) {

  var
    PermissionGroupUser, PermissionGroupUsers,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permission_group_users',

    permittedAttributes: [
      'id',
      'limby_permission_group_id',
      'user_id',
    ],

    user: function(){
      return this.belongsTo(models.User);
    },

    permission_group: function(){
      return this.belongsTo(models.PermissionGroup);
    },

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  PermissionGroupUser = limby.Model.extend(instanceMethods, classMethods);
  PermissionGroupUsers = bookshelf.Collection.extend({ model: PermissionGroupUser }, { });
      
  return {PermissionGroupUser: PermissionGroupUser, PermissionGroupUsers: PermissionGroupUsers};

};
