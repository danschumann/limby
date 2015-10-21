module.exports = {

  title: 'populate permissions',

  up: function(limby) {
    var p1 = {
      name: 'admin/permissions',
      module: 'limby',
      seeded: true
    };
    var p2 = {
      name: 'admin/tags',
      module: 'limby',
      seeded: true
    };
    return limby.knex('limby_permissions').where(p1).then(function(res){
      if (!res[0]) return limby.knex('limby_permissions').insert(p1);
    })
    .then(function(){
      return limby.knex('limby_permissions').where(p2)
    }).then(function(res){
      if (!res[0]) return limby.knex('limby_permissions').insert(p2);
    });
    
  },

  down: function(limby) {

    return limby.knex('limby_permissions').where({name: 'admin/permissions', module: 'limby'}).del().then(function(){
      return limby.knex('limby_permissions').where({name: 'admin/tags', module: 'limby'}).del();
    })
  },

};
