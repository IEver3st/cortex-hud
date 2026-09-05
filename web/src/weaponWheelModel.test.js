import { describe, expect, test } from 'bun:test'
import {
  DEV_WEAPON_WHEEL_STATE,
  INITIAL_WEAPON_WHEEL_STATE,
  normalizeWeaponWheelState,
} from './weaponWheelModel.js'

describe('weapon wheel model', () => {
  test('normalizes an eight-category snapshot without exposing native hashes', () => {
    const state = normalizeWeaponWheelState(DEV_WEAPON_WHEEL_STATE)

    expect(state.visible).toBe(true)
    expect(state.categories).toHaveLength(8)
    expect(state.selectedCategory).toBe('melee')
    expect(state.categories[0].weapon.name).toBe('Pistol')
    expect(state.categories[0].weapon.equipped).toBe(true)
    expect(state.categories[2].weapon.equipped).toBe(false)
    expect(state.categories[0].weapon.ammo).toEqual({ visible: true, clip: 20, reserve: 80 })
    expect(state.categories[0].weapon.hash).toBeUndefined()
  })

  test('bounds counts and rejects malformed weapon artwork paths', () => {
    const state = normalizeWeaponWheelState({
      visible: true,
      selectedCategory: 'gear',
      categories: [{
        id: 'gear',
        label: 'Thrown & Gear',
        count: 9999,
        selectedIndex: -20,
        weapon: {
          id: 'weapon_grenade',
          icon: '../outside.png',
          name: 'Grenade',
          equipped: 'yes',
          ammo: { visible: true, clip: -4, reserve: Number.POSITIVE_INFINITY },
        },
      }],
    })

    expect(state.categories[0].count).toBe(256)
    expect(state.categories[0].selectedIndex).toBe(1)
    expect(state.categories[0].weapon.icon).toBe('')
    expect(state.categories[0].weapon.equipped).toBe(false)
    expect(state.categories[0].weapon.ammo.clip).toBe(0)
    expect(state.categories[0].weapon.ammo.reserve).toBe(0)
  })

  test('preserves the prior snapshot when a partial payload omits categories', () => {
    const initial = normalizeWeaponWheelState(DEV_WEAPON_WHEEL_STATE)
    const updated = normalizeWeaponWheelState({ visible: false, revision: 2 }, initial)

    expect(updated.visible).toBe(false)
    expect(updated.revision).toBe(2)
    expect(updated.categories).toBe(initial.categories)
    expect(INITIAL_WEAPON_WHEEL_STATE.visible).toBe(false)
  })
})
