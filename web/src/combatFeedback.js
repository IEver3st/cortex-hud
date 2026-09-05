export const HITMARKER_DURATION_MS = 300

const HITMARKER_KINDS = new Set(['regular', 'knockout', 'critical', 'vehicle'])
const WEAPON_RETICLE_TYPES = new Set(['automatic', 'single', 'shotgun', 'tazer', 'rpg', 'homing', 'none'])

export function normalizeHitmarkerKind(value) {
  return typeof value === 'string' && HITMARKER_KINDS.has(value) ? value : null
}

export function normalizeWeaponBloom(value) {
  if (value === null || value === '' || typeof value === 'boolean') return 0
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(100, Math.max(0, Math.round(numericValue)))
}

export function normalizeWeaponReticleType(value) {
  return typeof value === 'string' && WEAPON_RETICLE_TYPES.has(value) ? value : null
}

export function getRingReticleDiameter(value, reticleType = 'automatic') {
  const bloom = normalizeWeaponBloom(value)
  if (reticleType === 'shotgun') return Number((13 + bloom * 0.11).toFixed(1))
  if (reticleType === 'rpg') return Number((16 + bloom * 0.11).toFixed(1))
  if (reticleType === 'homing') return Number((20 + bloom * 0.08).toFixed(1))
  if (reticleType === 'tazer') return Number((8 + bloom * 0.06).toFixed(1))
  return Number((9 + bloom * 0.11).toFixed(1))
}

export function getOpenReticleGap(value) {
  const bloom = normalizeWeaponBloom(value)
  return Number((3 + bloom * 0.04).toFixed(1))
}

export function getHeavyReticleDiameter(value, reticleType = 'rpg') {
  return getRingReticleDiameter(value, reticleType)
}

export function getHomingReticleSize(value) {
  return getRingReticleDiameter(value, 'homing')
}

export function getTazerReticleDiameter(value) {
  return getRingReticleDiameter(value, 'tazer')
}
