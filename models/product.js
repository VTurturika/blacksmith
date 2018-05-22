'use strict';

const Model = require('./model');

class Product extends Model {

  constructor(db) {
    super(db);
    this.setAllowedFields([
      'article', 'image', 'measure', 'width', 'height', 'length',
      'radius', 'tags', 'materials', 'details'
    ]);
    this.setRequiredFields(['article', 'measure', 'materials']);

    this.products = this.db.collection('products');
    this.products
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('products', index))
      .catch(err => this.onUniqueIndexFailed(err))
  }

  create(product) {
    return new Promise((resolve, reject) => {
      this.products
        .insertOne(product)
        .then(response => {
          return response && response.insertedId
            ? resolve(product)
            : reject(new this.error.InternalServerError('Db error while creating product'))
        })
        .catch(err => reject(this.onUpdateError(err)))
    })
  }

}

module.exports = Product;