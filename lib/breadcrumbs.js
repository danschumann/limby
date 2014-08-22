var _s = require('underscore.string');

module.exports = function(overrideAll, crumbs) {
  // this == template ob from limby.view
  var self = this

  // Single arg
  if (_.isObject(overrideAll)) {
    crumbs = overrideAll;
    overrideAll = false;
  };

  var limb = this.limb;

  // First key
  var defaults = {
    '': 'Home',
  }

  //console.log(this, limb, this.locals.limb);

  // Second key
  if (this.req.locals.limbName !== 'core')
    defaults[this.req.locals.limbName] = limb.config && limb.config.breadcrumb || _s.titleize(_s.humanize(this.req.locals.limbName));

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
