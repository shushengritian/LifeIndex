import type { ClockSnapshot, CommandContext, DateRange, Stamp } from '@/core/types'

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
export function formatMoney(minor: number): string {
  return moneyFormatter.format(minor / 100)
}
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`
}
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return seconds < 60
    ? `${seconds} 秒`
    : `${Math.floor(seconds / 60)} 分钟${seconds % 60 ? ` ${seconds % 60} 秒` : ''}`
}
export function localDate(clock: ClockSnapshot): string {
  return new Date(clock.nowMs + clock.utcOffsetMinutes * 60_000).toISOString().slice(0, 10)
}
export function formatCapturedInstant(instant: string, offsetMinutes: number): string {
  // Keep the original captured offset visible after travel or import; the viewer's timezone cannot redefine the fact.
  const wall = new Date(Date.parse(instant) + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const absolute = Math.abs(offsetMinutes)
  const offset = `${offsetMinutes < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
  return `${wall} · UTC${offset}`
}
export function monthRange(month: string): DateRange {
  const [year = 2000, number = 1] = month.split('-').map(Number)
  return {
    from: `${month}-01`,
    toExclusive: `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, '0')}-01`,
  }
}
export function weekRange(date: string): DateRange {
  const day = new Date(`${date}T12:00:00.000Z`)
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  const from = day.toISOString().slice(0, 10)
  day.setUTCDate(day.getUTCDate() + 7)
  return { from, toExclusive: day.toISOString().slice(0, 10) }
}
export function commandContext(stamp: Stamp): CommandContext {
  // Intent identity and its captured stamp are kept by the caller throughout a failed write retry.
  return {
    commandId: crypto.randomUUID(),
    expectedGeneration: stamp.generation,
    expectedRevision: stamp.revision,
  }
}
export function errorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    Validation: '内容或范围不符合要求，请检查输入；原内容仍保留。',
    NotFound: '这条记录已经不存在，请返回查看最新内容。',
    ReadFailure: '暂时读不到本机记录，请重试。记录没有被清空。',
    WriteFailure: '这次没有保存成功，输入仍在，请重试。',
    Busy: '另一项操作正在进行，请稍后重试。',
    EntityConflict: '本机记录已变化，请检查最新内容后重新打开。当前输入仍保留，可先复制。',
    GenerationConflict: '数据已恢复，这份草稿属于恢复前的数据，请复制需要的内容后重新打开记录。',
    PreviewStale: '本机记录已变化，请重新检查备份。',
    PreviewExpired: '备份预览已过期，请重新选择并检查文件。',
    UnsupportedBackup: '无法识别这个备份。请选择 LifeIndex 4.0 导出的新版备份。',
    ClockChanged: '设备时间发生变化，请校正后重试。当前记录已保留。',
  }
  return messages[code] ?? '操作未完成，请重试。原有记录仍保留。'
}
