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

  getAll(filters) {
    return new Promise((resolve, reject) => {
      this.materials
        .find(this.prepareFilters(filters))
        .toArray()
        .then(materials => resolve(materials))
        .catch(err =>reject(this.onServerError(err)));
    })
  }

  prepareFilters(filters) {

    let result = {};

    if (filters.article) {
      result.article = filters.article
    }
    if (filters.measure) {
      result.measure = filters.measure;
    }
    if (filters.widthMin !== undefined && filters.widthMax !== undefined) {
      result.width = {
        $gte: +filters.widthMin,
        $lte: +filters.widthMax
      }
    }
    if (filters.heightMin !== undefined && filters.heightMax !== undefined) {
      result.height = {
        $gte: +filters.heightMin,
        $lte: +filters.heightMax
      }
    }
    if (filters.lengthMin !== undefined && filters.lengthMax !== undefined) {
      result.length = {
        $gte: +filters.lengthMin,
        $lte: +filters.lengthMax
      }
    }
    if (filters.radiusMin !== undefined && filters.radiusMax !== undefined) {
      result.radius = {
        $gte: +filters.radiusMin,
        $lte: +filters.radiusMax
      }
    }

    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      result.price = {
        $gte: +filters.priceMin,
        $lte: +filters.priceMax
      }
    }

    if (filters.extraCostMin !== undefined && filters.extraCostMax !== undefined) {
      result.extraCost = {
        $gte: +filters.extraCostMin,
        $lte: +filters.extraCostMax
      }
    }

    if (filters.extraTimeMin !== undefined && filters.extraTimeMax !== undefined) {
      result.extraTime = {
        $gte: +filters.extraTimeMin,
        $lte: +filters.extraTimeMax
      }
    }

    return result;
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
        .catch(err => reject(this.onServerError(err)))
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)))
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
    })
  }

}

module.exports = Material;