'use strict';

const Controller = require('./controller');
let instance = null;

class TagController extends Controller {

  constructor(server, model) {
    super(model);

    if(!instance) {
      server.get('/tag', this.getAll);
      server.post('/tag', this.create);
      server.get('/tag/:tagId', this.get);
      server.put('/tag/:tagId', this.edit);
      server.del('/tag/:tagId', this.del);
      instance = this;
    }
    return instance;
  }

  getAll(req, res) {
    res.send('GET /tag');
  }

  create(req, res) {
    Promise.resolve()
      .then(() => instance.hasRequiredFields(req))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.create(fields))
      .then(tag => res.send(tag))
      .catch(err => res.send(err));
  }

  get(req, res) {
    res.send('GET /tag/:tagId');
  }

  edit(req, res) {
    res.send('PUT /tag/:tagId');
  }

  del(req, res) {
    res.send('DELETE /tag/:tagId');
  }

}

module.exports = TagController;