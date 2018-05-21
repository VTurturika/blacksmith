'use strict';

const Model = require('./model');

class Material extends Model {

  constructor(db) {
    super(db);
    db.collection('materials')
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('materials', index))
      .catch(err => this.onUniqueIndexFailed(err))
  }

}

module.exports = Material;