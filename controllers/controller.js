'use strict';

class Controller {

  constructor(model) {
    this.model = model;
  }

  hasRequiredFields(req) {
    return new Promise((resolve, reject) => {
      this.model.required.forEach(field => {
        if (!req.body || req.body[field] === undefined) {
          reject(new this.model.error.BadRequestError(`field '${field}' is required`));
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
        : reject(new this.model.error.BadRequestError('invalid body'))
    })
  }

  hasParam(req, param) {
    return new Promise((resolve, reject) => {
      return req.params && req.params[param] !== undefined
        ? resolve(req.params[param])
        : reject(new this.model.error.BadRequestError(`parameter '${param}' required`))
    })
  }

  validateId(id) {
    return new Promise((resolve, reject) => {
      return this.model.ObjectID.isValid(id)
        ? resolve(id)
        : reject(new this.model.error.BadRequestError('invalid id'))
    })
  }

}

module.exports = Controller;