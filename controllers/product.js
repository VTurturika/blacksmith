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
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.setValidation('product'))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.edit(req.params.productId, fields))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  del(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(id => instance.model.del(id))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  addMaterial(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'materialId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.setValidation('material'))
      .then(() => instance.hasRequiredFields(req))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.addMaterial(
        req.params.productId, req.params.materialId, fields
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  editMaterial(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'materialId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.setValidation('material'))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.editMaterial(
        req.params.productId, req.params.materialId, fields
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  delMaterial(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'materialId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.delMaterial(
        req.params.productId, req.params.materialId
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  addDetail(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'detailId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.setValidation('detail'))
      .then(() => instance.hasRequiredFields(req))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.addDetail(
        req.params.productId, req.params.detailId, fields
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  editDetail(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'detailId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.setValidation('detail'))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.editDetail(
        req.params.productId, req.params.detailId, fields
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  delDetail(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'detailId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.delDetail(
        req.params.productId, req.params.detailId
      ))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  addTag(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'tagId'))
      .then(id => instance.validateId(id))
      .then(fields => instance.model.addTag(req.params.productId, req.params.tagId))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  delTag(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'productId'))
      .then(id => instance.validateId(id))
      .then(() => instance.hasParam(req, 'tagId'))
      .then(id => instance.validateId(id))
      .then(() => instance.model.delTag(req.params.productId, req.params.tagId))
      .then(product => res.send(product))
      .catch(err => res.send(err));
  }

  stock(req, res) {
    res.send('POST /product/:productId/stock');
  }

  estimate(req, res) {
    res.send('POST /product/:productId/estimate');
  }

}

module.exports = ProductController;