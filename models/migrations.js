var

  Migration, Migrations,

  tableName = 'migrations',

  debug     = require('debug')('limby:migrations'),

  when      = require('when'),
  keys      = require('when/keys'),
  sequence  = require('when/sequence'),
  path      = require('path'),
  basename  = require('path').basename,
  join      = require('path').join,
  _         = require('underscore'),
  fs        = require('final-fs'),
  pm        = require('print-messages');

module.exports = function(limby) {

  var bookshelf = limby.bookshelf;

  Migration   = bookshelf.Model.extend({

    tableName: tableName,

    permittedAttributes: [
      'id',
      'filename',
      'limb',
    ],

    rollback: function() {

      var filePath;

      // Native limby migrations
      if (this.get('limb') == 'limby')
        filePath = join(__dirname, '..', 'migrations', this.get('filename'));

      // Base level application migrations
      else if (this.get('limb') == 'core')
        filePath = join(limby.paths.core, 'migrations', this.get('filename'));

      // Individual limb migrations
      else
        filePath = join(
          limby.paths.limbs,
          this.get('limb'),
          'migrations',
          this.get('filename')
        );

      return function(){
        return Migration.run(filePath, 'down');
      };
    },
    
  }, {

    run: function(filePath, direction) {

      var
        migration = require(filePath),
        fileName = basename(filePath),

        // for consoling
        pretty_direction = (direction == 'up' ? 'up'.green : 'down'.red),

        // In case it fails
        undoMigration = function(){

          // If we migrate successfully, but fail to save in migrations table
          // we have to undo the migration manually since it can't be in a transaction
          return migration[direction == 'up' ? 'down' : 'up'](bookshelf)
            .then(function(){
              throw new Error('Some migrations were successful, but we could not save them to the database'); 
            });

        };

      // We do the migration
      return when(migration[direction](limby))
        .then(function(){

          var limbName = filePath.split(path.sep);
          // -1 is the last entry ( filename ), - 2 is `migrations`, -3 is the limbName
          limbName = limbName[limbName.length - 3];

          // save it to the database
          var record = Migration.forge({filename: fileName, limb: limbName})

          console.log('saving in migrations table..'.green, fileName);
          if ( direction == 'up' )  {
            return record = record.save().otherwise(undoMigration);
          } else
            return record = record.fetch().then(function(model){
              return model.destroy();
            })
            .otherwise(undoMigration);

        });
          
    },

  });

  Migrations = bookshelf.Collection.extend({ model: Migration }, {

    getFiles: function(){

      var files = [];

      // their migrations might depend on previous limby migrations
      // so we have to combine all migrations into 1 list and run in order
      var limbyMigrationsPath = join(__dirname, '..', 'migrations');

      return when(fs.readdir(limbyMigrationsPath)).then(function(limbyMigrationFiles){

        _.each(limbyMigrationFiles, function(fileName){
          // We will sort based on fileName so we keep that separate, but then we will need the full path
          files.push([fileName, join(limbyMigrationsPath, fileName)])
        })

      }).then(function(appMigrationFiles){

        _.each(limby.limbs, function(branch, branchName){
          _.each(branch.migrations, function(migration, fileName){
            var mPath;
            if (branchName == 'core')
              mPath = join(limby.paths.core, 'migrations', fileName)
            else
              mPath = join(limby.paths.limbs, branchName, 'migrations', fileName)

            files.push([fileName, mPath]);

          });
        });
        
        // a[0] and b[0] are both the fileName (date)
        files.sort(function(a, b){
          if (a[0] < b[0]) return -1;
          if (a[0] > b[0]) return 1;
          return 0
        });
        return files;
      });
    
    },
    
    migrate: function(options){
      
      debug('migrate')
      options = options || {};
      var files;

      return this.getFiles()
        .then(function(_files){
          debug('got files')
          files = _files;
          return Migrations.ensureTable()
        })
        .then(function(){
          return Migrations.fileNames(options.path)
        })
        .then(function(existingFileNames){
          debug('got filenames')
          var pending = _.compact(_.map(files, function(set){

            var fileName = set[0];
            if (! _.include(existingFileNames, fileName))
              return set;

          }));

          if (pending.length) {
            
            // Sequence because migrations should be in order
            return sequence(_.compact(_.map(pending, function(set, n){
              if ( !options.step || options.step > n ){
                return function(){
                  return Migration.run(set[1], 'up');
                }
              }

            })));
            
          }

        });
    },

    ensureTable: function(){

      return bookshelf.knex.schema.hasTable(tableName).then(function(exists){
        if ( !exists ) {
          pm.log('Creating Migrations Table...');
          return bookshelf.schema.createTable(tableName, function(table){

            table.increments('id').unique().primary();
            // filename should be ISO string -- description == '2013-11-30T14-48-34.465Z'
            // note dashes instead of colons in time, file system likes that
            table.string('filename').unique().notNullable();
            table.string('limb');

          });
        }
      });

    },

    // We need to know all the migrations that need to be ran, and which ones were already ran
    fileNames: function() {
      var migrations;

      return (migrations = new Migrations).fetch().then(function(){
        return migrations.pluck('filename');
      });
    },

    rollback: function(options){

      options.step = options.step || 1;
      downs = []

      return (migrations = new Migrations)
        .query(function(qb){
          qb.orderBy('id', 'asc');
        })
        .fetch()
        .then(function(){

          while(migrations.length > 0 && options.step-- > 0){
            downs.push(migrations.pop().rollback());
          };

          return sequence(downs);

        });
    },

  });

  return {Migrations: Migrations, Migration: Migration};
};
