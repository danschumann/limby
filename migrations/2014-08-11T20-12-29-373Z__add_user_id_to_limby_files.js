module.exports = {

  title: '',

  up: function(limby) {
    
    return limby.schema.table('limby_files', function(table) {
      table.integer('user_id').index();
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_files', function(table) {
      table.dropColumn('user_id');
    })

  },

};
