import React, { useEffect, useMemo, useRef, useState } from 'react'
import { resolveGta5Place } from '../gta5Places'
import './Gta6Navigation.css'

const PLACE_VISIBLE_MS = 3400
const PLACE_EXIT_MS = 280
const PLACE_REPEAT_COOLDOWN_MS = 15000

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function PlaceIcon({ kind }) {
  if (kind === 'palm') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 43c1.8-10.5 1.7-19.1-.2-25.8" />
        <path d="M24 17.2c-5.9-6.5-11.9-6.4-17-1.6 6.2-.3 10.4 1.2 13.2 4.7" />
        <path d="M24 17.2c5.9-6.5 11.9-6.4 17-1.6-6.2-.3-10.4 1.2-13.2 4.7" />
        <path d="M23.8 17.2C20.5 9.5 16.1 7.3 11 8.6c5 2.2 8.1 5.5 9.5 9.8" />
        <path d="M24.2 17.2C27.5 9.5 31.9 7.3 37 8.6c-5 2.2-8.1 5.5-9.5 9.8" />
      </svg>
    )
  }

  if (kind === 'city' || kind === 'industrial') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7 42V22h12v20M19 42V9h15v33M34 42V17h8v25M4 42h40" />
        <path d="M11 27h4M11 32h4M23 15h4M23 21h4M23 27h4M23 33h4M37 22h2M37 28h2" />
        {kind === 'industrial' && <path d="M7 22l6-7 6 7" />}
      </svg>
    )
  }

  if (kind === 'mountain') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M4 40 18 13l8 14 5-8 13 21H4Z" />
        <path d="m13 23 5-10 4 7M27 27l4-8 4 7" />
      </svg>
    )
  }

  if (kind === 'desert') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="33" cy="14" r="6" />
        <path d="M4 37c8-7 16-7 24 0 5-4 10-4 16 0M4 42h40M12 31V18M8 22h4M12 27h5v-6" />
      </svg>
    )
  }

  if (kind === 'rural') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 7 10 22h7v8h14v-8h7L24 7Z" />
        <path d="M21 30v12M27 30v12M7 42h34M8 34c3-2 6-2 9 0M31 34c3-2 6-2 9 0" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 43s13-12.1 13-23A13 13 0 0 0 11 20c0 10.9 13 23 13 23Z" />
      <circle cx="24" cy="20" r="4" />
    </svg>
  )
}

const Gta6Navigation = React.memo(({
  street,
  zone,
  zoneCode,
  radarVisible,
  layout,
  suspended = false,
}) => {
  const [displayedPlace, setDisplayedPlace] = useState(null)
  const [visible, setVisible] = useState(false)
  const lastResolvedKeyRef = useRef(null)
  const shownAtRef = useRef(new Map())
  const revealTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const removeTimerRef = useRef(null)

  const resolvedPlace = useMemo(
    () => resolveGta5Place({ street, zone, zoneCode }),
    [street, zone, zoneCode],
  )

  const clearTimers = () => {
    window.clearTimeout(revealTimerRef.current)
    window.clearTimeout(hideTimerRef.current)
    window.clearTimeout(removeTimerRef.current)
  }

  useEffect(() => {
    if (!resolvedPlace) {
      lastResolvedKeyRef.current = null
      return
    }

    if (resolvedPlace.id === lastResolvedKeyRef.current) return
    lastResolvedKeyRef.current = resolvedPlace.id

    const now = Date.now()
    const lastShownAt = shownAtRef.current.get(resolvedPlace.id) || 0
    if (now - lastShownAt < PLACE_REPEAT_COOLDOWN_MS) return
    shownAtRef.current.set(resolvedPlace.id, now)

    clearTimers()
    setVisible(false)
    setDisplayedPlace(resolvedPlace)

    revealTimerRef.current = window.setTimeout(() => setVisible(true), 32)
    hideTimerRef.current = window.setTimeout(() => setVisible(false), PLACE_VISIBLE_MS)
    removeTimerRef.current = window.setTimeout(
      () => setDisplayedPlace(null),
      PLACE_VISIBLE_MS + PLACE_EXIT_MS,
    )
  }, [resolvedPlace])

  useEffect(() => () => clearTimers(), [])

  if (!displayedPlace) return null

  const screenWidth = Number(layout?.screenWidth) || 1920
  const screenHeight = Number(layout?.screenHeight) || 1080
  const scale = clamp(Math.min(screenWidth / 1920, screenHeight / 1080), 0.75, 1.5)
  const presented = visible && !suspended

  return (
    <section
      className={[
        'gta6-place-discovery',
        `tone-${displayedPlace.tone}`,
        radarVisible ? '' : 'is-radar-hidden',
        presented ? 'is-visible' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--gta6-place-scale': scale }}
      role="status"
      aria-live="polite"
      aria-hidden={!presented}
    >
      <span className="gta6-place-icon">
        <PlaceIcon kind={displayedPlace.icon} />
      </span>
      <span className="gta6-place-divider" aria-hidden="true" />
      <span className="gta6-place-copy">
        <span className="gta6-place-primary">{displayedPlace.primary}</span>
        <span className="gta6-place-secondary">{displayedPlace.secondary}</span>
      </span>
    </section>
  )
})

Gta6Navigation.displayName = 'Gta6Navigation'

export default Gta6Navigation
