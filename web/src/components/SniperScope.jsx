import React, { useEffect, useState } from 'react'
import './SniperScope.css'

const EXIT_DURATION_MS = 110

function Reticle() {
  return (
    <svg className="sniper-scope__reticle" viewBox="0 0 1000 1000" focusable="false">
      <defs>
        <g id="sniper-reticle-geometry">
          <path d="M250 500H486 M514 500H750 M500 280V486 M500 514V760" />
          <path d="M350 492V508 M400 494V506 M450 496V504 M550 496V504 M600 494V506 M650 492V508" />
          <path d="M492 380H508 M494 440H506" />
          <path d="M493 560H507 M489 620H511 M485 680H515" />
        </g>
      </defs>
      <use className="sniper-scope__reticle-shadow" href="#sniper-reticle-geometry" />
      <use className="sniper-scope__reticle-line" href="#sniper-reticle-geometry" />
      <circle className="sniper-scope__aim-point-shadow" cx="500" cy="500" r="2.4" />
      <circle className="sniper-scope__aim-point" cx="500" cy="500" r="1.25" />
    </svg>
  )
}

function formatZoom(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 1
  return Number.isInteger(safeValue) ? safeValue.toFixed(0) : safeValue.toFixed(1)
}

function SniperScope({ visible, zoom = 1, range = null, steadiness = 100 }) {
  const [mounted, setMounted] = useState(Boolean(visible))

  useEffect(() => {
    if (visible) {
      const frame = window.requestAnimationFrame(() => setMounted(true))
      return () => window.cancelAnimationFrame(frame)
    }

    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (!mounted) {
    return null
  }

  const safeSteadiness = Math.min(100, Math.max(0, Number(steadiness) || 0))
  const rangeValid = Number.isFinite(Number(range)) && Number(range) > 0
  const zoomText = formatZoom(zoom)

  return (
    <div
      className={`sniper-scope${visible ? ' sniper-scope--visible' : ' sniper-scope--exit'}`}
      aria-hidden="true"
    >
      <div className="sniper-scope__lens">
        <div className="sniper-scope__reflection" />
        <Reticle />

        <div className="sniper-scope__readout sniper-scope__zoom">
          <span className="sniper-scope__accent" />
          <span key={zoomText} className="sniper-scope__readout-value">{zoomText}x</span>
        </div>

        {rangeValid && (
          <div className="sniper-scope__readout sniper-scope__range">
            <span className="sniper-scope__accent" />
            <span key={range} className="sniper-scope__readout-value">{Math.round(range)}m</span>
          </div>
        )}

        <div
          className={`sniper-scope__steadiness${safeSteadiness <= 18 ? ' sniper-scope__steadiness--critical' : ''}`}
        >
          <span
            className="sniper-scope__steadiness-fill"
            style={{ width: `${safeSteadiness}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(SniperScope)
