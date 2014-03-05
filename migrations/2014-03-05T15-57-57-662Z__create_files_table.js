module.exports = {

  title: 'Create files table',

  up: function(data) {

    console.log('up');
    return data.schema.createTable('limby_files', function(table){
      table.increments('id').primary();
      table.string('path');
      table.integer('parent_id');
      table.string('parent_type');
      table.string('type');
    }).then(function() {
      console.log('created whiteboard_occurrences'.green);
    });

  },

  down: function(data) {

    return data.schema.dropTable('limby_files')
    .then(function() {
      console.log('dropped occurrences'.red);
    });

  },
};
