module.exports = function(limby, models) {

  var
    controller,
    when = require('when'),
    bookshelf = limby.bookshelf,
    Tags  = limby.models.Tags;
    Tag   = limby.models.Tag;

  return controller = {

    // Creating is done through occurrences and customer_requests
    index: function(req, res, next) {

      Tags.forge().query(function(qb) {
        qb.orderBy('name');
      }).fetch()
      .then(function(tags){
        return res.view('tags/index', {tags: tags});
      })

    },

    edit: function(req, res, next) {

      var users, tags;
      if (req.body.name)
        req.body.name = _.escape(req.body.name)

      Tag.forge({id: req.params.tag_id }).fetch()
      .then(function(tag) {
        res.view('tags/edit', {
          tag: tag,
          body: req.body,
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
        res.redirect(limby.baseURL + '/admin/tags');
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
        return tag.validate();
      })
      .then(function() {
        return tag.save();
      })
      .then(function() {
        req.notification(req.params.tag_id ? 'Updated tag' : 'Created tag');
        res.redirect(limby.baseURL + '/admin/tags');
      })
      .otherwise(function(er) {
        if ( !tag.errored() ) console.log('unknown error'.red, er, er.stack);
        req.flash.danger(tag.errored() ? tag.errors : 'Unknown Error')
        controller.edit(req, res, next);
      });

    },

  };
};
