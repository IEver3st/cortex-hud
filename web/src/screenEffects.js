const EFFECT_NAMES = new Set(['damage', 'stamina', 'kill'])

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

export function normalizeScreenEffectMessage(message) {
  if (!message || typeof message !== 'object' || !EFFECT_NAMES.has(message.effect)) {
    return null
  }

  return {
    effect: message.effect,
    duration: Math.round(clampNumber(message.duration, 120, 5000, 600)),
    strength: clampNumber(
      message.strength,
      0.05,
      1,
      message.effect === 'kill' ? 0.72 : message.effect === 'stamina' ? 0.24 : 0.38,
    ),
  }
}

export function hasActiveScreenEffects(effects) {
  return Boolean(effects?.damage || effects?.stamina || effects?.kill)
}
