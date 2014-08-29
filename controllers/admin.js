module.exports = function(limby){

  return {

    index: function(req, res, next) {
      limby.models.Users.forge().query(function(qb){
        qb.orderBy('first_name');
      }).fetch().then(function(users){
        res.view('admin/index', {users: users});
      });
    },

    toggle: function(req, res, next) {

      if (+req.params.user_id == req.session.user_id)
        return res.json({error: true, messages: "You can't edit your own priviledges"});

      limby.models.User.forge({id: req.params.user_id}).fetch()
      .then(function(user){
        if (req.body.toggle == null)
          return user.set({deleted: req.body.disable == 'true'}).save();
        else
          return user.set({admin: req.body.toggle == 'true'}).save();
      })
      .then(function(){
        res.json({success: true});
      })
      ;

    },

  };

};
