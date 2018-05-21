'use strict';

const entities = ['material', 'product', 'tag'];
const controllersDir = './controllers/';
const modelsDir = './models/';

function initDatabase(config) {
  return new Promise((resolve, reject) => {
    const mongodb = require('mongodb').MongoClient;
    mongodb.connect(config.database.endpoint, {useNewUrlParser: true})
      .then(conn => resolve(conn.db(config.database.name)))
      .catch(err => reject(err));
  })
}

function initControllers(server, db) {
  return new Promise((resolve, reject) => {
    entities.forEach(entity => {
      let controller = require(controllersDir + entity);
      let model = require(modelsDir + entity);
      new controller(server, new model(db));
    });
    resolve();
  });
}

module.exports = {
  database: initDatabase,
  controllers: initControllers
};