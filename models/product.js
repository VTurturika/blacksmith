'use strict';

const Model = require('./model');

class Product extends Model {

  constructor(db) {
    super(db);
  }

}

module.exports = Product;