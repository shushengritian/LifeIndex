import { Engine } from './database'
import { BACKUP_TABLES, backupCounts, validateBackupDocument } from './backup-schema'
import { coreLog, domainError, fail } from './errors'
import type {
  BackupData,
  BackupDocument,
  BackupFocusSummary,
  BackupPreview,
  LifeIndexServices,
} from './types'
import { LIMITS, integer, requireValue, uuid } from './validation'

async function snapshot(engine: Engine): Promise<BackupData> {
  const db = engine.db
  const [
    categories,
    transactions,
    weightEntries,
    activitySessions,
    habits,
    habitChecks,
    focusSessions,
    preferences,
  ] = await Promise.all([
    db.categories.toArray(),
    db.transactions.toArray(),
    db.weightEntries.toArray(),
    db.activitySessions.toArray(),
    db.habits.toArray(),
    db.habitChecks.toArray(),
    db.focusSessions.toArray(),
    db.preferences.toArray(),
  ])
  return {
    categories,
    transactions,
    weightEntries,
    activitySessions,
    habits,
    habitChecks,
    focusSessions,
    preferences,
  }
}
function focusCounts(data: BackupData): BackupFocusSummary {
  return {
    running: data.focusSessions.filter((row) => row.status === 'running').length,
    paused: data.focusSessions.filter((row) => row.status === 'paused' && !row.pendingCompletion)
      .length,
    awaitingSave: data.focusSessions.filter(
      (row) => row.status === 'paused' && row.pendingCompletion,
    ).length,
    completed: data.focusSessions.filter((row) => row.status === 'completed').length,
  }
}
async function readBlob(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('ReadFailure'))
    reader.readAsText(file)
  })
}
export function backupService(engine: Engine): LifeIndexServices['backup'] {
  const previews = new Map<
    string,
    { document: BackupDocument; preview: BackupPreview; createdMono: number }
  >()
  let restoring = false
  return {
    inspectFile: async (file) => {
      coreLog('inspect', 'entered')
      try {
        // Expired candidates no longer need to retain their potentially large in-memory data.
        for (const [token, candidate] of previews) {
          if (engine.clock.monotonicNow() - candidate.createdMono >= LIMITS.previewTtlMs)
            previews.delete(token)
        }
        requireValue(file instanceof Blob && file.size <= LIMITS.backupBytes && file.size > 0)
        let unknown: unknown
        try {
          unknown = JSON.parse(await readBlob(file))
        } catch {
          fail('Validation')
        }
        const document = validateBackupDocument(unknown)
        const target = await engine.read(() => snapshot(engine)),
          now = engine.capture(),
          token = engine.id()
        const preview: BackupPreview = {
          token,
          expiresAt: new Date(now.nowMs + LIMITS.previewTtlMs).toISOString(),
          exportedAt: document.exportedAt,
          appVersion: document.appVersion,
          sourceCounts: backupCounts(document.data),
          targetCounts: backupCounts(target.data),
          targetStamp: target.stamp,
          sourceFocus: focusCounts(document.data),
          targetFocus: focusCounts(target.data),
        }
        // Store our own copy: mutating the UI preview cannot change the validation or target stamp.
        previews.set(token, {
          document,
          preview: structuredClone(preview),
          createdMono: engine.clock.monotonicNow(),
        })
        coreLog('inspect', 'ready')
        return preview
      } catch (error) {
        const safe = domainError(error, 'ReadFailure')
        coreLog('inspect', 'failed', safe.code)
        throw safe
      }
    },
    cancelPreview: (token) => {
      if (restoring) {
        coreLog('inspect', 'failed', 'Busy')
        fail('Busy')
      }
      previews.delete(token)
      coreLog('inspect', 'cancelled')
    },
    restore: async (token) => {
      coreLog('restore', 'entered')
      let ownsLock = false
      try {
        if (restoring) fail('Busy')
        uuid(token)
        const candidate = previews.get(token)
        if (!candidate) fail('PreviewExpired')
        if (engine.clock.monotonicNow() - candidate.createdMono >= LIMITS.previewTtlMs) {
          previews.delete(token)
          fail('PreviewExpired')
        }
        restoring = true
        ownsLock = true
        await engine.ready()
        const result = await engine.db.transaction('rw', engine.db.tables, async () => {
          const meta = await engine.getMeta(),
            expected = candidate.preview.targetStamp
          if (meta.generation !== expected.generation || meta.revision !== expected.revision)
            fail('PreviewStale')
          const document = validateBackupDocument(candidate.document)
          // Every clear/insert and the new generation share the same transaction; any abort restores all nine tables.
          for (const table of BACKUP_TABLES) {
            await engine.db.table(table).clear()
            await engine.db.table(table).bulkAdd(document.data[table])
          }
          const actual = backupCounts(await snapshot(engine))
          requireValue(BACKUP_TABLES.every((table) => actual[table] === document.counts[table]))
          const next = {
            ...meta,
            generation: engine.id(),
            revision: integer(meta.revision + 1, 0, Number.MAX_SAFE_INTEGER),
          }
          await engine.db.meta.put(next)
          return {
            data: { counts: actual },
            stamp: { generation: next.generation, revision: next.revision },
          }
        })
        previews.delete(token)
        coreLog('restore', 'committed')
        return result
      } catch (error) {
        const safe = domainError(error, 'WriteFailure')
        coreLog('restore', 'failed', safe.code)
        throw safe
      } finally {
        // A rejected concurrent caller must not release the first caller's in-flight lock.
        if (ownsLock) restoring = false
      }
    },
    exportSnapshot: async () => {
      coreLog('export', 'entered')
      try {
        const data = await engine.read(() => snapshot(engine)),
          clock = engine.capture(),
          exportedAt = new Date(clock.nowMs).toISOString()
        const document: BackupDocument = {
          format: 'lifeindex-v4-backup',
          formatVersion: 1,
          schemaVersion: 1,
          appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '4.0.0',
          exportedAt,
          source: { utcOffsetMinutes: clock.utcOffsetMinutes, locale: 'zh-CN' },
          counts: backupCounts(data.data),
          data: data.data,
        }
        validateBackupDocument(document)
        const blob = new Blob([JSON.stringify(document)], { type: 'application/json' })
        requireValue(blob.size <= LIMITS.backupBytes)
        coreLog('export', 'ready')
        return {
          blob,
          filename: `lifeindex-v4-${exportedAt.slice(0, 10)}.json`,
          exportedAt,
          stamp: data.stamp,
          counts: document.counts,
        }
      } catch (error) {
        const safe = domainError(error, 'ReadFailure')
        coreLog('export', 'failed', safe.code)
        throw safe
      }
    },
  }
}
