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

  getAll() {
    return new Promise((resolve, reject) => {
      this.products
        .find()
        .toArray()
        .then(products => resolve(products))
        .catch(err => reject(err));
    })
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

  getTree(id) {
    return new Promise((resolve, reject) => {
      let result;
      this.products
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(product => {
          if(!product) {
            return reject(new this.error.NotFoundError('Product not found'))
          }
          result = product;

          if (!result.details.length) {
            return resolve(result);
          }

          let promises = [];
          result.details.forEach(detail => {
            promises.push(this.getTree(detail._id))
          });

          return Promise.all(promises);
        })
        .then(children => {
          children = children || [];
          children.forEach((child, i) => result.details[i].product = child);
          resolve(result);
        })
        .catch(err => reject(err))
    })
  }

}

module.exports = Product;