var 
  sep = require('path').sep,
  s   = sep == '\\' ? '\\\\' : sep
  ;

module.exports = {
  sepReg:           new RegExp(s, 'g'),
  firstSeparator:   new RegExp("^" + s),
  relativeWidgets:  new RegExp(".*widgets" + s),
  trimEXT:          /(\.ect$|\.ect.html$)/,
};
