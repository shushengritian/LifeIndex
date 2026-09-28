const icons = {
  today:
    '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/>',
  health:
    '<path d="M12 20S4 15.7 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.7 12 20 12 20Z"/><path d="M7 12h3l1-3 2 6 1-3h3"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 0v3m0 8 3-3"/>',
  finance: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18m-5 5h2M7 5V3h10"/>',
  settings:
    '<path d="m9 3-1 3-3 1v4l-2 1 2 1v4l3 1 1 3h6l1-3 3-1v-4l2-1-2-1V7l-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  play: '<path d="m9 5 10 7-10 7Z"/>',
  weight:
    '<rect x="4" y="4" width="16" height="17" rx="4"/><path d="M8 8a5 5 0 0 1 8 0m-4 0 2-2"/>',
  activity: '<path d="M3 9v6m3-8v10m12-10v10m3-8v6M6 12h12"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  leaf: '<path d="M19 4C9 2 3 7 6 14s14 5 13-10ZM5 20l10-11"/>',
  cup: '<path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Zm12 1h1a3 3 0 0 1 0 6h-1M8 3v2m5-2v2"/>',
  food: '<path d="M5 3v7m3-7v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10m12-18c-4 2-5 8-2 10h3m0-10v18"/>',
  train:
    '<rect x="6" y="2" width="12" height="16" rx="3"/><path d="M6 10h12M9 21l2-3m4 3-2-3M9 6h6m-6 8h1m4 0h1"/>',
  bag: '<path d="M5 7h14l2 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
}
const icon = (name, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.today}</svg>`
