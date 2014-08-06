module.exports = {

  title: '',

  up: function(limby) {
    
    // adds a foreign key so files can have a parent file ( for thumbs )
    return limby.schema.table('limby_files', function(table) {
      table.integer('limby_files_id').index();
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_files', function(table) {
      table.dropColumn('limby_files_id');
    });

  },

};
