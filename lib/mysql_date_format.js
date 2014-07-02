var moment = require('moment');

module.exports = Date.prototype.toMysqlFormat = function() {
  return moment(arguments[0] || this).format('YYYY-MM-DDTHH:MM:SS');
};
