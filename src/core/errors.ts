import type { DomainError, DomainErrorCode } from './types'

export class CoreError extends Error implements DomainError {
  readonly code: DomainErrorCode
  readonly field?: string
  constructor(code: DomainErrorCode, field?: string) {
    // Never retain an IndexedDB exception message, which may contain submitted values.
    super(code)
    this.name = 'CoreError'
    this.code = code
    if (field !== undefined) this.field = field
  }
}
export function fail(code: DomainErrorCode, field?: string): never {
  throw new CoreError(code, field)
}
export function domainError(error: unknown, fallback: DomainErrorCode): CoreError {
  return error instanceof CoreError ? error : new CoreError(fallback)
}
const phases = new Set(['entered', 'committed', 'unchanged', 'failed', 'ready', 'cancelled'])
const operations = new Set([
  'initialize',
  'read',
  'create',
  'update',
  'remove',
  'archive',
  'activate',
  'reorder',
  'setStatus',
  'setCheck',
  'start',
  'pause',
  'resume',
  'prepareCompletion',
  'finalizeCompletion',
  'discard',
  'updateDetails',
  'setPreference',
  'inspect',
  'restore',
  'export',
])
const codes = new Set([
  'Validation',
  'NotFound',
  'ReadFailure',
  'WriteFailure',
  'Busy',
  'EntityConflict',
  'GenerationConflict',
  'PreviewStale',
  'PreviewExpired',
  'UnsupportedBackup',
  'ClockChanged',
])
export function coreLog(operation: string, phase: string, code?: string): void {
  // Runtime allowlists prevent untyped callers from putting personal values in logs.
  const payload = {
    operation: operations.has(operation) ? operation : 'read',
    ...(code && codes.has(code) ? { failureClass: code } : {}),
  }
  const event = `[LifeIndex] core.${phases.has(phase) ? phase : 'failed'}`
  if (phase === 'failed') console.warn(event, payload)
  else console.info(event, payload)
}
