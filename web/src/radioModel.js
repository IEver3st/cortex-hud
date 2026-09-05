const MAX_ITEMS = 192
const MAX_LABEL_LENGTH = 128

const cleanString = (value, maxLength = MAX_LABEL_LENGTH) => {
  if (typeof value !== 'string') return ''
  const withoutControls = Array.from(
    value,
    (character) => (character.charCodeAt(0) < 32 ? ' ' : character),
  ).join('')
  return withoutControls.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

const cleanInteger = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : fallback
}

const wrapIndex = (index, count) => {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

const normalizeItem = (item, index) => {
  if (!item || typeof item !== 'object') return null

  const label = cleanString(item.label)
  if (!label) return null

  return {
    id: cleanString(item.id, 192) || `radio-item-${index}`,
    label,
    subtitle: cleanString(item.subtitle),
    mark: cleanString(item.mark, 8) || label.slice(0, 4).toUpperCase(),
    kind: item.kind === 'track' ? 'track' : 'station',
  }
}

const normalizeStation = (station, previous) => {
  if (!station || typeof station !== 'object') return previous
  return {
    id: cleanString(station.id, 64) || previous.id,
    label: cleanString(station.label, 64) || previous.label,
    mark: cleanString(station.mark, 8) || previous.mark,
  }
}

const normalizeTrack = (track, previous) => {
  if (!track || typeof track !== 'object') return previous
  return {
    textId: cleanInteger(track.textId, previous.textId),
    title: cleanString(track.title) || previous.title,
    artist: cleanString(track.artist) || previous.artist,
    available: track.available === true,
    requested: track.requested === true,
  }
}

const normalizeControls = (controls, previous) => {
  if (!controls || typeof controls !== 'object') return previous

  const inputMode = controls.inputMode === 'gamepad'
    ? 'gamepad'
    : controls.inputMode === 'keyboard'
      ? 'keyboard'
      : previous.inputMode
  const suppliedKey = cleanString(controls.muteKey, 16)
  const fallbackKey = inputMode === previous.inputMode
    ? previous.muteKey
    : inputMode === 'gamepad' ? 'A' : 'X'

  return {
    inputMode,
    muteKey: suppliedKey || fallbackKey,
  }
}

export const INITIAL_RADIO_STATE = Object.freeze({
  visible: false,
  mode: 'radio',
  onDemandAvailable: false,
  muted: false,
  selectedIndex: 0,
  direction: 0,
  revision: 0,
  station: Object.freeze({ id: '', label: 'Vehicle Radio', mark: 'RADIO' }),
  track: Object.freeze({
    textId: -1,
    title: 'Live broadcast',
    artist: 'Vehicle radio',
    available: false,
    requested: false,
  }),
  controls: Object.freeze({ inputMode: 'keyboard', muteKey: 'X' }),
  items: Object.freeze([]),
})

export function normalizeRadioState(payload, previous = INITIAL_RADIO_STATE) {
  if (!payload || typeof payload !== 'object') return previous

  const hasItems = Array.isArray(payload.items)
  const items = hasItems
    ? payload.items.slice(0, MAX_ITEMS).map(normalizeItem).filter(Boolean)
    : previous.items
  const selectedIndex = wrapIndex(
    Object.prototype.hasOwnProperty.call(payload, 'selectedIndex')
      ? cleanInteger(payload.selectedIndex, previous.selectedIndex)
      : previous.selectedIndex,
    items.length,
  )

  return {
    visible: Object.prototype.hasOwnProperty.call(payload, 'visible')
      ? payload.visible === true
      : previous.visible,
    mode: payload.mode === 'onDemand' ? 'onDemand' : payload.mode === 'radio' ? 'radio' : previous.mode,
    onDemandAvailable: Object.prototype.hasOwnProperty.call(payload, 'onDemandAvailable')
      ? payload.onDemandAvailable === true
      : previous.onDemandAvailable,
    muted: Object.prototype.hasOwnProperty.call(payload, 'muted')
      ? payload.muted === true
      : previous.muted,
    selectedIndex,
    direction: Math.sign(cleanInteger(payload.direction, 0)),
    revision: cleanInteger(payload.revision, previous.revision),
    station: normalizeStation(payload.station, previous.station),
    track: normalizeTrack(payload.track, previous.track),
    controls: normalizeControls(payload.controls, previous.controls),
    items,
  }
}

export function getRadioWindow(items, selectedIndex, radius = 2) {
  if (!Array.isArray(items) || items.length === 0) return []

  const count = items.length
  const center = wrapIndex(selectedIndex, count)
  const safeRadius = Math.max(0, Math.min(4, cleanInteger(radius, 2)))
  const result = []
  const usedIndexes = new Set()

  for (let offset = -safeRadius; offset <= safeRadius; offset += 1) {
    const itemIndex = wrapIndex(center + offset, count)
    if (usedIndexes.has(itemIndex)) continue
    usedIndexes.add(itemIndex)
    result.push({ item: items[itemIndex], itemIndex, offset })
  }

  return result
}
