const px = (value = 0) => `calc(${value}px * var(--es-ui-scale))`

export function resolveAnchorStyle(layout, fallback = {}) {
  const anchor = layout?.anchor || fallback.anchor || 'bottom-right'
  const offsetX = layout?.offsetX ?? fallback.offsetX ?? 0
  const offsetY = layout?.offsetY ?? fallback.offsetY ?? 0
  const style = { position: 'fixed' }

  switch (anchor) {
    case 'top-left':
      style.top = px(offsetY)
      style.left = px(offsetX)
      break
    case 'top-right':
      style.top = px(offsetY)
      style.right = px(offsetX)
      break
    case 'bottom-left':
      style.bottom = px(offsetY)
      style.left = px(offsetX)
      break
    case 'bottom-center':
      style.bottom = px(offsetY)
      style.left = `calc(50% + ${px(offsetX)})`
      style.transform = 'translateX(-50%)'
      break
    case 'bottom-center-left':
      style.bottom = px(offsetY)
      style.left = `calc(50% + ${px(offsetX)})`
      break
    case 'left-above-minimap':
      style.left = px(offsetX)
      style.bottom = `calc(var(--hud-safezone-bottom) + var(--hud-minimap-height) + ${px(offsetY)})`
      break
    case 'above-minimap':
      style.left = `calc(var(--hud-minimap-left) + ${px(offsetX)})`
      style.bottom = `calc(var(--hud-safezone-bottom) + var(--hud-minimap-height) + ${px(offsetY)})`
      break
    case 'top-center':
      style.top = px(offsetY)
      style.left = `calc(50% + ${px(offsetX)})`
      style.transform = 'translateX(-50%)'
      break
    case 'bottom-right':
    default:
      style.bottom = px(offsetY)
      style.right = px(offsetX)
      break
  }

  return style
}
