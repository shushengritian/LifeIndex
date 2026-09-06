import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Setting } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { settingSchema } from '@/shared/validation/schemas'

export class SettingsRepository {
  constructor(private readonly database: LifeIndexDatabase) {}

  async get(key: Setting['key']): Promise<Setting | undefined> {
    logger.info('settings.read.started', { entityType: 'setting', operation: 'read' })
    try {
      const setting = await this.database.settings.get(key)
      logger.info('settings.read.succeeded', {
        entityType: 'setting',
        operation: 'read',
        count: setting ? 1 : 0,
      })
      return setting
    } catch (error) {
      logger.error('settings.read.failed', error, {
        entityType: 'setting',
        operation: 'read',
        failureClass: 'DatabaseRead',
      })
      throw new AppError('DatabaseRead', 'Setting could not be read', { cause: error })
    }
  }

  async put(setting: Setting): Promise<Setting> {
    logger.info('settings.write.started', { entityType: 'setting', operation: 'write' })
    try {
      const parsed = settingSchema.safeParse(setting)
      if (!parsed.success) throw new AppError('Validation', 'Setting validation failed')
      const canonical = parsed.data as Setting
      await this.database.settings.put(canonical)
      logger.info('settings.write.succeeded', {
        entityType: 'setting',
        operation: 'write',
        count: 1,
      })
      return canonical
    } catch (error) {
      logger.error('settings.write.failed', error, {
        entityType: 'setting',
        operation: 'write',
        failureClass: error instanceof AppError ? error.failureClass : 'DatabaseWrite',
      })
      throw error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Setting could not be written', { cause: error })
    }
  }

  async remove(key: Setting['key']): Promise<void> {
    logger.info('settings.delete.started', { entityType: 'setting', operation: 'delete' })
    try {
      const existing = await this.database.settings.get(key)
      await this.database.settings.delete(key)
      logger.info('settings.delete.succeeded', {
        entityType: 'setting',
        operation: 'delete',
        count: existing ? 1 : 0,
      })
    } catch (error) {
      logger.error('settings.delete.failed', error, {
        entityType: 'setting',
        operation: 'delete',
        failureClass: 'DatabaseWrite',
      })
      throw new AppError('DatabaseWrite', 'Setting could not be deleted', { cause: error })
    }
  }
}
