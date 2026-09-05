/* eslint-disable react-hooks/set-state-in-effect -- entry and ignition transitions intentionally stage short-lived visual state */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildProceduralMarque, clampVehicleMetric } from '../vehicleIdentity.js'
import { resolveVehicleIdentificationStyle } from '../minimapGeometry.js'
import './VehicleIdentification.css'

const CARD_VISIBLE_MS = 5600
const CARD_EXIT_MS = 280
const METER_SETTLE_MS = 520

function statusTone(value) {
  if (value <= 30) return 'is-critical'
  if (value <= 55) return 'is-warning'
  return 'is-healthy'
}

function ProceduralMarque({ identity }) {
  const mark = useMemo(() => buildProceduralMarque(identity), [identity])

  return (
    <svg
      className={[
        'vehicle-id-marque',
        `vehicle-id-marque--${mark.variant}`,
        mark.generated ? 'is-generated' : '',
      ].filter(Boolean).join(' ')}
      viewBox="0 0 240 80"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {mark.variant === 'oval' && (
        <>
          <ellipse cx="120" cy="40" rx="94" ry="30" />
          <ellipse cx="120" cy="40" rx="82" ry="23" />
          <path d="M22 40h28M190 40h28M48 54c37-16 103-19 145-8" />
        </>
      )}
      {mark.variant === 'shield' && (
        <>
          <path d="M120 4 191 19l-12 39-59 18-59-18-12-39 71-15Z" />
          <path d="M120 12 179 24l-9 27-50 16-50-16-9-27 59-12Z" />
          <path d="m79 31 41 27 41-27M120 13v45" />
        </>
      )}
      {mark.variant === 'wings' && (
        <>
          <path d="M9 27h72l18 13-18 13H20M231 27h-72l-18 13 18 13h61" />
          <path d="M24 35h54l13 5-13 5H31M216 35h-54l-13 5 13 5h47" />
          <circle cx="120" cy="40" r="25" />
          <circle cx="120" cy="40" r="18" />
        </>
      )}
      {mark.variant === 'aperture' && (
        <>
          <path d="m120 4 55 14 19 22-19 22-55 14-55-14-19-22 19-22 55-14Z" />
          <path d="m120 12 45 11 16 17-16 17-45 11-45-11-16-17 16-17 45-11Z" />
          <path d="m83 56 22-34M104 62l22-44M127 62l22-44M150 58l13-21" />
        </>
      )}
      <text x="120" y="47" textAnchor="middle">
        {mark.generated ? mark.initials : mark.wordmark}
      </text>
    </svg>
  )
}

function EngineIcon() {
  return (
    <svg className="vehicle-id-meter-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8.5h9l2 2v6.5H6v-6.5l1-2Z" />
      <path d="M9.5 8.5V5.8h5v2.7M4 11H2.5v4H4M18 12h2l1.5-2v7M9 12h6M10.2 4h3.6" />
    </svg>
  )
}

function FuelIcon() {
  return (
    <svg className="vehicle-id-meter-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 4.5h9v15h-9zM7.8 7h4.4v4H7.8z" />
      <path d="M14.5 7h1.8l2.8 3.2v6.3a1.7 1.7 0 0 0 3.4 0V9.7l-2.2-2.2M5 19.5h10" />
    </svg>
  )
}

function VehicleMeter({ type, value }) {
  const boundedValue = clampVehicleMetric(value)
  const label = type === 'engine' ? 'Engine health' : 'Fuel'

  return (
    <span
      className={`vehicle-id-meter ${statusTone(boundedValue)}`}
      role="img"
      aria-label={`${label} ${boundedValue} percent`}
    >
      <span className="vehicle-id-meter-gauge" aria-hidden="true">
        <svg className="vehicle-id-meter-ring" viewBox="0 0 44 44">
          <circle className="vehicle-id-meter-track" cx="22" cy="22" r="18" pathLength="100" />
          <circle
            className="vehicle-id-meter-value"
            cx="22"
            cy="22"
            r="18"
            pathLength="100"
            style={{ strokeDashoffset: 100 - boundedValue }}
          />
        </svg>
        {type === 'engine' ? <EngineIcon /> : <FuelIcon />}
      </span>
    </span>
  )
}

