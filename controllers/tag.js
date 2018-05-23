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

  getAll(req, res) { //todo add filters
    Promise.resolve()
      .then(() => instance.model.getAll())
      .then(tags => res.send(tags))
      .catch(err => res.send(err));
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
    Promise.resolve()
      .then(() => instance.hasParam(req, 'tagId'))
      .then(id => instance.validateId(id))
      .then(id => instance.model.get(id))
      .then(material => res.send(material))
      .catch(err => res.send(err));
  }

  edit(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'tagId'))
      .then(id => instance.validateId(id))
      .then(() => instance.filterAllowedFields(req))
      .then(fields => instance.model.edit(req.params.tagId, fields))
      .then(tag => res.send(tag))
      .catch(err => res.send(err));
  }

  del(req, res) {
    Promise.resolve()
      .then(() => instance.hasParam(req, 'tagId'))
      .then(id => instance.validateId(id))
      .then(id => instance.model.del(id))
      .then(tag => res.send(tag))
      .catch(err => res.send(err));
  }

}

module.exports = TagController;