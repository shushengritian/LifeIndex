import { BackupService } from '@/data/backup/BackupService'
import { logger } from '@/shared/logging/logger'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function backupFilename(exportedAt: string): string {
  const date = new Date(exportedAt)
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid backup timestamp')
  return `lifeindex-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`
}

export async function exportBackupToDevice(service: BackupService): Promise<string> {
  logger.info('backup.handoff.started', { operation: 'export', formatVersion: 1 })
  const backup = await service.createSnapshot(navigator.language || 'zh-CN')
  const filename = backupFilename(backup.exportedAt)
  const file = new File([service.serialize(backup)], filename, { type: 'application/json' })

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      logger.info('backup.handoff.shareselected', { operation: 'share', formatVersion: 1 })
      await navigator.share({ files: [file], title: 'LifeIndex 备份' })
    } else {
      logger.info('backup.handoff.downloadselected', { operation: 'download', formatVersion: 1 })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = filename
        document.body.append(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        URL.revokeObjectURL(url)
      }
    }
    logger.info('backup.handoff.succeeded', { operation: 'export', formatVersion: 1 })
    return backup.exportedAt
  } catch (error) {
    logger.error('backup.handoff.failed', error, {
      operation: 'export',
      formatVersion: 1,
      failureClass: 'BackupExport',
    })
    throw error
  }
}
