module.exports = function(limby, models) {

  var
    File, Files,
    debug = require('debug')('limby:models:file'),

    // Since converting gifs takes a long time, we only allow one at a time
    processing = false,
    queue = [],

    columns, instanceMethods, classMethods, options,

    extRegex   = /\.[^\.]*$/,
    defaultFileNamer = function(baseName) { return baseName; },
    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    fs         = require('final-fs'),
    pm         = require('print-messages'),

    thumbnail  = {
      width: 248,
      height: 300,
    },
    processFile,

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
      eval(varName + " = require('" + module + "');");
    } catch (er) {
      console.log(er, er.stack);
      throw new Error(erMsg);
    }

  };

  if (limby.config.imager.module == 'imagemagick') {

    if (!limby.imager)
      throw new Error("You must set limby.imager=require('imagemagick') to use the config.imager.module = 'canvas'");

    im = limby.imager;

    _.each(['identify', 'convert', 'resize'], function(fnName) {
      im[fnName] = nodefn.lift(_.bind(im[fnName], im));
      im[fnName].path = fnName; // BUGFIX: imagemagick depends on a string of what bash command to run
    })

    processFile = function(file) {

      return when().then(function() {
        if (file.get('type') == 'original')
          return im.identify(['-format', '%wx%h_', file.get('tmpPath')])
      })
      .then(function(output) {

        var args = [ file.get('tmpPath') ];
        if (file.get('type') !== 'preview') args.push('-coalesce');
        args.push(
          '-resize', output ? output.split('_')[0] : thumbnail.width + 'x' + thumbnail.height,
          join(limby.config.imager.directory, file.get('fName'))
        );

        return im.convert(args);

      });

    }

  } else if (limby.config.imager.module == 'canvas') {

    if (!limby.imager)
      throw new Error("You must set limby.imager=require('canvas') to use the config.imager.module = 'canvas'");

    Canvas = limby.imager;

    processFile = function(file) {

      var img;

      return fs.readFile(file.get('tmpPath'))
      .then(function(data) {
        img = new Canvas.Image;
        img.src = data;
      })
      .then(function() {

        var width = img.width, height = img.height;

        var canvas = new Canvas(width, height);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        var resizedCanvas;

        if (file.get('type') !== 'original') {
          var ratio = thumbnail.width / img.width;
          if (thumbnail.height / img.height < ratio)
            ratio = thumbnail.height / img.height;

          width *= ratio; height *= ratio;
          width = Math.floor(width);
          height = Math.floor(height);
          resizedCanvas = new Canvas(width, height);
          require('../lib/resize_image')(canvas, resizedCanvas);
        }

        var deferred = when.defer();
        (resizedCanvas || canvas).toBuffer(function(err, buf){
          return fs.writeFile(join(limby.config.imager.directory, file.get('fName')), buf)
            .then(deferred.resolve).otherwise(deferred.reject);
        });

        return deferred.promise;

      })
      .otherwise(function(er){
        console.log('error processing', er, er.stack);
      });

    }
  };

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

    process: function(){

      var file = this;

      // sets this application to busy
      processing = true;

      return processFile(file).then(function() {
        // This instance has the actual values, but in the db, they reference 'processing image'
        // Now that the images exist, we can point to the actual paths by saving
        return file.save()
      })
      .otherwise(function(er) {
        console.log("Couldn't resize image. do you have " + limby.config.imager.module + " installed?".red, er, er.stack);
      })
      .then(function() {
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

      debug('upload')

      var
        req = opts.req,
        key = opts.key || 'Please specify req.upload({key})',
        fileNamer = opts.fileNamer,
        parent = opts.parent;

      fileNamer = fileNamer || defaultFileNamer;

      // Massage files into specific format
      req.files = req.files || {};
      req.files[key] = req.files[key] || [];
      if (!_.isArray(req.files[key]))
        req.files[key] = [req.files[key]];

      return when.map(req.files[key], function(file) {
        debug('map files', file)

        if (!file.size) return;
        (opts.flash || function() {
          req.flash.info('Processing image');
          this.flash = function(){}; // reset so it only does it once
        })();

        var path = file.path;
        var fileName = fileNamer(file.originalFilename);

        var hex           = baseName(path).replace(extRegex, '');
        var previewName   = fileName.replace(extRegex, '-' + hex + '-preview$&');
        var avatarName    = fileName.replace(extRegex, '-' + hex + '-avatar$&');
        var originalName  = fileName.replace(extRegex, '-' + hex + '-original$&');

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

          return function(){
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
                tmpPath: path + (ob.type == 'preview' && im ? '[0]' : ''), // [0] takes first frame of gif
                fName: ob.fName,
                
              });

              Files.tryProcessing(file);
            });
          };
        }));

      })
      .otherwise(function(er){
        console.log('could not create files db objects'.red, er, er.stack);
      });
    },
    
  });
      
  return {File: File, Files: Files};

};
