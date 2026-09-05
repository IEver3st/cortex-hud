import { describe, expect, test } from 'bun:test'
import { INITIAL_RADIO_STATE, getRadioWindow, normalizeRadioState } from './radioModel.js'

describe('radio model', () => {
  test('normalizes native payloads and wraps the selected index', () => {
    const state = normalizeRadioState({
      visible: true,
      mode: 'onDemand',
      onDemandAvailable: true,
      muted: true,
      selectedIndex: 3,
      station: { id: 'RADIO_01_CLASS_ROCK', label: 'Los Santos Rock Radio', mark: 'LSRR' },
      track: { textId: 1088, title: 'All The Things She Said', artist: 'SIMPLE MINDS', available: true },
      items: [
        { id: 'one', label: 'One', mark: '1', kind: 'track' },
        { id: 'two', label: 'Two', mark: '2', kind: 'track' },
      ],
    })

    expect(state.visible).toBe(true)
    expect(state.mode).toBe('onDemand')
    expect(state.onDemandAvailable).toBe(true)
    expect(state.muted).toBe(true)
    expect(state.selectedIndex).toBe(1)
    expect(state.track.title).toBe('All The Things She Said')
  })

  test('metadata-only updates preserve the selector items', () => {
    const initial = normalizeRadioState({
      visible: true,
      items: [{ id: 'station', label: 'Station', mark: 'ST' }],
    })
    const updated = normalizeRadioState({
      track: { textId: 7, title: 'New Song', artist: 'New Artist', available: true },
    }, initial)

    expect(updated.items).toBe(initial.items)
    expect(updated.track.artist).toBe('New Artist')
    expect(updated.visible).toBe(true)
  })

  test('renders only the currently active input scheme', () => {
    const keyboard = normalizeRadioState({
      controls: { inputMode: 'keyboard', muteKey: 'X' },
    })
    expect(keyboard.controls).toEqual({ inputMode: 'keyboard', muteKey: 'X' })

    const gamepad = normalizeRadioState({
      controls: { inputMode: 'gamepad', muteKey: 'A' },
    }, keyboard)
    expect(gamepad.controls).toEqual({ inputMode: 'gamepad', muteKey: 'A' })
    expect(gamepad.controls.muteKey).not.toContain('/')
  })

  test('builds a five-item circular window across the list boundary', () => {
    const items = Array.from({ length: 7 }, (_, index) => ({ id: String(index), label: String(index) }))
    const window = getRadioWindow(items, 0)

    expect(window.map(({ item }) => item.id)).toEqual(['5', '6', '0', '1', '2'])
    expect(window.map(({ offset }) => offset)).toEqual([-2, -1, 0, 1, 2])
  })

  test('rejects malformed item data without mutating the default state', () => {
    const state = normalizeRadioState({ items: [{ label: '' }, null], selectedIndex: 500 })
    expect(state.items).toEqual([])
    expect(state.selectedIndex).toBe(0)
    expect(INITIAL_RADIO_STATE.visible).toBe(false)
    expect(INITIAL_RADIO_STATE.onDemandAvailable).toBe(false)
  })
})
