'use strict';

const Controller = require('./controller');
let instance = null;

class MaterialController extends Controller {

  constructor(server, model) {
    super();

    if(!instance) {
      server.get('/material', this.getAll);
      server.post('/material', this.create);
      server.get('/material/:materialId', this.get);
      server.put('/material/:materialId', this.edit);
      server.del('/material/:materialId', this.del);
      this.model = model;
      instance = this;
    }
    return instance;
  }

  getAll(req, res) {
    res.send('GET /material');
  }

  create(req, res) {
    res.send('POST /material');
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