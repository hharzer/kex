const path = require('path')
const knex = require('knex')
const test = require('ava')

module.exports = () => {
  test.before(async t => {
    const connection = knex({
      client: 'sqlite',
      connection: ':memory:',
      migrations: {
        directory: path.join(__dirname, './migrations')
      },
      seeds: {
        directory: path.join(__dirname, './seeds')
      },
      useNullAsDefault: true
    })

    await connection.migrate.latest()
    await connection.seed.run()

    t.context.knex = connection
  })
}
