import { describe, expect, test } from 'bun:test'
import { normalizeLocationDisplayStyle } from './locationDisplayStyle.js'

describe('location display style', () => {
  test('keeps the supported styles stable', () => {
    expect(normalizeLocationDisplayStyle('off')).toBe('off')
    expect(normalizeLocationDisplayStyle('current')).toBe('current')
    expect(normalizeLocationDisplayStyle('gta6')).toBe('gta6')
  })

  test('falls back safely for malformed or unknown values', () => {
    expect(normalizeLocationDisplayStyle('GTA6')).toBe('current')
    expect(normalizeLocationDisplayStyle('future')).toBe('current')
    expect(normalizeLocationDisplayStyle(null)).toBe('current')
  })
})
