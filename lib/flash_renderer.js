var
  _ = require('underscore');
_.str = require('underscore.string');

// Recursively digs through req.session.flash[danger|success|warning|info][...]
// prints bootstrap style alerts
module.exports = function() {

  var args = arguments;
  var self = this;
  return m =  _.compact(_.map(['danger', 'success', 'warning', 'info'], function(type) {

    if (_.size(self.req.session.flash[type])) {

      return _.map(args.length ? args : _.keys(self.req.session.flash[type]), function(key) {

        var messages = self.req.session.flash[type][key];

        if (args.length && !_.include(args, key)) return;

        var s = _.map(messages, function(msg){
          return '<div class="alert alert-' + type + '">' +
            // parseInt(key) .... checks for '0' and '1'
            (key == 'base' || parseInt(key) + '' == key ? '' : '<strong>' + _.str.humanize(key) + '</strong> ') +
            msg +
          '</div>';
        }).join('\n');

        delete self.req.session.flash[type][key];
        return s;

      }).join('\n');
    };
  })).join('\n');
};
