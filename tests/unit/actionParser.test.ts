import { describe, expect, it } from 'vitest'

import { parseActionRoute } from '@/app/actions/actionParser'
import { toLocalDateKey } from '@/shared/domain/date'
import { FIXED_NOW } from '../fixtures/builders'

const ACTION_ID = '00000000-0000-4000-8000-000000000101'

describe('fragment URL action parser', () => {
  it('rejects a retired financial action before reading its payload', () => {
    expect(parseActionRoute('add-transaction', '?actionId=' + ACTION_ID + '&amount=35.10')).toEqual(
      { ok: false, reason: 'UnknownAction' },
    )
  })

  it('defaults habit date and focus duration at parse time', () => {
    const now = new Date(FIXED_NOW)
    expect(
      parseActionRoute(
        'check-habit',
        `?actionId=${ACTION_ID}&habitId=00000000-0000-4000-8000-000000000002`,
        now,
      ),
    ).toMatchObject({
      ok: true,
      action: { type: 'check-habit', localDate: toLocalDateKey(now) },
    })
    expect(
      parseActionRoute(
        'start-focus',
        `?actionId=${ACTION_ID}&title=%E5%90%88%E6%88%90%E9%98%85%E8%AF%BB`,
        now,
      ),
    ).toMatchObject({
      ok: true,
      action: {
        type: 'start-focus',
        draft: { title: '合成阅读', plannedDurationSeconds: 1500 },
      },
    })
  })

  it.each([
    ['unknown action', 'delete-everything', `?actionId=${ACTION_ID}`, 'UnknownAction'],
    ['unknown field', 'start-focus', `?actionId=${ACTION_ID}&title=test&extra=1`, 'InvalidField'],
    [
      'duplicate field',
      'check-habit',
      `?actionId=${ACTION_ID}&habitId=00000000-0000-4000-8000-000000000002&habitId=00000000-0000-4000-8000-000000000003`,
      'DuplicateField',
    ],
    [
      'malformed encoding',
      'start-focus',
      `?actionId=${ACTION_ID}&title=%E0%A4%A`,
      'MalformedEncoding',
    ],
    [
      'uppercase UUID',
      'start-focus',
      '?actionId=AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA&title=test',
      'InvalidField',
    ],
    [
      'prototype key',
      'start-focus',
      `?actionId=${ACTION_ID}&title=test&__proto__=polluted`,
      'InvalidField',
    ],
    [
      'impossible local date',
      'check-habit',
      `?actionId=${ACTION_ID}&habitId=00000000-0000-4000-8000-000000000002&localDate=2026-02-30`,
      'InvalidField',
    ],
  ])('rejects %s', (_label, type, search, reason) => {
    expect(parseActionRoute(type, search, new Date(FIXED_NOW))).toEqual({ ok: false, reason })
  })
})
