const pluralize = require('pluralize')
const snakeCase = require('lodash.snakecase')
const QueryBuilder = require('./query-builder')
const { toScope } = require('./utils')
const { KexError } = require('./errors')

/** @typedef { import('./plugins/soft-deletes').SoftDeleteOptions } SoftDeleteOptions */
/** @typedef { import('./relations/relation') } Relation */
/** @typedef { import('./query-builder').Scope } Scope */

/**
 * @typedef {Object} ModelOptions
 * @property {String} [tableName]
 * @property {String} [primaryKey=id]
 * @property {Boolean | SoftDeleteOptions} [softDeletes=false]
 * @property {Object.<String, Object>} [relations]
 * @property {PluginFactory[]} [plugins]
 * @property {Object.<String,Scope>} [scopes]
 * @property {Object.<String,Scope>} [globalScopes]
 * @property {Object.<String,Relation>} [relations]
 */

/**
 * @typedef {Object} ExtendOptions
 * @property {String} methodName
 * @property {Function} fn
 * @property {Boolean} [queryProxy=false] should the function
 *                                        be proxied to the QueryBuilder?
 */

class Model {
  /**
   * @param {import('./kex')} kex
   * @param {String} name
   * @param {ModelOptions} options
   */
  constructor (kex, name, options = {}) {
    this.name = name
    this.kex = kex
    this.options = options
    this.QueryBuilder = QueryBuilder.createChildClass(this)
    this.booted = false
  }

  get tableName () {
    const { tableName } = this.options
    return tableName || snakeCase(pluralize.plural(this.name))
  }

  get primaryKey () {
    const { primaryKey } = this.options
    return primaryKey || 'id'
  }

  query () {
    this.bootIfNotBooted()

    const { knex } = this.kex
    return this.QueryBuilder.create(knex.client)
  }

  /**
   * @param {ExtendOptions} options
   */
  extend (options) {
    const { methodName, fn, queryProxy = false } = options

    if (this[methodName]) {
      throw new KexError(`Can't overwrite method [${methodName}] in ${this.name} model`)
    }

    if (queryProxy) {
      this.QueryBuilder.extend({ methodName, fn })
      this[methodName] = (...args) => {
        const query = this.query()
        return query[methodName](...args)
      }
    } else {
      this[methodName] = (...args) => {
        return fn.call(this, ...args)
      }
    }
  }

  addScope (name, fn) {
    this.extend({
      methodName: name,
      fn: toScope(fn),
      queryProxy: true
    })

    return this
  }

  /**
   * @private
   */
  bootIfNotBooted () {
    if (this.booted) {
      return
    }

    const {
      scopes = {},
      globalScopes = {}
    } = this.options

    Object.entries(scopes)
      .forEach(([name, fn]) => this.addScope(name, fn))

    Object.entries(globalScopes)
      .forEach(([name, fn]) => this.QueryBuilder.addGlobalScope(name, fn))

    this.booted = true
  }
}

module.exports = Model
