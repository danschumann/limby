var _flash;

_flash = function(options) {
  var
    $flash,
    action = options.action,
    animate = options.animate,
    data = options.data,
    messages = options.messages,
    target = options.target,
    templates = options.templates,
    time = options.time,
    type = options.type;

  if (animate == null) animate = true;
  if (time == null) time = 6000;
  if (action == null) action = 'appendTo';
  if (_.isString(messages)) messages = [messages];

  $flash = $((templates || coffeecups).flash(data || {
    messages: messages,
    type: type
  })).hide();
  $flash[action](target || '.popups');
  $flash[animate && 'slideDown' || 'show']().alert();
  if (time) 
    setTimeout(function() {
      if ($flash.is(':visible'))
        $flash[animate && 'slideUp' || 'hide']();
    }, time);

};

window.flash = {};

var types = ['danger', 'info', 'warning', 'success'];
for (i in types) {
  // wrapped to preserve variable type
  (function(type){
    flash[type] = function(ob) {

      if (_.isString(ob)) ob = { messages: ob };

      _flash(_.extend(ob, { type: type }));
    };
  })(types[i]);
};

flash.loading = function(enabled) {

  if (typeof enabled == 'Number') {
    setTimeout(function() {
      flash.loading(false)
    }, enabled)
    enabled = true;
  };

  $('.flash-loading')[enabled ? 'show' : 'hide']()

};
