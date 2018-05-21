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

}

module.exports = Material;