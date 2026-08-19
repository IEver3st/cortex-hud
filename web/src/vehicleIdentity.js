const INVALID_LABELS = new Set(['', 'NULL', 'CARNOTFOUND', 'UNDEFINED'])

const KNOWN_VEHICLE_BRANDS = new Set([
  'ALBANY',
  'ANNIS',
  'BENEFACTOR',
  'BF',
  'BOLLOKAN',
  'BRAVADO',
  'CANIS',
  'CHEVAL',
  'COIL',
  'DECLASSE',
  'DEWBAUCHEE',
  'DINKA',
  'EMPEROR',
  'ENUS',
  'GROTTI',
  'HVY',
  'IMPONTE',
  'INVETERO',
  'KARIN',
  'LAMPADATI',
  'LCC',
  'MAIBATSU',
  'MAMMOTH',
  'MAXWELL',
  'NAGASAKI',
  'OBEY',
  'OCELOT',
  'OVERFLOD',
  'PEGASSI',
  'PFISTER',
  'PRINCIPE',
  'PROGEN',
  'SCHYSTER',
  'SHITZU',
  'TRUFFADE',
  'UBERMACHT',
  'VAPID',
  'VULCAR',
  'WEENY',
  'WESTERN',
  'WILLARD',
  'ZIRCONIUM',
])

function cleanText(value, fallback, maxLength) {
  const text = Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  if (INVALID_LABELS.has(text.toUpperCase())) return fallback
  return text.slice(0, maxLength)
}

export function clampVehicleMetric(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

export function normalizeVehicleIdentity(data) {
  const entryId = Number(data?.entryId)
  if (!Number.isSafeInteger(entryId) || entryId <= 0) return null

  return {
    entryId,
    brand: cleanText(data?.brand, 'Custom', 24),
    name: cleanText(data?.name, 'Vehicle', 38),
    archetype: cleanText(data?.archetype, '', 48),
    modelKey: cleanText(data?.modelKey, String(entryId), 24),
    proceduralLogo: data?.proceduralLogo === true,
    engineState: data?.engineState === true,
    engineHealth: clampVehicleMetric(data?.engineHealth),
    fuel: clampVehicleMetric(data?.fuel),
  }
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function buildProceduralMarque(identity) {
  const brand = cleanText(identity?.brand, 'Custom', 24).toUpperCase()
  const generated = identity?.proceduralLogo === true || !KNOWN_VEHICLE_BRANDS.has(brand)
  const source = brand === 'CUSTOM'
    ? cleanText(identity?.archetype || identity?.name, 'CV', 24)
    : brand
  const words = source.split(/[^A-Z0-9]+/i).filter(Boolean)
  const initials = words.length > 1
    ? words.slice(0, 3).map((word) => word[0]).join('')
    : source.replace(/[^A-Z0-9]/gi, '').slice(0, 3)
  const seed = stableHash(`${brand}:${identity?.modelKey || identity?.name || ''}`)

  return {
    generated,
    initials: (initials || 'CV').toUpperCase(),
    variant: brand === 'VAPID'
      ? 'oval'
      : ['oval', 'shield', 'wings', 'aperture'][seed % 4],
    wordmark: brand.slice(0, 12),
  }
}
