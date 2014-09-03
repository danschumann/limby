var _ = require('underscore');

module.exports = function(limby, models) {
  var
    controller,
    PermissionGroup = models.PermissionGroup,
    when = require('when'),
    User = models.User;

  return controller = {

    edit: function(req, res, next) {

      if (req.body.name)
        req.body.name = _.escape(req.body.name);

      res.view('permission_groups/edit', {group: req.locals.permission_group, body: req.body});

    },

    load: function(req, res, next) {
      PermissionGroup
        .forge({id: req.params.group_id})
        .fetch()
        .then(function(pg){
          if (!pg) throw new Error;
          req.locals.permission_group = pg;
          next();
        })
        .otherwise(function(er) {
          req.flash.danger('Could not fetch that permission group');
          res.redirect(limby.baseURL + '/admin/permissions');
        });
    },

    update: function(req, res, next) {

      var
        group = req.locals.permission_group || PermissionGroup.forge(),
        isNew = !group.id;

      group.set({
        name: _.escape(req.body.name),
        default: req.body.default == 'on',
      }).validate()
      .then(function(){
        return group.save();
      })
      .then(function(group) {
        req.flash.success('Successfully ' + (isNew ? 'created' : 'edited') + ' group name');
        res.redirect(limby.baseURL + '/admin/permissions/groups/' + group.id);
      })
      .otherwise(function(er){
        if (!group.errored()) console.log('unknown error permission_groups', er, er.stack);
        req.flash.danger(group.errored() ? group.errors : 'Unknown Error');
        controller.edit(req, res, next);
      })
    },

    show: function(req, res, next) {

      var output = {};

      req.locals.permission_group
      .load([
        'permission_group_users',
        'permission_group_roles',
      ])
      .then(function(){

        output.group = req.locals.permission_group;
        return models.Users.forge().query(function(qb) {
          qb.orderBy('first_name');
          qb.orderBy('last_name');
          qb.where('deleted', null);
        }).fetch();
      })
      .then(function(users){
        output.users = users;
        return models.Permissions.forge().fetchOrderedWithParents()
      })
      .then(function(roles){
        output.roles = roles;
      })
      .then(function(){
        res.view('permission_groups/show', output);
      });

    },

    destroy: function(req, res, next) {
      req.locals.permission_group.destroy()
        .then(function(){
          req.flash.info(
            '<strong>' + req.locals.permission_group.get('name') + '<strong>' + 
            ' Destroyed permission group'
          );
          res.redirect(limby.baseURL + '/admin/permissions')
        })
        .otherwise(function(er) {
          console.log('uncaught error permission_groups destory'.red, er, er.stack);
          req.flash.danger('Unknown error while deleting');
          res.redirect(limby.baseURL + '/admin/permissions')
        });
    },

  };

};
