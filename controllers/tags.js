module.exports = function(limby, models) {

  var
    when = require('when'),
    bookshelf = limby.bookshelf,
    Tags  = limby.models.Tags;
    Tag   = limby.models.Tag;

  return {

    // Creating is done through occurrences and customer_requests
    index: function(req, res, next) {

      Tags.forge().fetch()
      .then(function(tags){
        return res.view('tags/index', {tags: tags});
      })

    },

    edit: function(req, res, next) {

      var users, tags;

      Tag.forge({id: req.params.tag_id }).fetch()
      .then(function(tag) {

        res.view('tags/edit', {
          tag: tag,
        });
      });

    },

    destroy: function(req, res, next) {

      var users, tag;

      Tag.forge({ id: req.params.tag_id }).fetch()
      .then(function(tag) {
        return tag.destroy();
      })
      .then(function() {
        req.notification('Deleted tag');
        res.redirect('/tags');
      });

    },

    update: function(req, res, next) {

      var users, tag;

      tag = Tag.forge({
        id: req.params.tag_id ? parseInt(req.params.tag_id) : undefined,
      });

      when().then(function(){
        if (tag.id)
          return tag.fetch();
      })
      .then(function() {
        tag.set({name: _.escape(req.body.name)});
        return tag.save();
      })
      .then(function() {
        req.notification(req.params.tag_id ? 'Updated tag' : 'Created tag');
        res.redirect('/tags');
      });

    },

    // Creating is done through occurrences and customer_requests
    destroy: function(req, res, next){

      Tag.forge({id: req.params.tag_id}).fetch()
      .then(function(tag){
        return tag.destroy();
      })
      .then(function(){
        res.redirect('back');
      });

    },

  };
};
