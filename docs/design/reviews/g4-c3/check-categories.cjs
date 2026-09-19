// Test the actual category registry and policy with synthetic references, without storage or browser state.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict')
const context = vm.createContext({
  document: {
    addEventListener() {},
    querySelectorAll() {
      return []
    },
  },
  setTimeout(fn) {
    fn()
  },
  busy: false,
  failNext: false,
  log() {},
  error() {},
  fixtures: {
    transactions: [{ category: 'food', amount: 1200 }],
    activities: [{ type: 'walking', value: 30 }],
  },
  focusHistory: [{ category: 'reading', seconds: 1500 }],
  session: null,
})
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../prototypes/g4-icon-library.js'), 'utf8'),
  context,
)
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../../prototypes/g4-categories.js'), 'utf8'),
  context,
)
;(async () => {
  // Every selectable icon must be discoverable in a group; stable IDs survive filtering.
  assert.equal(vm.runInContext('Object.keys(categorySymbols).length', context), 42)
  assert.equal(
    vm.runInContext(
      'Object.keys(categorySymbols).every(id=>Object.values(categoryIconGroups).some(group=>group.ids.includes(id)))',
      context,
    ),
    true,
  )
  assert.equal(
    vm.runInContext(
      'Object.values(categoryIconGroups).every(group=>group.ids.every(id=>categorySymbols[id]))',
      context,
    ),
    true,
  )
  assert.equal(vm.runInContext('categoryIconGroupFor("cake")', context), 'dining')
  console.log('PASS: 42 icons, complete group coverage, stable icon group lookup')
  // Drill-down lists must never mix hierarchy levels or leak a finance parent into flat groups.
  assert.equal(context.categoryManagementItems().length, 4)
  assert.equal(
    context.categoryManagementItems().some((c) => c.parentId),
    false,
  )
  vm.runInContext("categoryParent='food'", context)
  assert.equal(context.categoryManagementItems().length, 2)
  assert.equal(
    context.categoryManagementItems().every((c) => c.parentId === 'food'),
    true,
  )
  vm.runInContext("categoryGroup='activity'", context)
  assert.equal(context.categoryManagementItems().length, 3)
  vm.runInContext("categoryGroup='income';categoryParent=null", context)
  assert.equal(context.categoryManagementItems().length, 1)
  vm.runInContext("categoryGroup='expense'", context)
  assert.equal(context.categoryAllowed('food', 'expense'), true)
  assert.equal(context.categoryAllowed('pay', 'expense'), false)
  // Root/leaf identity and archive inheritance must not invalidate a record's existing category.
  assert.equal(context.categoryLabel('food-breakfast'), '餐饮 / 早餐')
  assert.equal(context.categoryAllowed('food-breakfast', 'income'), false)
  const original = context.categoryFor('food')
  original.title = 'Synthetic renamed'
  assert.equal(context.categoryLabel('food'), 'Synthetic renamed')
  assert.equal(context.categoryReferences(original), 1)
  original.archived = true
  assert.equal(context.categoryAllowed('food-breakfast', 'expense'), false)
  assert.equal(context.categoryAllowed('food-breakfast', 'expense', 'food-breakfast'), true)
  assert.equal(
    context.categoryChoices('expense').some((c) => c.id === 'food-breakfast'),
    false,
  )
  assert.equal(
    context.categoryChoices('expense').some((c) => c.id === 'food'),
    false,
  )
  assert.equal(context.categoryAllowed('food', 'expense'), false)
  assert.equal(context.categoryAllowed('food', 'expense', 'food'), true)
  assert.equal(
    context.categoryChoices('expense', 'food').some((c) => c.id === 'food'),
    true,
  )
  assert.equal(context.fixtures.transactions[0].category, 'food')
  assert.equal(context.fixtures.transactions[0].amount, 1200)
  context.failNext = true
  assert.equal(
    await context.categoryWrite('restore', () => {
      original.archived = false
    }),
    false,
  )
  assert.equal(original.archived, true)
  assert.equal(
    await context.categoryWrite('restore', () => {
      original.archived = false
    }),
    true,
  )
  assert.equal(context.categoryAllowed('food', 'expense'), true)
  assert.equal(context.categoryAllowed('food-breakfast', 'expense'), true)
  assert.equal(context.categoryReferences(context.categoryFor('reading')), 1)
  assert.equal(context.categoryReferences(context.categoryFor('walking')), 1)
  console.log(
    'PASS: stable references, domain isolation, archived picker exclusion, historical retention, failed restore, retry, focus/activity references',
  )
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
