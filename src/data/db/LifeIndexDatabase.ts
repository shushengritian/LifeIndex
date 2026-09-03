import Dexie, { type Table } from 'dexie'

import { createSeedCategories, createSeedSettings, seedCategoryIds } from '@/data/db/seeds'
import { CURRENT_DATABASE_VERSION, databaseSchemaV1 } from '@/data/db/schema'
import type {
  ActionReceipt,
  Category,
  FocusSession,
  Habit,
  HabitRecord,
  Setting,
  Transaction,
} from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'

export const DEFAULT_DATABASE_NAME = 'LifeIndexDB'

export class LifeIndexDatabase extends Dexie {
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  habits!: Table<Habit, string>
  habitRecords!: Table<HabitRecord, string>
  focusSessions!: Table<FocusSession, string>
  settings!: Table<Setting, Setting['key']>
  actionReceipts!: Table<ActionReceipt, string>

  constructor(name = DEFAULT_DATABASE_NAME) {
    super(name)
    this.version(CURRENT_DATABASE_VERSION).stores(databaseSchemaV1)
  }

  async initialize(now = new Date()): Promise<void> {
    logger.info('database.initialization.started', {
      operation: 'initialize',
      schemaVersion: CURRENT_DATABASE_VERSION,
    })

    try {
      await this.open()
      const insertedCount = await this.ensureSeedData(now.toISOString())
      logger.info('database.initialization.succeeded', {
        operation: 'initialize',
        schemaVersion: CURRENT_DATABASE_VERSION,
        count: insertedCount,
      })
    } catch (error) {
      logger.error('database.initialization.failed', error, {
        operation: 'initialize',
        schemaVersion: CURRENT_DATABASE_VERSION,
        failureClass: 'DatabaseInitialization',
      })
      this.close()
      throw new AppError('DatabaseInitialization', 'LifeIndex database could not initialize', {
        cause: error,
      })
    }
  }

  private async ensureSeedData(timestamp: string): Promise<number> {
    return this.transaction('rw', this.categories, this.settings, async () => {
      const categories = createSeedCategories(timestamp)
      const existingCategoryKeys = new Set(
        (await this.categories.bulkGet(seedCategoryIds))
          .filter((category): category is Category => category !== undefined)
          .map((category) => category.id),
      )
      const missingCategories = categories.filter(({ id }) => !existingCategoryKeys.has(id))

      const settings = createSeedSettings(timestamp)
      const existingSettingKeys = new Set(
        (await this.settings.bulkGet(settings.map(({ key }) => key)))
          .filter((setting): setting is Setting => setting !== undefined)
          .map((setting) => setting.key),
      )
      const missingSettings = settings.filter(({ key }) => !existingSettingKeys.has(key))

      // Seed only missing stable keys so reopening cannot overwrite user choices or duplicate defaults.
      if (missingCategories.length > 0) await this.categories.bulkAdd(missingCategories)
      if (missingSettings.length > 0) await this.settings.bulkAdd(missingSettings)

      const insertedCount = missingCategories.length + missingSettings.length
      logger.info(insertedCount > 0 ? 'database.seed.inserted' : 'database.seed.alreadypresent', {
        operation: 'seed',
        count: insertedCount,
      })
      return insertedCount
    })
  }
}
