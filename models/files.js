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

    baseName   = require('path').basename,
    join       = require('path').join,
    when       = require('when'),
    nodefn     = require('when/node/function');

  var im, initted;

  if (limby.config.imager.module && limby.imager) {
    var resizeConfig = {};
    resizeConfig[limby.config.imager.module] = limby.imager;
    var resizer = limby.resizer = require('limby-resize')(resizeConfig);
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

    process: function(){

      var file = this;

      // sets this application to busy
      processing = true;

      var options = {}
      if (file.get('type') !== 'original') {
        options.width = 248;
        options.height = 300;
      };

      // applies only to imagemagick gifs
      if (file.get('type') !== 'preview') options.coalesce = true;

      options.destination = join(limby.config.imager.directory, file.get('fName'));

      if ( !resizer || !resizer.resize )
        throw new Error('You must initialize your resizer at limby.config.imager -- see config/example');
      return resizer.resize(file.get('tmpPath'), options).then(function() {
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
              type: 'processing-' + ob.type, // this is a temporary type. saved in db until real type is done
              parent_type: parent.tableName,
              parent_id: parent.id,
            }).save().then(function(file){

              var _path = path;

              // index page gets too noisy if gifs are animated.  take first frame only
              if (ob.type == 'preview' && resizer.config.imagemagick)
                _path += '[0]'; 

              // Since this `file` will sit in queue(memory) until it compiles
              // we can set the type on it and save it later ( when the img is done )
              file.set({
                type: ob.type,
                tmpPath: _path,
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
