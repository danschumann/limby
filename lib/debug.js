// HACK: mask passwords in debugger
// We overwrite the server base prototype so that we can scrape for and hide password columns
module.exports = function(limby) {

  var _ = require('underscore');
  var maskColumns = [];

  var DBProto = require('bookshelf/node_modules/knex/clients/server/base').ServerBase.prototype;

  var findBind = /`[^`]*?` = \?/g;

  _.each(limby.config.maskColumns || ['password'], function(col){
    maskColumns.push( '`' + col + '` = ?' );
  });

  DBProto.debug = function(sql, bindings, connection, builder) {
    var
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
    console.log({sql: sql, bindings: printBindings});
  };
}
