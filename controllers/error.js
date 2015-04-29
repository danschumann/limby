module.exports = function(limby, models){

  var
    _        = require('underscore');

  return function(err, req, res, next) {
    console.log('Server Error!'.red, err, err.stack);
    if (!(err instanceof Error)) err = new Error(err.toString());
    limby.email({
      to: limby.config.mail.webmaster,
      from: limby.config.mail.from,
      subject: limby.config.mail.errorSubject || 'Server Error',
      text: err.toString() + '\n' + err.stack,
      html: err.toString() + '<br />' + err.stack.toString().replace(/\n/g, '<br />'),
    }).then(function(){
      if (limby.config.errorPage)
        res.view(limby.config.errorPage || 'error');
      else
        limby.render(limby.viewPath('error'), function(err, html) {
          res.send(html);
        });
    });
  };
};
