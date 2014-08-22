module.exports = function(limby, models) {

  var
    PermissionUserRole, PermissionUserRoles,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    check      = bookshelf.check,
    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permission_user_roles',

    permittedAttributes: [
      'id',
      'limby_permission_id',
      'user_id',
    ],

    permission: function(){
      this.belongsTo(models.Permission);
    },

    user: function(){
      this.belongsTo(models.User);
    },

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  PermissionUserRole = limby.Model.extend(instanceMethods, classMethods);
  PermissionUserRoles = bookshelf.Collection.extend({ model: PermissionUserRole }, { });
      
  return {PermissionUserRole: PermissionUserRole, PermissionUserRoles: PermissionUserRoles};

};
