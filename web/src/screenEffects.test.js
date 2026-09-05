import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import ScreenEffects from './components/ScreenEffects.jsx'
import { hasActiveScreenEffects, normalizeScreenEffectMessage } from './screenEffects.js'

const screenEffectsCss = readFileSync(
  new URL('./components/ScreenEffects.css', import.meta.url),
  'utf8',
)
const screenEffectsComponent = readFileSync(
  new URL('./components/ScreenEffects.jsx', import.meta.url),
  'utf8',
)

describe('screen effects', () => {
  test('accepts only supported, bounded effect messages', () => {
    expect(normalizeScreenEffectMessage({
      effect: 'kill',
      duration: 99999,
      strength: 4,
      blur: -2,
    })).toEqual({
      effect: 'kill',
      duration: 5000,
      strength: 1,
    })

    expect(normalizeScreenEffectMessage({ effect: 'stamina' }).strength).toBe(0.24)

    expect(normalizeScreenEffectMessage({ effect: 'unknown' })).toBeNull()
  })

  test('renders simultaneous effects without an interactive surface', () => {
    const effects = {
      damage: { nonce: 1, duration: 480, strength: 0.38 },
      stamina: { nonce: 2, duration: 900, strength: 0.24 },
      kill: null,
    }
    const markup = renderToStaticMarkup(
      React.createElement(ScreenEffects, { effects, onEffectEnd: () => {} }),
    )

    expect(markup).toContain('screen-effect--damage')
    expect(markup).toContain('screen-effect--stamina')
    expect(markup).not.toContain('screen-effect--kill')
    expect(hasActiveScreenEffects(effects)).toBe(true)
  })

  test('renders a continuous inset stamina glow without fullscreen opacity compositing', () => {
    const effects = {
      damage: null,
      stamina: { nonce: 3, duration: 900, strength: 0.24 },
      kill: null,
    }
    const markup = renderToStaticMarkup(
      React.createElement(ScreenEffects, { effects, onEffectEnd: () => {} }),
    )

    expect(screenEffectsCss).not.toContain('backdrop-filter')
    expect(screenEffectsCss).not.toContain('contain: strict')
    expect(screenEffectsCss).not.toMatch(/\bopacity\s*:/)
    expect(markup.match(/screen-effect screen-effect--stamina/g)).toHaveLength(1)
    expect(markup).not.toContain('screen-effect-edge')
    expect(screenEffectsCss).toMatch(/\.screen-effect--stamina\s*\{[^}]*box-shadow:/s)
    expect(screenEffectsCss).toMatch(
      /@keyframes screen-effect-stamina[\s\S]*?box-shadow:[\s\S]*?inset[\s\S]*?inset[\s\S]*?inset/,
    )
  })

  test('uses the kill glow geometry and pulse timing with a white stamina palette', () => {
    expect(screenEffectsComponent).toContain(
      'const KILL_PAINT = { rim: 0.24, mid: 0.544, far: 0.224, fade: 0.48 }',
    )
    expect(screenEffectsComponent).toContain('stamina: KILL_PAINT')
    expect(screenEffectsComponent).toContain('kill: KILL_PAINT')
    expect(screenEffectsCss).toMatch(
      /\.screen-effect--kill,\s*\.screen-effect--stamina\s*\{[^}]*--screen-effect-far-blur:/s,
    )
    expect(screenEffectsCss).toMatch(
      /@keyframes screen-effect-stamina[\s\S]*?14%\s*\{[\s\S]*?42%\s*\{/,
    )
    expect(screenEffectsCss).toContain('rgba(246, 249, 250, var(--screen-effect-rim-alpha))')
    expect(screenEffectsCss).toContain('rgba(205, 220, 228, var(--screen-effect-mid-alpha))')
  })
})
