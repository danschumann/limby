module.exports = function(limby, models) {

  var
    File, Files,
    columns, instanceMethods, classMethods, options,

    extRegex   = /\.[^\.]*$/,
    defaultFileNamer = function(baseName) { return baseName; },
    config     = limby.config,
    bookshelf  = limby.bookshelf,
    _          = require('underscore'),
    pm         = require('print-messages'),
    when       = require('when'),

    check      = bookshelf.check,
    papercut    = require('papercut'),
    nodefn     = require('when/node/function');

  papercut.configure(function(){
    _.each(limby.config.papercut, function(val, key) {
      papercut.set(key, val);
    });
  });

  // Papercut seems to like doing 1 image per instance of thumbnailer
  var ResizerDefault = papercut.Schema(function(schema){
    schema.version({
      name: 'avatar',
      size: '300x200',
      process: 'resize',
    });

    schema.version({
      name: 'original',
      process: 'copy',
    });
  });

  instanceMethods = {

    tableName: 'limby_files',

    permittedAttributes: [
      'id',
      'parent_id',
      'parent_type',
      'path',
      'type',
    ],

    morphModels: [ ], // extend this in other files
    parent: function() {
      return this.morphTo.apply(this, ['parent'].concat(this.morphModels));
    },

    validations: { },

  };

  classMethods = { };

  options = {
    instanceMethods: instanceMethods,
    classMethods: classMethods,
  };

  File = bookshelf.Model.extend(instanceMethods, classMethods);
  Files = bookshelf.Collection.extend({ model: File }, {

    upload: function(opts) {
      var
        req = opts.req,
        key = opts.key || 'Please specify req.upload({key})',
        Resizer = opts.resizer,
        fileNamer = opts.fileNamer,
        parent = opts.parent;

      fileNamer = fileNamer || defaultFileNamer;

      req.files = req.files || {};
      req.files[key] = req.files[key] || [];

      if (!_.isArray(req.files[key]))
        req.files[key] = [req.files[key]];

      pm.log('ham'.red, req.files[key]);
      return when.map(req.files[key], function(file) {
        var path = file.path;
        var fName = fileNamer(file.originalFilename.replace(extRegex, ''));

        resizerInstance = new ResizerDefault();

        return nodefn.call(_.bind(resizerInstance.process, resizerInstance), fName, path)

        .otherwise(function(er) {
          console.log("Couldn't resize image. do you have ImageMagick installed?".red, er);
        });
      })
      .then(function(images) {

        return when.map(images, function(imageSet) {
          return when.map(_.map(imageSet, function(url, type) {
            return limby.models.File.forge({
              path: url,
              type: type,
              parent_type: parent.tableName,
              parent_id: parent.id,
            }).save();
          }));
        });

      });
    },
    
  });
      
  return {File: File, Files: Files};

};
