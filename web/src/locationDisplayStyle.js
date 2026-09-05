import { resolveGta5Place } from './gta5Places.js'

export const LOCATION_DISPLAY_OPTIONS = Object.freeze([
  { value: 'off', label: 'Off' },
  { value: 'current', label: 'Current' },
  { value: 'gta6', label: 'Leonida' },
])

export function normalizeLocationDisplayStyle(value) {
  if (value === 'off') return 'off'
  return value === 'gta6' ? 'gta6' : 'current'
}

const UNKNOWN_LOCATION_VALUES = new Set(['', 'UNKNOWN', 'NULL', 'N/A'])

function usableLocationLabel(value) {
  const label = String(value ?? '').trim()
  return UNKNOWN_LOCATION_VALUES.has(label.toUpperCase()) ? '' : label
}

export function resolveGta6Area({ street, zone, zoneCode }) {
  const resolvedPlace = resolveGta5Place({ street: null, zone, zoneCode })
  const label = usableLocationLabel(resolvedPlace?.primary)
    || usableLocationLabel(zone)
    || usableLocationLabel(street)
    || 'Los Santos'
  const stableZone = resolvedPlace?.id
    || usableLocationLabel(zoneCode)
    || usableLocationLabel(zone)

  return {
    key: stableZone ? stableZone.toUpperCase() : '',
    label,
  }
}

export function resolveGta6LocationLabel(location) {
  return resolveGta6Area(location).label
}
