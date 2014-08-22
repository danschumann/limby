var
  _ = require('underscore');
_.str = require('underscore.string');

// Recursively digs through req.session.flash[danger|success|warning|info][...]
// prints bootstrap style alerts
module.exports = {
  wrap: function(limby){
    // No _.bind because `this` context is that of a template object
    limby.renderFlash = module.exports.renderFlash;
  },
  
  renderFlash: function() {

    var args = arguments;
    // `this` is a template object
    var opts = this;
    return m =  _.compact(_.map(['danger', 'success', 'warning', 'info'], function(type) {

      if (_.size(opts.req.session.flash[type])) {

        return _.map(args.length ? args : _.keys(opts.req.session.flash[type]), function(key) {

          var messages = opts.req.session.flash[type][key];

          if (args.length && !_.include(args, key)) return;

          var s = _.map(messages, function(msg){
            return '<div class="alert alert-' + type + '">' +
              '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + 
              // parseInt(key) .... checks for '0' and '1'
              (key == 'base' || parseInt(key) + '' == key ? '' : '<strong>' + _.str.humanize(key) + '</strong> ') +
              msg +
            '</div>';
          }).join('\n');

          delete opts.req.session.flash[type][key];
          return s;

        }).join('\n');
      };
    })).join('\n');
  },
};
