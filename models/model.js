'use strict';

const error = require('restify-errors');
const ObjectID = require('mongodb').ObjectID;

class Model {

  constructor(db) {
    this.db = db;
    this.ObjectID = ObjectID;
    this.error = error;
    this.allowed = [];
    this.required = [];
  }

  onUniqueIndexCreated(collection, indexName) {
    console.log(`unique index ${indexName} created for collection ${collection}`);
  }

  onUniqueIndexFailed(err) {
    console.log(err);
    process.exit(2);
  }

  setAllowedFields(fields) {
    this.allowed = fields;
  }

  setRequiredFields(fields) {
    this.required = fields;
  }

  onServerError(err) {
    return err.code === 11000
      ? new this.error.BadRequestError('Given value already used')
      : new this.error.InternalServerError(err.message)
  }
}

module.exports = Model;