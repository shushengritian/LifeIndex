import type { Table } from 'dexie'

import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { calculateCounts, storeKeys, validateBackup } from '@/data/backup/schema'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { BackupData, LifeIndexBackupV2 } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024
const PREVIEW_TTL_MILLISECONDS = 15 * 60 * 1000

export interface BackupPreview {
  token: string
  formatVersion: 2
  appVersion: string
  exportedAt: string
  counts: LifeIndexBackupV2['counts']
  expiresAt: string
}

export interface RestoreResult {
  counts: LifeIndexBackupV2['counts']
}

interface PreviewEntry {
  backup: LifeIndexBackupV2
  expiresAtMilliseconds: number
}

function sortByKey<T>(values: T[], selectKey: (value: T) => string): T[] {
  return values.sort((left, right) => selectKey(left).localeCompare(selectKey(right)))
}

export class BackupService {
  private readonly previews = new Map<string, PreviewEntry>()

  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly appVersion: string,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async createSnapshot(locale = navigator.language || 'zh-CN'): Promise<LifeIndexBackupV2> {
    logger.info('backup.export.started', { operation: 'snapshot', formatVersion: 2 })

    try {
      const data = await this.readConsistentData()
      const now = this.clock.now()
      const backup: LifeIndexBackupV2 = {
        format: 'lifeindex-backup',
        formatVersion: 2,
        appVersion: this.appVersion,
        exportedAt: now.toISOString(),
        source: {
          timezoneOffsetMinutes: now.getTimezoneOffset(),
          locale,
        },
        counts: calculateCounts(data),
        data,
      }
      const canonical = validateBackup(backup)
      logger.info('backup.export.succeeded', {
        operation: 'snapshot',
        formatVersion: 2,
        count: Object.values(canonical.counts).reduce((sum, count) => sum + count, 0),
      })
      return canonical
    } catch (error) {
      logger.error('backup.export.failed', error, {
        operation: 'snapshot',
        formatVersion: 2,
        failureClass: 'BackupExport',
      })
      throw error instanceof AppError
        ? error
        : new AppError('BackupExport', 'Backup snapshot could not be created', { cause: error })
    }
  }

  serialize(backup: LifeIndexBackupV2): string {
    return `${JSON.stringify(validateBackup(backup), null, 2)}\n`
  }

  inspectText(text: string, byteLength = new TextEncoder().encode(text).byteLength): BackupPreview {
    logger.info('backup.import.inspectionstarted', { operation: 'inspect', formatVersion: 2 })
    if (byteLength > MAX_BACKUP_BYTES) {
      logger.warn('backup.import.rejected', {
        operation: 'inspect',
        reason: 'FileTooLarge',
        failureClass: 'BackupRead',
      })
      throw new AppError('BackupRead', 'Backup file is too large')
    }

    let input: unknown
    try {
      input = JSON.parse(text)
    } catch (error) {
      logger.error('backup.import.parsefailed', error, {
        operation: 'inspect',
        failureClass: 'BackupRead',
      })
      throw new AppError('BackupRead', 'Backup JSON could not be parsed', { cause: error })
    }

    try {
      const backup = validateBackup(input)
      const token = this.idGenerator.next()
      const expiresAtMilliseconds = this.clock.now().getTime() + PREVIEW_TTL_MILLISECONDS
      this.previews.set(token, { backup, expiresAtMilliseconds })
      logger.info('backup.import.inspectionsucceeded', {
        operation: 'inspect',
        formatVersion: backup.formatVersion,
        count: Object.values(backup.counts).reduce((sum, count) => sum + count, 0),
      })
      return {
        token,
        formatVersion: 2,
        appVersion: backup.appVersion,
        exportedAt: backup.exportedAt,
        counts: backup.counts,
        expiresAt: new Date(expiresAtMilliseconds).toISOString(),
      }
    } catch (error) {
      const failure =
        error instanceof AppError
          ? error
          : new AppError('Validation', 'Backup validation failed', { cause: error })
      logger.error('backup.import.validationfailed', error, {
        operation: 'inspect',
        failureClass: failure.failureClass,
      })
      throw failure
    }
  }

