import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveGta6Area } from '../locationDisplayStyle.js'
import { resolveMinimapPlaqueStyle } from '../minimapGeometry.js'
import './Gta6Navigation.css'

const LOCATION_VISIBLE_MS = 3600
const LOCATION_EXIT_MS = 280
const LOCATION_REVEAL_DELAY_MS = 20

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

const Gta6Navigation = React.memo(({
  street,
  zone,
  zoneCode,
  radarVisible,
  layout,
}) => {
  const area = useMemo(
    () => resolveGta6Area({ street, zone, zoneCode }),
    [street, zone, zoneCode],
  )
  const [displayedArea, setDisplayedArea] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const lastAreaKey = useRef('')
  const radarVisibleRef = useRef(radarVisible)
  const timers = useRef({ reveal: 0, hide: 0, remove: 0 })

  const clearTimers = useCallback(() => {
    window.clearTimeout(timers.current.reveal)
    window.clearTimeout(timers.current.hide)
    window.clearTimeout(timers.current.remove)
    timers.current = { reveal: 0, hide: 0, remove: 0 }
  }, [])

  useEffect(() => {
    radarVisibleRef.current = radarVisible
    if (radarVisible) return

    clearTimers()
    setIsVisible(false)
    timers.current.remove = window.setTimeout(() => {
      setDisplayedArea(null)
    }, LOCATION_EXIT_MS)
  }, [clearTimers, radarVisible])

  useEffect(() => {
    if (!area.key || area.key === lastAreaKey.current) return
    lastAreaKey.current = area.key
    clearTimers()

    if (!radarVisibleRef.current) {
      setIsVisible(false)
      setDisplayedArea(null)
      return
    }

    setDisplayedArea(area)
    setIsVisible(false)
    timers.current.reveal = window.setTimeout(() => {
      setIsVisible(true)
    }, LOCATION_REVEAL_DELAY_MS)
    timers.current.hide = window.setTimeout(() => {
      setIsVisible(false)
    }, LOCATION_VISIBLE_MS)
    timers.current.remove = window.setTimeout(() => {
      setDisplayedArea((current) => current?.key === area.key ? null : current)
    }, LOCATION_VISIBLE_MS + LOCATION_EXIT_MS)
  }, [area, clearTimers])

  useEffect(() => clearTimers, [clearTimers])

  const screenWidth = Number(layout?.screenWidth) || 1920
  const screenHeight = Number(layout?.screenHeight) || 1080
  const scale = clamp(Math.min(screenWidth / 1920, screenHeight / 1080), 0.75, 1.5)
  const plaqueStyle = {
    ...resolveMinimapPlaqueStyle(layout?.minimapBounds, scale, { screenWidth, screenHeight }),
    '--gta6-location-scale': scale,
  }

  if (!displayedArea) return null

  return (
    <section
      className={`gta6-location-plaque${isVisible ? ' is-visible' : ''}`}
      style={plaqueStyle}
      role="status"
      aria-live="polite"
      aria-hidden={!isVisible}
      aria-label={`Location: ${displayedArea.label}`}
    >
      <span className="gta6-location-label" aria-hidden="true">{displayedArea.label}</span>
    </section>
  )
})

Gta6Navigation.displayName = 'Gta6Navigation'

export default Gta6Navigation
