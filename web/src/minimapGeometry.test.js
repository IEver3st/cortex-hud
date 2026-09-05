import { describe, expect, test } from 'bun:test'
import {
  createFallbackMinimapBounds,
  normalizeMinimapBounds,
  resolveMinimapPlaqueStyle,
  resolveVehicleIdentificationStyle,
} from './minimapGeometry.js'

describe('runtime minimap geometry', () => {
  test('preserves native bounds while trimming the plaque visible-right overhang', () => {
    const bounds = normalizeMinimapBounds(
      { left: 27, top: 742, bottom: 51, width: 315, height: 198 },
      { screenWidth: 1920, screenHeight: 1080 },
    )

    expect(bounds).toEqual({ left: 27, top: 742, bottom: 51, width: 315, height: 198 })
    expect(resolveMinimapPlaqueStyle(bounds, 1, { screenWidth: 1920, screenHeight: 1080 })).toEqual({
      left: '27px',
      bottom: '257px',
      width: '308px',
    })
  })

  test('provides bounded geometry before the first game layout message', () => {
    expect(normalizeMinimapBounds(null, { screenWidth: 1280, screenHeight: 720 }))
      .toEqual(createFallbackMinimapBounds(1280, 720))
  })

  test('keeps measured ultrawide positions in the active viewport coordinate space', () => {
    const bounds = { left: -2400, top: 1050, bottom: 80, width: 1258, height: 395 }

    expect(resolveMinimapPlaqueStyle(bounds, 1.5, { screenWidth: 7680, screenHeight: 2160 }))
      .toEqual({ left: '-2400px', bottom: '487px', width: '1247px' })
  })

  test('gives vehicle identification the plaque gap with a tighter right edge', () => {
    const bounds = { left: 27, top: 742, bottom: 51, width: 315, height: 198 }

    expect(resolveVehicleIdentificationStyle(
      bounds,
      1,
      { screenWidth: 1920, screenHeight: 1080 },
    )).toEqual({ left: '30px', bottom: '257px', width: '307px' })
  })
})
