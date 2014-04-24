var
  _ = require('underscore');
_.str = require('underscore.string');

module.exports = function() {

  var self = this;
  var m =  self._.map(['danger', 'success', 'warning', 'info'], function(type) {

    if (self._.size(self.req.session.flash[type])) {

      return '<div class="alert-list ' + type + '-alert-list" >' +  (
        self._.map(self.req.session.flash[type], function(messages, key) {
          var s = self._.map(messages, function(msg){
            return '<div class="alert alert-' + type + '">' +
              // parseInt(key) .... checks for '0' and '1'
              (key == 'base' || parseInt(key) + '' == key ? '' : '<strong>' + _.str.humanize(key) + '</strong> ') +
              msg +
            '</div>';
          }).join('\n');

          delete self.req.session.flash[type];
          return s;

        }).join('\n')) +
      '</div>';
    };
  }).join('\n');

  return m;
};
