/** True when UI runs in a normal browser (Vite / file) — not FiveM NUI. */
export const isHudDevBrowser =
  typeof window !== 'undefined' && typeof window.GetParentResourceName !== 'function'

const PLAYFIELD_KEY = 'es_hud_dev_playfield'
const HEX6 = /^#[0-9A-Fa-f]{6}$/

/** Simulated “world” fill behind the HUD in the browser dev preview. */
export const defaultDevPlayfieldColor = '#1a1a2e'

export function loadDevPlayfieldColor() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultDevPlayfieldColor
  }
  try {
    const v = window.localStorage.getItem(PLAYFIELD_KEY)
    if (v && HEX6.test(v.trim())) {
      return v.trim()
    }
  } catch (_) {
    /* ignore */
  }
  return defaultDevPlayfieldColor
}

export function saveDevPlayfieldColor(hex) {
  if (typeof window === 'undefined' || !window.localStorage || !HEX6.test(hex)) {
    return
  }
  try {
    window.localStorage.setItem(PLAYFIELD_KEY, hex)
  } catch (_) {
    /* ignore */
  }
}
