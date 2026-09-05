import { describe, expect, test } from 'bun:test'
import { applyHudDevScenario } from './hudDevScenarios.js'

describe('HUD browser-dev scenarios', () => {
  test('Leonida combat enables the compact on-foot weapon presentation', () => {
    const state = applyHudDevScenario({ vehicleVisible: true }, 'gta6-combat')

    expect(state.gta6HudEnabled).toBe(true)
    expect(state.gta6AuthenticWeaponHud).toBe(true)
    expect(state.locationDisplayStyle).toBe('gta6')
    expect(state.vehicleVisible).toBe(false)
    expect(state.isArmed).toBe(true)
    expect(state.weaponType).toBe('rifle')
    expect(state.weaponReticleType).toBe('automatic')
    expect(state.weaponBloom).toBe(28)
    expect(state.weaponAiming).toBe(true)
    expect(state.ammoClip).toBe(24)
  })

  test('Leonida vehicle intro gets a fresh, valid identity entry', () => {
    const state = applyHudDevScenario({}, 'gta6-vehicle', 2048)

    expect(state.vehicleVisible).toBe(true)
    expect(state.aircraftVisible).toBe(false)
    expect(state.vehicleIdentity.entryId).toBe(2048)
    expect(state.vehicleIdentity.engineState).toBe(true)
  })

  test('aircraft scenario clears incompatible ground and scope states', () => {
    const state = applyHudDevScenario({
      vehicleVisible: true,
      sniperScopeVisible: true,
      vehicleIdentity: { entryId: 1 },
    }, 'aircraft-emergency')

    expect(state.aircraftVisible).toBe(true)
    expect(state.forceAircraftHud).toBe(true)
    expect(state.vehicleVisible).toBe(false)
    expect(state.vehicleIdentity).toBeNull()
    expect(state.sniperScopeVisible).toBe(false)
  })

  test('classic scenario clears transient Leonida and warning state', () => {
    const state = applyHudDevScenario({
      gta6HudEnabled: true,
      floodWarningActive: true,
      hurricaneWarningActive: true,
      sniperScopeVisible: true,
    }, 'classic-on-foot')

    expect(state.gta6HudEnabled).toBe(false)
    expect(state.locationDisplayStyle).toBe('current')
    expect(state.floodWarningActive).toBe(false)
    expect(state.hurricaneWarningActive).toBe(false)
    expect(state.sniperScopeVisible).toBe(false)
  })
})
