module.exports = {

  title: 'add limby_permission_group_users',

  up: function(limby) {
    
    return limby.schema.createTable('limby_permission_group_users', function(table){
      table.increments('id').primary();
      table.integer('limby_permission_group_id').index();
      table.integer('user_id').index()
    });
  },

  down: function(limby) {

    return limby.schema.dropTable('limby_permission_group_users');

  },

};
