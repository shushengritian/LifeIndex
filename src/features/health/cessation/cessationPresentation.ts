import type { CessationTrigger } from '@/shared/domain/types'

export const triggerNames: Record<CessationTrigger, string> = {
  meal: '饭后',
  stress: '压力',
  social: '社交',
  boredom: '无聊',
  other: '其他',
}
// Native date/time fields use device-local input; the repository assigns the immutable plan date.
export function dateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
