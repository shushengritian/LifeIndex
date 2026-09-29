import type { IconKey } from '@/core/types'

export type UiIconKey =
  | IconKey
  | 'write'
  | 'settings'
  | 'play'
  | 'pause'
  | 'back'
  | 'close'
  | 'download'
  | 'upload'
  | 'sun'
  | 'shield'
const paths: Record<UiIconKey, string> = {
  today: 'M4 6h16v15H4z M8 3v6m8-6v6M4 11h16M8 15h1m6 0h1',
  health:
    'M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6 M3 12h5l2-3 3 7 2-4h6',
  focus: 'M9 2h6M12 2v3M19 5l2 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M12 9v5l3 2',
  finance: 'M4 5h14v3M4 5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V8H4a1.5 1.5 0 0 1 0-3 M16 13h5v4h-5z',
  activity: 'M13 4a2 2 0 1 0 .1 0 M7 9l4-2 4 4 5 1M11 8l-2 6 5 3-1 5M9 14l-5 6',
  weight: 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2 M7 7h10v5H7z M12 9l2-1',
  leaf: 'M20 3C9 2 3 7 4 14c1 6 9 8 13 1 2-3 3-8 3-12 M5 21l9-12',
  book: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1v15',
  cup: 'M4 8h12v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8 M16 9h2a3 3 0 0 1 0 6h-2 M7 2v3m5-3v3',
  bag: 'M5 7h14l2 14H3z M8 8V5a4 4 0 0 1 8 0v3',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  write: 'M15 4l5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 14zM12 20h8',
  settings:
    'M10 2h4l1 3 3 1 3 4v4l-3 4-3 1-1 3h-4l-1-3-3-1-3-4v-4l3-4 3-1z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  play: 'M8 4l13 8-13 8z',
  pause: 'M8 4v16M16 4v16',
  back: 'M19 12H5m6-6-6 6 6 6',
  close: 'm6 6 12 12M18 6 6 18',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6z M12 8v7',
}
export function Icon({ name, size = 20 }: { name: UiIconKey; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
