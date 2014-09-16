// HACK: mask passwords in debugger
// We overwrite the server base prototype so that we can scrape for and hide password columns
module.exports = function(limby) {

  var _ = require('underscore');
  var maskColumns = [];

  try {
    var DBProto = require('knex-dschumann/lib/runner').prototype;
  
    var findBind = /`[^`]*?` = \?/g;
  
    _.each(limby.config.maskColumns || ['password'], function(col){
      maskColumns.push( '`' + col + '` = ?' );
    });
  
    var _original = DBProto.debug;
    DBProto.debug = function(options) {

      try {
        var
          sql = options.sql,
          bindings = options.bindings,
          printBindings = [],
          bindingSql = sql.match(findBind) || [];
    
        // bindingSql == [ '`col1` = ?', '`col2` = ?' ]
    
        _.each(bindings, function(val, n) {
          if (_.include(maskColumns, bindingSql[n]))
            printBindings[n] = '***********'
          else
            printBindings[n] = bindings[n];
        });
    
        // We're also leaving out cid because for our purposes we don't care
        console.dir({sql: sql, bindings: printBindings});
  
      
      } catch (er) {
        // It's a hack, so if it fails, oh well
        console.log("SQL password-masker failed.. hopefully you weren't querying with sensitive data".yellow, __dirname, __filename);
        return _original.apply(this, arguments);
      }
    };
  } catch (e) {
    console.log('Could not init password masker'.yellow, e, e.stack);
  
  }
}
