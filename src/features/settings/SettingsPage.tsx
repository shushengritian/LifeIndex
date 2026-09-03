import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { BackupService, MAX_BACKUP_BYTES, type BackupPreview } from '@/data/backup/BackupService'
import { exportBackupToDevice } from '@/data/backup/browserBackup'
import { CURRENT_DATABASE_VERSION } from '@/data/db/schema'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import { applyAppearance } from '@/features/settings/appearance'
import type { Appearance, Category, TransactionType } from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'

const appearances: Array<{ value: Appearance; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

export function SettingsPage() {
  const { database } = useAppServices()
  const settings = useMemo(() => new SettingsRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const backup = useMemo(() => new BackupService(database, __APP_VERSION__), [database])
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupPreview>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const query = useCallback(async () => {
    const [appearance, lastExport, financeCategories] = await Promise.all([
      settings.get('appearance'),
      settings.get('lastSuccessfulExportAt'),
      categories.list({ domain: 'finance', includeArchived: true }),
    ])
    return {
      appearance: appearance?.key === 'appearance' ? appearance.value : 'system',
      lastExport: lastExport?.key === 'lastSuccessfulExportAt' ? lastExport.value : undefined,
      financeCategories,
    }
  }, [categories, settings])
  const state = useLiveQueryState(query)

  async function setAppearance(appearance: Appearance) {
    setError('')
    applyAppearance(appearance)
    try {
      const timestamp = new Date().toISOString()
      await settings.put({ key: 'appearance', value: appearance, updatedAt: timestamp })
    } catch {
      applyAppearance(state.status === 'ready' ? state.data.appearance : 'system')
      setError('外观偏好未能保存，已恢复之前的选择。')
    }
  }

  async function exportBackup() {
    setError('')
    setMessage('')
    setWorking(true)
    try {
      const exportedAt = await exportBackupToDevice(backup)
      await settings.put({
        key: 'lastSuccessfulExportAt',
        value: exportedAt,
        updatedAt: exportedAt,
      })
      setMessage('备份文件已交给系统保存或分享。请确认它已出现在 Files / iCloud Drive 中。')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setMessage('已取消导出；本地数据没有改变。')
      } else {
        setError('备份未能导出，本地数据没有改变。请重试。')
      }
    } finally {
      setWorking(false)
    }
  }

  async function inspectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (preview) backup.cancel(preview.token)
    setPreview(undefined)
    setError('')
    setMessage('')
    setWorking(true)
    logger.info('backup.file.readstarted', { operation: 'inspect', formatVersion: 1 })
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        backup.inspectText('', file.size)
      }
      const inspected = backup.inspectText(await file.text(), file.size)
      setPreview(inspected)
      logger.info('backup.file.readsucceeded', { operation: 'inspect', formatVersion: 1 })
    } catch (caught) {
      logger.error('backup.file.readfailed', caught, {
        operation: 'inspect',
        failureClass: 'BackupRead',
      })
      setError('无法使用这个文件：请确认它是有效且受支持的 LifeIndex JSON 备份。当前数据没有改变。')
    } finally {
      setWorking(false)
      event.target.value = ''
    }
  }

  async function restoreBackup() {
    if (!preview) return
    const confirmed = window.confirm(
      '这会用预览中的备份替换当前全部 LifeIndex 数据，V1 不会合并。建议先导出当前数据。确认继续？',
    )
    if (!confirmed) return
    setWorking(true)
    setError('')
    try {
      await backup.restore(preview.token)
      const restoredAppearance = await database.settings.get('appearance')
      applyAppearance(
        restoredAppearance?.key === 'appearance' ? restoredAppearance.value : 'system',
      )
      setPreview(undefined)
      setMessage('恢复完成。全部模块已从这份备份重新读取。')
    } catch {
      setError('恢复失败，原有数据已保留。你可以使用同一预览重试。')
    } finally {
      setWorking(false)
    }
  }

  function cancelPreview() {
    if (preview) backup.cancel(preview.token)
    setPreview(undefined)
    setMessage('已取消恢复；当前数据没有改变。')
  }

  return (
    <section className="page settings-page" aria-labelledby="settings-title">
      <p className="eyebrow">settings</p>
      <h1 id="settings-title">设置</h1>
      <p className="page-intro">管理外观、组织方式和只属于这台设备的数据。</p>

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
          <section className="settings-section" aria-labelledby="appearance-title">
            <h2 id="appearance-title">外观</h2>
            <div className="appearance-options">
              {appearances.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={state.data.appearance === value}
                  onClick={() => void setAppearance(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section" aria-labelledby="data-safety-title">
            <div className="section-heading">
              <h2 id="data-safety-title">数据安全</h2>
              <span>仅存本机</span>
            </div>
            <p>
              Safari 或系统存储压力可能清除站点数据。请定期将 JSON 备份保存到 Files 或 iCloud
              Drive。
            </p>
            <p className="setting-meta">
              最近导出：
              {state.data.lastExport
                ? new Intl.DateTimeFormat('zh-CN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(state.data.lastExport))
                : '尚未导出'}
            </p>
            <div className="settings-actions">
              <button
                className="button-primary"
                type="button"
                disabled={working}
                onClick={() => void exportBackup()}
              >
                {working ? '处理中…' : '导出完整备份'}
              </button>
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
            </div>
            {preview ? (
              <BackupPreviewPanel
                preview={preview}
                working={working}
                onRestore={() => void restoreBackup()}
                onCancel={cancelPreview}
              />
            ) : null}
          </section>

          <CategoryManager
            repository={categories}
            categories={state.data.financeCategories}
            onError={setError}
          />

          <section className="settings-section" aria-labelledby="habit-management-title">
            <h2 id="habit-management-title">习惯管理</h2>
            <p>新增、修改、暂停或恢复习惯，并查看保留的历史进度。</p>
            <Link className="settings-link" to="/habits">
              打开习惯管理
            </Link>
          </section>

          <section className="settings-section" aria-labelledby="about-title">
            <h2 id="about-title">关于</h2>
            <dl className="about-list">
              <div>
                <dt>应用版本</dt>
                <dd>{__APP_VERSION__}</dd>
              </div>
              <div>
                <dt>数据库版本</dt>
                <dd>{CURRENT_DATABASE_VERSION}</dd>
              </div>
              <div>
                <dt>存储方式</dt>
                <dd>IndexedDB · 本地优先</dd>
              </div>
            </dl>
            <p>LifeIndex 不使用账户、分析服务或云端数据库。导出文件由你自行保管。</p>
          </section>
        </>
      ) : null}
    </section>
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
      <p className="restore-warning">确认后会替换当前全部数据，不会合并。</p>
      <div className="form-actions">
        <button className="button-secondary" type="button" onClick={onCancel}>
          取消恢复
        </button>
        <button className="button-primary" type="button" disabled={working} onClick={onRestore}>
          确认替换
        </button>
      </div>
    </div>
  )
}

function CategoryManager({
  repository,
  categories,
  onError,
}: {
  repository: CategoryRepository
  categories: Category[]
  onError: (message: string) => void
}) {
  const [type, setType] = useState<TransactionType>('expense')
  const [name, setName] = useState('')
  const active = categories.filter(
    (category) => category.archived === 0 && category.transactionType === type,
  )
  const archived = categories.filter((category) => category.archived === 1)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      onError('分类名称不能为空。')
      return
    }
    try {
      await repository.create({
        domain: 'finance',
        transactionType: type,
        name: name.trim(),
        icon: 'other',
        color: 'sage',
      })
      setName('')
      onError('')
    } catch {
      onError('分类未能创建，请重试。')
    }
  }

  async function rename(category: Category) {
    const nextName = window.prompt('输入新的分类名称', category.name)
    if (!nextName || nextName.trim() === category.name) return
    try {
      await repository.update(category.id, {
        name: nextName.trim(),
        icon: category.icon,
        color: category.color,
      })
    } catch {
      onError('分类未能重命名，请重试。')
    }
  }

  async function setArchived(category: Category, value: boolean) {
    if (value && !window.confirm('归档后，它不会出现在新交易中；历史账目仍会保留。确认归档？'))
      return
    try {
      await repository.setArchived(category.id, value)
    } catch {
      onError('分类状态未能更新，历史账目没有改变。')
    }
  }

  async function move(category: Category, direction: -1 | 1) {
    const index = active.findIndex(({ id }) => id === category.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= active.length) return
    const reordered = [...active]
    ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]
    try {
      await repository.reorder(reordered.map(({ id }) => id))
    } catch {
      onError('分类顺序未能保存。')
    }
  }

  return (
    <section className="settings-section" aria-labelledby="category-management-title">
      <h2 id="category-management-title">记账分类</h2>
      <form className="inline-category-form" onSubmit={(event) => void create(event)}>
        <label>
          类型
          <select value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </label>
        <label>
          分类名称
          <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
        </label>
        <button className="button-primary" type="submit">
          新增分类
        </button>
      </form>
      <div className="segmented-control category-type-tabs">
        <button
          type="button"
          aria-pressed={type === 'expense'}
          className={type === 'expense' ? 'segment-active' : ''}
          onClick={() => setType('expense')}
        >
          支出分类
        </button>
        <button
          type="button"
          aria-pressed={type === 'income'}
          className={type === 'income' ? 'segment-active' : ''}
          onClick={() => setType('income')}
        >
          收入分类
        </button>
      </div>
      <ul className="category-list">
        {active.map((category, index) => (
          <li key={category.id}>
            <span>{category.name}</span>
            <div>
              <button
                type="button"
                aria-label={`上移 ${category.name}`}
                disabled={index === 0}
                onClick={() => void move(category, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`下移 ${category.name}`}
                disabled={index === active.length - 1}
                onClick={() => void move(category, 1)}
              >
                ↓
              </button>
              <button type="button" onClick={() => void rename(category)}>
                重命名
              </button>
              <button
                className="text-destructive"
                type="button"
                onClick={() => void setArchived(category, true)}
              >
                归档
              </button>
            </div>
          </li>
        ))}
      </ul>
      {archived.length > 0 ? (
        <details className="archived-categories">
          <summary>已归档分类（{archived.length}）</summary>
          <ul>
            {archived.map((category) => (
              <li key={category.id}>
                <span>
                  {category.name} · {category.transactionType === 'expense' ? '支出' : '收入'}
                </span>
                <button type="button" onClick={() => void setArchived(category, false)}>
                  恢复
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
