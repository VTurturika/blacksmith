'use strict';

const entities = ['material', 'product', 'tag'];
const controllersDir = './controllers/';
const modelsDir = './models/';

function initControllers(server) {
  return new Promise((resolve, reject) => {
    entities.forEach(entity => {
      let controller = require(controllersDir + entity);
      let model = require(modelsDir + entity);
      new controller(server, new model());
    });
    resolve();
  });
}

module.exports = {
  controllers: initControllers
};