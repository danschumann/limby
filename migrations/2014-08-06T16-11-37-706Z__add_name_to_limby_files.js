module.exports = {

  title: '',

  up: function(limby) {
    
    return limby.schema.table('limby_files', function(table) {
      table.string('name');
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_files', function(table) {
      table.dropColumn('name');
    });

  },

};
