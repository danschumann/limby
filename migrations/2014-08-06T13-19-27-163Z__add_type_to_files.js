module.exports = {

  title: '',

  up: function(limby) {
    
    return limby.schema.table('limby_files', function(table) {
      table.string('file_type').index();
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_files', function(table) {
      table.dropColumn('file_type');
    });

  },

};
