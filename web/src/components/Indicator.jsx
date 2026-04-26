import React, { useMemo } from 'react'
import { BsLungsFill } from 'react-icons/bs'
import { FaCompass, FaLocationArrow, FaMap, FaMapMarkerAlt } from 'react-icons/fa'
import './Indicator.css'

const getHeadingLabel = (heading) => {
  if (heading >= 337.5 || heading < 22.5) return 'N'
  if (heading >= 22.5 && heading < 67.5) return 'NE'
  if (heading >= 67.5 && heading < 112.5) return 'E'
  if (heading >= 112.5 && heading < 157.5) return 'SE'
  if (heading >= 157.5 && heading < 202.5) return 'S'
  if (heading >= 202.5 && heading < 247.5) return 'SW'
  if (heading >= 247.5 && heading < 292.5) return 'W'
  if (heading >= 292.5 && heading < 337.5) return 'NW'
  return 'N'
}

const px = (value = 0) => `calc(${value}px * var(--es-ui-scale))`

const resolveAnchorStyle = (layout) => {
  const anchor = layout?.anchor || 'top-center'
  const offsetX = layout?.offsetX || 0
  const offsetY = layout?.offsetY || 0

  const fixedAnchors = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
  if (!fixedAnchors.has(anchor)) {
    const isBottom = anchor === 'bottom-center'
    return {
      wrap: true,
      wrapClass: isBottom
        ? 'indicator-anchor-wrap indicator-anchor-bottom'
        : 'indicator-anchor-wrap indicator-anchor-top',
      wrapStyle: isBottom ? { bottom: px(offsetY) } : { top: px(offsetY) },
      barStyle: { marginLeft: px(offsetX) },
    }
  }

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
    case 'bottom-right':
      style.bottom = px(offsetY)
      style.right = px(offsetX)
      break
  }

  return { wrap: false, barStyle: style }
}

const Indicator = ({ heading, street, zone, postal, postalDist, layout, theme, sectionedIndicator, oxygen, underwater, oxygenDisplayLocation, oxygenColor }) => {
  const headingLabel = useMemo(() => getHeadingLabel(heading), [heading])
  const indicatorVariant = layout?.variant || 'segmented'
  const { wrap, wrapClass, wrapStyle, barStyle } = useMemo(() => resolveAnchorStyle(layout), [layout])
  const capsulesClass = sectionedIndicator ? ' indicator-capsules' : ''

  const oxygenCriticality = useMemo(() => {
    const o = Number(oxygen) || 100
    if (o <= 25) return 'critical'
    if (o <= 50) return 'low'
    return ''
  }, [oxygen])

  const oxygenColorResolved = useMemo(() => {
    const o = Number(oxygen) || 100
    if (o <= 25) return '#ef4444'
    if (o <= 50) return '#f59e0b'
    return oxygenColor || theme?.oxygen || '#06b6d4'
  }, [oxygen, oxygenColor, theme])

  const bar = (
    <div
      className={`indicator-container indicator-${indicatorVariant}${capsulesClass}${wrap ? ' indicator-position-relative' : ''}`}
      style={barStyle}
    >
      <div className="indicator-box">
        <div className="indicator-icon compass">
          <FaCompass />
        </div>
        <div className="indicator-text">{headingLabel}</div>
      </div>
      <div className="indicator-box">
        <div className="indicator-icon location">
          <FaLocationArrow />
        </div>
        <div className="indicator-text">{street}</div>
      </div>
      <div className="indicator-box">
        <div className="indicator-icon map">
          <FaMap />
        </div>
        <div className="indicator-text">{zone}</div>
      </div>
      {postal && (
        <div className="indicator-box">
          <div className="indicator-icon postal" style={{ color: theme?.indicatorAccent || 'var(--indicator-accent)' }}>
            <FaMapMarkerAlt />
          </div>
          <div className="indicator-text">
            <span className="indicator-postal-label">Postal:</span>
            {postal}
            {postalDist !== null && postalDist !== undefined && (
              <span className="indicator-postal-distance">({postalDist.toFixed(2)}m)</span>
            )}
          </div>
        </div>
      )}
      {oxygenDisplayLocation === 'indicator' && underwater && (
        <div className={`indicator-box oxygen ${oxygenCriticality}`}>
          <div
            className="indicator-icon"
            style={
              oxygenCriticality
                ? { color: oxygenColorResolved }
                : oxygenColor || theme?.oxygen
                  ? { color: oxygenColor || theme?.oxygen }
                  : undefined
            }
          >
            <BsLungsFill />
          </div>
          <div className="indicator-text indicator-text--oxygen">{Math.round(oxygen)}%</div>
        </div>
      )}
    </div>
  )

  if (wrap) {
    return (
      <div className={wrapClass} style={wrapStyle}>
        {bar}
      </div>
    )
  }

  return bar
}

export default Indicator
