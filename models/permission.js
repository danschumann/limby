module.exports = function(limby, models) {

  var
    Permission, Permissions,
    columns, instanceMethods, classMethods, options,

    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    when       = require('when'),

    nodefn     = require('when/node/function');

  instanceMethods = {

    tableName: 'limby_permissions',

    permittedAttributes: [
      'id',
      'name',
      'description',
      'seeded',
      'module',
      'parent_id',
      'parent_type',
    ],

    permission_group_roles: function(){
      return this.hasMany(limby.models.PermissionGroupRole);
    },

    permission_user_roles: function(){
      return this.hasMany(limby.models.PermissionUserRole);
    },

    validations: { },

    morphParents: [ limby.Model ], // extend this in other files
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphParents));
    },

  };

  classMethods = {
  };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  Permission = limby.Model.extend(instanceMethods, classMethods);
  Permissions = bookshelf.Collection.extend({

    model: Permission,

    loadParents: function() {
      var permissions = this;

      return when.map(permissions.models, function(p) {
        if (p.get('parent_type'))
          return p.load('parent');
      });
    },

    fetchOrderedWithParents: function() {

      var permissions = this;

      return permissions.query(function(qb){
        qb.orderBy('seeded', 'desc');
        qb.orderBy('name');
      }).fetch()
      .then(function(){
        return permissions.loadParents();
      })
      .then(function(){
        return permissions;
      });
    },
  }, { /* collection class methods */ });
      
  return {Permission: Permission, Permissions: Permissions};

};
