'use strict';

const Model = require('./model');

class Product extends Model {

  constructor(db) {
    super(db);
    this.db.collection('products')
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('products', index))
      .catch(err => this.onUniqueIndexFailed(err))
  }

}

module.exports = Product;