import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'bun:test'
import SettingsModal from './SettingsModal.jsx'

const renderSettings = (customRadioUi) => renderToStaticMarkup(
  <SettingsModal
    visible
    settings={{ customRadioUi }}
    onSave={() => {}}
    onClose={() => {}}
    onStartMoveSpeedometer={() => {}}
    onResetSpeedometer={() => {}}
    onStartMoveAmmo={() => {}}
    onResetAmmo={() => {}}
  />,
)

describe('vehicle radio setting', () => {
  test('renders the GTA/custom UI preference with an accessible toggle state', () => {
    const nativeMarkup = renderSettings(false)
    const customMarkup = renderSettings(true)

    expect(nativeMarkup).toContain('Vehicle Radio')
    expect(nativeMarkup).toContain('Use the Cortex radio selector instead of the base GTA radio wheel')
    expect(nativeMarkup).toMatch(/aria-pressed="false"[^>]*aria-label="Use custom Cortex radio interface"/)
    expect(customMarkup).toMatch(/aria-pressed="true"[^>]*aria-label="Use custom Cortex radio interface"/)
  })
})

describe('weapon wheel setting', () => {
  test('renders an accessible independent toggle', () => {
    const html = renderToStaticMarkup(
      <SettingsModal
        visible
        settings={{ customWeaponWheel: true }}
        onSave={() => {}}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('Custom Weapon Wheel')
    expect(html).toContain('aria-label="Use custom Cortex weapon wheel"')
    expect(html).toContain('aria-pressed="true"')
  })
})
