'use strict';

const Controller = require('./controller');
let instance = null;

class MaterialController extends Controller {

  constructor(server, model) {
    super(model);

    if(!instance) {
      server.get('/material', this.getAll);
      server.post('/material', this.create);
      server.get('/material/:materialId', this.get);
      server.put('/material/:materialId', this.edit);
      server.del('/material/:materialId', this.del);
      instance = this;
    }
    return instance;
  }

  getAll(req, res) { //todo add filters
    Promise.resolve()
      .then(() => instance.model.getAll())
      .then(materials => res.send(materials))
      .catch(err => res.send(err));
  }

  create(req, res) {
    Promise.resolve()
      .then(() => instance.hasRequiredFields(req))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.create(fields))
      .then(material => res.send(material))
      .catch(err => res.send(err));
  }

  get(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'materialId'))
      .then(id => instance.validateId(id))
      .then(id => instance.model.get(id))
      .then(material => res.send(material))
      .catch(err => res.send(err));
  }

  edit(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'materialId'))
      .then(id => instance.validateId(id))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.edit(req.params.materialId, fields))
      .then(material => res.send(material))
      .catch(err => res.send(err));
  }

  del(req, res) {
    res.send('DELETE /material/:materialId');
  }

}

module.exports = MaterialController;