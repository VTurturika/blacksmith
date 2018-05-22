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

      server.post('/product/:productId/material/:materialId', this.addMaterial);
      server.put('/product/:productId/material/:materialId', this.editMaterial);
      server.del('/product/:productId/material/:materialId', this.delMaterial);

      server.post('/product/:productId/detail/:detailId', this.addDetail);
      server.put('/product/:productId/detail/:detailId', this.editDetail);
      server.del('/product/:productId/detail/:detailId', this.delDetail);

      server.post('/product/:productId/tag/:tagId', this.addTag);
      server.del('/product/:productId/tag/:tagId', this.delTag);

      server.post('/product/:productId/stock', this.stock);
      server.post('/product/:productId/estimate', this.estimate);

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
      .then(() => instance.model.setValidation('product'))
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

  addMaterial(req, res) {
    res.send('POST /product/:productId/material/:materialId');
  }

  editMaterial(req, res) {
    res.send('PUT /product/:productId/material/:materialId');
  }

  delMaterial(req, res) {
    res.send('DELETE /product/:productId/material/:materialId');
  }

  addDetail(req, res) {
    res.send('POST /product/:productId/detail/:detailId');
  }

  editDetail(req, res) {
    res.send('PUT /product/:productId/detail/:detailId');
  }

  delDetail(req, res) {
    res.send('DELETE /product/:productId/detail/:detailId');
  }

  addTag(req, res) {
    res.send('POST /product/:productId/tag/:tagId');
  }

  delTag(req, res) {
    res.send('DELETE /product/:productId/tag/:tagId');
  }

  stock(req, res) {
    res.send('POST /product/:productId/stock');
  }

  estimate(req, res) {
    res.send('POST /product/:productId/estimate');
  }

}

module.exports = ProductController;