import type {
  CommandContext,
  CompletionAttempt,
  FocusSession,
  LifeIndexServices,
  Snapshot,
} from '@/core/types'
import { createCompletionAttempt, deriveFocusDisplay } from '@/core/services'
import { commandContext, errorMessage } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'
import type { ConfirmOptions } from './Confirmation'

interface RuntimeState {
  status: 'loading' | 'ready' | 'failed'
  snapshot: Snapshot<FocusSession | null> | undefined
  session: FocusSession | null
  elapsedSeconds: number
  remainingSeconds: number
  awaitingSave: boolean
  busy: boolean
  error: string | null
}
type PendingAttempt = {
  attempt: CompletionAttempt
  ctx: CommandContext
  finalizeCtx?: CommandContext
}
type FocusTarget = { id: string; revision: number; generation: string }
export class FocusController {
  private state: RuntimeState = {
    status: 'loading',
    snapshot: undefined,
    session: null,
    elapsedSeconds: 0,
    remainingSeconds: 0,
    awaitingSave: false,
    busy: false,
    error: null,
  }
  private listeners = new Set<() => void>()
  private pending: PendingAttempt | null = null
  private automatic = new Set<string>()
  private locked = false
  private previousWall: number | undefined
  private previousMono: number | undefined
  private clockFault: { wall: number; monotonic: number } | null = null
  private wasVisible = true
  private unsubscribe: (() => void) | undefined
  private interval: ReturnType<typeof setInterval> | undefined
  private manualConfirmation: AbortController | null = null
  private startIntent: { minutes: number; ctx: CommandContext } | null = null

