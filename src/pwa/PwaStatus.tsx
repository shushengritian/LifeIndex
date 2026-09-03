import { useState } from 'react'

import { usePwa } from '@/pwa/PwaContext'
import { logger } from '@/shared/logging/logger'

export function PwaStatus() {
  const { state, dirtyFormCount, applyUpdate } = usePwa()
  const [dismissed, setDismissed] = useState(false)
  const [updateError, setUpdateError] = useState(false)

  async function approveUpdate() {
    setUpdateError(false)
    try {
      await applyUpdate()
    } catch {
      setUpdateError(true)
    }
  }

  return (
    <>
      {!state.online ? (
        <div className="connectivity-banner" role="status">
          当前离线 · 本机数据仍可继续使用
        </div>
      ) : null}
      {state.registrationFailed ? (
        <div className="connectivity-banner warning" role="status">
          离线功能暂未就绪；联网后刷新可重试
        </div>
      ) : null}
      {state.updateReady && !dismissed ? (
        <section className="update-banner" aria-labelledby="update-title">
          <div>
            <strong id="update-title">新版本已准备好</strong>
            <p>
              {dirtyFormCount > 0
                ? '检测到未保存输入。请先保存或取消表单，再更新。'
                : '更新会重新打开 LifeIndex；本地记录不会被上传。'}
            </p>
            {updateError ? (
              <p className="form-error" role="alert">
                更新未能应用，请稍后重试。
              </p>
            ) : null}
          </div>
          <div className="update-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                logger.info('pwa.update.deferred', { operation: 'update' })
                setDismissed(true)
              }}
            >
              稍后
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={dirtyFormCount > 0 || state.applyingUpdate}
              onClick={() => void approveUpdate()}
            >
              {state.applyingUpdate ? '正在更新…' : '立即更新'}
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
