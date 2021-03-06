const test = require('ava')
const setupDb = require('./setup-db')
const { createKex } = require('./utils')
const { equalQueries } = require('./assertions')

setupDb()

test('proxy scope methods', t => {
  const kex = createKex(t)
  const User = kex.createModel('User', {
    scopes: {
      test: qb => qb.where('active', true)
    }
  })

  equalQueries(t, User.query().test(), User.test())
})

const proxyMacro = (t, options) => {
  const { expectedFn, actualFn } = options
  const User = createKex(t).createModel('User')

  equalQueries(t, expectedFn(User), actualFn(User))
}

test('where()', proxyMacro, {
  expectedFn: User => User.query().where({ active: true }),
  actualFn: User => User.where({ active: true })
})

test('insert()', proxyMacro, {
  expectedFn: User => User.query().insert({ active: true }),
  actualFn: User => User.insert({ active: true })
})

test('returning()', proxyMacro, {
  expectedFn: User => User.query().returning('id').insert({ active: true }),
  actualFn: User => User.returning('id').insert({ active: true })
})
