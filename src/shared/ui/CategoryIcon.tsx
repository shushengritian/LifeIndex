import { useEffect } from 'react'
import {
  categoryIconIds,
  legacyCategoryIconAliases,
  resolveCategoryIcon,
} from '@/shared/domain/categoryIcons'
import { logger } from '@/shared/logging/logger'

/** Authored JSX only: database values select a key, never inject SVG markup. */
export function CategoryIcon({ name, size = 23 }: { name: string; size?: number }) {
  const known =
    categoryIconIds.includes(name as (typeof categoryIconIds)[number]) ||
    Object.hasOwn(legacyCategoryIconAliases, name)
  useEffect(() => {
    if (!known)
      logger.warn('category.icon.fallback', { operation: 'render', reason: 'unknown-icon' })
  }, [known])
  const id = resolveCategoryIcon(name)
  const shapes = {
    suitcase: (
      <>
        <rect x="5" y="6" width="14" height="14" rx="3" />
        <path d="M9 6V3h6v3M9 10v6m6-6v6M8 20v2m8-2v2" />
      </>
    ),
    hotel: (
      <>
        <path d="M4 21V3h16v18M2 21h20M10 21v-5h4v5M8 7h1m6 0h1M8 11h1m6 0h1" />
      </>
    ),
    tent: (
      <>
        <path d="m3 21 9-18 9 18H3Zm5 0 4-8 4 8M9 3l3 6 3-6" />
      </>
    ),
    beach: (
      <>
        <path d="M3 11a9 9 0 0 1 18 0H3Zm9-9c-3 3-4 6-4 9m4-9c3 3 4 6 4 9m-4 0v10M5 21h14" />
      </>
    ),
    camera: (
      <>
        <path d="m8 5 2-2h4l2 2h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2h4Z" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18M5 7h14M5 17h14" />
      </>
    ),
    graduation: (
      <>
        <path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v9" />
      </>
    ),
    baby: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 5c-3-4 4-5 3-1M8 12h.1M16 12h.1M9 16q3 3 6 0" />
      </>
    ),
    family: (
      <>
        <circle cx="7" cy="6" r="3" />
        <circle cx="17" cy="6" r="3" />
        <circle cx="12" cy="13" r="2" />
        <path d="M2 18v-4q0-4 5-4m15 8v-4q0-4-5-4M8 22v-3a4 4 0 0 1 8 0v3" />
      </>
    ),
    beauty: (
      <>
        <path d="M7 21V11h10v10H7Zm2-10V5l6-3v9M7 16h10" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 3v6c0 5-3 8-8 11-5-3-8-6-8-11V5l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    receipt: (
      <>
        <path d="M5 2l3 2 4-2 4 2 3-2v20l-3-2-4 2-4-2-3 2V2ZM9 8h6m-6 4h6m-6 4h3" />
      </>
    ),
    subscription: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 2v6m8-6v6M4 10h16m-7 3 3 3-3 3m-5-3h8" />
      </>
    ),
    parcel: (
      <>
        <path d="m3 7 9-5 9 5v11l-9 4-9-4V7Zm0 0 9 5 9-5m-9 5v10M7 5l10 5v5" />
      </>
    ),
    parking: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 18V7h4a3 3 0 0 1 0 6H9" />
      </>
    ),
    train: (
      <>
        <rect x="6" y="2" width="12" height="16" rx="5" />
        <path d="M6 10h12M9 6h6M7 22l3-4m7 4-3-4M9 14h.1m6 0h.1" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6V5Zm12 0v3m0 3v2m0 3v3" />
      </>
    ),
    flower: (
      <>
        <path d="M12 21v-7m0 6q-6 0-7-4 5-1 7 4Zm0-3q6 0 7-4-5-1-7 4ZM12 4c-4-6-9 0-5 3-7 1-4 8 1 6 0 6 8 6 8 0 5 2 8-5 1-6 4-3-1-9-5-3Z" />
        <circle cx="12" cy="9" r="2" />
      </>
    ),
    food: (
      <>
        <path d="M5 3v7m3-7v7M3 3v6a3 3 0 0 0 6 0V3M6 12v9m12-18c-3 3-4 7-4 10h5V3h-1Zm1 10v8" />
      </>
    ),
    coffee: (
      <>
        <path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 22h18" />
      </>
    ),
    transit: (
      <>
        <rect x="5" y="3" width="14" height="15" rx="4" />
        <path d="M5 11h14M9 3v8M7 21l2-3m8 3-2-3" />
        <circle cx="9" cy="15" r=".7" />
        <circle cx="15" cy="15" r=".7" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2" />
      </>
    ),
    pay: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="3" />
        <path d="M8 6V3h8v3M3 11h18m-12 5h6m-3-3v6" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 2 5 3 3 4v16c3-2 6-1 9 1 3-2 6-3 9-1V4c-2-1-5-2-9 1Zm0 0v16" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="14" r="8" />
        <path d="M9 2h6m-3 0v4m6 2 2-2m-8 4v5l3 2" />
      </>
    ),
    activity: (
      <>
        <path d="m4 13 4 2 3-6 4 6h5M3 6v12m3-14v16m12-16v16m3-14v12" />
      </>
    ),
    heart: (
      <>
        <path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />
        <path d="M4 12h4l2-3 3 6 2-3h5" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C9 2 3 8 5 15s15 5 15-12ZM4 21 15 9" />
      </>
    ),
    fruit: (
      <>
        <path d="M12 7c-6-5-11 1-7 9 3 6 5 4 7 4s4 2 7-4c4-8-1-14-7-9Zm0 0V3m0 2c1-3 3-3 5-3" />
      </>
    ),
    cake: (
      <>
        <path d="M4 12h16v9H4Zm0 4c2-3 4 3 6 0s4 3 6 0 3 0 4 0M12 12V8" />
        <path d="M12 2c-3 3-2 5 0 5s3-2 0-5Z" />
      </>
    ),
    bottle: (
      <>
        <path d="M9 2h6v4l2 4v10H7V10l2-4V2Zm0 4h6M7 12h10m-10 5h10" />
      </>
    ),
    noodles: (
      <>
        <path d="M3 12h18c-1 6-4 8-9 8s-8-2-9-8Zm5 9h8M6 3l14 5M5 6l14 5M8 9v3m4-2v2" />
      </>
    ),
    car: (
      <>
        <path d="m5 9 2-5h10l2 5M3 10h18v8H3Zm2 8v3m14-3v3M6 13h2m8 0h2" />
      </>
    ),
    bus: (
      <>
        <rect x="4" y="3" width="16" height="16" rx="3" />
        <path d="M4 11h16M12 3v8M7 19v2m10-2v2M7 15h1m8 0h1" />
      </>
    ),
    bike: (
      <>
        <circle cx="5" cy="17" r="4" />
        <circle cx="19" cy="17" r="4" />
        <path d="m5 17 5-9 5 9H5m10 0 4-9h-7M8 5h4m6-2h2l1 5" />
      </>
    ),
    plane: (
      <>
        <path d="m12 2 2 8 7 5v2l-7-2v5l2 2-4-1-4 1 2-2v-5l-7 2v-2l7-5 2-8Z" />
      </>
    ),
    fuel: (
      <>
        <path d="M4 21V4h10v17M2 21h14M4 10h10m0 3h3v5a2 2 0 0 0 4 0V8l-3-3m1 1-2 2 4 3" />
      </>
    ),
    shirt: (
      <>
        <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c-1 4-7 4-8 0Z" />
      </>
    ),
    shoe: (
      <>
        <path d="M3 8h5l3 6 9 2 1 5H3V8Zm0 10h18M9 10l3-1m-1 4 3-1" />
      </>
    ),
    gift: (
      <>
        <path d="M3 10h18v4H3Zm2 4v7h14v-7M12 10v11" />
        <path d="M12 10C2 10 4 1 8 4l4 6c10 0 8-9 4-6l-4 6Z" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M10 5h4m-3 14h2" />
      </>
    ),
    cart: (
      <>
        <path d="M2 3h3l3 12h11l3-9H6m2 9-1 3h12" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </>
    ),
    home: (
      <>
        <path d="m2 11 10-9 10 9M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="8" r="5" />
        <path d="m12 12 9 9m-3-3 3-3m-6 0 3-3M7 7h1" />
      </>
    ),
    bulb: (
      <>
        <path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7H8Zm1 3h6m-5 3h4m-2-6v-5" />
      </>
    ),
    drop: (
      <>
        <path d="M12 2c-3 5-8 10-8 14a8 8 0 0 0 16 0c0-4-5-9-8-14Z" />
        <path d="M8 16a4 4 0 0 0 4 4" />
      </>
    ),
    wifi: (
      <>
        <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0" />
        <circle cx="12" cy="20" r="1" />
      </>
    ),
    tools: (
      <>
        <path d="M14 3a6 6 0 0 0-7 8L2 18l4 4 7-8a6 6 0 0 0 8-7l-4 4-4-4 4-4h-3Z" />
      </>
    ),
    pill: (
      <>
        <path d="m5 11 6-6a5.7 5.7 0 0 1 8 8l-6 6a5.7 5.7 0 0 1-8-8Zm3-3 8 8" />
      </>
    ),
    clinic: (
      <>
        <path d="M4 21V5h16v16M2 21h20M9 21v-5h6v5M12 7v6m-3-3h6" />
      </>
    ),
    tooth: (
      <>
        <path d="M12 5C2-3 2 10 5 15l2 7 3-8h4l3 8 2-7c3-5 3-18-7-10Z" />
      </>
    ),
    pet: (
      <>
        <ellipse cx="5" cy="8" rx="2" ry="3" />
        <ellipse cx="11" cy="5" rx="2" ry="3" />
        <ellipse cx="18" cy="7" rx="2" ry="3" />
        <path d="M8 14c2-5 6-5 8 0 6 4 2 8-4 5-6 3-10-1-4-5Z" />
      </>
    ),
    movie: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4" />
      </>
    ),
    music: (
      <>
        <path d="M9 17V5l11-3v13M9 9l11-3" />
        <ellipse cx="6" cy="18" rx="3" ry="3" />
        <ellipse cx="17" cy="16" rx="3" ry="3" />
      </>
    ),
    game: (
      <>
        <path d="M7 6h10c4 0 7 14 3 14l-5-4H9l-5 4C0 20 3 6 7 6Z" />
        <path d="M7 9v6m-3-3h6m6-2h1m1 3h1" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="9" cy="6" rx="6" ry="3" />
        <path d="M3 6v5c0 4 12 4 12 0V6M3 11v5c0 3 6 4 10 2" />
        <path d="M16 11c7 0 7 5 0 5m5-3v6c0 3-9 3-9 0v-5" />
      </>
    ),
    bank: (
      <>
        <path d="m2 8 10-6 10 6H2Zm1 13h18M5 11v7m7-7v7m7-7v7" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 9h20M6 15h4" />
      </>
    ),
    salary: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="M8 6V3h8v3M3 12c6 3 12 3 18 0m-11 2h4" />
      </>
    ),
    bonus: (
      <>
        <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
      </>
    ),
  }
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
      focusable="false"
    >
      {shapes[id]}
    </svg>
  )
}
