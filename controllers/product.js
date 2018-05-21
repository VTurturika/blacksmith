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
    res.send('GET /product');
  }

  create(req, res) {
    res.send('POST /product');
  }

  get(req, res) {
    res.send('GET /product/:productId');
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

}

module.exports = ProductController;