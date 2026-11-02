// Inline SVG icons. 24x24, 1.7 stroke, currentColor. Shared by the templates.

const svg = (body, fill = 'none') =>
  `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

export const ICONS = {
  plug: svg('<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4"/>'),
  sparkles: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.4-2-.6-1 .1-2 1.3-2H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>'),
  layout: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>'),
  history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4M12 8v4l3 2"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5-10-6.5Z"/>'),
  download: svg('<path d="M12 4v10M8 10.5 12 14.5l4-4M4 18h16"/>'),
  refresh: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/><path d="M20 4v4h-4"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9Z"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2V5ZM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2V5Z"/>'),
  check: svg('<path d="m4 12.5 5 5 11-11"/>'),
  arrowRight: svg('<path d="M4 12h15M13 6l6 6-6 6"/>'),
  arrowDown: svg('<path d="M12 4v15M6 13l6 6 6-6"/>'),
  arrowUpRight: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  github: svg('<path d="M9 19c-4 1.2-4-2.2-6-2.8m12 5.3v-3.4c0-1 .1-1.4-.5-2 2.3-.3 4.5-1.2 4.5-5.1a4 4 0 0 0-1.1-2.8 3.7 3.7 0 0 0-.1-2.8s-.9-.3-3 1.1a10.3 10.3 0 0 0-5.6 0c-2.1-1.4-3-1.1-3-1.1a3.7 3.7 0 0 0-.1 2.8A4 4 0 0 0 5 11c0 3.9 2.2 4.8 4.5 5.1-.6.6-.6 1.2-.5 2V21"/>'),
  telegram: svg('<path d="m21 4-3 16-5.5-4.2L9 19l-.4-5.3L20 5.5 6.4 12.2 3 11l18-7Z"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  external: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  alert: svg('<path d="M12 3 2.5 20h19L12 3ZM12 9v5M12 17.5v.5"/>'),
  heart: svg('<path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6"/>'),
  star: svg('<path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.3 6.5 20.2l1.1-6.2L3 9.6l6.3-.9L12 3Z"/>'),
  verified: svg('<path d="m12 2 2.6 2 3.3-.2.9 3.2 2.6 2-1.4 3 1.4 3-2.6 2-.9 3.2-3.3-.2-2.6 2-2.6-2-3.3.2-.9-3.2-2.6-2 1.4-3-1.4-3 2.6-2 .9-3.2 3.3.2L12 2Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>'),
}
