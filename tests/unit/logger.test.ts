import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logger, type SafeLogContext } from '@/shared/logging/logger'

describe('safe logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('keeps allowlisted diagnostic metadata', () => {
    logger.info('repository.write.succeeded', {
      entityType: 'transaction',
      operation: 'create',
      count: 1,
    })

    expect(console.info).toHaveBeenCalledWith(
      '[LifeIndex] repository.write.succeeded',
      expect.objectContaining({ entityType: 'transaction', operation: 'create', count: 1 }),
    )
  })

  it('drops unapproved keys even when an untyped caller bypasses TypeScript', () => {
    logger.info('repository.write.started', {
      operation: 'create',
      amount: '35.00',
      note: 'private note',
    } as unknown as SafeLogContext)

    const payload = vi.mocked(console.info).mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload).not.toHaveProperty('amount')
    expect(payload).not.toHaveProperty('note')
  })

  it('reports an error class without its potentially sensitive message', () => {
    logger.error('backup.import.failed', new Error('private backup value'), {
      failureClass: 'Validation',
    })

    const payload = vi.mocked(console.error).mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload).toMatchObject({ errorName: 'Error', failureClass: 'Validation' })
    expect(JSON.stringify(payload)).not.toContain('private backup value')
  })

  it('replaces a free-form event that could contain personal data', () => {
    logger.info('Saved private journal title')

    expect(console.info).toHaveBeenCalledWith(
      '[LifeIndex] logging.event.rejected',
      expect.objectContaining({ correlationId: expect.any(String) }),
    )
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      'private journal title',
    )
  })
})
