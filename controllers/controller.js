'use strict';

const error = require('restify-errors');

class Controller {

  constructor(model) {
    this.model = model;
  }

  hasRequiredFields(req) {
    return new Promise((resolve, reject) => {
      this.model.required.forEach(field => {
        if (!req.body || req.body[field] === undefined) {
          reject(new error.BadRequestError(`field '${field}' is required`));
        }
      });
      resolve();
    });
  }

  filterAllowedFields(req) {
    return new Promise((resolve, reject) => {
      let result = {};
      this.model.allowed.forEach(field => {
        if(req.body && req.body[field] !== undefined) {
          result[field] = req.body[field];
        }
      });
      return Object.keys(result).length
        ? resolve(result)
        : reject(new error.BadRequestError('invalid body'))
    })
  }

}

module.exports = Controller;