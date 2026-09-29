import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BackupPreview, BackupTable } from '@/core/types'
import { useV4Services } from '@/app/v4/Services'
import { useFlow } from '@/app/v4/Flow'
import { useConfirm } from '@/app/v4/Confirmation'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { PageHeading } from '@/shared/ui/v4/Elements'
import { commandContext, errorMessage } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'

const tableLabels: Record<BackupTable, string> = {
  categories: '分类',
  transactions: '收支记录',
  weightEntries: '体重记录',
  activitySessions: '运动记录',
  habits: '习惯计划',
  habitChecks: '习惯完成',
  focusSessions: '专注会话',
  preferences: '偏好设置',
}
export function BackupV4() {
  const services = useV4Services(),
    flow = useFlow(),
    confirm = useConfirm()
  const [preview, setPreview] = useState<BackupPreview | null>(null),
    [reading, setReading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  const readGeneration = useRef(0),
    previewRef = useRef<BackupPreview | null>(null),
    lock = useRef(false),
    alive = useRef(true)
  useDirtyGuard({ dirty: false, busy })
  useEffect(() => {
    const reads = readGeneration
    alive.current = true
    return () => {
      alive.current = false
      reads.current++
      if (previewRef.current) services.backup.cancelPreview(previewRef.current.token)
    }
  }, [services])
  function cancel() {
    if (lock.current) return
    readGeneration.current++
    if (previewRef.current) services.backup.cancelPreview(previewRef.current.token)
    previewRef.current = null
    setPreview(null)
    setReading(false)
    setError(null)
    logger.info('backup.preview.cancelled', { operation: 'cancel' })
  }
  async function inspect(file: File | undefined) {
    // Invalidate every older read before size/format checks; cancellation can never resurrect a previous preview.
    const generation = ++readGeneration.current
    if (previewRef.current) services.backup.cancelPreview(previewRef.current.token)
    previewRef.current = null
    setPreview(null)
    setError(null)
    if (!file) {
      setReading(false)
      return
    }
    setReading(true)
    logger.info('backup.preview.started', { operation: 'inspect' })
    try {
      const result = await services.backup.inspectFile(file)
      if (!alive.current || generation !== readGeneration.current) {
        services.backup.cancelPreview(result.token)
        return
      }
      previewRef.current = result
      setPreview(result)
      logger.info('backup.preview.ready', { operation: 'inspect', formatVersion: 1 })
    } catch (failure) {
      if (alive.current && generation === readGeneration.current) {
        setError(errorMessage(failure))
        logger.warn('backup.preview.failed', { operation: 'inspect', failureClass: 'Validation' })
      }
    } finally {
      if (alive.current && generation === readGeneration.current) setReading(false)
    }
  }
  async function restore() {
    if (!preview || lock.current) return
    const selected = preview
    if (
      !(await confirm({
        title: '替换当前新版数据？',
        description:
          '备份中的全部记录和未结束专注将替换当前新版内容。取消可保持原样；建议先导出当前备份。',
        confirmLabel: '确认替换',
        cancelLabel: '保留当前数据',
      }))
    )
      return
    // Selection may change while confirmation is open; only the reviewed token can be submitted.
    if (previewRef.current?.token !== selected.token) return
    lock.current = true
    setBusy(true)
    setError(null)
    logger.info('backup.restore.started', { operation: 'restore' })
    try {
      await services.backup.restore(selected.token)
      previewRef.current = null
      setPreview(null)
      flow.notify('恢复完成，已替换新版记录。')
      logger.info('backup.restore.completed', { operation: 'restore' })
    } catch (failure) {
      setError(errorMessage(failure))
      logger.warn('backup.restore.failed', { operation: 'restore', failureClass: 'DomainWrite' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function exportFile() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    logger.info('backup.export.started', { operation: 'export' })
    try {
      const result = await services.backup.exportSnapshot()
      const url = URL.createObjectURL(result.blob),
        anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.filename
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      const preferences = await services.preferences.getAll()
      await services.preferences.set(
        {
          key: 'lastExportedAt',
          value: result.exportedAt,
          expectedEntityRevision: preferences.data.revisions.lastExportedAt,
        },
        commandContext(preferences.stamp),
      )
      flow.notify('备份已交给浏览器，请确认文件已保存。')
      logger.info('backup.export.delivered', { operation: 'download' })
    } catch (failure) {
      setError(errorMessage(failure))
      logger.warn('backup.export.failed', { operation: 'export', failureClass: 'DomainOperation' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        title="把生活，妥善带走。"
        description="先保存一份，再安心开始。"
        action={
          <Link to="/settings" className="text-button">
            返回设置
          </Link>
        }
      />
      {error && (
        <p className="entry-error" role="alert">
          {error}
        </p>
      )}
      <section className="backup-export">
        <h2>导出新版备份</h2>
        <p>完整保存八类新版数据，包括运行中、暂停和待保存的专注。文件由你自行保管。</p>
        <button
          type="button"
          className="button"
          disabled={busy || reading}
          onClick={() => void exportFile()}
        >
          {busy ? '正在处理…' : '导出备份'}
        </button>
      </section>
      <section className="backup-import">
        <h2>从备份恢复</h2>
        <p>只接收 LifeIndex 4.0 的新版 JSON 备份，最大 50 MiB。选择文件仅作校验，不修改记录。</p>
        <label className="field">
          选择 JSON 备份
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              // Keep the File object for validation, but reset native selection so the same file can be retried.
              event.currentTarget.value = ''
              void inspect(file)
            }}
          />
        </label>
        {reading && <p role="status">正在校验备份…</p>}
        {(reading || preview) && (
          <button type="button" className="text-button" disabled={busy} onClick={cancel}>
            取消恢复
          </button>
        )}
        {preview && (
          <div className="backup-preview">
            <h3>确认备份内容</h3>
            <p>
              版本 {preview.appVersion} · 导出于{' '}
              {new Date(preview.exportedAt).toLocaleString('zh-CN')}
            </p>
            <table>
              <caption>恢复将替换以下新版数据</caption>
              <thead>
                <tr>
                  <th scope="col">内容</th>
                  <th scope="col">备份</th>
                  <th scope="col">本机</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(tableLabels) as BackupTable[]).map((key) => (
                  <tr key={key}>
                    <th scope="row">{tableLabels[key]}</th>
                    <td>{preview.sourceCounts[key]}</td>
                    <td>{preview.targetCounts[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              备份中的未结束专注：运行 {preview.sourceFocus.running}，暂停{' '}
              {preview.sourceFocus.paused}，待保存 {preview.sourceFocus.awaitingSave}。
            </p>
            <p>
              本机将被替换的未结束专注：运行 {preview.targetFocus.running}，暂停{' '}
              {preview.targetFocus.paused}，待保存 {preview.targetFocus.awaitingSave}。
            </p>
            <p>
              运行会话会按设备时间追平，暂停保持暂停。预览15分钟有效；期间记录有变化须重新检查。
            </p>
            <button className="button" type="button" disabled={busy} onClick={() => void restore()}>
              {busy ? '正在替换，暂时不能取消…' : '继续，确认替换'}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
