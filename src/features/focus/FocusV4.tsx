import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useFocusRuntime } from '@/app/v4/FocusRuntime'
import { PageHeading, SectionHeading, Feedback } from '@/shared/ui/v4/Elements'
import { Icon } from '@/shared/ui/v4/Icon'
import { formatClock, formatDuration } from '@/shared/v4/format'
import { shiftDate, useTodayDate, usePageLog } from '@/features/today/v4/data'
import { RecordPageSection } from '@/features/finance/v4/RecordPageSection'
import { logger } from '@/shared/logging/logger'

export function FocusV4() {
  usePageLog('focus')
  const runtime = useFocusRuntime(),
    services = useV4Services(),
    today = useTodayDate(),
    [minutes, setMinutes] = useState(25),
    primary = useRef<HTMLButtonElement>(null),
    session = runtime.session
  const summary = useV4Query(
    useCallback(
      () => services.focus.getSummary({ from: today, toExclusive: shiftDate(today, 1) }),
      [services, today],
    ),
  )
  const status = runtime.awaitingSave
      ? 'pending'
      : session?.status === 'paused'
        ? 'paused'
        : session
          ? 'running'
          : 'idle',
    remaining = session ? runtime.remainingSeconds : minutes * 60,
    elapsed = session ? runtime.elapsedSeconds : 0
  async function control() {
    logger.info('v4.focus.controlrequested', {
      operation:
        status === 'idle'
          ? 'start'
          : status === 'running'
            ? 'pause'
            : status === 'paused'
              ? 'resume'
              : 'retry',
    })
    try {
      await (status === 'idle'
        ? runtime.start(minutes)
        : status === 'running'
          ? runtime.pause()
          : status === 'paused'
            ? runtime.resume()
            : runtime.retry())
    } catch {
      logger.warn('v4.focus.controlfailed', { failureClass: 'runtime' })
    } finally {
      requestAnimationFrame(() => primary.current?.focus({ preventScroll: true }))
    }
  }
  async function retryState() {
    // A wall-clock fault deliberately blocks ordinary controls; retry is the explicit recovery path after correction.
    logger.info('v4.focus.recoveryrequested', { operation: 'retry' })
    try {
      await runtime.retry()
    } catch {
      logger.warn('v4.focus.recoveryfailed', { failureClass: 'runtime' })
    } finally {
      requestAnimationFrame(() => primary.current?.focus({ preventScroll: true }))
    }
  }
  return (
    <>
      <PageHeading title="专注空间" description="不必做很多，只做眼前这一件。" />
      <div className="v4-two-column">
        <section className="v4-focus-room" data-state={runtime.status}>
          <header className="v4-focus-room-head">
            <span>
              {status === 'idle'
                ? '准备好，就开始'
                : status === 'running'
                  ? '正在专注'
                  : status === 'paused'
                    ? '已暂停 · 不累计时间'
                    : '时间已停止，等待保存'}
            </span>
            <Link to="/today" className="v4-focus-collapse">
              {status === 'idle'
                ? '返回今天'
                : status === 'running'
                  ? '收起，继续计时'
                  : status === 'paused'
                    ? '收起，保持暂停'
                    : '收起，保留待保存'}
            </Link>
          </header>
          {runtime.status === 'loading' ? (
            <Feedback kind="loading" title="正在读取专注状态" />
          ) : runtime.status === 'failed' ? (
            <Feedback
              kind="error"
              title="专注状态暂时读不到"
              onRetry={() => void runtime.retry()}
            />
          ) : (
            <>
              <h2>{session?.title ?? '给重要的事，一点留白。'}</h2>
              <div className="v4-focus-sculpture">
                <svg viewBox="0 0 280 280" fill="none" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, index) => (
                    <ellipse
                      key={index}
                      cx="140"
                      cy="140"
                      rx="118"
                      ry="92"
                      transform={`rotate(${index * 10} 140 140)`}
                      stroke="currentColor"
                      strokeWidth=".45"
                      opacity=".48"
                    />
                  ))}
                  <circle
                    cx="140"
                    cy="140"
                    r="123"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeDasharray="772.83"
                    strokeDashoffset={
                      772.83 * (session ? elapsed / (session.targetDurationMs / 1000) : 0)
                    }
                    transform="rotate(-90 140 140)"
                  />
                </svg>
                <div className="v4-focus-digit numeric" role="timer" aria-live="off">
                  <span>{formatClock(remaining)}</span>
                  <small>
                    {status === 'paused' ? '暂停中' : status === 'idle' ? '分钟 : 秒' : '剩余时间'}
                  </small>
                </div>
              </div>
              <div className="v4-focus-controls">
                <button
                  ref={primary}
                  className="button"
                  type="button"
                  disabled={runtime.busy}
                  onClick={() => void control()}
                  data-focus-key="focus-primary"
                >
                  <Icon name={status === 'running' ? 'pause' : 'play'} size={18} />
                  {runtime.busy
                    ? '正在处理…'
                    : status === 'idle'
                      ? '开始专注'
                      : status === 'running'
                        ? '暂停一下'
                        : status === 'paused'
                          ? '继续专注'
                          : '重试保存'}
                </button>
                {session && !runtime.awaitingSave && (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={runtime.busy}
                    onClick={() => void runtime.finish()}
                  >
                    结束
                  </button>
                )}
              </div>
              {status === 'idle' && (
                <div className="v4-duration-options" role="group" aria-label="计划专注时长">
                  {[15, 25, 45].map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={minutes === value}
                      disabled={runtime.busy}
                      onClick={() => setMinutes(value)}
                    >
                      {value} 分钟
                    </button>
                  ))}
                </div>
              )}
              <p className="v4-focus-note">
                {session
                  ? `已专注 ${formatClock(elapsed)} · 目标 ${session.targetDurationMs / 60000} 分钟`
                  : '默认名称为“自由专注”，完成后可编辑。'}
              </p>
              {session && session.localDate !== today && (
                <p className="v4-focus-note">开始于 {session.localDate}，保存后归入该日。</p>
              )}
              {session && (
                <button
                  type="button"
                  className="v4-focus-discard"
                  disabled={runtime.busy}
                  onClick={() => void runtime.discard()}
                >
                  放弃这一段
                </button>
              )}
            </>
          )}
          {runtime.error && (
            <div className="v4-focus-error">
              <p role="alert">{runtime.error}</p>
              {runtime.status === 'ready' && !runtime.awaitingSave && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={runtime.busy}
                  onClick={() => void retryState()}
                >
                  重试专注状态
                </button>
              )}
            </div>
          )}
        </section>
        <section className="v4-focus-history">
          <SectionHeading title="今天的专注">
            <Link className="text-button" to="/focus/history">
              全部历史
            </Link>
          </SectionHeading>
          {summary.status === 'loading' ? (
            <Feedback kind="loading" title="正在读取专注记录" />
          ) : summary.status === 'failed' ? (
            <Feedback kind="error" title="专注记录暂时读不到" onRetry={summary.retry} />
          ) : (
            summary.snapshot && (
              <>
                <div className="v4-focus-total numeric">
                  {formatDuration(summary.snapshot.data.totalDurationMs)}
                </div>
                <p className="v4-scope-note">
                  {summary.snapshot.data.count} 段已保存 · 按开始日期归属
                </p>
              </>
            )
          )}
          <RecordPageSection
            kind="focus"
            range={{ from: today, toExclusive: shiftDate(today, 1) }}
            emptyText="完成并保存的专注，会留在这里。"
          />
        </section>
      </div>
    </>
  )
}
