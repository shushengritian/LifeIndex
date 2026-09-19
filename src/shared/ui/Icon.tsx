export type IconName =
  | 'today'
  | 'finance'
  | 'focus'
  | 'health'
  | 'settings'
  | 'add'
  | 'trash'
  | 'back'
  | 'next'
  | 'check'
  | 'appearance'
  | 'download'
  | 'upload'

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  // Settings navigation/actions share the same stroke geometry as the app shell.
  const settingsPaths = {
    back: 'm14 5-7 7 7 7',
    next: 'm9 5 7 7-7 7',
    check: 'm5 12 4 4L19 6',
    appearance: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    upload: 'M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5',
  }
  if (Object.hasOwn(settingsPaths, name)) {
    return (
      <svg {...common}>
        <path d={settingsPaths[name as keyof typeof settingsPaths]} />
        {name === 'appearance' ? <circle cx="12" cy="12" r="4" /> : null}
      </svg>
    )
  }
  if (name === 'trash') {
    // A shared geometric action icon avoids font-dependent alignment on compact record rows.
    return (
      <svg {...common}>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </svg>
    )
  }
  if (name === 'add') {
    // A geometric SVG plus stays optically centered across Safari font and baseline differences.
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  if (name === 'today') {
    return (
      <svg {...common}>
        <path d="M4 8.5h16M7 3.5v3M17 3.5v3M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" />
        <path d="m8 14 2.2 2.2L16 11" />
      </svg>
    )
  }
  if (name === 'finance') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2.5" />
        <path d="M4 9h16M8 14h3M15.5 13v3M14 14.5h3" />
      </svg>
    )
  }
  if (name === 'focus') {
    return (
      <svg {...common}>
        <circle cx="12" cy="13" r="7.5" />
        <path d="M12 13 15.5 10M9 3h6M12 3v2.5" />
      </svg>
    )
  }
  if (name === 'health') {
    return (
      <svg {...common}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        <path d="M8.5 12h2l1-2.3 1.6 4.6 1-2.3h1.5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      {/* Approved symmetric gear: preserve its square canvas instead of stretching a font glyph. */}
      <path d="M9.91 4.69L10.61 2.10L13.39 2.10L14.09 4.69L15.68 5.35L18.02 4.01L19.99 5.98L18.65 8.32L19.31 9.91L21.90 10.61L21.90 13.39L19.31 14.09L18.65 15.68L19.99 18.02L18.02 19.99L15.68 18.65L14.09 19.31L13.39 21.90L10.61 21.90L9.91 19.31L8.32 18.65L5.98 19.99L4.01 18.02L5.35 15.68L4.69 14.09L2.10 13.39L2.10 10.61L4.69 9.91L5.35 8.32L4.01 5.98L5.98 4.01L8.32 5.35Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}
