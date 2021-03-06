module.exports = {

  title: 'populate permissions',

  up: function(limby) {
    
    return limby.models.Permission.firstOrCreate({
      name: 'admin/super',
      module: 'limby',
      seeded: true
    });
    
  },

  down: function(limby) {

    return limby.models.Permission.forge({name: 'admin/permissions', module: 'limby'}).fetch()
      .then(function(perm) {
        if (perm)
          return perm.destroy();
      });
  },

};
