var
  _ = require('underscore');

// creates a way to add errors to something
// parent may be req.session, error key may be errors
// then you add errors to req.session.errors.someKey = ['in array format', '2nd error']
module.exports = function(parent, errorKey) {

  // possible args
  // (string message) // key == base
  // (array messages) // key == base
  // (string key, string)
  // (string key, array)
  // (object)
  return function(key, messages) {

    if ( !(parent || this)[errorKey] ) 
      (parent || this)[errorKey] = {};

    if ( !messages ) {
      messages = key;
      key = null;
    };

    key = key || 'base';

    return _error.call(parent || this, key, messages);
  };

  // Iterator / recursive
  function _error(key, messages) {

    var self = this;

    if (!messages)
      messages = "We've errored and we can't get up.  ( Not sure what the problem is )";

    // We know how to handle strings and only strings
    if (_.isString(messages)) {
      self[errorKey][key] = self[errorKey][key] || [];
      self[errorKey][key].push(messages);
    }

    // For every other type, we end up calling _error again
    // because it could be recursive -- eventually we'll have a string
    
    // Only errors should have .message -- i.e. -- new Error('asdf')
    else if (messages.message && messages.stack)
      _error.call(self, key, messages.message);

    else if (_.isArray(messages))
      _.each(messages, function(err) {
        _error.call(self, key, err);
      });

    else if (_.isObject(messages))
      _.each(messages, function(err, _key) {
        _error.call(self, _key, err);
      });

    else
      console.log('Unhandled error type!'.red, arguments);

  };

};
