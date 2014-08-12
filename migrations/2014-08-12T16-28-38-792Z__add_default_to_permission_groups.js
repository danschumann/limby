module.exports = {

  title: '',

  up: function(limby) {
    
    return limby.schema.table('limby_permission_groups', function(table) {
      table.boolean('default');
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_permission_groups', function(table) {
      table.dropColumn('default');
    })

  },

};
