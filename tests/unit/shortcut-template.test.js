import { describe, expect, it } from 'vitest'
import { URL, URLSearchParams } from 'node:url'
import { buildShortcut } from '../../scripts/build-shortcut.mjs'
import { modelShortcut } from '../../scripts/shortcut-test-runtime.mjs'
import { parseActionRoute } from '../../src/app/actions/actionParser'

const root = 'category-finance-food-v1'
const child = '12345678-1234-4123-8123-123456789012'
const income = 'category-finance-income-v1'
const config = () => ({
  format: 'lifeindex-shortcut-categories',
  version: 1,
  categories: [
    { id: root, domain: 'finance', type: 'expense', name: '同名', parentId: null, available: true },
    {
      id: child,
      domain: 'finance',
      type: 'expense',
      name: '同名',
      parentId: root,
      available: true,
    },
    {
      id: income,
      domain: 'finance',
      type: 'income',
      name: '收入',
      parentId: null,
      available: true,
    },
  ],
})
const actions = buildShortcut().WFWorkflowActions
const run = (options = {}) =>
  modelShortcut(actions, {
    config: config(),
    ocr: '实付金额 12.34\n交易时间 2026-09-19 10:45',
    ...options,
  })

describe('native shortcut candidate wiring (model, not Apple runtime)', () => {
  it('serializes text inputs as token strings instead of empty native display fields', () => {
    for (const item of actions) {
      if (
        /\.(text\.replace|text\.match|text\.split|urlencode|openurl)$/.test(
          item.WFWorkflowActionIdentifier,
        )
      ) {
        expect(item.WFWorkflowActionParameters.WFInput.WFSerializationType).toBe(
          'WFTextTokenString',
        )
      }
      if (item.WFWorkflowActionIdentifier.endsWith('.text.replace')) {
        expect(item.WFWorkflowActionParameters.WFReplaceTextReplace.WFSerializationType).toBe(
          'WFTextTokenString',
        )
      }
      if (item.WFWorkflowActionIdentifier.endsWith('.format.date')) {
        expect(item.WFWorkflowActionParameters.WFDate.WFSerializationType).toBe('WFTextTokenString')
      }
    }
  })
  it('passes a child category and individually encoded fields to the real App parser', () => {
    const result = run()
    expect(result.stopped).toBe(false)
    expect(result.opened).toHaveLength(1)
    const url = new URL(result.opened[0])
    const params = new URLSearchParams(url.hash.split('?')[1])
    expect([...params.keys()]).toEqual(['actionId', 'amount', 'occurredAt', 'categoryId', 'type'])
    expect(params.get('categoryId')).toBe(child)
    expect(params.get('occurredAt')).toBe('2026-09-19T10:45:00+08:00')
    const parsed = parseActionRoute('add-transaction', `?${params.toString()}`)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.action.draft.amountMinor).toBe(1234)
    expect(result.opened[0]).not.toContain('实付')
    expect(result.prompts).toEqual(['Text', 'Date and Time'])
  })
  it('supports root-only selection and income without a child prompt', () => {
    const rootOnly = run({
      choose: (items, prompt) => (prompt.includes('二级') ? items.at(-1) : items[0]),
    })
    expect(rootOnly.opened[0]).toContain(`categoryId=${root}`)
    const receipt = run({
      choose: (items, prompt) => (prompt.includes('支出还是收入') ? '收入' : items[0]),
    })
    expect(receipt.opened[0]).toContain(`categoryId=${income}&type=income`)
  })
  it.each([
    [
      'version',
      (c) => {
        c.version = 2
      },
    ],
    [
      'empty',
      (c) => {
        c.categories = []
      },
    ],
    [
      'duplicate ID',
      (c) => {
        c.categories.push({ ...c.categories[0] })
      },
    ],
    [
      'missing parent',
      (c) => {
        c.categories[1].parentId = 'category-finance-missing-v1'
      },
    ],
    [
      'cross-type parent',
      (c) => {
        c.categories[1].parentId = income
      },
    ],
    [
      'cycle',
      (c) => {
        c.categories[0].parentId = child
      },
    ],
    [
      'self parent',
      (c) => {
        c.categories[1].parentId = child
      },
    ],
    [
      'archived',
      (c) => {
        c.categories[1].available = false
      },
    ],
    [
      'unknown domain',
      (c) => {
        c.categories[0].domain = 'focus'
      },
    ],
    [
      'invalid ID',
      (c) => {
        c.categories[0].id = '../unsafe'
      },
    ],
  ])('stops before URL handoff for %s configuration', (_, mutate) => {
    const c = config()
    mutate(c)
    const result = run({ config: c })
    expect(result.stopped).toBe(true)
    expect(result.opened).toEqual([])
  })
  it.each(['0', '-5', '1O.00', '1.234', '1&note=bad'])(
    'rejects invalid confirmed amount %s',
    (amount) => {
      expect(run({ amount }).opened).toEqual([])
    },
  )
  it('rejects multiple screenshots and does not contain upload or private-output actions', () => {
    expect(run({ shared: ['image-a', 'image-b'] }).stopped).toBe(true)
    expect(run({ shared: ['image-a'] }).opened).toHaveLength(1)
    expect(
      actions.some((a) =>
        /downloadurl|notification|savetocameraroll|setclipboard|runjavascript|runshellscript/.test(
          a.WFWorkflowActionIdentifier,
        ),
      ),
    ).toBe(false)
    expect(
      actions.filter((a) => a.WFWorkflowActionIdentifier.endsWith('.number.random')),
    ).toHaveLength(6)
  })
})
