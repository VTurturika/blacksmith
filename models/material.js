'use strict';

const Model = require('./model');

class Material extends Model {

  constructor(db) {
    super(db);
    this.setAllowedFields([
      'article', 'image', 'measure', 'width', 'height', 'length',
      'radius', 'price', 'extraCost', 'extraTime', 'stock'
    ]);
    this.serRequiredFields(['article', 'measure', 'price', 'stock']);

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

}

module.exports = Material;