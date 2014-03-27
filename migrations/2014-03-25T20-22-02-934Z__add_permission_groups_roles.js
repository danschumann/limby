module.exports = {

  title: 'create limby_permission_group_roles',

  up: function(limby) {
    
    return limby.schema.createTable('limby_permission_group_roles', function(table){
      table.increments('id').primary();
      table.integer('limby_permission_id').index();
      table.integer('limby_permission_group_id').index();
    });
    
  },

  down: function(limby) {

    return limby.schema.dropTable('limby_permission_group_roles')

  },

};