  constructor(
    private services: LifeIndexServices,
    private confirm: (options: ConfirmOptions) => Promise<boolean>,
  ) {}
  getSnapshot = () => this.state
  getBusy = () => this.state.busy
  getUnsaved = () =>
    this.pending !== null &&
    !(this.state.session?.status === 'paused' && this.state.session.pendingCompletion)
  private currentTarget(): FocusTarget | undefined {
    const snapshot = this.state.snapshot
    return snapshot?.data
      ? {
          id: snapshot.data.id,
          revision: snapshot.data.revision,
          generation: snapshot.stamp.generation,
        }
      : undefined
  }
  private verifyTarget(target: FocusTarget | undefined, snapshot: Snapshot<FocusSession | null>) {
    // A confirmation belongs to one version of one session; an unrelated new session is never an implicit replacement.
    if (
      !target ||
      snapshot.stamp.generation !== target.generation ||
      snapshot.data?.id !== target.id ||
      snapshot.data.revision !== target.revision
    )
      throw Object.assign(new Error('FocusConfirmationChanged'), { code: 'EntityConflict' })
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(patch: Partial<RuntimeState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }
  connect() {
    this.observe()
    this.interval = setInterval(() => this.tick(), 250)
    document.addEventListener('visibilitychange', this.foreground)
    logger.info('focus.runtime.started', { operation: 'observe' })
    return () => {
      this.unsubscribe?.()
      clearInterval(this.interval)
      document.removeEventListener('visibilitychange', this.foreground)
      this.manualConfirmation?.abort()
    }
  }
  private foreground = () => {
    if (document.visibilityState === 'visible') this.tick()
  }
  private observe() {
    this.unsubscribe?.()
    this.unsubscribe = this.services.observe(() => this.services.focus.getCurrent(), {
      next: (snapshot) => {
        const old = this.state.snapshot
        // A restore invalidates in-memory completion attempts rather than silently retargeting them to new data.
        if (old && old.stamp.generation !== snapshot.stamp.generation) {
          this.pending = null
          this.startIntent = null
          this.automatic.clear()
          this.clockFault = null
          this.manualConfirmation?.abort()
          logger.info('focus.runtime.generationchanged', { operation: 'reconcile' })
        }
        if (old?.data?.id !== snapshot.data?.id) {
          this.manualConfirmation?.abort()
          if (this.pending?.attempt.id !== snapshot.data?.id) this.pending = null
          this.clockFault = null
          this.previousWall = undefined
          this.previousMono = undefined
        }
        if (!snapshot.data) this.pending = null
        this.publish({ status: 'ready', snapshot, session: snapshot.data })
        this.tick()
      },
      error: () => {
        this.publish({ status: 'failed', error: '暂时读不到专注状态，请重试。' })
        logger.warn('focus.runtime.readfailed', { operation: 'read', failureClass: 'ReadFailure' })
      },
    })
  }
  private tick() {
    const session = this.state.session
    const clock = this.services.clock.capture()
    const monotonic = performance.now()
    if (this.clockFault) return
    const visible = document.visibilityState === 'visible'
    const forwardJump =
      visible &&
      this.wasVisible &&
      this.previousWall !== undefined &&
      this.previousMono !== undefined &&
      clock.nowMs - this.previousWall - (monotonic - this.previousMono) > 5000
    const display = deriveFocusDisplay(session, clock, this.previousWall)
    this.wasVisible = visible
    if (display.clockChanged || forwardJump) {
      // Preserve the last trusted wall/monotonic pair; an error label alone must not leave write commands enabled.
      this.clockFault = {
        wall: this.previousWall ?? clock.nowMs,
        monotonic: this.previousMono ?? monotonic,
      }
      if (this.state.error !== '设备时间发生变化，请校正后重试。')
        logger.warn('focus.runtime.clockchanged', {
          operation: 'tick',
          reason: 'discontinuous-clock',
        })
      this.publish({ error: '设备时间发生变化，请校正后重试。' })
      return
    }
    this.previousMono = monotonic
    this.previousWall = clock.nowMs
    // A failed prepare retains a fixed local endpoint; the UI must not continue accumulating while claiming it stopped.
    const pendingDisplay =
      this.pending && session
        ? deriveFocusDisplay(session, {
            ...clock,
            nowMs: Date.parse(this.pending.attempt.requestedAt),
          })
        : display
    const awaitingSave =
      !!this.pending || (session?.status === 'paused' && !!session.pendingCompletion)
    if (
      this.state.elapsedSeconds !== pendingDisplay.displayElapsedSeconds ||
      this.state.remainingSeconds !== pendingDisplay.displayRemainingSeconds ||
      this.state.awaitingSave !== awaitingSave
    ) {
      this.publish({
        elapsedSeconds: pendingDisplay.displayElapsedSeconds,
        remainingSeconds: pendingDisplay.displayRemainingSeconds,
        awaitingSave,
      })
    }
    if (!session || session.status === 'completed' || this.locked || this.pending) return
    if ((display.expired || awaitingSave) && !this.automatic.has(session.id)) {
      // One automatic attempt per controller/session; failures require explicit retry, never a timer-driven write loop.
      this.automatic.add(session.id)
      void this.complete()
    }
  }
  private async operation(work: () => Promise<void>) {
    if (this.locked) return
    if (this.clockFault) {
      this.publish({ error: '设备时间发生变化，请校正后重试。' })
      return
    }
    this.locked = true
    this.publish({ busy: true, error: null })
    try {
      await work()
    } catch (error) {
      const tooShort =
        error && typeof error === 'object' && 'field' in error && error.field === 'durationMs'
      this.publish({
        error: tooShort ? '至少专注一秒后再保存，本段仍保持原来的状态。' : errorMessage(error),
      })
      logger.warn('focus.runtime.writefailed', {
        operation: 'transition',
        failureClass: 'DomainWrite',
      })
    } finally {
      this.locked = false
      this.publish({ busy: false })
      this.tick()
    }
  }
  start = async (minutes: number) =>
    this.operation(async () => {
      const snapshot = await this.services.focus.getCurrent()
      if (!this.startIntent || this.startIntent.minutes !== minutes)
        this.startIntent = { minutes, ctx: commandContext(snapshot.stamp) }
      const saved = await this.services.focus.start(
        { targetDurationMs: minutes * 60_000 },
        this.startIntent.ctx,
      )
      this.startIntent = null
      this.publish({ snapshot: saved, session: saved.data, status: 'ready' })
      logger.info('focus.runtime.transitioned', { operation: 'start', toState: 'running' })
    })
  pause = async () =>
    this.operation(async () => {
      const snapshot = this.state.snapshot
      if (!snapshot?.data || snapshot.data.status !== 'running') return
      const result = await this.services.focus.pause(
        { id: snapshot.data.id, expectedEntityRevision: snapshot.data.revision },
        commandContext(snapshot.stamp),
      )
      this.publish({ snapshot: result, session: result.data })
      logger.info('focus.runtime.transitioned', { operation: 'pause', toState: result.data.status })
    })
  resume = async () =>
    this.operation(async () => {
      const snapshot = this.state.snapshot
      if (!snapshot?.data || snapshot.data.status !== 'paused' || snapshot.data.pendingCompletion)
        return
      const result = await this.services.focus.resume(
        { id: snapshot.data.id, expectedEntityRevision: snapshot.data.revision },
        commandContext(snapshot.stamp),
      )
      this.publish({ snapshot: result, session: result.data })
      logger.info('focus.runtime.transitioned', {
        operation: 'resume',
        toState: result.data.status,
      })
    })
  finish = async () => {
    if (this.locked || this.clockFault || !this.state.session || this.state.awaitingSave) return
    const target = this.currentTarget()
    const confirmation = new AbortController()
    this.manualConfirmation = confirmation
    const accepted = await this.confirm({
      title: '结束这一段专注？',
      description: '确认时保存实际已用时长。取消后继续保持当前状态。',
      confirmLabel: '结束并保存',
      cancelLabel: '继续专注',
      signal: confirmation.signal,
    })
    if (this.manualConfirmation === confirmation) this.manualConfirmation = null
    if (accepted && !confirmation.signal.aborted) await this.complete(target)
  }
  private complete = async (target = this.currentTarget()) =>
    this.operation(async () => {
      let snapshot = await this.services.focus.getCurrent()
      const session = snapshot.data
      if (!session) {
        this.pending = null
        this.publish({ snapshot, session: null, awaitingSave: false })
        return
      }
      this.verifyTarget(target, snapshot)
      if (session.status !== 'paused' || !session.pendingCompletion) {
        if (deriveFocusDisplay(session, this.services.clock.capture()).elapsedMs < 1000) {
          throw Object.assign(new Error('FocusTooShort'), {
            code: 'Validation',
            field: 'durationMs',
          })
        }
        if (!this.pending)
          this.pending = {
            attempt: createCompletionAttempt(
              session,
              this.services.clock.capture(),
              crypto.randomUUID(),
            ),
            ctx: commandContext(snapshot.stamp),
          }
        this.publish({ awaitingSave: true })
        let prepared
        try {
          prepared = await this.services.focus.prepareCompletion(
            this.pending.attempt,
            this.pending.ctx,
          )
        } catch (error) {
          // Deterministic rejection never becomes a frozen unsaved intent. Only a failed persistence attempt retains its endpoint.
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            [
              'Validation',
              'ClockChanged',
              'EntityConflict',
              'GenerationConflict',
              'NotFound',
            ].includes(String(error.code))
          ) {
            this.pending = null
            this.publish({ awaitingSave: false })
          }
          throw error
        }
        if (prepared.data.status === 'completed') {
          this.pending = null
          this.publish({ session: null, awaitingSave: false })
          return
        }
        snapshot = prepared as typeof snapshot
        this.publish({ snapshot, session: snapshot.data })
      }
      const stopped = snapshot.data
      if (stopped?.status !== 'paused' || !stopped.pendingCompletion) return
      const ctx = this.pending?.finalizeCtx ?? commandContext(snapshot.stamp)
      if (this.pending) this.pending.finalizeCtx = ctx
      await this.services.focus.finalizeCompletion(
        { id: stopped.id, token: stopped.pendingCompletion.token },
        ctx,
      )
      this.pending = null
      this.manualConfirmation?.abort()
      const current = await this.services.focus.getCurrent()
      this.publish({ snapshot: current, session: current.data, awaitingSave: false })
      logger.info('focus.runtime.completed', { operation: 'finalize', toState: 'completed' })
    })
  retry = async () => {
    if (this.clockFault) {
      const expectedNow = this.clockFault.wall + performance.now() - this.clockFault.monotonic
      if (Math.abs(this.services.clock.capture().nowMs - expectedNow) > 1000) {
        this.publish({ error: '设备时间仍未校正，请校正后再重试。' })
        return
      }
      this.clockFault = null
      this.previousWall = undefined
      this.previousMono = undefined
      logger.info('focus.runtime.clockrestored', { operation: 'retry' })
    }
    if (this.pending || this.state.awaitingSave) {
      await this.complete()
      return
    }
    this.startIntent = null
    this.publish({ error: null })
    this.observe()
    this.tick()
  }
  discard = async () => {
    if (this.locked || !this.state.session) return
    const target = this.currentTarget()
    const confirmation = new AbortController()
    this.manualConfirmation = confirmation
    const accepted = await this.confirm({
      title: '放弃这一段？',
      description: '本段未保存时长将删除，已保存的历史不受影响。',
      confirmLabel: '确认放弃',
      cancelLabel: '保留专注',
      signal: confirmation.signal,
    })
    if (this.manualConfirmation === confirmation) this.manualConfirmation = null
    if (!accepted || confirmation.signal.aborted) return
    await this.operation(async () => {
      const snapshot = await this.services.focus.getCurrent()
      if (!snapshot.data) return
      this.verifyTarget(target, snapshot)
      await this.services.focus.discard(
        { id: snapshot.data.id, expectedEntityRevision: snapshot.data.revision },
        commandContext(snapshot.stamp),
      )
      this.pending = null
      this.publish({ session: null, awaitingSave: false })
      logger.info('focus.runtime.discarded', { operation: 'discard', toState: 'idle' })
    })
  }
}
