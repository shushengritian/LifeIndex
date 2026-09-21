import { isLocalDateKey } from '@/shared/domain/date'

// Route state is display context, never a write command or a trusted database receipt.
export function financeDisplayDate(value: unknown): string | undefined {
  return typeof value === 'string' && value >= '1000-01-01' && isLocalDateKey(value)
    ? value
    : undefined
}

export type FinanceQuickExit = { status: 'cancelled' } | { status: 'saved'; localDate: string }
