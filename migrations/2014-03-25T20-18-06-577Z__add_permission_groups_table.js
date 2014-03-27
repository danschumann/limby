module.exports = {

  title: 'create limby_permission_groups',

  up: function(limby) {
    
    return limby.schema.createTable('limby_permission_groups', function(table){
      table.increments('id').primary();
      table.string('name').unique();
    });
    
  },

  down: function(limby) {

    return limby.schema.dropTable('limby_permission_groups')

  },

};
