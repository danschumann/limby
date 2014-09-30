var tableName = 'limby_permissions';

module.exports = {

  title: 'create description in ' + tableName,


  up: function(limby) {
    
    return limby.schema.table(tableName, function(table) {
      table.text('description');
    })

    .then(function(){
      console.log(('created description in ' + tableName).green);
    });
    
  },

  down: function(limby) {

    return limby.schema.table(tableName, function(table) {
      table.dropColumn('description');
    })

    .then(function(){
      console.log(('dropped description from ' + tableName).red);
    });

  },

};
