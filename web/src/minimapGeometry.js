function finiteNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

const MINIMAP_VISIBLE_RIGHT_INSET_PX = 7

export function createFallbackMinimapBounds(screenWidth = 1920, screenHeight = 1080) {
  const width = clamp(finiteNumber(screenWidth, 1920), 1, 7680)
  const height = clamp(finiteNumber(screenHeight, 1080), 1, 4320)

  return {
    left: Math.round(width * 0.0125),
    top: Math.round(height * (1 - 0.047 - 0.183)),
    bottom: Math.round(height * 0.047),
    width: Math.round(width * 0.1638),
    height: Math.round(height * 0.183),
  }
}

export function normalizeMinimapBounds(value, viewport = {}) {
  const screenWidth = clamp(finiteNumber(viewport.screenWidth, 1920), 1, 7680)
  const screenHeight = clamp(finiteNumber(viewport.screenHeight, 1080), 1, 4320)
  const fallback = createFallbackMinimapBounds(screenWidth, screenHeight)

  if (!value || typeof value !== 'object') return fallback

  const width = finiteNumber(value.width, fallback.width)
  const height = finiteNumber(value.height, fallback.height)

  return {
    left: Math.round(clamp(finiteNumber(value.left, fallback.left), -screenWidth, screenWidth * 2)),
    top: Math.round(clamp(finiteNumber(value.top, fallback.top), -screenHeight, screenHeight * 2)),
    bottom: Math.round(clamp(finiteNumber(value.bottom, fallback.bottom), 0, screenHeight * 2)),
    width: Math.round(clamp(width, 1, screenWidth * 2)),
    height: Math.round(clamp(height, 1, screenHeight * 2)),
  }
}

export function resolveMinimapOverlayStyle(bounds, scale = 1, viewport = {}, options = {}) {
  const normalized = normalizeMinimapBounds(bounds, viewport)
  const boundedScale = clamp(finiteNumber(scale, 1), 0.72, 1.5)
  const gap = Math.round(clamp(finiteNumber(options.gap, 8), 0, 64) * boundedScale)
  const requestedLeftInset = Math.round(
    clamp(finiteNumber(options.leftInset, 0), 0, 64) * boundedScale,
  )
  const leftInset = Math.min(requestedLeftInset, Math.max(0, normalized.width - 1))
  const requestedRightInset = Math.round(
    clamp(finiteNumber(options.rightInset, 0), 0, 64) * boundedScale,
  )
  const rightInset = Math.min(requestedRightInset, Math.max(0, normalized.width - leftInset - 1))

  return {
    left: `${normalized.left + leftInset}px`,
    bottom: `${normalized.bottom + normalized.height + gap}px`,
    width: `${Math.max(1, normalized.width - leftInset - rightInset)}px`,
  }
}

export function resolveMinimapPlaqueStyle(bounds, scale = 1, viewport = {}) {
  return resolveMinimapOverlayStyle(bounds, scale, viewport, {
    rightInset: MINIMAP_VISIBLE_RIGHT_INSET_PX,
  })
}

export function resolveVehicleIdentificationStyle(bounds, scale = 1, viewport = {}) {
  return resolveMinimapOverlayStyle(bounds, scale, viewport, {
    gap: 8,
    leftInset: 3,
    rightInset: 5,
  })
}
