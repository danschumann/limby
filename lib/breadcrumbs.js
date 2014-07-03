var _s = require('underscore.string');

module.exports = function(overrideAll, crumbs) {
  // this == template ob from limby.view
  var self = this

  // Single arg
  if (_.isObject(overrideAll)) {
    crumbs = overrideAll;
    overrideAll = false;
  };

  var limb = this.limby.limbs[this.req._limby.key];

  // First key
  var defaults = {
    '': 'Home',
  }

  // Second key
  if (this.req._limby.key !== 'core')
    defaults[this.req._limby.key] = limb.config && limb.config.breadcrumb || _s.titleize(_s.humanize(this.req._limby.key));

  if (!overrideAll)
    crumbs = _.extend(defaults, crumbs);

  var url = '';
  var keys = _.keys(crumbs);

  return '<ol class="breadcrumb">' +
    _.map(keys, function(_url, n) {
      var title = crumbs[_url];
      url += _url + '/';
      if (n == keys.length - 1)
        return '<li class="active">' + title + '</li>';
      else
        return '<li><a href="' + self.baseURL + url + '">' + title + '</a></li>';
    }).join('') +
  '</ol>';

};
