import React from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { resolveGta6Area, resolveGta6LocationLabel } from '../locationDisplayStyle.js'
import Gta6Navigation from './Gta6Navigation.jsx'

describe('Leonida location plaque', () => {
  test('uses the stable game zone instead of waypoint or street changes', () => {
    expect(resolveGta6Area({
      street: 'Vinewood Boulevard',
      zone: 'Vinewood',
      zoneCode: 'VINE',
    })).toEqual({ key: 'ZONE:VINE', label: 'Vinewood' })
  })

  test('falls back to a bounded location label without a waypoint', () => {
    expect(resolveGta6LocationLabel({ street: 'Unknown', zone: 'Mirror Park', zoneCode: '' }))
      .toBe('Mirror Park')
    expect(resolveGta6LocationLabel({ street: null, zone: null, zoneCode: null }))
      .toBe('Los Santos')
  })

  test('does not persistently render before an area-entry effect', () => {
    const markup = renderToStaticMarkup(React.createElement(Gta6Navigation, {
      street: 'Vinewood Boulevard',
      zone: 'Vinewood',
      zoneCode: 'VINE',
      radarVisible: true,
      layout: {
        screenWidth: 1920,
        screenHeight: 1080,
        minimapBounds: { left: 24, bottom: 51, width: 315, height: 198 },
      },
    }))

    expect(markup).toBe('')
  })
})
