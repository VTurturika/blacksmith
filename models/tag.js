'use strict';

const Model = require('./model');

class Tag extends Model {

  constructor(db) {
    super(db);
    this.setAllowedFields(['name']);
    this.setRequiredFields(['name']);

    this.tags = this.db.collection('tags');
    this.tags
      .ensureIndex({"name": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('tags', index))
      .catch(err => this.onUniqueIndexFailed(err))
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.tags
        .find()
        .toArray()
        .then(tag => resolve(tag))
        .catch(err => reject(err))
    });
  }

  create(tag) {
    return new Promise((resolve, reject) => {
      this.tags
        .insertOne(tag)
        .then(response => {
          return response && response.insertedId
            ? resolve(tag)
            : reject(new this.error.InternalServerError('Db error while creating tag'))
        })
        .catch(err => reject(this.onUpdateError(err)))
    })
  }

  get(id) {
    return new Promise((resolve, reject) => {
      this.tags
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(tag => {
          return tag
            ? resolve(tag)
            : reject(new this.error.NotFoundError('Tag not found'))
        })
        .catch(err => reject(err))
    })
  }

  edit(id, newData) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(id))
        .then(tag => this.tags.updateOne({
            _id: new this.ObjectID(id)
          }, {
            $set: newData
          })
        )
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(id)
            : reject(new this.error.InternalServerError('Db error while updating tag'))
        })
        .then(tag => resolve(tag))
        .catch(err =>reject(this.onUpdateError(err)))
    })
  }

}

module.exports = Tag;