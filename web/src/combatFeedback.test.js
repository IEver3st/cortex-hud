import { describe, expect, test } from 'bun:test'
import {
  getHeavyReticleDiameter,
  getHomingReticleSize,
  getOpenReticleGap,
  getRingReticleDiameter,
  getTazerReticleDiameter,
  normalizeHitmarkerKind,
  normalizeWeaponBloom,
  normalizeWeaponReticleType,
} from './combatFeedback.js'

describe('combat feedback', () => {
  test('automatic and shotgun rings tighten as bloom falls', () => {
    expect(getRingReticleDiameter(0)).toBe(9)
    expect(getRingReticleDiameter(50)).toBe(14.5)
    expect(getRingReticleDiameter(100)).toBe(20)
    expect(getRingReticleDiameter(20)).toBeLessThan(getRingReticleDiameter(80))
    expect(getRingReticleDiameter(50, 'shotgun')).toBe(18.5)
  })

  test('the three-line reticle spreads with bloom', () => {
    expect(getOpenReticleGap(0)).toBe(3)
    expect(getOpenReticleGap(50)).toBe(5)
    expect(getOpenReticleGap(100)).toBe(7)
  })

  test('bloom is finite, rounded, and bounded', () => {
    expect(normalizeWeaponBloom(-10)).toBe(0)
    expect(normalizeWeaponBloom(64.6)).toBe(65)
    expect(normalizeWeaponBloom(400)).toBe(100)
    expect(normalizeWeaponBloom('not-a-number')).toBe(0)
    expect(normalizeWeaponBloom(null)).toBe(0)
  })

  test('only supported hitmarker meanings reach the UI', () => {
    expect(normalizeHitmarkerKind('regular')).toBe('regular')
    expect(normalizeHitmarkerKind('knockout')).toBe('knockout')
    expect(normalizeHitmarkerKind('critical')).toBe('critical')
    expect(normalizeHitmarkerKind('vehicle')).toBe('vehicle')
    expect(normalizeHitmarkerKind('headshot')).toBeNull()
  })

  test('only supported reticle profiles reach the UI', () => {
    expect(normalizeWeaponReticleType('automatic')).toBe('automatic')
    expect(normalizeWeaponReticleType('single')).toBe('single')
    expect(normalizeWeaponReticleType('shotgun')).toBe('shotgun')
    expect(normalizeWeaponReticleType('tazer')).toBe('tazer')
    expect(normalizeWeaponReticleType('rpg')).toBe('rpg')
    expect(normalizeWeaponReticleType('homing')).toBe('homing')
    expect(normalizeWeaponReticleType('rifle')).toBeNull()
  })

  test('heavy reticles stay larger than automatic rings while tracking bloom', () => {
    expect(getRingReticleDiameter(0, 'rpg')).toBe(16)
    expect(getRingReticleDiameter(50, 'rpg')).toBe(21.5)
    expect(getRingReticleDiameter(0, 'homing')).toBe(20)
    expect(getRingReticleDiameter(50, 'homing')).toBe(24)
    expect(getRingReticleDiameter(0, 'tazer')).toBe(8)
    expect(getRingReticleDiameter(50, 'tazer')).toBe(11)
    expect(getRingReticleDiameter(50, 'rpg')).toBeGreaterThan(getRingReticleDiameter(50, 'automatic'))
    expect(getHeavyReticleDiameter(50, 'rpg')).toBe(getRingReticleDiameter(50, 'rpg'))
    expect(getHomingReticleSize(50)).toBe(getRingReticleDiameter(50, 'homing'))
    expect(getTazerReticleDiameter(50)).toBe(getRingReticleDiameter(50, 'tazer'))
  })
})
