import { devices } from '@playwright/test'

export const protocolVersion = 'lifeindex-v4-performance-2'
export const fixtureVersion = 'lifeindex-v4-synthetic-1'
export const seed = 4_029
export const budgets = {
  version: 'frozen-r3-v3',
  fcp: 400,
  ready: 1_400,
  longHistoryReady: 2_000,
  chooser: 350,
  editor: 350,
  javascriptGzip: 256_000,
  cssGzip: 16_384,
} as const
export const browserOptions = {
  ...devices['iPhone 13'],
  viewport: { width: 390, height: 664 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  colorScheme: 'light' as const,
  reducedMotion: 'reduce' as const,
  serviceWorkers: 'block' as const,
}
export type Dataset = 'F0' | 'F1' | 'F3'
export type Editor = 'expense' | 'weight' | 'activity'
export const entryNames: Record<Editor, string> = {
  expense: '记一笔',
  weight: '记体重',
  activity: '记运动',
}
export const regions = [
  'shell',
  'today-habits',
  'today-finance',
  'focus-runtime',
  'today-records',
] as const
export const groups: { dataset: Dataset; editor: Editor }[] = [
  ...(['F0', 'F1'] as const).flatMap((dataset) =>
    (['expense', 'weight', 'activity'] as const).map((editor) => ({ dataset, editor })),
  ),
  { dataset: 'F3', editor: 'expense' },
]
export type Metric = 'fcp' | 'ready' | 'chooser' | 'editor'
export type Rect = { x: number; y: number; width: number; height: number }
export type Resource = {
  name: string
  initiatorType: string
  startTime: number
  responseEnd: number
  duration: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
}
export type Probe = {
  ready: number | null
  readyFirst: number | null
  readyConfirmed: number | null
  chooserStart: number | null
  chooser: number | null
  chooserConfirmed: number | null
  editorStart: number | null
  editor: number | null
  editorConfirmed: number | null
  fcp: number | null
  fontsReady: number | null
  fontCompletions: { time: number; source: string; geometry: Record<string, Rect> }[]
  geometryAtReady: Record<string, Rect>
  geometryAtFontsReady: Record<string, Rect>
  geometryAfterFonts: Record<string, Rect> | null
  fontShift: number | null
  regionStates: Record<string, string | null>
  field: { label: boolean; unit: boolean; focused: boolean; editable: boolean } | null
  resources: Resource[]
  readyChecks: Record<string, boolean>
  diagnostic: string
}
export type Sample = {
  order: number
  group: string
  dataset: Dataset
  editor: Editor
  repetition: number
  startedAt: string
  baseDate: string | null
  capturedAt: string | null
  status: 'passed' | 'failed'
  failure: string | null
  stage: string
  metrics: Record<Metric, number | null>
  probe: Probe | null
  preparationRequests: string[]
  responseEncodings: Record<string, string>
  fixtureCounts: Record<string, number>
  keyboardChangedValue: boolean
  cancelPreservedDatabase: boolean
  databaseDigest: string | null
  screenshot: string | null
}
