var _flash;

_flash = function(options) {
  var
    $flash,
    action = options.action,
    animate = options.animate,
    data = options.data,
    messages = options.messages,
    target = options.target,
    template = options.template,
    time = options.time,
    type = options.type;

  if (animate == null) animate = true;
  if (time == null) {
    if (animate)
      time = 6000;
    else
      time = 0;
  }
  if (action == null) action = 'appendTo';
  if (typeof messages == 'string') messages = [messages];

  if (template)
    $flash = $(template(data || {
      messages: messages,
      type: type
    }));
  else {
    if (typeof messages !== 'array') messages = [messages];

    var html = '<div class="alert-list">';
    for (key in messages) {
      var msg = messages[key];
      if (typeof msg !== 'array') msg = [msg];
      html += '<div class="alert alert-' + type + '">';
      if (options.close !== false)
        html += '<button class="close">&times;</button>';
      if ('' + parseInt(i) !== i) html += '<strong>' + key + '</strong>';
      html += msg;
      html += '</div>';
    };
    html += '</div>';
    $flash = $(html);
  };

  $flash.hide();
  if (action !== false) {
    $flash[action](target || '.popups');
    $flash[animate && 'slideDown' || 'show']().alert();
  };

  var remove = function(){
    $flash[animate && 'slideUp' || 'hide'](function(){
      $flash.remove();
    });
  };
  if (time) 
    setTimeout(function() {
      if ($flash.is(':visible'))
        remove();
    }, time);

  $flash.on('click', '.close', function(e){
    remove();
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  })
  return $flash;

};

window.flash = {};

var types = ['danger', 'info', 'warning', 'success'];
for (i in types) {
  // wrapped to preserve variable type
  (function(type){
    flash[type] = function(ob) {

      if (typeof ob == 'string') ob = { messages: ob };

      ob.type = type;
      _flash(ob);
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
