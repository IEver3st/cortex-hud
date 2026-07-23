import React, { useEffect, useMemo, useRef, useState } from 'react'

const REEL_CYCLES = 6
const REEL_LENGTH = REEL_CYCLES * 10
const REEL_MID = Math.floor(REEL_CYCLES / 2) * 10
const REEL_FACES = Array.from({ length: REEL_LENGTH }, (_, i) => i % 10)

/**
 * Shortest signed step on a 0–9 ring.
 * 0 → 9 = -1, 9 → 0 = +1, 5 → 7 = +2, etc.
 */
function ringDelta(from, to) {
  const a = ((from % 10) + 10) % 10
  const b = ((to % 10) + 10) % 10
  let delta = b - a
  if (delta > 5) delta -= 10
  if (delta < -5) delta += 10
  return delta
}

/**
 * Single mechanical reel digit (gas-pump / odometer style).
 * Uses a repeated 0–9 strip and shortest-path steps so countdown
 * through tens (20 → 19) rolls 0 → 9 the short way, not through 1–8.
 */
const SlidingDigit = React.memo(({ digit, durationMs }) => {
  const safeDigit = Number.isFinite(digit)
    ? Math.max(0, Math.min(9, Math.trunc(digit)))
    : 0

  const prevDigitRef = useRef(safeDigit)
  const offsetRef = useRef(REEL_MID + safeDigit)
  const [offset, setOffset] = useState(REEL_MID + safeDigit)
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    const prev = prevDigitRef.current
    const next = safeDigit
    if (prev === next) return undefined

    prevDigitRef.current = next
    const nextOffset = offsetRef.current + ringDelta(prev, next)
    offsetRef.current = nextOffset
    setInstant(false)
    setOffset(nextOffset)

    // Keep the reel centered so the strip never runs out of faces.
    if (nextOffset < 10 || nextOffset > REEL_LENGTH - 11) {
      const recentered = REEL_MID + next
      const settleMs = Math.max(durationMs + 40, 80)
      const timer = window.setTimeout(() => {
        offsetRef.current = recentered
        setInstant(true)
        setOffset(recentered)
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setInstant(false))
        })
      }, settleMs)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [safeDigit, durationMs])

  return (
    <span className="sliding-digit" aria-hidden="true">
      <span
        className={`sliding-digit-strip${instant ? ' is-instant' : ''}`}
        style={{
          transform: `translate3d(0, calc(-1em * ${offset}), 0)`,
          transitionDuration: instant ? '0ms' : `${durationMs}ms`,
        }}
      >
        {REEL_FACES.map((n, i) => (
          <span key={i} className="sliding-digit-face">{n}</span>
        ))}
      </span>
    </span>
  )
})

SlidingDigit.displayName = 'SlidingDigit'

/**
 * Gas-pump style sliding number. Each decimal place is its own reel.
 */
const SlidingNumber = React.memo(({
  value = 0,
  className = '',
  style,
  durationMs = 200,
}) => {
  const safeValue = Math.max(0, Math.floor(Number(value) || 0))
  const digits = useMemo(
    () => String(safeValue).split('').map((ch) => Number(ch)),
    [safeValue],
  )

  return (
    <span
      className={['sliding-number', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={String(safeValue)}
    >
      {digits.map((digit, index) => (
        <SlidingDigit
          key={`${digits.length}-${index}`}
          digit={digit}
          durationMs={durationMs}
        />
      ))}
    </span>
  )
})

SlidingNumber.displayName = 'SlidingNumber'

export default SlidingNumber
