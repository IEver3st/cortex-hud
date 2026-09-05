import React, { useMemo } from 'react'
import { BsLungsFill } from 'react-icons/bs'
import { FaCompass, FaLocationArrow, FaMap, FaMapMarkerAlt } from 'react-icons/fa'
import { FaTriangleExclamation } from 'react-icons/fa6'
import {
  WiDaySunny,
  WiDayCloudy,
  WiCloudy,
  WiRain,
  WiThunderstorm,
  WiFog,
  WiSnow,
  WiSmoke,
  WiTornado,
} from 'react-icons/wi'
import './Indicator.css'

const weatherKey = (weather) =>
  String(weather || '')
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)[0] || ''

const WeatherGlyph = ({ weather, size = 13, className, title }) => {
  const w = weatherKey(weather)
  const icon = (() => {
    if (w === 'THUNDER' || w === 'THUNDERSTORM') return <WiThunderstorm size={size} />
    if (w === 'RAIN' || w === 'DRIZZLE' || w === 'CLEARING') return <WiRain size={size} />
    if (w === 'FOGGY' || w === 'FOG') return <WiFog size={size} />
    if (w === 'SMOG') return <WiSmoke size={size} />
    if (w === 'SNOW' || w === 'BLIZZARD' || w === 'XMAS') return <WiSnow size={size} />
    if (w === 'CLOUDS' || w === 'OVERCAST') return <WiCloudy size={size} />
    if (w === 'EXTRASUNNY' || w === 'CLEAR') return <WiDaySunny size={size} />
    return <WiDayCloudy size={size} />
  })()
  return (
    <span className={className} title={title ?? undefined} aria-hidden>
      {icon}
    </span>
  )
}

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

const sanitizeWeatherForecastLine = (raw) => {
  let s = String(raw ?? '')
    .replace(/\bNext:\s*/gi, '')
    .replace(/\bTransition\b/gi, ' ')
    .replace(/\s*·\s*·/g, ' · ')
  s = s.replace(/^\s*·\s*/, '').replace(/\s*·\s*$/g, '')
  s = s.replace(/\s{2,}/g, ' ').trim()
  s = s.replace(/^[·\s]+|[·\s]+$/g, '').trim()
  return s
}

const Indicator = ({
  heading,
  street,
  zone,
  postal,
  postalDist,
  layout,
  theme,
  sectionedIndicator,
  oxygen,
  underwater,
  oxygenDisplayLocation,
  oxygenColor,
  dynamicWeatherShow,
  dynamicWeatherDisplay,
  dynamicWeatherSeason,
  dynamicWeatherWetLabel,
  dynamicWeatherForecastLine,
  floodWarningActive,
  floodWarningDetail,
  hurricaneWarningActive,
  hurricaneWarningDetail,
}) => {
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

  const dynamicWeatherMeta = useMemo(() => {
    const bits = []
    if (dynamicWeatherSeason && String(dynamicWeatherSeason).trim()) {
      bits.push(String(dynamicWeatherSeason).trim())
    }
    if (dynamicWeatherWetLabel && String(dynamicWeatherWetLabel).trim()) {
      const w = String(dynamicWeatherWetLabel)
        .replace(/\bTransition\b/gi, '')
        .replace(/\s*·\s*·/g, ' · ')
        .replace(/^\s*·\s*|\s*·\s*$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (w) bits.push(w)
    }
    return bits.join(' · ')
  }, [dynamicWeatherSeason, dynamicWeatherWetLabel])

  const weatherForecastLineClean = useMemo(
    () => sanitizeWeatherForecastLine(dynamicWeatherForecastLine),
    [dynamicWeatherForecastLine]
  )

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
      {floodWarningActive && !hurricaneWarningActive && (
        <div
          className="indicator-box indicator-box--flood"
          role="status"
          aria-live="polite"
          title={floodWarningDetail ? `Flash flood: ${floodWarningDetail}` : 'Flash flood'}
        >
          <div className="indicator-icon indicator-icon--flood" aria-hidden>
            <FaTriangleExclamation />
          </div>
          <div className="indicator-text indicator-text--flood">Flash flood</div>
        </div>
      )}
      {hurricaneWarningActive && (
        <div
          className="indicator-box indicator-box--hurricane"
          role="status"
          aria-live="polite"
          title={hurricaneWarningDetail ? `Hurricane: ${hurricaneWarningDetail}` : 'Hurricane warning'}
        >
          <div className="indicator-icon indicator-icon--hurricane" aria-hidden>
            <WiTornado size={15} />
          </div>
          <div className="indicator-text indicator-text--hurricane">Hurricane</div>
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
      {dynamicWeatherShow && !floodWarningActive && !hurricaneWarningActive && (
        <div className="indicator-box indicator-box--weather" title={dynamicWeatherMeta || undefined}>
          <div className="indicator-icon indicator-icon--weather" aria-hidden>
            <WeatherGlyph className="indicator-weather-wi" weather={dynamicWeatherDisplay} size={13} />
          </div>
          <div className="indicator-text indicator-text--weather">
            <span className="indicator-weather-nowline">{(dynamicWeatherDisplay || '—').toString().toUpperCase()}</span>
            {weatherForecastLineClean ? (
              <>
                <span className="indicator-weather-arrow" aria-hidden>
                  {' '}
                  →{' '}
                </span>
                <span className="indicator-weather-exportline">{weatherForecastLineClean}</span>
              </>
            ) : null}
          </div>
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

export default React.memo(Indicator)
