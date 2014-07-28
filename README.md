limby
=====

Currently not published in npm, download from github for now into `node_modules`

    cd node_modules/limby && npm install
    
To use terminal commands such as `limby g migration`, `limby migrate`, `limby rollback --step=3`, `limby redo`, first:

    cd node_modules/limby && npm install -g

Limby is great.  It handles a complete user system, including sign up, login, logout, forgot password, edit account, etc.

It comes with overrideable default views for these user managmenet tasks.  They can be fully overriden, or extended.


It's easily extendable.  Within `limbs`, you create sections of your application.  such as `limbs/message_board`.
Limby will look at each limb, and load it's structure.  `models`, `controllers`, `views`, `app.js`, `migrations` are the main components of a `limb`.

I said views can be overriden or extended.  The `core/views` folder will overwrite anything in `node_modules/limby/views`.
`views/widgets` ( in core or a limb ) are used to extend certain views that call `renderWidgets`, such as the `navbar`, `base/index`, `home/index`, and `account/index` views.
renderWidgets on `home/index` will look for `views/widgets/home/index`, making it easy to extend the navbar and main sections with your limbs.

So for example, your `limb` will have a migration `add_favorite_food_to_users_table`.

To create the migration

    cd core/limbs/myLimb && limby g migration add_favorite_food_to_users_table
    
Edit the created migration.  It has an example in the generated file.  See http://knexjs.org/ for how to build schema migrations.

Then, create and edit `models/user.js` like so:

    module.exports = function(limby) {

      // Add attribute to user whitelist    
      limby.models.User.prototype.permittedAttributes.push('favorite_food');
      
    }

And in the `limb`'s `views/widgets/account/index.ect.html`, you can extend fields on the account page so your fb_id
    
    <div>
      <h3> Favorite Food </h3>
      <input name="favorite_food" value="<%- _.escape(@body.favorite_food) || @user.favorite_food %>" />
    </div>
    
You've just extended the main user table with your own field, without editing any base files.
    
__Alphaware -- pre pre release__


#Usage

structure

* index.js
* config
* --index.js
* core
* --app.js
* --views
* --models
* --migrations
* --controllers
* --limbs
* ----food
* ------app.js
* ------views
* --------index.ect.html
* ------models
* --------food.js
* ------migrations
* --------2014-04-13T03-27-26-041z__add_foods_table.js // timestamp generated by limby
* ------controllers
* --------food.js

### main index.js entry point

    var
      limby,
      join = require('path').join,
      app   = require('./core/app'),
      Limby = require('limby');
    
    limby = new Limby(join(__dirname, 'config'));
    
    limby.loadNative()
    .then(function(){
      return limby.loadLimbs();
    })
    .then(function(){
      return limby.require('core.app');
    })
    .then(function(){
      limby.route();
    });

### core/app.js

  module.exports = function(limby) {
  
    var app = limby.app;
    
    // http://domain.com/terms_of_use
    app.get('/terms_of_use', ...);
  
  }
  
  
### limbs/food/controllers/food.js
  
    module.exports = function(limby, models) {
    
      // models == limby.limbs.food.models
      
      return {
      
        indexRoute: function(req, res, next) {
          // sends limbs/food/views/index
          // res.view adds several attributes to @ context
          res.view('index');
        },
      
      };
    };
    
Requires `config/index.js` -- customize for your directory structure

    module.exports = {
    
      paths: {
        base:   join(__dirname, '..'),
        core:   join(__dirname, '../core'),
        module: join(__dirname, '../node_modules/limby'),
        views:  join(__dirname, '../core/views'),
        limbs:  join(__dirname, '../core/limbs'),
      },
    }



#TODO: Example app

#TODO: Publish facebook auth limb
