function finiteNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeVehicleCloneChallenge(value) {
  const challenge = value && typeof value === 'object' ? value : {}
  const nonce = typeof challenge.nonce === 'string' ? challenge.nonce.slice(0, 96) : ''
  const key = typeof challenge.key === 'string' && challenge.key.trim()
    ? challenge.key.trim().slice(0, 12).toUpperCase()
    : 'K'

  return {
    nonce,
    key,
    rounds: Math.round(clamp(finiteNumber(challenge.rounds, 1), 1, 4)),
    roundDuration: Math.round(clamp(finiteNumber(challenge.roundDuration, 980), 650, 1800)),
    targetPhase: clamp(finiteNumber(challenge.targetPhase, 0.74), 0.45, 0.88),
    hitWindow: clamp(finiteNumber(challenge.hitWindow, 0.14), 0.06, 0.24),
    introDuration: Math.round(clamp(finiteNumber(challenge.introDuration, 320), 150, 900)),
    interRoundDelay: Math.round(clamp(finiteNumber(challenge.interRoundDelay, 240), 100, 650)),
    completionDelay: Math.round(clamp(finiteNumber(challenge.completionDelay, 150), 50, 450)),
  }
}

export function isVehicleCloneHit(phase, targetPhase, hitWindow) {
  const normalizedPhase = clamp(finiteNumber(phase, -1), 0, 1)
  const normalizedTarget = clamp(finiteNumber(targetPhase, 0.74), 0, 1)
  const tolerance = clamp(finiteNumber(hitWindow, 0.14), 0.01, 0.5) * 0.5
  return Math.abs(normalizedPhase - normalizedTarget) <= tolerance
}

export function vehicleCloneSweepAngle(phase, targetPhase) {
  const normalizedPhase = clamp(finiteNumber(phase, 0), 0, 1)
  const normalizedTarget = clamp(finiteNumber(targetPhase, 0.74), 0, 1)
  return (normalizedPhase - normalizedTarget) * 360
}
