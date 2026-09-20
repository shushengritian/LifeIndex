import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { BackupService, MAX_BACKUP_BYTES, type BackupPreview } from '@/data/backup/BackupService'
import { exportBackupToDevice } from '@/data/backup/browserBackup'
import { CURRENT_DATABASE_VERSION } from '@/data/db/schema'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import { applyAppearance } from '@/features/settings/appearance'
import type { Appearance } from '@/shared/domain/types'
import { CategoryManager } from '@/features/settings/CategoryManager'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { usePwa } from '@/pwa/PwaContext'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Icon, type IconName } from '@/shared/ui/Icon'

const appearances: Array<{ value: Appearance; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const detailTitles = {
  appearance: '主题外观',
  export: '导出备份',
  restore: '从备份恢复',
  about: '关于 LifeIndex',
} as const
type SettingsView = keyof typeof detailTitles | 'home'

export function SettingsDetailPage() {
  const { section = '' } = useParams()
  // Route keys deliberately remount ephemeral previews; navigation guards protect pending work first.
  return Object.hasOwn(detailTitles, section) ? (
    <SettingsPage key={section} view={section as keyof typeof detailTitles} />
  ) : (
    <Navigate to="/settings" replace />
  )
}

export function SettingsPage({ view = 'home' }: { view?: SettingsView }) {
  useEffect(() => {
    // Only a whitelisted view name is logged, never query parameters or backup metadata.
    logger.info('settings.view.opened', { operation: 'open', toState: view })
  }, [view])
  const { database } = useAppServices()
  const { state: pwaState } = usePwa()
  const settings = useMemo(() => new SettingsRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const backup = useMemo(() => new BackupService(database, __APP_VERSION__), [database])
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupPreview>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const operationLock = useRef(false)
  const [restoreConfirmation, setRestoreConfirmation] = useState(false)

  // One synchronous lock covers settings writes and backup commands before React disables controls.
  function beginOperation(operation: string) {
    if (operationLock.current) {
      logger.info('settings.operation.blocked', { operation, reason: 'busy' })
      return false
    }
    operationLock.current = true
    setWorking(true)
    logger.info('settings.operation.started', { operation })
    return true
  }

  function finishOperation() {
    operationLock.current = false
    setWorking(false)
  }

  // Preview can be dismissed; an in-flight inspect/export/restore must finish first.
  useDirtyForm(Boolean(preview), working)

  const query = useCallback(async () => {
    const [appearance, lastExport, financeCategories, focusCategories, activityCategories] =
      await Promise.all([
        settings.get('appearance'),
        settings.get('lastSuccessfulExportAt'),
        categories.list({ domain: 'finance', includeArchived: true }),
        categories.list({ domain: 'focus', includeArchived: true }),
        categories.list({ domain: 'activity', includeArchived: true }),
      ])
    return {
      appearance: appearance?.key === 'appearance' ? appearance.value : 'system',
      lastExport: lastExport?.key === 'lastSuccessfulExportAt' ? lastExport.value : undefined,
      allCategories: [...financeCategories, ...focusCategories, ...activityCategories],
    }
  }, [categories, settings])
  const state = useLiveQueryState(query)

  async function setAppearance(appearance: Appearance) {
    if (!beginOperation('appearance')) return
    setError('')
    applyAppearance(appearance)
    try {
      const timestamp = new Date().toISOString()
      await settings.put({ key: 'appearance', value: appearance, updatedAt: timestamp })
      logger.info('settings.appearance.saved', { operation: 'appearance' })
    } catch (caught) {
      applyAppearance(state.status === 'ready' ? state.data.appearance : 'system')
      setError('外观偏好未能保存，已恢复之前的选择。')
      logger.error('settings.appearance.failed', caught, { operation: 'appearance' })
    } finally {
      finishOperation()
    }
  }

  async function exportBackup() {
    if (!beginOperation('export')) return
    setError('')
    setMessage('')
    try {
      const exportedAt = await exportBackupToDevice(backup)
      setMessage('备份文件已交给系统保存或分享。请确认它已出现在 Files / iCloud Drive 中。')
      logger.info('settings.export.completed', { operation: 'export' })
      // Export handoff and recording its timestamp are separate outcomes; never imply the file failed afterward.
      try {
        await settings.put({
          key: 'lastSuccessfulExportAt',
          value: exportedAt,
          updatedAt: exportedAt,
        })
      } catch (caught) {
        logger.error('settings.export.timestampfailed', caught, { operation: 'export' })
        setError('备份已交给系统，但导出时间未能记录。请在文件 App 中确认文件已保存。')
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setMessage('已取消导出；本地数据没有改变。')
        logger.info('settings.export.cancelled', { operation: 'export' })
      } else {
        logger.error('settings.export.failed', caught, { operation: 'export' })
        setError('备份未能导出，本地数据没有改变。请重试。')
      }
    } finally {
      finishOperation()
    }
  }

  async function inspectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!beginOperation('inspect')) return
    if (preview) backup.cancel(preview.token)
    setPreview(undefined)
    setError('')
    setMessage('')
    logger.info('backup.file.readstarted', { operation: 'inspect', formatVersion: 4 })
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        backup.inspectText('', file.size)
      }
      const inspected = backup.inspectText(await file.text(), file.size)
      setPreview(inspected)
      logger.info('backup.file.readsucceeded', { operation: 'inspect', formatVersion: 4 })
    } catch (caught) {
      logger.error('backup.file.readfailed', caught, {
        operation: 'inspect',
        failureClass: 'BackupRead',
      })
      setError('无法使用这个文件：请确认它是有效且受支持的 LifeIndex JSON 备份。当前数据没有改变。')
    } finally {
      finishOperation()
      event.target.value = ''
    }
  }

  async function restoreBackup() {
    if (!preview || !beginOperation('restore')) return
    setError('')
    try {
      await backup.restore(preview.token)
      // The transaction is committed here. A later appearance read failure must not claim rollback.
      setPreview(undefined)
      setRestoreConfirmation(false)
      setMessage('恢复完成。全部模块已从这份备份重新读取。')
      logger.info('settings.restore.completed', { operation: 'restore' })
      try {
        const restoredAppearance = await database.settings.get('appearance')
        applyAppearance(
          restoredAppearance?.key === 'appearance' ? restoredAppearance.value : 'system',
        )
      } catch (caught) {
        logger.error('settings.restore.appearancefailed', caught, { operation: 'appearance' })
        setError('数据已恢复，但外观暂未同步。请刷新页面重新读取外观设置。')
      }
    } catch (caught) {
      logger.error('settings.restore.failed', caught, { operation: 'restore' })
      setError('恢复失败，原有数据已保留。你可以使用同一预览重试。')
    } finally {
      finishOperation()
    }
  }

  function cancelPreview() {
    if (operationLock.current) return
    if (preview) backup.cancel(preview.token)
    setPreview(undefined)
    setRestoreConfirmation(false)
    setMessage('已取消恢复；当前数据没有改变。')
  }

  return (
    <section className="page settings-page" aria-labelledby="settings-title">
      <header className="settings-detail-heading">
        {view !== 'home' ? (
          <Link to="/settings" className="icon-action" aria-label="返回设置">
            <Icon name="back" />
          </Link>
        ) : null}
        <h1 id="settings-title">{view === 'home' ? '设置' : detailTitles[view]}</h1>
      </header>
      {view === 'home' ? <p className="page-intro">按自己的方式，记录生活。</p> : null}

      {error ? (
        <p className="form-error global-feedback" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="success-message global-feedback" role="status">
          {message}
        </p>
      ) : null}
      {state.status === 'loading' ? <p className="state-message">正在读取设置…</p> : null}
      {state.status === 'failed' ? (
        <p className="form-error" role="alert">
          设置暂时无法读取，本地数据没有被重置。
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <>
          {view === 'home' ? (
            <>
              <CategoryManager
                repository={categories}
                categories={state.data.allCategories}
                onError={setError}
              />
              <SettingsHome appearance={state.data.appearance} />
            </>
          ) : null}

          {view === 'appearance' ? (
            <section className="settings-detail" aria-label="外观选择">
              <p className="page-intro">深浅之间，找到舒服的阅读方式。</p>
              <div className="settings-theme-options">
                {appearances.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={state.data.appearance === value}
                    aria-label={label}
                    disabled={working}
                    onClick={() => void setAppearance(value)}
                  >
                    <span className={`settings-theme-swatch ${value}`} aria-hidden="true">
                      <i />
                      <i />
                    </span>
                    <span className="settings-row-meta">
                      <strong>{label}</strong>
                      <small>
                        {value === 'system'
                          ? '与设备外观保持一致'
                          : value === 'light'
                            ? '冷白背景，清晰轻盈'
                            : '深海蓝背景，安静沉浸'}
                      </small>
                    </span>
                    <span className="settings-theme-check">
                      {state.data.appearance === value ? <Icon name="check" size={20} /> : null}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {view === 'export' || view === 'restore' ? (
            <section className="settings-detail" aria-labelledby="data-safety-title">
              <div className="section-heading">
                <h2 id="data-safety-title">数据与安全</h2>
                <span>仅存本机</span>
              </div>
              <p>
                Safari 或系统存储压力可能清除站点数据。请定期将 JSON 备份保存到 Files 或 iCloud
                Drive。
              </p>
              {view === 'export' ? (
                <>
                  <ol className="settings-steps">
                    <li>生成包含全部模块记录的 JSON 备份</li>
                    <li>选择“存储到文件”或分享给自己的设备</li>
                    <li>在文件 App 中确认文件存在</li>
                  </ol>
                  <p className="setting-meta">
                    最近导出：
                    {state.data.lastExport
                      ? new Intl.DateTimeFormat('zh-CN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(state.data.lastExport))
                      : '尚未导出'}
                  </p>
                </>
              ) : (
                <p>先检查备份内容，再确认替换。恢复不会合并记录。</p>
              )}
              <div className="settings-actions">
                {view === 'export' ? (
                  <button
                    className="button-primary"
                    type="button"
                    disabled={working}
                    onClick={() => void exportBackup()}
                  >
                    {working ? '处理中…' : '导出完整备份'}
                  </button>
                ) : (
                  <label className="file-picker button-secondary">
                    选择备份文件
                    <input
                      ref={fileInput}
                      type="file"
                      accept="application/json,.json"
                      disabled={working}
                      onChange={(event) => void inspectFile(event)}
                    />
                  </label>
                )}
              </div>
              {preview ? (
                <BackupPreviewPanel
                  preview={preview}
                  working={working}
                  onRestore={() => {
                    if (operationLock.current) return
                    setError('')
                    setRestoreConfirmation(true)
                    logger.info('settings.restore.requested', { operation: 'restore' })
                  }}
                  onCancel={cancelPreview}
                />
              ) : null}
            </section>
          ) : null}

          {view === 'about' ? (
            <section className="settings-detail" aria-label="应用信息">
              <div className="settings-about-mark">
                <Icon name="health" size={40} />
                <h2>LifeIndex</h2>
                <p>Index your life.</p>
              </div>
              <dl className="about-list">
                <div>
                  <dt>应用版本</dt>
                  <dd aria-label={`应用版本 ${__APP_VERSION__}`}>{__APP_VERSION__}</dd>
                </div>
                <div>
                  <dt>数据库版本</dt>
                  <dd>{CURRENT_DATABASE_VERSION}</dd>
                </div>
                <div>
                  <dt>存储方式</dt>
                  <dd>IndexedDB · 本地优先</dd>
                </div>
                <div>
                  <dt>离线能力</dt>
                  <dd>
                    {pwaState.registrationFailed
                      ? '需联网刷新重试'
                      : pwaState.offlineReady
                        ? '应用壳体已就绪'
                        : '正在准备'}
                  </dd>
                </div>
              </dl>
              <p>LifeIndex 不使用账户、分析服务或云端数据库。导出文件由你自行保管。</p>
            </section>
          ) : null}
        </>
      ) : null}
      {restoreConfirmation && preview ? (
        <ConfirmDialog
          title="替换全部本地数据？"
          description="将使用预览中的备份替换全部 LifeIndex 数据，不会合并。请先确认当前数据已有备份。"
          confirmLabel="替换并恢复"
          cancelLabel="返回预览"
          busy={working}
          error={error}
          onCancel={() => {
            if (!operationLock.current) setRestoreConfirmation(false)
          }}
          onConfirm={() => void restoreBackup()}
        />
      ) : null}
    </section>
  )
}

function SettingsHome({ appearance }: { appearance: Appearance }) {
  return (
    <>
      <section className="settings-section" aria-labelledby="appearance-title">
        <h2 id="appearance-title">外观</h2>
        <SettingsRow
          to="appearance"
          icon="appearance"
          title="主题外观"
          subtitle={appearances.find(({ value }) => value === appearance)!.label}
          tone="blue"
        />
      </section>
      <section className="settings-section" aria-labelledby="data-safety-title">
        <h2 id="data-safety-title">数据与安全</h2>
        <SettingsRow
          to="export"
          icon="download"
          title="导出备份"
          subtitle="保留一份自己的数据"
          tone="sage"
        />
        <SettingsRow
          to="restore"
          icon="upload"
          title="从备份恢复"
          subtitle="先检查内容，再确认替换"
          tone="blue"
        />
        <p className="settings-group-note">数据仅存本机，请定期备份。</p>
      </section>
      <section className="settings-section" aria-labelledby="other-title">
        <h2 id="other-title">其他</h2>
        <SettingsRow
          to="/health/cessation"
          icon="health"
          title="戒烟计划"
          subtitle="查看历史与入口设置"
          tone="sage"
        />
        <SettingsRow
          to="about"
          icon="health"
          title="关于 LifeIndex"
          subtitle="私人生活索引"
          tone="violet"
        />
      </section>
    </>
  )
}

function SettingsRow({
  to,
  icon,
  title,
  subtitle,
  tone,
}: {
  to: string
  icon: IconName
  title: string
  subtitle: string
  tone: string
}) {
  return (
    <Link
      className="settings-row"
      aria-label={title}
      to={to.startsWith('/') ? to : `/settings/${to}`}
      onContextMenu={(event) => {
        // Keep in-app settings rows out of iOS's external-link preview menu.
        event.preventDefault()
        logger.info('settings.navigation.calloutprevented', { operation: 'navigate' })
      }}
    >
      <span className={`category-glyph tone-${tone}`}>
        <Icon name={icon} />
      </span>
      <span className="settings-row-meta">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <Icon name="next" size={18} />
    </Link>
  )
}

function BackupPreviewPanel({
  preview,
  working,
  onRestore,
  onCancel,
}: {
  preview: BackupPreview
  working: boolean
  onRestore: () => void
  onCancel: () => void
}) {
  const labels: Array<[keyof BackupPreview['counts'], string]> = [
    ['transactions', '账目'],
    ['habits', '习惯'],
    ['habitRecords', '签到'],
    ['focusSessions', '专注'],
    ['weightEntries', '体重'],
    ['activitySessions', '运动'],
    ['cessationPlans', '戒烟计划'],
    ['cessationDays', '无烟日确认'],
    ['cessationEvents', '戒烟事件'],
    ['categories', '分类'],
    ['settings', '设置'],
    ['actionReceipts', '动作回执'],
  ]
  return (
    <div className="restore-preview" role="group" aria-labelledby="restore-preview-title">
      <h3 id="restore-preview-title">恢复预览</h3>
      <p>
        备份格式 {preview.formatVersion} · 应用 {preview.appVersion} ·{' '}
        {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(preview.exportedAt),
        )}
      </p>
      <ul>
        {labels.map(([key, label]) => (
          <li key={key}>
            <span>{label}</span>
            <strong>{preview.counts[key]}</strong>
          </li>
        ))}
      </ul>
      <p className="restore-warning">
        确认后会替换当前全部数据，不会合并。备份中没有的记录也不会保留，请先导出当前备份。
      </p>
      <div className="form-actions">
        <button className="button-secondary" type="button" disabled={working} onClick={onCancel}>
          取消恢复
        </button>
        <button className="button-primary" type="button" disabled={working} onClick={onRestore}>
          确认替换
        </button>
      </div>
    </div>
  )
}
