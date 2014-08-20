var tableName = 'example_table';

module.exports = {

  title: 'create [col1 in ]' + tableName,


  up: function(limby) {
    
    /*
    // see knexjs.org for more migration options, or use your limby bookshelf models
    return limby.schema.createTable(tableName, function(table){
      table.increments('id').primary();
      table.integer('special').unique();
      table.integer('foreign_id').index();
      table.text('content');
    })
    // or
    return limby.schema.table(tableName, function(table) {
      table.boolean('col1');
    })

    .then(function(){
      console.log(('created [col1 in ]' + tableName).green);
    });
    */
    
  },

  down: function(limby) {

    /*
    return limby.schema.dropTable(tableName)
    // or
    return limby.schema.table(tableName, function(table) {
      table.dropColumn('col1');
    })

    .then(function(){
      console.log(('dropped [col1 from ]' + tableName).red);
    });
    */

  },

};
