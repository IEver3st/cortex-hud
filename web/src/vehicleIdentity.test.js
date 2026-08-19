import { describe, expect, test } from 'bun:test'
import {
  buildProceduralMarque,
  clampVehicleMetric,
  normalizeVehicleIdentity,
} from './vehicleIdentity.js'

describe('vehicle identity payloads', () => {
  test('rejects malformed entry ids and bounds telemetry', () => {
    expect(normalizeVehicleIdentity({ entryId: 'bad' })).toBeNull()

    expect(normalizeVehicleIdentity({
      entryId: 7,
      brand: '  Vapid  ',
      name: '  Ganado  ',
      engineHealth: 140,
      fuel: -12,
    })).toMatchObject({
      entryId: 7,
      brand: 'Vapid',
      name: 'Ganado',
      engineHealth: 100,
      fuel: 0,
    })
  })

  test('uses safe fallbacks for missing add-on metadata', () => {
    const identity = normalizeVehicleIdentity({
      entryId: 8,
      brand: 'CARNOTFOUND',
      name: 'NULL',
      archetype: 'custom_sport_rs',
      proceduralLogo: true,
      engineHealth: 825 / 10,
      fuel: 53.4,
    })

    expect(identity).toMatchObject({
      brand: 'Custom',
      name: 'Vehicle',
      proceduralLogo: true,
      engineHealth: 83,
      fuel: 53,
    })
    expect(buildProceduralMarque(identity)).toMatchObject({
      generated: true,
      initials: 'CSR',
    })
  })

  test('generates compact emblems for unknown add-on manufacturers', () => {
    const mark = buildProceduralMarque({
      brand: 'CapricePPV',
      name: 'Chev',
      modelKey: 'addon-caprice',
    })

    expect(mark.generated).toBe(true)
    expect(mark.initials).toBe('CAP')
    expect(['oval', 'shield', 'wings', 'aperture']).toContain(mark.variant)
  })

  test('keeps metric values finite and deterministic', () => {
    expect(clampVehicleMetric(Number.NaN)).toBe(0)
    expect(clampVehicleMetric(49.6)).toBe(50)

    const identity = { brand: 'Vapid', name: 'Ganado', modelKey: '123' }
    expect(buildProceduralMarque(identity)).toEqual(buildProceduralMarque(identity))
    expect(buildProceduralMarque(identity).generated).toBe(false)
    expect(buildProceduralMarque(identity).variant).toBe('oval')
  })
})
