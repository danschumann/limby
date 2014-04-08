module.exports = {

  title: '',

  up: function(limby) {

    return limby.schema.table('limby_permissions', function(table) {
      table.integer('parent_id');
      table.string('parent_type');
    });
    
  },

  down: function(limby) {

    return limby.schema.table('limby_permissions', function(table) {
      table.dropColumn('parent_id');
      table.dropColumn('parent_type');
    });

  },

};
