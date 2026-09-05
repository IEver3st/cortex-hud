import React from 'react'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import RadioSelector from './RadioSelector.jsx'
import { INITIAL_RADIO_STATE } from '../radioModel.js'

const renderSelector = (
  controls,
  muted = false,
  requested = false,
  onDemandAvailable = true,
) => renderToStaticMarkup(
  <RadioSelector
    state={{
      ...INITIAL_RADIO_STATE,
      visible: true,
      muted,
      onDemandAvailable,
      station: { id: 'RADIO_04_PUNK', label: 'Channel X', mark: 'X' },
      track: {
        ...INITIAL_RADIO_STATE.track,
        title: 'Live broadcast',
        artist: 'Channel X',
        requested,
      },
      controls,
      items: [{ id: 'RADIO_04_PUNK', label: 'Channel X', mark: 'X', kind: 'station' }],
    }}
  />,
)

const renderedMuteKey = (markup) => markup.match(
  /class="radio-selector__mute-key"[^>]*>([^<]+)<\/span>/,
)?.[1]

describe('radio selector input scheme', () => {
  test('shows only the keyboard key when keyboard and mouse are active', () => {
    const markup = renderSelector({ inputMode: 'keyboard', muteKey: 'X' })

    expect(markup.match(/class="radio-selector__mute-key"/g)).toHaveLength(1)
    expect(markup).toContain('data-input-mode="keyboard"')
    expect(renderedMuteKey(markup)).toBe('X')
    expect(markup).toContain('Live Radio')
  })

  test('switches the single keycap to gamepad and keeps the action inline', () => {
    const markup = renderSelector({ inputMode: 'gamepad', muteKey: 'A' }, true)

    expect(markup.match(/class="radio-selector__mute-key"/g)).toHaveLength(1)
    expect(markup).toContain('data-input-mode="gamepad"')
    expect(renderedMuteKey(markup)).toBe('A')
    expect(markup).toContain('radio-selector--muted')
    expect(markup).toContain('Unmute')
    expect(markup).toContain('Press A to resume')
  })

  test('announces a newly selected on-demand song while native playback catches up', () => {
    const markup = renderSelector({ inputMode: 'keyboard', muteKey: 'X' }, false, true)

    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('radio-selector--pending')
    expect(markup).toContain('Cueing · Channel X')
  })

  test('presents stations without a deterministic catalog as live-only', () => {
    const markup = renderSelector({ inputMode: 'keyboard', muteKey: 'X' }, false, false, false)

    expect(markup).toContain('radio-selector__mode is-unavailable')
    expect(markup).toContain('On Demand unavailable for this station')
    expect(markup).toContain('aria-disabled="true"')
  })
})
