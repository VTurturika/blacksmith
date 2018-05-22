'use strict';

const Controller = require('./controller');
let instance = null;

class ProductController extends Controller {

  constructor(server, model) {
    super(model);

    if(!instance) {
      server.get('/product', this.getAll);
      server.post('/product', this.create);
      server.get('/product/:productId', this.get);
      server.put('/product/:productId', this.edit);
      server.del('/product/:productId', this.del);
      server.post('/product/stock', this.stock);
      server.post('/product/estimate', this.estimate);
      instance = this;
    }
    return instance;
  }

  getAll(req, res) {
    Promise.resolve() //todo add filters
      .then(() => instance.model.getAll())
      .then(products => res.send(products))
      .catch(err => res.send(err));
  }

  create(req, res) {
    Promise.resolve()
      .then(() => instance.hasRequiredFields(req))
      .then(() => instance.validateTags(req))
      .then(() => instance.validateMaterials(req))
      .then(() => instance.validateDetails(req))
      .then(() => instance.filterAllowedFields(req))
      .then(fileds => instance.model.create(fileds))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  get(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(id => instance.model.getTree(id))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  edit(req, res) {
    res.send('PUT /product/:productId');
  }

  del(req, res) {
    res.send('DELETE /product/:productId');
  }

  stock(req, res) {
    res.send('POST /product/stock');
  }

  estimate(req, res) {
    res.send('POST /product/estimate');
  }

  validateMaterials(req) {
    return new Promise((resolve, reject) => {
      if (!req.body.materials) {
        return resolve();
      }
      if (!Array.isArray(req.body.materials)) {
        return reject(new this.model.error.BadRequestError(`invalid 'materials' field`));
      }
      req.body.materials.forEach((material, i) => {
        ['_id', 'quantity', 'time', 'cost', 'isImproved'].forEach(field => {
          return material[field] === undefined
            ? reject(new this.model.error.BadRequestError(`'materials[${i}].${field}' required`))
            : true
        });
      });
      resolve();
    });
  }

  validateDetails(req) {
    return new Promise((resolve, reject) => {
      if (!req.body.details) {
        return resolve();
      }
      if (!Array.isArray(req.body.details)) {
        return reject(new this.model.error.BadRequestError(`invalid 'details' field`));
      }
      req.body.details.forEach((detail, i) => {
        ['_id', 'quantity', 'time', 'cost'].forEach(field => {
          return detail[field] === undefined
            ? reject(new this.model.error.BadRequestError(`'details[${i}].${field}' required`))
            : true
        })
      });
      resolve();
    })
  }

  validateTags(req) {
    return new Promise((resolve, reject) => {
      if (!req.body.tags) {
        return resolve();
      }
      if (!Array.isArray(req.body.tags)) {
        return reject(new this.model.error.BadRequestError(`invalid 'tags' field`));
      }
      resolve();
    })
  }

}

module.exports = ProductController;