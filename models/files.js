module.exports = function(limby, models) {

  var
    File, Files,
    debug = require('debug')('limby:models:file'),

    // Since converting gifs takes a long time, we only allow one at a time
    processing = false,
    queue = [],

    columns, instanceMethods, classMethods, options,
    sequence = require('when/sequence'),
    extRegex   = /\.[^\.]*$/,
    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    fs         = require('final-fs'),
    pm         = require('print-messages'),

    baseName   = require('path').basename,
    join       = require('path').join,
    path       = require('path'),
    when       = require('when'),
    nodefn     = require('when/node/function');

  var im, initted;

  // Massage config into resize config
  if (limby.config.imager.module && limby.imager) {

    // limby-resize expects {canvas: require('canvas')}, or {imagemagick: require('imagemagick')}
    var resizeConfig = {};
    resizeConfig[limby.config.imager.module] = limby.imager;

    var resizer = limby.resizer = require('limby-resize')(resizeConfig);

  }

  // Step 1 of upload
  var processFile = function(reqFile, opts) {

    debug('processFile', reqFile, opts)

    if (!reqFile.size) return;

    debug('has reqFile size');

    var path = reqFile.path;
    var fileName = reqFile.originalFilename;
    if (opts.fileNamer) fileName = opts.fileNamer(fileName);

    // When uploading it gets a random name
    var hash           = baseName(path).replace(extRegex, '');

    debug({fileName: fileName, hash: hash})

    var original;

    // insert `-preview` before extension
    var previewName   = fileName.replace(extRegex, '-' + hash + '-preview$&');
    var avatarName    = fileName.replace(extRegex, '-' + hash + '-avatar$&');
    var originalName  = fileName.replace(extRegex, '-' + hash + '-original$&');

    // BUGFIX:
    // using sequence because my DB kept disconnecting only for this
    return sequence(_.map([
      { fName: originalName,
        type: 'original' }, 
      { fName: avatarName,
        type: 'avatar' }, 
      { fName: previewName,
        type: 'preview' }, 
    ], function(ob) {

      return function() {

        debug('sequence', ob);

        var file = limby.models.File.forge({
          name: _.escape(reqFile.originalFilename),
          path: '/uploads/' + ob.fName, // urlPath
          type: 'processing-' + ob.type, // this is a temporary type. saved in db until real type is done
          parent_type: opts.parent.tableName,
          parent_id: opts.parent.id,
          width: opts.width,
          height: opts.height,
        });

        debug('sequence file', file.toJSON());

        // The thumbnails are parented to the original
        // this is where sequence comes in handy
        if (ob.type == 'original')
          original = file;
        else
          file.set({limby_files_id: original.id});

        return file.save().then(function() {

          debug('sequence file saved')

          var _path = path;

          // index page gets too noisy if gifs are animated.  take first frame only
          if (ob.type == 'preview' && resizer.config.imagemagick)
            _path += '[0]';

          file.set({
            // Since this `file` will sit in queue(memory) until it compiles
            // we can set the type on it and save it later ( when the img is done )
            type: ob.type,

            // Not saved to db, used by tryProcessing
            tmpPath: _path,
            fName: ob.fName,

          });

          Files.tryProcessing(file);
          return file;
        });
      };
    }));
  }

  instanceMethods = {

    tableName: 'limby_files',

    permittedAttributes: [
      'id',
      'name',
      'parent_id',
      'parent_type',
      'limby_files_id',
      'path',
      'type',
      'file_type',
    ],

    morphParents: [ ], // extend this in other files
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphParents));
    },

    validations: { },

    isImage: function() {
      return this.get('file_type') == 'image';
    },

    // Step 2 of upload
    process: function() {

      debug('process', this.toJSON());

      var file = this;

      // sets this application to busy
      // so we can only process one at a time
      processing = true;

      var options = {};
      if (file.get('type') !== 'original') {
        options.width = file.get('width') || 248;
        options.height = file.get('height') || 300;
      };

      options.destination = join(limby.config.imager.directory, file.get('fName'));

      var ext = path.extname(file.get('path')).substring(1).toLowerCase();
      var isImage;

      if ( _.include(['gif', 'png', 'jpg', 'jpeg'], ext) )
        file.set('file_type', 'image');

      return when().then(function() {
        if (file.get('type') == 'original') {

          debug('copy', file.get('tmpPath'), options);

          // Originals just get copied over ( trusted system )
          var read = fs.createReadStream(file.get('tmpPath'))
          var write = fs.createWriteStream(options.destination);
          read.pipe(write);
          var deferred = when.defer();
          write.on('error', function(err){
            deferred.reject(err)
          });
          write.on('close', function(){
            deferred.resolve()
          });

          return deferred.promise

        } else {

          if ( file.isImage() ) {

            debug('image resize')

            // applies only to imagemagick gifs
            if (file.get('type') !== 'preview') options.coalesce = true;

            if ( !resizer || !resizer.resize )
              throw new Error('You must initialize your resizer at limby.config.imager -- see config/example');

            return resizer.resize(file.get('tmpPath'), options).then(function() {
            })
            .otherwise(function(er) {
              console.log("Couldn't resize image. do you have " + limby.config.imager.module + " installed?".red, er, er.stack);
            });

          } else
            return file.set({path: '/images/file.png'}).save();

        };
      })
      .then(function() {
        // This instance has the actual values, but in the db, they reference 'processing image'
        // Now that the images exist, we can point to the actual paths by saving
        processing = false;
        return file.save()
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

    // Async method that empties out queue and kicks off processing
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
        key = opts.key || 'Please specify req.upload({key})';

      // Massage multiple/single files into one format
      req.files = req.files || {};
      req.files[key] = req.files[key] || [];
      if (!_.isArray(req.files[key]))
        req.files[key] = [req.files[key]];

      // They could have uploaded multple files
      return when.map(req.files[key], function(file){
        processFile(file, opts);
      })
      .otherwise(function(er){
        console.log('could not create files db objects'.red, er, er.stack);
      });
    },
    
  });
      
  return {File: File, Files: Files};

};
