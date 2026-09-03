import { afterEach, describe, expect, it } from 'vitest'

import { backupFilename } from '@/data/backup/browserBackup'
import { applyAppearance } from '@/features/settings/appearance'

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('Settings utilities', () => {
  it('creates the documented local-time backup filename', () => {
    const localDate = new Date(2026, 8, 3, 14, 5)
    expect(backupFilename(localDate.toISOString())).toBe('lifeindex-backup-2026-09-03-1405.json')
  })

  it('applies explicit themes and removes the override for system mode', () => {
    applyAppearance('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyAppearance('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyAppearance('system')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
