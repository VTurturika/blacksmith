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

  getAll(req, res) {
    Promise.resolve()
      .then(() => instance.model.db.collection('materials').find({}).toArray())
      .then(results => res.json(results));
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
    res.send('GET /material/:materialId');
  }

  edit(req, res) {
    res.send('PUT /material/:materialId');
  }

  del(req, res) {
    res.send('DELETE /material/:materialId');
  }

}

module.exports = MaterialController;