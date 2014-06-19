module.exports = {

  title: '',

  up: function(limby) {
    
    /*
    // see knexjs.org for more migration options, or use your limby bookshelf models
    return limby.schema.createTable('example_table', function(table){
      table.increments('id').primary();
      table.integer('special').unique();
      table.integer('foreign_id').index();
      table.text('content');
    }).then(function(){
      console.log('created example_table'.green);
    });
    // or
    return limby.schema.table('example_table', function(table) {
      table.boolean('col1');
    });
    */
    
  },

  down: function(limby) {

    /*
    return limby.schema.dropTable('example_table')
      .then(function(){
        console.log('dropped example_table'.red);
      });
    // or
    return limby.schema.table('example_table', function(table) {
      table.dropColumn('col1');
    })
    */

  },

};
