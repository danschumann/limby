module.exports = {

  title: '',

  up: function(limby) {
    
    /*
    // see knexjs.org for more migration options, or use your limby bookshelf models
    return limby.schema.createTable('create_table_example', function(table){
      table.increments('id').primary();
      table.integer('special').unique();
      table.integer('foreign_id').index();
      table.text('content');
    }).then(function(){
      console.log('created example table'.green);
    });
    // or
    return limby.schema.table('column_table_example', function(table) {
      table.boolean('col1');
    });
    */
    
  },

  down: function(limby) {

    /*
    return limby.schema.dropTable('create_table_example')
      .then(function(){
        console.log('dropped create_table_example'.red);
      });
    // or
    return limby.schema.table('column_table_example', function(table) {
      table.dropColumn('col1');
    })
    */

  },

};