  async restore(token: string): Promise<RestoreResult> {
    logger.info('backup.restore.started', { operation: 'replace', formatVersion: 2 })
    const entry = this.previews.get(token)
    if (!entry || entry.expiresAtMilliseconds < this.clock.now().getTime()) {
      this.previews.delete(token)
      logger.warn('backup.restore.tokenrejected', {
        operation: 'replace',
        failureClass: 'RestoreToken',
      })
      throw new AppError('RestoreToken', 'Restore preview is missing or expired')
    }

    const backup = validateBackup(entry.backup)
    try {
      await this.replaceData(backup)
      this.previews.delete(token)
      logger.info('backup.restore.succeeded', {
        operation: 'replace',
        formatVersion: backup.formatVersion,
        count: Object.values(backup.counts).reduce((sum, count) => sum + count, 0),
      })
      return { counts: backup.counts }
    } catch (error) {
      logger.error('backup.restore.failed', error, {
        operation: 'replace',
        formatVersion: backup.formatVersion,
        failureClass: 'RestoreWrite',
      })
      throw new AppError('RestoreWrite', 'Restore failed and existing data was retained', {
        cause: error,
      })
    }
  }

  cancel(token: string): void {
    const removed = this.previews.delete(token)
    logger.info('backup.restore.cancelled', {
      operation: 'cancel',
      reason: removed ? 'PreviewRemoved' : 'PreviewMissing',
    })
  }

  private async readConsistentData(): Promise<BackupData> {
    const tables: Table[] = [
      this.database.categories,
      this.database.transactions,
      this.database.habits,
      this.database.habitRecords,
      this.database.focusSessions,
      this.database.settings,
      this.database.actionReceipts,
      this.database.weightEntries,
      this.database.activitySessions,
    ]

    return this.database.transaction('r', tables, async () => ({
      categories: sortByKey(await this.database.categories.toArray(), ({ id }) => id),
      transactions: sortByKey(await this.database.transactions.toArray(), ({ id }) => id),
      habits: sortByKey(await this.database.habits.toArray(), ({ id }) => id),
      habitRecords: sortByKey(await this.database.habitRecords.toArray(), ({ id }) => id),
      focusSessions: sortByKey(await this.database.focusSessions.toArray(), ({ id }) => id),
      settings: sortByKey(await this.database.settings.toArray(), ({ key }) => key),
      actionReceipts: sortByKey(
        await this.database.actionReceipts.toArray(),
        ({ actionId }) => actionId,
      ),
      weightEntries: sortByKey(await this.database.weightEntries.toArray(), ({ id }) => id),
      activitySessions: sortByKey(await this.database.activitySessions.toArray(), ({ id }) => id),
    }))
  }

  private async replaceData(backup: LifeIndexBackupV2): Promise<void> {
    const tables: Table[] = storeKeys.map((key) => this.database[key])
    await this.database.transaction('rw', tables, async () => {
      // One transaction makes clear-and-replace all-or-nothing across every business store.
      await Promise.all(tables.map((table) => table.clear()))
      await this.addIfPresent(this.database.categories, backup.data.categories)
      await this.addIfPresent(this.database.habits, backup.data.habits)
      await this.addIfPresent(this.database.transactions, backup.data.transactions)
      await this.addIfPresent(this.database.habitRecords, backup.data.habitRecords)
      await this.addIfPresent(this.database.focusSessions, backup.data.focusSessions)
      await this.addIfPresent(this.database.settings, backup.data.settings)
      await this.addIfPresent(this.database.actionReceipts, backup.data.actionReceipts)
      await this.addIfPresent(this.database.weightEntries, backup.data.weightEntries)
      await this.addIfPresent(this.database.activitySessions, backup.data.activitySessions)

      const actualCounts = calculateCounts({
        categories: await this.database.categories.toArray(),
        transactions: await this.database.transactions.toArray(),
        habits: await this.database.habits.toArray(),
        habitRecords: await this.database.habitRecords.toArray(),
        focusSessions: await this.database.focusSessions.toArray(),
        settings: await this.database.settings.toArray(),
        actionReceipts: await this.database.actionReceipts.toArray(),
        weightEntries: await this.database.weightEntries.toArray(),
        activitySessions: await this.database.activitySessions.toArray(),
      })
      if (storeKeys.some((key) => actualCounts[key] !== backup.counts[key])) {
        throw new AppError('RestoreWrite', 'Restored store counts do not match')
      }
    })
  }

  private async addIfPresent<T, TKey>(table: Table<T, TKey>, values: T[]): Promise<void> {
    if (values.length > 0) await table.bulkAdd(values)
  }
}
