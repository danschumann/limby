module.exports = {

  title: 'create limby_permissions',

  up: function(limby) {
    
    return limby.schema.createTable('limby_permissions', function(table){
      table.increments('id').primary();
      table.string('name').index();
      table.string('module');
      table.unique(['name', 'module']);
      table.boolean('seeded').index();
    }).then(function(){
      console.log('created limby_permissions table'.green);
    });
    
  },

  down: function(limby) {

    return limby.schema.dropTable('limby_permissions')
      .then(function(){
        console.log('dropped limby_permissions'.red);
      });

  }

}
