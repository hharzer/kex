const DataLoader = require('dataloader')
const pluralize = require('pluralize')
const Relation = require('./relation')
const { mapToMany, prop, noop, omit } = require('../utils')

/** @typedef {import('../model')} Model */

const omitPivotFields = groupedRows => groupedRows.map(
  rows => rows.map(
    item => omit(item, ['pivot__foreign_id'])
  )
)

class BelongsToMany extends Relation {
  /**
   * @param {String} related
   * @param {Object} [options]
   * @param {String} [options.table]
   * @param {String} [options.foreignPivotKey] the key used in the pivot table,
   *                                           referencing the parent model
   * @param {String} [options.relatedPivotKey] the key used in the pivot table,
   *                                           referencing the related model
   * @param {String} [options.parentKey]       the parent model key used
   *                                           to retrieve the related models
   * @param {String} [options.relatedKey]      the related model key
   */
  constructor (related, options = {}) {
    super()

    this.related = related
    this.options = options
  }

  /**
   * @param {import('../model')} Model
   * @param {import('../query-builder').Scope} [scope]
   * @return {DataLoader}
   */
  createDataLoader (Model, scope = noop) {
    const { options } = this
    const { kex } = Model

    const foreignPivotKey = options.foreignPivotKey || this.getForeignKeyName(Model)
    const parentKey = options.parentKey || Model.primaryKey

    const Related = kex.getModel(this.related)
    const relatedPivotKey = options.relatedPivotKey || this.getForeignKeyName(Related)
    const relatedKey = options.relatedKey || Related.primaryKey

    const table = options.table || this.getTableName(Model, Related)

    const loader = new DataLoader(keys => {
      const query = Related.query()
        .join(table, `${table}.${relatedPivotKey}`, `${Related.tableName}.${relatedKey}`)
        .select(
          `${Related.tableName}.*`,
          `${table}.${foreignPivotKey} AS pivot__foreign_id`
        )
        .whereIn(`${table}.${foreignPivotKey}`, keys)

      scope(query)

      return query.then(mapToMany(keys, prop('pivot__foreign_id')))
        .then(omitPivotFields)
    })

    return model => loader.load(model[parentKey])
  }

  /**
   * @param {Model} Model
   * @param {Model} Related
   * @return {String}
   */
  getTableName (Model, Related) {
    const names = [Model.tableName, Related.tableName]

    return names.map(name => pluralize.singular(name))
      .sort()
      .join('_')
  }
}

module.exports = BelongsToMany
