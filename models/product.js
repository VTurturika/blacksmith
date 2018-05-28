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
            'article', 'image', 'measure', 'width', 'height', 'length', 'radius', 'name'
          ]);
          this.setRequiredFields(['article', 'measure', 'name']);
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

  getAll(filters) {
    return new Promise((resolve, reject) => {
      this.products
        .find(this.prepareFilters(filters))
        .toArray()
        .then(products => resolve(products))
        .catch(err =>reject(this.onServerError(err)));
    })
  }

  prepareFilters(filters) {

    let result = {};

    if (filters.article) {
      result.article = filters.article
    }
    if (filters.measure) {
      result.measure = filters.measure;
    }
    if (filters.tags) {
      result.$or = [];
      filters.tags.split(',').forEach(tag => {
        result.$or.push({tags: new this.ObjectID(tag.trim())})
      })
    }
    if (filters.widthMin !== undefined && filters.widthMax !== undefined) {
      result.width = {
        $gte: +filters.widthMin,
        $lte: +filters.widthMax
      }
    }
    if (filters.heightMin !== undefined && filters.heightMax !== undefined) {
      result.height = {
        $gte: +filters.heightMin,
        $lte: +filters.heightMax
      }
    }
    if (filters.lengthMin !== undefined && filters.lengthMax !== undefined) {
      result.length = {
        $gte: +filters.lengthMin,
        $lte: +filters.lengthMax
      }
    }
    if (filters.radiusMin !== undefined && filters.radiusMax !== undefined) {
      result.radius = {
        $gte: +filters.radiusMin,
        $lte: +filters.radiusMax
      }
    }

    return result;
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
        .catch(err => reject(this.onServerError(err)))
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
        .catch(err =>reject(this.onServerError(err)));
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

          Promise.all(details)
            .then(details => {
              details.forEach((detail, i) => {
                result.details[i].product = detail
              });
              resolve(result);
            })
        })
        .catch(err =>reject(this.onServerError(err)));
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
        .then(product => resolve(product))
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
    })
  }

  estimate(productId, quantity) {
    return new Promise((resolve, reject) => {
      let result = {};
      let product;
      Promise.resolve()
        .then(() => this.get(productId))
        .then(dbProduct => {
          product = dbProduct;

          result._id = product._id;
          result.article = product.article;
          result.time = 0;
          result.cost = 0;
          result.requiredQuantity = quantity;
          result.currentStock = product.stock;
          result.materials = [];
          result.details = [];

          if (quantity <= product.stock) {
              result.enough = true;
              result.useExisting = quantity;
              result.stockAfter = product.stock - quantity;
              result.createNew = 0;
              return resolve(result);
          }

          result.enough = false;
          result.useExisting = product.stock;
          result.stockAfter = 0;
          result.createNew = quantity - product.stock;

          //estimate materials
          let materials = [];
          product.materials.forEach(material => {
            materials.push(this.estimateMaterial(material, result.createNew));
            result.time += result.createNew * material.time;
            result.cost += result.createNew * material.cost;
          });

          Promise.all(materials)
            .then(materials => {

              materials.forEach(material => {
                result.time += material.time;
                result.cost += material.cost;
              });
              result.materials = materials;

              if (!product.details.length) {
                return resolve(result);
              }

              //estimate details;
              let details = [];
              let detailsConfigs = [];
              product.details.forEach(detail => {
                details.push(this.estimate(detail._id, result.createNew * detail.quantity));
                detailsConfigs.push(detail);
                result.time += result.createNew * detail.time;
                result.cost += result.createNew * detail.cost
              });

              Promise.all(details)
                .then(details => {
                  details.forEach((detail, i) => {
                    result.time += detail.time;
                    result.cost += detail.cost;
                    detail.config = detailsConfigs[i];
                  });
                  result.details = details;

                  resolve(result);
                })
            })
        })
        .catch(err =>reject(this.onServerError(err)));
    });
  }

  estimateMaterial(dependency, quantity) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(dependency._id))
        .then(material => {

          let result = {
            _id: material._id,
            article: material.article,
            price: material.price,
            config: dependency,
          };

          let requiredQuantity = dependency.quantity * quantity;
          let currentQuantity = dependency.isImproved
            ? material.stock.improved
            : material.stock.ordinary;

          //enough materials in stock
          if (requiredQuantity <= currentQuantity) {
            result.enough = true;
            result.time = 0;
            result.cost =  0;
            result.requiredQuantity = {
              ordinary: dependency.isImproved ? 0 : requiredQuantity,
              improved: dependency.isImproved ? requiredQuantity : 0
            };
            result.useExisting = {
              ordinary: dependency.isImproved ? 0 : requiredQuantity,
              improved: dependency.isImproved ? requiredQuantity : 0
            };
            result.currentStock = material.stock;
            result.stockAfter = {
              ordinary: dependency.isImproved
                ? material.stock.ordinary
                : material.stock.ordinary - requiredQuantity,
              improved: dependency.isImproved
                ? material.stock.improved - requiredQuantity
                : material.stock.improved
            };
            result.purchaseOrdinary = {
              quantity: 0,
              cost: 0
            };
            result.createImproved = {
              quantity: 0,
              time: 0,
              cost: 0
            };
          }
          //not enough improved materials but we can create some from ordinary
          else if (dependency.isImproved &&
            requiredQuantity <= material.stock.improved + material.stock.ordinary
          ) {
            let needCreateImproved = requiredQuantity - material.stock.improved;
            let needCreateTime = needCreateImproved * material.extraTime;
            let needCreateCost = needCreateImproved * material.extraCost;
            result.enough = false;
            result.time = needCreateTime;
            result.cost = needCreateImproved;
            result.requiredQuantity = {
              ordinary: 0,
              improved: requiredQuantity
            };
            result.useExisting = {
              ordinary: needCreateImproved,
              improved: material.stock.improved
            };
            result.currentStock = material.stock;
            result.stockAfter = {
              ordinary: material.stock.ordinary - needCreateImproved,
              improved: 0
            };
            result.purchaseOrdinary = {
              quantity: 0,
              cost: 0
            };
            result.createImproved = {
              quantity: needCreateImproved,
              time: needCreateTime,
              cost: needCreateCost
            };
          }
          //not enough improved and ordinary both, need purchase ordinary materials
          else if (dependency.isImproved &&
            requiredQuantity > material.stock.improved + material.stock.ordinary
          ) {
            let needPurchaseAndImprove =
              requiredQuantity - material.stock.improved - material.stock.ordinary;
            let needCreateTime = needPurchaseAndImprove * material.extraTime;
            let needCreateCost = needPurchaseAndImprove * material.extraCost;
            result.enough = false;
            result.time = needCreateTime;
            result.cost = needCreateCost + needPurchaseAndImprove*material.price;
            result.requiredQuantity = {
              ordinary: 0,
              improved: requiredQuantity
            };
            result.useExisting = {
              ordinary: material.stock.ordinary,
              improved: material.stock.improved
            };
            result.currentStock = material.stock;
            result.stockAfter = {
              ordinary: 0,
              improved: 0,
            };
            result.purchaseOrdinary = {
              quantity: needPurchaseAndImprove,
              cost: needPurchaseAndImprove * material.price
            };
            result.createImproved = {
              quantity: needPurchaseAndImprove,
              time: needCreateTime,
              cost: needCreateCost
            };
          }
          //not enough ordinary materials
          else {
            let needPurchase = requiredQuantity - material.stock.ordinary;
            result.enough = false;
            result.time = 0;
            result.cost = needPurchase * material.price;
            result.requiredQuantity = {
              ordinary: requiredQuantity,
              improved: 0
            };
            result.useExisting = {
              ordinary: material.stock.ordinary,
              improved: 0
            };
            result.currentStock = material.stock;
            result.stockAfter = {
              ordinary: 0,
              improved: material.stock.improved
            };
            result.purchaseOrdinary = {
              quantity: needPurchase,
              cost: needPurchase * material.price
            };
            result.createImproved = {
              quantity: 0,
              time: 0,
              cost: 0
            };
          }
          resolve(result);
        })
        .catch(err =>reject(this.onServerError(err)))
    })
  }

  stock(id, change) {
    return new Promise((resolve, reject) => {
      if (change < 0) {
        this.estimate(id, -change)
          .then(estimate => {
            if (estimate.enough) {
              this.reduceStock(id, change)
                .then(product => resolve({
                  success: true,
                  product: product,
                  estimate: null
                }))
                .catch(err =>reject(this.onServerError(err)))
            }
            else {
              resolve({
                success: false,
                product: null,
                estimate: estimate
              })
            }
          })
      }
      else {
        Promise.resolve()
          .then(() => this.get(id))
          .then(product => this.estimate(id, product.stock + change))
          .then(estimate => {
            let enoughMaterials = estimate.materials.every(material => material.enough);
            let enoughDetails = estimate.details.every(detail => detail.enough);
            if (enoughMaterials && enoughDetails) {
              this.increaseStock(id, change)
                .then(product => resolve({
                  success: true,
                  product: product,
                  estimate: false
                }))
                .catch(err =>reject(this.onServerError(err)))
            }
            else {
              resolve({
                success: false,
                product: null,
                estimate: estimate
              })
            }
          })
          .catch(err =>reject(this.onServerError(err)));
      }
    });
  }

  reduceStock(id, change) {
    return new Promise((resolve, reject) => {
      this.products
        .updateOne({
          _id: new this.ObjectID(idededed)
        }, {
          $inc: {stock: change}
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? this.get(id)
            : reject(new this.error.InternalServerError('Db error while reducing product stock'))
        })
        .then(product => resolve(product))
        .catch(err =>reject(this.onServerError(err)))
    });
  }

  increaseStock(id, change) {
    return new Promise((resolve, reject) => {
      let materials;
      let details;
      Promise.resolve()
        .then(() => this.get(id))
        .then(product => {
          materials = product.materials;
          details = product.details;
          return this.products
            .updateOne({
              _id: new this.ObjectID(id)
            }, {
              $inc: {stock: change}
            })
        })
        .then(response => {
          if (!response || !response.result || !response.result.ok) {
            return reject(new this.error.InternalServerError(
              'Db error while increasing product stock'
            ));
          }

          let promises = [];
          materials.forEach(material => {
            promises.push(this.reduceMaterialStock(
              material._id, material.quantity * change, material.isImproved
            ))
          });

          return Promise.all(promises);
        })
        .then(materialIds => {

          let promises = [];
          details.forEach(detail => {
            promises.push(this.reduceDetailStock(detail._id, detail.quantity * change));
          });

          return Promise.all(promises)
        })
        .then(detailIds => this.getTree(id))
        .then(product => resolve(product))
        .catch(err =>reject(this.onServerError(err)));
    });
  }

  reduceMaterialStock(id, change, isImproved) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.getMaterial(id))
        .then(material => {
          let type = isImproved
            ? 'improved'
            : 'ordinary';
          let update = {};
          update[`stock.${type}`] = -change;
          return this.materials.updateOne({
              _id: new this.ObjectID(id)
            }, {
              $inc: update
            })
        })
        .then(response => {
          return response && response.result && response.result.ok
            ? resolve(id)
            : reject(new this.error.InternalServerError(
              `Db error while reducing material '${id}' stock`
            ))
        })
        .catch(err =>reject(this.onServerError(err)));
    })
  }

  reduceDetailStock(id, change) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => this.get(id))
        .then(detail => this.products.updateOne({
            _id: new this.ObjectID(id)
          }, {
            $inc: {stock: -change}
          })
        )
        .then(response => {
          return response && response.result && response.result.ok
            ? resolve(id)
            : reject(new this.error.InternalServerError(
              `Db error while reducing detail '${id}' stock`
            ))
        })
        .catch(err =>reject(this.onServerError(err)));

    })
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
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
        .catch(err =>reject(this.onServerError(err)));
    })
  }

}

module.exports = Product;