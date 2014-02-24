module.exports = function(limby) {

  var _conf = limby.config.ldap;
  LdapAuth  = require('ldapauth-fork'),
  limby.ldapAuthenticate = function(user, pass, cb) {

    limby.ldap = new LdapAuth({
      url: 'ldap://' + _conf.host + ':' + _conf.port,
      adminDn: _conf.admin_user,
      adminPassword: _conf.admin_password,
      searchBase: _conf.base,
      searchFilter: 'sAMAccountName={{username}}',
    });

    limby.ldap.authenticate(user, pass, function() {
      limby.ldap.close(function(){})
      cb.apply(this, arguments);
    });

  };
};
