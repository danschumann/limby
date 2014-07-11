module.exports = function(limby, models) {

  var
    File, Files,

    // Since converting gifs takes a long time, we only allow one at a time
    processing = false,
    queue = [],

    columns, instanceMethods, classMethods, options,

    extRegex   = /\.[^\.]*$/,
    defaultFileNamer = function(baseName) { return baseName; },
    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),

    baseName   = require('path').basename,
    join       = require('path').join,
    when       = require('when'),
    nodefn     = require('when/node/function');

  // Disable if they didn't configure a image resizing module to use
  if (
    !limby.config.imager ||
    !limby.config.imager.module ||
    !_.include(['canvas', 'imagemagick'], limby.config.imager.module)
  ) {
    var fallback = function(){ 
      throw new Error('You must set imager.module = (canvas|imagemagick) in config to use limby Files');
    } 
    // Alternative to `new fallback` is `fallback.forge()`, so stub that too.
    fallback.forge = fallback;
    return {
      File: fallback,
      Files: fallback,
    }
  }


  var im, Canvas, rsz, crp;

  var include = function(varName, module, erMsg) {
    try {
      eval(varName + " = require('imagemagick');");
    } catch (er) {
      throw new Error(erMsg);
    }

  };

  if (limby.config.imager.module == 'imagemagick') {

    console.log('loading IMAGE MAGICK');
    include('im', 'imagemagick',
      "Please `npm install imagemagick` in your main application directory, or unset config.imager.module");

    _.each(['identify', 'convert', 'resize'], function(fnName) {
      im[fnName] = nodefn.lift(_.bind(im[fnName], im));
      im[fnName].path = fnName; // BUGFIX: imagemagick depends on a string of what bash command to run
    })
    console.log('loading IMAGE MAGICK', im);

  } else if (limby.config.imager.module == 'canvas') {
    include('Canvas', 'canvas',
      "Please `npm install canvas` in your main application directory, or unset config.imager.module");
    include('rsz', 'rsz',
      "Please `npm install rsz` in your main application directory, since you are using config.imager.module = 'canvas'");
    include('crp', 'crp',
      "Please `npm install crp` in your main application directory, since you are using config.imager.module = 'canvas'");
  }

  instanceMethods = {

    tableName: 'limby_files',

    permittedAttributes: [
      'id',
      'parent_id',
      'parent_type',
      'path',
      'type',
    ],

    morphParents: [ ], // extend this in other files
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphParents));
    },

    validations: { },

    process: function() {

      processing = true;
      var file = this;

      return when().then(function(){
        if (file.get('type') == 'original')
          return im.identify(['-format', '%wx%h_', file.get('tmpPath')])

      })
      .then(function(output) {
        var args = [ file.get('tmpPath') ]
        if (file.get('type') !== 'preview') args.push('-coalesce');
        args.push(
          '-resize', output ? output.split('_')[0] : '248x300',
          join(limby.config.imager.directory, file.get('fName'))
        );

        return im.convert(args);
      })
      .then(function() {
        return file.save()
      })
      .otherwise(function(er) {
        console.log("Couldn't resize image. do you have ImageMagick installed?".red, er, er.stack);
      })
      .then(function(){
        processing = false;
      });

    },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  File = bookshelf.Model.extend(instanceMethods, classMethods);
  Files = bookshelf.Collection.extend({ model: File }, {

    // Async method that empties out queue
    tryProcessing: function(file) {

      if (file)
        queue.push(file);

      if (!processing && queue.length)
        queue.shift().process().then(function(){
          Files.tryProcessing();
        });

    },

    upload: function(opts) {

      var
        req = opts.req,
        key = opts.key || 'Please specify req.upload({key})',
        fileNamer = opts.fileNamer,
        parent = opts.parent;

      (opts.flash || function() { req.flash.info('Processing image'); })();

      fileNamer = fileNamer || defaultFileNamer;

      // Massage files into specific format
      req.files = req.files || {};
      req.files[key] = req.files[key] || [];
      if (!_.isArray(req.files[key]))
        req.files[key] = [req.files[key]];

      return when.map(req.files[key], function(file) {

        if (!file.size) return;
        var path = file.path;
        var fileName = fileNamer(file.originalFilename);

        var hex = baseName(path).replace(extRegex, '');
        var previewName = fileName.replace(extRegex, '-' + hex + '-preview$&')
        var avatarName = fileName.replace(extRegex, '-' + hex + '-avatar$&')
        var originalName = fileName.replace(extRegex, '-' + hex + '-original$&')

        // BUGFIX:
        // using sequence because my DB kept disconnecting only for this
        // This might not even fix it, just trying
        return require('when/sequence')(_.map([
          { fName: avatarName,
            type: 'avatar' }, 
          { fName: previewName,
            type: 'preview' }, 
          { fName: originalName,
            type: 'original' }, 
        ], function(ob){

          return limby.models.File.forge({
            path: '/uploads/' + ob.fName, // urlPath
            type: 'processing-' + ob.type,
            parent_type: parent.tableName,
            parent_id: parent.id,
          }).save().then(function(file){
            // Since this `file` will sit in queue(memory) until it compiles
            // we can set the type on it and save it later ( when the img is done )
            file.set({
              type: ob.type,
              tmpPath: path + (ob.type == 'preview' ? '[0]' : ''),
              fName: ob.fName,
              
            });

            Files.tryProcessing(file);
          });
        }));

      })
    },
    
  });
      
  return {File: File, Files: Files};

};
