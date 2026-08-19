import { describe, expect, test } from 'bun:test'
import { isArmorBypassTransition } from './vitalsOverlay.js'

describe('layered health and armor transitions', () => {
  test('recognizes health damage that leaves equipped armor untouched', () => {
    expect(isArmorBypassTransition(
      { health: 100, armor: 60 },
      { health: 82, armor: 60 },
    )).toBe(true)
  })

  test('keeps armor visible when armor absorbs the damage', () => {
    expect(isArmorBypassTransition(
      { health: 100, armor: 60 },
      { health: 100, armor: 42 },
    )).toBe(false)
  })

  test('keeps armor relevant when a hit consumes armor and health', () => {
    expect(isArmorBypassTransition(
      { health: 100, armor: 10 },
      { health: 92, armor: 0 },
    )).toBe(false)
  })

  test('does not report bypass damage when no armor remains', () => {
    expect(isArmorBypassTransition(
      { health: 80, armor: 0 },
      { health: 70, armor: 0 },
    )).toBe(false)
  })

  test('rejects healing and malformed telemetry', () => {
    expect(isArmorBypassTransition(
      { health: 70, armor: 50 },
      { health: 80, armor: 50 },
    )).toBe(false)
    expect(isArmorBypassTransition(
      { health: 70, armor: 50 },
      { health: 'unknown', armor: 50 },
    )).toBe(false)
  })
})
