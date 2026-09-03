type SafeLogValue = string | number | boolean | null | undefined

export type SafeLogKey =
  | 'actionType'
  | 'appVersion'
  | 'correlationId'
  | 'count'
  | 'entityType'
  | 'failureClass'
  | 'formatVersion'
  | 'fromState'
  | 'operation'
  | 'reason'
  | 'schemaVersion'
  | 'toState'

export type SafeLogContext = Partial<Record<SafeLogKey, SafeLogValue>>

const allowedContextKeys = new Set<SafeLogKey>([
  'actionType',
  'appVersion',
  'correlationId',
  'count',
  'entityType',
  'failureClass',
  'formatVersion',
  'fromState',
  'operation',
  'reason',
  'schemaVersion',
  'toState',
])

const safeEventPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,7}$/

interface SanitizedError {
  errorName: string
  errorCode?: string
}

function createCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `log-${Date.now()}`
}

function sanitizeEvent(event: string): string {
  // Event names are identifiers, never free-form messages that could accidentally contain personal data.
  return safeEventPattern.test(event) ? event : 'logging.event.rejected'
}

function sanitizeContext(context: SafeLogContext | undefined): Record<string, SafeLogValue> {
  if (!context) return {}

  // Runtime filtering is a second privacy boundary in case untyped callers bypass the TypeScript key union.
  return Object.fromEntries(
    Object.entries(context).filter(([key, value]) => {
      return (
        allowedContextKeys.has(key as SafeLogKey) &&
        (value === undefined ||
          value === null ||
          ['string', 'number', 'boolean'].includes(typeof value))
      )
    }),
  )
}

function sanitizeError(error: unknown): SanitizedError {
  if (!(error instanceof Error)) return { errorName: 'UnknownError' }

  const candidateCode = (error as Error & { code?: unknown }).code
  return {
    errorName: error.name || 'Error',
    ...(typeof candidateCode === 'string' ? { errorCode: candidateCode } : {}),
  }
}

function eventPayload(context?: SafeLogContext): Record<string, SafeLogValue> {
  return {
    correlationId: context?.correlationId ?? createCorrelationId(),
    ...sanitizeContext(context),
  }
}

export const logger = {
  info(event: string, context?: SafeLogContext): void {
    console.info(`[LifeIndex] ${sanitizeEvent(event)}`, eventPayload(context))
  },
  warn(event: string, context?: SafeLogContext): void {
    console.warn(`[LifeIndex] ${sanitizeEvent(event)}`, eventPayload(context))
  },
  error(event: string, error: unknown, context?: SafeLogContext): void {
    console.error(`[LifeIndex] ${sanitizeEvent(event)}`, {
      ...eventPayload(context),
      ...sanitizeError(error),
    })
  },
}
