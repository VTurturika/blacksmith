'use strict';

class Model {

  constructor(db) {
    this.db = db;
  }

  onUniqueIndexCreated(collection, indexName) {
    console.log(`unique index ${indexName} created for collection ${collection}`);
  }

  onUniqueIndexFailed(err) {
    console.log(err);
    process.exit(2);
  }
}

module.exports = Model;