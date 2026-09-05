import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import HUD from './components/HUD.jsx'

const BASE_HUD_PROPS = {
  health: 100,
  healthRecentlyDamaged: true,
  armor: 58,
  stamina: 100,
  staminaRegenerating: false,
  vehicleVisible: false,
  playerInVehicle: false,
  speedUnit: 'mph',
  speed: 0,
  rpm: 0,
  currentGear: 'N',
  fuel: 100,
  hasFuelProvider: false,
  engineHealth: 100,
  cruiseActive: false,
  cruiseSpeed: 0,
  belt: false,
  harness: false,
  useSeatbelt: true,
  nosVisible: false,
  nosAmount: 0,
  nosActive: false,
  hunger: 100,
  thirst: 100,
  stress: 0,
  oxygen: 100,
  oxygenExtended: false,
  underwater: false,
  inWater: false,
  voipTalking: false,
  voipRange: 'normal',
  voipConnected: false,
  voipProximity: 0,
  radioChannel: 0,
  radioTalking: false,
  hungerThreshold: 25,
  thirstThreshold: 25,
  stressThreshold: 75,
  oxygenThreshold: 25,
  statusIconShape: 'bar',
  resolvedStatusIconShape: 'bar',
  statusRingWidth: 46,
  statusRingHeight: 46,
  showVoip: false,
  framework: 'standalone',
  standaloneVoipHudEnabled: false,
  speedometerPos: null,
  editMode: false,
  onDrag: () => {},
  ammoEditMode: false,
  onAmmoDrag: () => {},
  colors: {},
  theme: {},
  layout: {},
  fuelDisplayStyle: 'bar',
  waypointDist: -1,
  waypointUnit: '',
  ammoClip: -1,
  ammoReserve: -1,
  ammoPos: null,
  ammoColor: '#ffffff',
  ammoPositionPreset: 'bottom-right',
  isArmed: false,
  weaponType: 'none',
  weaponIcon: null,
  weaponName: '',
  weaponUsesCharge: false,
  weaponChargeReady: true,
  weaponChargeProgress: 100,
  gta6HudEnabled: true,
  gta6AuthenticWeaponHud: true,
  gta6ShowWeaponName: false,
  locationDisplayStyle: 'gta6',
  sectionedBars: false,
  oxygenDisplayLocation: 'statusCluster',
}

describe('armor damage HUD contract', () => {
  test('the game polling boundary treats armor loss as recent damage', () => {
    const hudThread = readFileSync(
      new URL('../../modules/threads/client/hud.lua', import.meta.url),
      'utf8',
    )

    expect(hudThread).toMatch(
      /lastHealth\s*>=\s*0\s*and\s*\(\s*health\s*<\s*lastHealth\s*or\s*armor\s*<\s*lastArmor\s*\)/,
    )
  })

  test('the oxygen polling boundary detects scuba gear and extended breath capacity', () => {
    const statusClient = readFileSync(
      new URL('../../modules/status/client.lua', import.meta.url),
      'utf8',
    )

    expect(statusClient).toMatch(/PED_CONFIG_FLAG_IS_SCUBA\s*=\s*135/)
    expect(statusClient).toMatch(/GetPedConfigFlag\(ped, PED_CONFIG_FLAG_IS_SCUBA, true\)\s*==\s*true/)
    expect(statusClient).toMatch(/breathMaxReference\s*>\s*15\.0/)
  })

  test('the Leonida damage strip renders equipped armor over health', () => {
    const markup = renderToStaticMarkup(React.createElement(HUD, BASE_HUD_PROPS))

    expect(markup).toContain('aria-label="Armor"')
    expect(markup).toContain('gta6-vital-fill--armor')
    expect(markup).toContain('width:58%')
  })

  test('the Leonida area announcement suppresses the overlapping current waypoint capsule', () => {
    const plaqueMarkup = renderToStaticMarkup(React.createElement(HUD, {
      ...BASE_HUD_PROPS,
      waypointDist: 418,
      waypointUnit: 'm',
      locationDisplayStyle: 'gta6',
    }))
    const currentMarkup = renderToStaticMarkup(React.createElement(HUD, {
      ...BASE_HUD_PROPS,
      waypointDist: 418,
      waypointUnit: 'm',
      locationDisplayStyle: 'current',
    }))

    expect(plaqueMarkup).not.toContain('waypoint-distance')
    expect(currentMarkup).toContain('waypoint-distance')
  })

  test('the Leonida oxygen meter expands only for extended underwater capacity', () => {
    const compactMarkup = renderToStaticMarkup(React.createElement(HUD, {
      ...BASE_HUD_PROPS,
      healthRecentlyDamaged: false,
      oxygen: 72,
      oxygenExtended: false,
      inWater: true,
      underwater: true,
    }))
    const tankMarkup = renderToStaticMarkup(React.createElement(HUD, {
      ...BASE_HUD_PROPS,
      healthRecentlyDamaged: false,
      oxygen: 72,
      oxygenExtended: true,
      inWater: true,
      underwater: true,
    }))

    expect(compactMarkup).toContain('gta6-vital--oxygen')
    expect(compactMarkup).not.toContain('has-extended-oxygen')
    expect(tankMarkup).toContain('gta6-vital--oxygen has-extended-oxygen')
    expect(tankMarkup).toContain('aria-label="Oxygen"')
  })
})
