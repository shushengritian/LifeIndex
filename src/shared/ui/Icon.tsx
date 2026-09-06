export type IconName = 'today' | 'finance' | 'focus' | 'health' | 'settings'

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.8-1.8.9-1.9L15 5l-1.5 1.4h-2L10 5 7.9 6.1 8.8 8 8 9.8l-2 .7v3l2 .7.8 1.8-.9 1.9L10 19l1.5-1.4h2L15 19l2.1-1.1-.9-1.9.8-1.8 2-.7Z" />
    </svg>
  )
}
