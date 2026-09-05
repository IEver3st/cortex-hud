import { describe, expect, test } from 'bun:test'
import { shouldShowSpeedometer, shouldShowWeaponOverlay } from './hudVisibility.js'

describe('speedometer visibility', () => {
  test('shows for ordinary vehicle driving', () => {
    expect(shouldShowSpeedometer({
      vehicleVisible: true,
      editMode: false,
      disableSpeedometer: false,
      gta6HudEnabled: false,
    })).toBe(true)
  })

  test('honors the explicit disable-speedometer setting', () => {
    expect(shouldShowSpeedometer({
      vehicleVisible: true,
      editMode: false,
      disableSpeedometer: true,
      gta6HudEnabled: false,
    })).toBe(false)
  })

  test('always hides in Leonida UI mode', () => {
    expect(shouldShowSpeedometer({
      vehicleVisible: true,
      editMode: true,
      disableSpeedometer: false,
      gta6HudEnabled: true,
    })).toBe(false)
  })
})

describe('Leonida weapon overlay visibility', () => {
  test('shows an equipped weapon while the player is on foot', () => {
    expect(shouldShowWeaponOverlay({
      gta6HudEnabled: true,
      isArmed: true,
      ammoEditMode: false,
      playerInVehicle: false,
    })).toBe(true)
  })

  test('hides vehicle weapon ammo when entering a vehicle', () => {
    expect(shouldShowWeaponOverlay({
      gta6HudEnabled: true,
      isArmed: true,
      ammoEditMode: false,
      playerInVehicle: true,
    })).toBe(false)
  })
})
