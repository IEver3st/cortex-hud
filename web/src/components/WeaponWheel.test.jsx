import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import { DEV_WEAPON_WHEEL_STATE, INITIAL_WEAPON_WHEEL_STATE } from '../weaponWheelModel.js'
import WeaponWheel from './WeaponWheel.jsx'

describe('weapon wheel presentation', () => {
  test('matches the eight-station reference without invented wheel chrome', () => {
    const html = renderToStaticMarkup(<WeaponWheel state={DEV_WEAPON_WHEEL_STATE} />)

    expect((html.match(/weapon-wheel__slot(?: |")/g) || [])).toHaveLength(8)
    expect(html).toContain('weapon-wheel__slot is-selected')
    expect(html).toContain('weapon-wheel__slot is-equipped')
    expect(html).toContain('Unarmed')
    expect(html).toContain('Pistol')
    expect(html).toContain('20 loaded, 80 reserve')
    expect(html).not.toContain('weapon-wheel__connector')
    expect(html).not.toContain('weapon-wheel__slot-label')
    expect(html).not.toContain('weapon-wheel__slot-count')
    expect(html).not.toContain('weapon-wheel__hint')
    expect(html).not.toContain('<button')
  })

  test('unmounts completely while closed', () => {
    expect(renderToStaticMarkup(<WeaponWheel state={INITIAL_WEAPON_WHEEL_STATE} />)).toBe('')
  })
})
