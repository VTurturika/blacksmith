'use strict';

const Model = require('./model');

class Product extends Model {

  constructor(db) {
    super(db);
    this.products = this.db.collection('products');
    this.materials = this.db.collection('materials');
    this.tags = this.db.collection('tags');
    this.products
      .ensureIndex({"article": 1}, {unique: true})
      .then(index => this.onUniqueIndexCreated('products', index))
      .catch(err => this.onUniqueIndexFailed(err));
    this.setValidation('product');
  }

  setValidation(entity) {
    return new Promise((resolve, reject) => {
      switch (entity) {
        case 'product':
          this.setAllowedFields([
            'article', 'image', 'measure', 'width', 'height', 'length', 'radius'
          ]);
          this.setRequiredFields(['article', 'measure']);
          return resolve();
        case 'material':
          this.setAllowedFields(['quantity', 'time', 'cost', 'isImproved']);
          this.setRequiredFields(['quantity', 'time', 'cost', 'isImproved']);
          return resolve();
        case 'detail':
          this.setAllowedFields(['quantity', 'time', 'cost']);
          this.setRequiredFields(['quantity', 'time', 'cost']);
          return resolve();
        case 'stock':
          this.setAllowedFields(['change']);
          this.setRequiredFields(['change']);
          return resolve();
        case 'estimate':
          this.setAllowedFields(['quantity']);
          this.setRequiredFields(['quantity']);
          return resolve();
        default:
          return resolve()
      }
    });

  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.products
        .find()
        .toArray()
        .then(products => resolve(products))
        .catch(err => reject(err));
    })
  }

  create(product) {
    return new Promise((resolve, reject) => {
      product.tags = [];
      product.details = [];
      product.materials = [];
      product.stock = 0;
      this.products
        .insertOne(product)
        .then(response => {
          return response && response.insertedId
            ? resolve(product)
            : reject(new this.error.InternalServerError('Db error while creating product'))
        })
        .catch(err => reject(this.onUpdateError(err)))
    })
  }

  get(id) {
    return new Promise((resolve, reject) => {
      this.products
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(product => {
          return product
            ? resolve(product)
            : reject(new this.error.NotFoundError('Product not found'))
        })
        .catch(err => reject(err))
    })
  }

  getTree(id) {
    return new Promise((resolve, reject) => {
      let result;
      this.products
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(product => {
          if (!product) {
            return reject(new this.error.NotFoundError('Product not found'))
          }
          result = product;

          // fetch all materials
          let materials = [];
          result.materials.forEach(material => {
            materials.push(this.getMaterial(material._id))
          });

          return Promise.all(materials);
        })
        .then(materials => {
          materials.forEach((material, i) => result.materials[i].material = material);

          //fetch all tags
          let tags = [];
          result.tags.forEach(tag => tags.push(this.getTag(tag)));

          return Promise.all(tags)
        })
        .then(tags => {
          result.tags = tags;

          if (!result.details.length) { //stop recursion
            return resolve(result);
          }

          //fetch all details recursively
          let details = [];
          result.details.forEach(detail => {
            details.push(this.getTree(detail._id))
          });

          return Promise.all(details);
        })
        .then(details => {
          details.forEach((detail, i) => result.details[i].product = detail);
          resolve(result);
        })
        .catch(err => reject(err))
    })
  }

  edit(id, newData) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(id))
        .then(product => this.products.updateOne({
            _id: new this.ObjectID(id)
          }, {
            $set: newData
          })
        )
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(id)
            : reject(new this.error.InternalServerError('Db error while updating product'))
        })
        .then(material => resolve(material))
        .catch(err =>reject(this.onUpdateError(err)))
    })
  }

  del(id) {
    return new Promise((resolve, reject) => {
      let product;
      Promise.resolve()
        .then(() => this.get(id))
        .then(result => {
          product = result;
          return this.checkUsage(id);
        })
        .then(() => this.products.deleteOne({_id: product._id}))
        .then(response => {
          return response && response.deletedCount
            ? resolve(product)
            : reject(new this.error.InternalServerError('Db error while deleting product'));
        })
        .catch(err => reject(err))
    })
  }

  checkUsage(id) {
    return new Promise((resolve, reject) => {
      this.products
        .findOne({
          details: {
            $elemMatch: {_id: new this.ObjectID(id)}
          }
        })
        .then(product => {
          return !product
            ? resolve()
            : reject(new this.error.BadRequestError(
              `Can't delete. Detail used for product with id '${product._id}'`
            ))
        })
        .catch(err => reject(err));
    })
  }

  estimate(productId, quantity) {
    return new Promise((resolve, reject) => {

      let result = {
        enough: true,
        time: 0,
        cost: 0,
        details: []
      };
      let product;

      Promise.resolve()
        .then(() => this.get(productId))
        .then(dbProduct => {
          product = dbProduct;

          //estimate materials
          let materials = [];
          product.materials.forEach(material => {
            materials.push(this.estimateMaterial(material, quantity))
          });

          return Promise.all(materials);
        })
        .then(materials => {
          result.enough = materials.every(material => material.enough);
          materials.forEach(material => {
            result.time += material.apply.time;
            result.cost += material.apply.cost;
          });
          result.materials = materials;

          if (!product.details.length) {
            return resolve(result);
          }

          //estimate details;
          let details = [];
          product.details.forEach(detail => {
            details.push(this.estimateDetail(detail, quantity))
          });

          return Promise.all(details);
        })
        .then(details => {

          details = details || [];
          let isEnoughDetails = details.every(detail => detail.enough);
          result.enough = result.enough && isEnoughDetails;

          let notEnoughDetails = [];
          details.forEach(detail => {
            if (detail.enough) {
              result.time += detail.apply.time;
              result.cost += detail.apply.cost;
              result.details.push(detail);
            }
            else {
              notEnoughDetails.push(this.estimate(detail.detail._id, detail.createNew));
            }
          });

          if (!notEnoughDetails.length) {
            return resolve(result);
          }

          return Promise.all(notEnoughDetails);
        })
        .then(details => {
          details = details || [];
          details.forEach(detail => {
            result.time += detail.time;
            result.cost += detail.cost;
            result.details.push(detail);
          });

          resolve(result);
        })
        .catch(err => reject(err));
    });
  }

  estimateMaterial(dependency, quantity) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(dependency._id))
        .then(material => {

          let requiredQuantity = dependency.quantity * quantity;
          let currentQuantity = dependency.isImproved
            ? material.stock.improved
            : material.stock.ordinary;
          //enough materials in stock
          if (requiredQuantity <= currentQuantity) {
            return resolve({
              enough: true,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity,
                cost: dependency.cost * quantity
              },
              useExisting: {
                ordinary: dependency.isImproved
                  ? 0
                  : requiredQuantity,
                improved: dependency.isImproved
                  ? requiredQuantity
                  : 0
              },
              purchaseOrdinary: {
                quantity: 0,
                cost: 0
              },
              createImproved: {
                quantity: 0,
                time: 0,
                cost: 0
              },
              material: material,
              dependency: dependency
            })
          }
          //not enough improved materials but we can create some from ordinary
          else if (dependency.isImproved &&
            requiredQuantity <= material.stock.improved + material.stock.ordinary
          ) {
            let needCreateImproved = requiredQuantity - material.stock.improved;
            let needCreateTime = needCreateImproved * material.extraTime;
            let needCreateCost = needCreateImproved * material.extraCost;
            return resolve({
              enough: false,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity + needCreateTime,
                cost: dependency.cost * quantity + needCreateCost
              },
              useExisting: {
                ordinary: needCreateImproved,
                improved: material.stock.improved
              },
              purchaseOrdinary: {
                quantity: 0,
                cost: 0
              },
              createImproved: {
                quantity: needCreateImproved,
                time: needCreateTime,
                cost: needCreateCost
              },
              material: material,
              dependency: dependency
            })
          }
          //not enough improved and ordinary both, need purchase ordinary materials
          else if (dependency.isImproved &&
            requiredQuantity > material.stock.improved + material.stock.ordinary
          ) {
            let needPurchaseAndImprove = requiredQuantity
              - material.stock.improved - material.stock.ordinary;
            let needCreateTime = needPurchaseAndImprove * material.extraTime;
            let needCreateCost = needPurchaseAndImprove * material.extraCost;
            return resolve({
              enough: false,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity + needCreateTime,
                cost: dependency.cost * quantity + needCreateCost
              },
              useExisting: {
                ordinary: material.stock.ordinary,
                improved: material.stock.improved
              },
              purchaseOrdinary: {
                quantity: needPurchaseAndImprove,
                cost: needPurchaseAndImprove * material.price
              },
              createImproved: {
                quantity: needPurchaseAndImprove,
                time: needCreateTime,
                cost: needCreateCost
              },
              material: material,
              dependency: dependency
            })
          }
          //not enough ordinary materials
          else {
            return resolve({
              enough: false,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity,
                cost: dependency.cost * quantity
              },
              useExisting: {
                ordinary: material.stock.ordinary,
                improved: 0
              },
              purchaseOrdinary: {
                quantity: requiredQuantity - currentQuantity,
                cost: (requiredQuantity - currentQuantity) * material.price
              },
              createImproved: {
                quantity: 0,
                time: 0,
                cost: 0
              },
              material: material,
              dependency: dependency
            })
          }
        })
        .catch(err => reject(err))
    })
  }

  estimateDetail(dependency, quantity) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(dependency._id))
        .then(detail => {
          let requiredQuantity = dependency.quantity * quantity;
          if (requiredQuantity <= detail.stock) {
            return resolve({
              enough: true,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity,
                cost: detail.cost * quantity
              },
              useExisting: requiredQuantity,
              createNew: 0,
              detail: detail,
              dependency: dependency
            })
          }
          else {
            return resolve({
              enough: false,
              requiredQuantity: requiredQuantity,
              apply: {
                time: dependency.time * quantity,
                cost: detail.cost * quantity
              },
              useExisting: detail.stock,
              createNew: requiredQuantity - detail.stock,
              detail: detail,
              dependency: dependency
            })
          }
        })
        .catch(err => reject(err));
    });
  }

  getMaterial(id) {
    return new Promise((resolve, reject) => {
      this.materials
        .findOne({
          _id: new this.ObjectID(id)
        })
        .then(material => {
          return material
            ? resolve(material)
            : reject(new this.error.NotFoundError('Material not found'))
        })
        .catch(err => reject(err))
    })
  }

  addMaterial(productId, materialId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(materialId))
        .then(() => this.get(productId))
        .then(product => {
          if(product.materials.find(m => m._id.equals(new this.ObjectID(materialId)))) {
           return reject(new this.error.BadRequestError(
             'product already contains this material'
           ))
          }
          fields._id = new this.ObjectID(materialId);
          return this.products.updateOne({
            _id: product._id
          }, {
            $push: {materials: fields}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while adding material'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  editMaterial(productId, materialId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(materialId))
        .then(() => this.get(productId))
        .then(product => {
          let material = product.materials.find(m => m._id.equals(new this.ObjectID(materialId)))
          if(!material) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this material'
            ))
          }
          Object.keys(fields).forEach(field => material[field] = fields[field]);
          return this.products.updateOne({
            _id: product._id,
            materials: {$elemMatch: {_id: new this.ObjectID(materialId)}},
          },{
            $set: {"materials.$": material}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while editing material'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  delMaterial(productId, materialId) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(materialId))
        .then(() => this.get(productId))
        .then(product => {
          let material = product.materials.find(m => m._id.equals(new this.ObjectID(materialId)))
          if(!material) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this material'
            ))
          }
          return this.products.updateOne({
            _id: product._id,
          },{
            $pull: {materials: {_id: new this.ObjectID(materialId)}}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while deleting material'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  addDetail(productId, detailId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(detailId))
        .then(() => this.get(productId))
        .then(product => {
          if(product.details.find(d => d._id.equals(new this.ObjectID(detailId)))) {
            return reject(new this.error.BadRequestError(
              'product already contains this detail'
            ))
          }
          fields._id = new this.ObjectID(detailId);
          return this.products.updateOne({
            _id: product._id
          }, {
            $push: {details: fields}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while adding detail'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  editDetail(productId, detailId, fields) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(detailId))
        .then(() => this.get(productId))
        .then(product => {
          let detail = product.details.find(d => d._id.equals(new this.ObjectID(detailId)));
          if(!detail) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this detail'
            ))
          }
          Object.keys(fields).forEach(field => detail[field] = fields[field]);
          return this.products.updateOne({
            _id: product._id,
            details: {$elemMatch: {_id: new this.ObjectID(detailId)}},
          },{
            $set: {"details.$": detail}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while editing detail'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  delDetail(productId, detailId) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(detailId))
        .then(() => this.get(productId))
        .then(product => {
          let detail = product.details.find(d => d._id.equals(new this.ObjectID(detailId)));
          if(!detail) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this detail'
            ))
          }
          return this.products.updateOne({
            _id: product._id,
          },{
            $pull: {details: {_id: new this.ObjectID(detailId)}}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while deleting detail'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  getTag(id) {
    return new Promise((resolve, reject) => {
      this.tags
        .findOne({_id: new this.ObjectID(id)})
        .then(tag => {
          return tag
            ? resolve(tag)
            : reject(new this.error.NotFoundError('Tag not found'))
        })
        .catch(err => reject(err))
    })
  }

  addTag(productId, tagId) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getTag(tagId))
        .then(() => this.get(productId))
        .then(product => {
          if(product.tags.find(t => t.equals(new this.ObjectID(tagId)))) {
            return reject(new this.error.BadRequestError(
              'product already contains this tag'
            ))
          }
          return this.products.updateOne({
            _id: product._id
          }, {
            $push: {tags: new this.ObjectID(tagId)}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while adding tag'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

  delTag(productId, tagId) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getTag(tagId))
        .then(() => this.get(productId))
        .then(product => {
          let tag = product.tags.find(t => t.equals(new this.ObjectID(tagId)));
          if(!tag) {
            return reject(new this.error.BadRequestError(
              'product doesn\'t contain this tag'
            ))
          }
          return this.products.updateOne({
            _id: product._id,
          },{
            $pull: {tags: new this.ObjectID(tagId)}
          })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(productId)
            : reject(new this.error.InternalServerError('Db error while deleting tag'))
        })
        .then(product => resolve(product))
        .catch(err => reject(err));
    })
  }

}

module.exports = Product;