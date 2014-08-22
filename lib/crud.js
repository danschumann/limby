// TODO: this
module.exports = {
  action: function(options) {
    var limby = this;

    switch(options.type) {
      case 'index':
        return function(req, res, next){
          var col = options.collection.forge();

          // TODO: col.query(method) Query options
          col.fetch().then(function(results){
            res.view(options.view || 'actionable/index', {results: results});
          })
        };
        break;
    };

  },

};
