module.exports = {

  title: 'Create tags table',

  up: function(data) {

    return data.schema.createTable('limby_tags', function(table){
      table.increments('id').primary();
      table.string('name').index();
    }).then(function() {
      console.log('created limby_tags'.green);
    })
    .then(function(){
      return data.schema.createTable('limby_taggings', function(table){
        table.increments('id').primary();
        table.integer('limby_tag_id').index();
        table.integer('parent_id').index();
        table.string('parent_type').index();
      });
    }).then(function() {
      console.log('created limby_tags'.green);
    });

  },

  down: function(data) {

    return data.schema.dropTable('limby_taggings')
    .then(function() {
      return data.schema.dropTable('limby_tags');
    })
    .then(function() {
      console.log('dropped limby_tags and taggings'.red);
    });

  },

};
