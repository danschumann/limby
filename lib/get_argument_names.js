var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

module.exports = function getParamNames(method) {

  var methodString = method.toString().replace(STRIP_COMMENTS, '');

  var result = methodString.slice(methodString.indexOf('(')+1, methodString.indexOf(')')).match(/([^\s,]+)/g);

  if(result === null) result = [];

  return result;
}
