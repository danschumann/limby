module.exports = {

  title: 'add limby_permission_user_roles',

  up: function(limby) {
    
    return limby.schema.createTable('limby_permission_user_roles', function(table){
      table.increments('id').primary();
      table.integer('limby_permission_id').index();
      table.integer('user_id').index()
    });
  },

  down: function(limby) {

    return limby.schema.dropTable('limby_permission_user_roles');

  },

};
