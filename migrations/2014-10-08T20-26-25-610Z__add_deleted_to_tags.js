var tableName = 'limby_tags';

module.exports = {

  title: 'create deleted in ' + tableName,


  up: function(limby) {
    
    return limby.schema.table(tableName, function(table) {
      table.boolean('deleted').default(0);
    })

    .then(function(){
      console.log(('created deleted in ' + tableName).green);
    });
    
  },

  down: function(limby) {

    return limby.schema.table(tableName, function(table) {
      table.dropColumn('deleted');
    })

    .then(function(){
      console.log(('dropped deleted from ' + tableName).red);
    });

  },

};
