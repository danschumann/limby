module.exports = function(limby) {

  var
    _           = require('underscore'),
    bookshelf   = require('bookshelf'),
    knex        = require('knex'),
    wrap        = require('param-bindings');

  // Bookshelf Init -- DB connect
  knex = knex(limby.config.bookshelf);
  limby.knex = knex;
  wrap(knex, 'raw');
  limby.raw = _.bind(knex.raw, knex);
  limby.bookshelf = bookshelf = bookshelf(knex);
  limby.schema = bookshelf.schema = limby.knex.schema;

};