const VehicleIdentification = React.memo(({
  identity,
  enabled,
  vehicleVisible,
  radarVisible,
  layout,
  onActiveChange,
}) => {
  const [displayedIdentity, setDisplayedIdentity] = useState(null)
  const [visible, setVisible] = useState(false)
  const [metersLive, setMetersLive] = useState(false)
  const [meterValues, setMeterValues] = useState({ engine: 100, fuel: 100 })
  const revealTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const removeTimerRef = useRef(null)
  const meterTimerRef = useRef(null)
  const dismissedEntryRef = useRef(null)

  const identityEntryId = identity?.entryId
  const identityBrand = identity?.brand
  const identityName = identity?.name
  const identityArchetype = identity?.archetype
  const identityModelKey = identity?.modelKey
  const identityProceduralLogo = identity?.proceduralLogo

  const identityMeta = useMemo(() => {
    if (!identityEntryId) return null
    return {
      entryId: identityEntryId,
      brand: identityBrand,
      name: identityName,
      archetype: identityArchetype,
      modelKey: identityModelKey,
      proceduralLogo: identityProceduralLogo,
    }
  }, [
    identityArchetype,
    identityBrand,
    identityEntryId,
    identityModelKey,
    identityName,
    identityProceduralLogo,
  ])

  const clearCardTimers = () => {
    window.clearTimeout(revealTimerRef.current)
    window.clearTimeout(hideTimerRef.current)
    window.clearTimeout(removeTimerRef.current)
  }

  useEffect(() => {
    clearCardTimers()
    window.clearTimeout(meterTimerRef.current)

    const canShow = enabled && vehicleVisible && identityMeta
    if (!canShow || dismissedEntryRef.current === identityMeta?.entryId) {
      if (identityMeta && !canShow) {
        dismissedEntryRef.current = identityMeta.entryId
      }
      setVisible(false)
      removeTimerRef.current = window.setTimeout(() => setDisplayedIdentity(null), CARD_EXIT_MS)
      return clearCardTimers
    }

    setDisplayedIdentity(identityMeta)
    setVisible(false)
    setMetersLive(false)
    setMeterValues({ engine: 100, fuel: 100 })

    revealTimerRef.current = window.setTimeout(() => setVisible(true), 32)
    hideTimerRef.current = window.setTimeout(() => {
      dismissedEntryRef.current = identityMeta.entryId
      setVisible(false)
    }, CARD_VISIBLE_MS)
    removeTimerRef.current = window.setTimeout(
      () => setDisplayedIdentity(null),
      CARD_VISIBLE_MS + CARD_EXIT_MS,
    )

    return clearCardTimers
  }, [enabled, identityMeta, vehicleVisible])

  useEffect(() => {
    window.clearTimeout(meterTimerRef.current)
    const matchingEntry = displayedIdentity?.entryId === identity?.entryId
    if (!visible || !matchingEntry || identity?.engineState !== true || metersLive) {
      return undefined
    }

    meterTimerRef.current = window.setTimeout(() => setMetersLive(true), METER_SETTLE_MS)
    return () => window.clearTimeout(meterTimerRef.current)
  }, [displayedIdentity?.entryId, identity?.engineState, identity?.entryId, metersLive, visible])

  useEffect(() => {
    if (!metersLive || displayedIdentity?.entryId !== identity?.entryId) return
    setMeterValues({
      engine: clampVehicleMetric(identity?.engineHealth),
      fuel: clampVehicleMetric(identity?.fuel),
    })
  }, [
    displayedIdentity?.entryId,
    identity?.engineHealth,
    identity?.entryId,
    identity?.fuel,
    metersLive,
  ])

  const active = Boolean(displayedIdentity && visible)
  useEffect(() => {
    onActiveChange?.(active)
  }, [active, onActiveChange])

  useEffect(() => () => {
    clearCardTimers()
    window.clearTimeout(meterTimerRef.current)
    onActiveChange?.(false)
  }, [onActiveChange])

  if (!displayedIdentity) return null

  const screenWidth = Number(layout?.screenWidth) || 1920
  const screenHeight = Number(layout?.screenHeight) || 1080
  const scale = Math.max(0.72, Math.min(1.5, Math.min(screenWidth / 1920, screenHeight / 1080)))
  const alignedStyle = resolveVehicleIdentificationStyle(layout?.minimapBounds, scale, {
    screenWidth,
    screenHeight,
  })
  const cardStyle = {
    left: alignedStyle.left,
    width: alignedStyle.width,
    ...(radarVisible ? { bottom: alignedStyle.bottom } : {}),
    '--vehicle-id-scale': scale,
  }

  return (
    <section
      className={[
        'vehicle-id-card',
        visible ? 'is-visible' : '',
        radarVisible ? '' : 'is-radar-hidden',
        displayedIdentity.proceduralLogo ? 'is-procedural' : '',
      ].filter(Boolean).join(' ')}
      style={cardStyle}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="vehicle-id-plate">
        <ProceduralMarque identity={displayedIdentity} />
        <div className="vehicle-id-copy">
          <span className="vehicle-id-brand">{displayedIdentity.brand}</span>
          <span className="vehicle-id-name">{displayedIdentity.name}</span>
        </div>
      </div>
      <div className="vehicle-id-meters">
        <VehicleMeter type="engine" value={meterValues.engine} />
        <VehicleMeter type="fuel" value={meterValues.fuel} />
      </div>
    </section>
  )
})

VehicleIdentification.displayName = 'VehicleIdentification'

export default VehicleIdentification
