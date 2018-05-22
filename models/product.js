'use strict';

const Model = require('./model');

class Product extends Model {

  constructor(db) {
    super(db);
    this.products = this.db.collection('products');
    this.materials = this.db.collection('materials');
    this.products
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('products', index))
      .catch(err => this.onUniqueIndexFailed(err));
    this.setValidation('product');
  }

  setValidation(entity) {
    return new Promise((resolve, reject) => {
      switch (entity) {
        case 'product':
          this.setAllowedFields([
            'article', 'image', 'measure', 'width', 'height', 'length', 'radius'
          ]);
          this.setRequiredFields(['article', 'measure']);
          return resolve();
        case 'material':
          this.setAllowedFields(['quantity', 'time', 'cost', 'isImproved']);
          this.setRequiredFields(['quantity', 'time', 'cost', 'isImproved']);
          return resolve();
        case 'detail':
          this.setAllowedFields(['quantity', 'time', 'cost']);
          this.setRequiredFields(['quantity', 'time', 'cost']);
          return resolve();
        case 'stock':
          this.setAllowedFields(['change']);
          this.setRequiredFields(['change']);
          return resolve();
        case 'estimate':
          this.setAllowedFields(['quantity']);
          this.setRequiredFields(['quantity']);
          return resolve();
        default:
          return resolve()
      }
    });

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

  get(id) {
    return new Promise((resolve, reject) => {
      this.products
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(product => {
          return product
            ? resolve(product)
            : reject(new this.error.NotFoundError('Material not found'))
        })
        .catch(err => reject(err))
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

  edit(id, newData) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(id))
        .then(product => this.products.updateOne({
            _id: new this.ObjectID(id)
          }, {
            $set: newData
          })
        )
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(id)
            : reject(new this.error.InternalServerError('Db error while updating product'))
        })
        .then(material => resolve(material))
        .catch(err =>reject(this.onUpdateError(err)))
    })
  }

  del(id) {
    return new Promise((resolve, reject) => {
      let product;
      Promise.resolve()
        .then(() => this.get(id))
        .then(result => {
          product = result;
          return this.products
            .deleteOne({
              _id: product._id
            })
        })
        .then(response => {
          return response && response.deletedCount
            ? resolve(product)
            : reject(new this.error.InternalServerError('Db error while deleting product'));
        })
        .catch(err => reject(err))
    })
  }

  getMaterial(id) {
    return new Promise((resolve, reject) => {
      this.materials
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(material => {
          return material
            ? resolve(material)
            : reject(new this.error.NotFoundError('Material not found'))
        })
        .catch(err => reject(err))
    })
  }

  addMaterial(productId, materialId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(materialId))
        .then(() => this.get(productId))
        .then(product => {
          if(product.materials.find(m => m._id.equals(new this.ObjectID(materialId)))) {
           return reject(new this.error.BadRequestError(
             'product already contains this material'
           ))
          }
          fields._id = new this.ObjectID(materialId);
          return this.products.updateOne({
            _id: product._id
          }, {
            $push: {materials: fields}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while adding material'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  editMaterial(productId, materialId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(materialId))
        .then(() => this.get(productId))
        .then(product => {
          let material = product.materials.find(m => m._id.equals(new this.ObjectID(materialId)))
          if(!material) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this material'
            ))
          }
          Object.keys(fields).forEach(field => material[field] = fields[field]);
          return this.products.updateOne({
            _id: product._id,
            materials: {$elemMatch: {_id: new this.ObjectID(materialId)}},
          },{
            $set: {"materials.$": material}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while editing material'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

}

module.exports = Product;