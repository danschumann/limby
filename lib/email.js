module.exports = function(limby){

  if (!limby.config.mail) return;

  var
    mailer,
    nodefn      = require('when/node/function'),
    _           = require('underscore'),
    nodemailer  = require('nodemailer');

  mailer = nodemailer.createTransport('SMTP', limby.config.mail);

  var email = nodefn.lift(_.bind(mailer.sendMail, mailer));
  if (limby.config.mail.override) {
    throw new Error('limby/lib/email override not set up yet');
    var queue = {};

    limby.email = function(options){
      if (!options.key)
        throw new Error('You have to set an options.key in your limby.email if you plan to override all emails.  ' +
          'This allows combining multiple emails into one. \n limby.email({to: \'....\', key: \'myKey\', ...})');

      var existing = debounces[key];
      if (existing)
        existing.addresses.push(options.to);

    };

    var emptyQueue = _.debounce(function(){
    }, 5000);

  } else
    limby.email = email;
};
