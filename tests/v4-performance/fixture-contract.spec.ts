import { test, expect } from '@playwright/test'
import { BACKUP_TABLES, validateBackupDocument } from '../../src/core/backup-schema'
import { createFixture } from './fixtures'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { buildInventory } from './artifacts'

// This separate, browser-free author check does not navigate, launch Chromium, or collect performance data.
for (const baseDate of ['2026-09-29', '2026-10-01', '2028-03-01']) {
  test(`synthetic fixtures obey V4 schema and counts on ${baseDate}`, () => {
    for (const dataset of ['F0', 'F1', 'F3'] as const) {
      const exportedAt = `${baseDate}T00:00:00.000Z`
      const fixture = createFixture(dataset, baseDate, exportedAt)
      const document = validateBackupDocument({
        format: 'lifeindex-v4-backup',
        formatVersion: 1,
        schemaVersion: 1,
        appVersion: '4.0.0',
        exportedAt,
        source: { utcOffsetMinutes: 480, locale: 'zh-CN' },
        counts: Object.fromEntries(BACKUP_TABLES.map((key) => [key, fixture.tables[key].length])),
        data: Object.fromEntries(BACKUP_TABLES.map((key) => [key, fixture.tables[key]])),
      })
      expect(document.counts.transactions).toBe(
        dataset === 'F0' ? 0 : dataset === 'F1' ? 30 : 10_000,
      )
      if (dataset === 'F1') {
        expect(document.data.transactions.filter((row) => row.type === 'expense')).toHaveLength(24)
        expect(fixture.expected.completed).toBe(2)
        expect(fixture.expected.scheduled).toBe(6)
      }
      console.info('[LifeIndex performance] fixture.contract-verified', { dataset })
    }
  })
}

test('artifact inventory includes nested chunks, root SW and quoted precache URLs', () => {
  const root = mkdtempSync(join(tmpdir(), 'lifeindex-v4-perf-inventory-'))
  try {
    mkdirSync(join(root, 'assets', 'nested'), { recursive: true })
    const files = {
      'index.html': '<script type="module" src="/LifeIndex/assets/main.js"></script>',
      'assets/main.js': 'export const main = 1;',
      'assets/nested/lazy.js': 'export const lazy = 2;',
      'assets/theme.css': ':root { color: black; }',
      'sw.js':
        'const manifest = [{"revision":null,"url":"assets/main.js"},{"revision":"1","url":"index.html"}];',
    }
    for (const [name, value] of Object.entries(files)) writeFileSync(join(root, name), value)
    const inventory = buildInventory(root)
    expect(inventory.basePath).toBe('/LifeIndex/')
    expect(inventory.precache).toEqual(['assets/main.js', 'index.html'])
    expect(inventory.totals.javascriptGzip).toBe(
      Object.entries(files)
        .filter(([name]) => name.endsWith('.js'))
        .reduce((sum, [, value]) => sum + gzipSync(value).length, 0),
    )
    expect(inventory.totals.cssGzip).toBe(gzipSync(files['assets/theme.css']).length)
    writeFileSync(join(root, 'assets/nested/lazy.js'), 'export const lazy = 3;')
    expect(buildInventory(root).buildHash).not.toBe(inventory.buildHash)
    console.info('[LifeIndex performance] artifact.contract-verified', {
      files: inventory.files.length,
    })
  } finally {
    // Only the synthetic temporary directory created by this test is removed.
    rmSync(root, { recursive: true, force: true })
  }
})
