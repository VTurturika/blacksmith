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

}

module.exports = Tag;