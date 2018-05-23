'use strict';

const Model = require('./model');

class Material extends Model {

  constructor(db) {
    super(db);
    this.setAllowedFields([
      'article', 'image', 'measure', 'width', 'height', 'length',
      'radius', 'price', 'extraCost', 'extraTime', 'stock'
    ]);
    this.setRequiredFields([
      'article', 'measure', 'price', 'stock', 'extraCost', 'extraTime'
    ]);

    this.products = db.collection('products');
    this.materials = db.collection('materials');
    this.materials
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('materials', index))
      .catch(err => this.onUniqueIndexFailed(err))
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.materials
        .find()
        .toArray()
        .then(materials => resolve(materials))
        .catch(err => reject(err))
    })
  }

  create(material) {
    return new Promise((resolve, reject) => {
      this.materials
        .insertOne(material)
        .then(response => {
          return response && response.insertedId
            ? resolve(material)
            : reject(new this.error.InternalServerError('Db error while creating material'))
        })
        .catch(err => reject(this.onUpdateError(err)))
    })
  }

  get(id) {
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

  edit(id, newData) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(id))
        .then(material => this.materials.updateOne({
            _id: new this.ObjectID(id)
          }, {
            $set: newData
          })
        )
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(id)
            : reject(new this.error.InternalServerError('Db error while updating material'))
        })
        .then(material => resolve(material))
        .catch(err =>reject(this.onUpdateError(err)))
    })
  }

  del(id) {
    return new Promise((resolve, reject) => {
      let material;
      Promise.resolve()
        .then(() => this.get(id))
        .then(result => {
          material = result;
          return this.checkUsage(id);
        })
        .then(() => this.materials.deleteOne({_id: material._id}))
        .then(response => {
          return response && response.deletedCount
            ? resolve(material)
            : reject(new this.error.InternalServerError('Db error while deleting material'));
        })
        .catch(err => reject(err))
    })
  }

  checkUsage(id) {
    return new Promise((resolve, reject) => {
      this.products
        .findOne({
          materials: {
            $elemMatch: {_id: new this.ObjectID(id)}
          }
        })
        .then(product => {
          return !product
            ? resolve()
            : reject(new this.error.BadRequestError(
              `Can't delete. Material used for detail with id '${product._id}'`
            ))
        })
        .catch(err => reject(err));
    })
  }

}

module.exports = Material;