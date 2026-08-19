import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isVehicleCloneHit,
  normalizeVehicleCloneChallenge,
  vehicleCloneSweepAngle,
} from '../vehicleCloneQte.js'
import './VehicleCloneQte.css'

const INITIAL_VIEW = {
  phase: 0,
  round: 1,
  status: 'intro',
}

function VehicleCloneQte({ challenge, pressNonce, layout, onComplete }) {
  const normalized = useMemo(
    () => (challenge ? normalizeVehicleCloneChallenge(challenge) : null),
    [challenge],
  )
  const [view, setView] = useState(INITIAL_VIEW)
  const runtimeRef = useRef(null)
  const frameRef = useRef(0)
  const timerRef = useRef(0)
  const lastPressRef = useRef(pressNonce)
  const completeRef = useRef(onComplete)

  useEffect(() => {
    completeRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    window.cancelAnimationFrame(frameRef.current)
    window.clearTimeout(timerRef.current)
    lastPressRef.current = 0

    if (!normalized?.nonce) {
      runtimeRef.current = null
      return undefined
    }

    const runtime = {
      challenge: normalized,
      round: 1,
      startAt: performance.now() + normalized.introDuration,
      waiting: false,
      completed: false,
    }
    runtimeRef.current = runtime

    const finish = (success) => {
      if (runtime.completed) return
      runtime.completed = true
      window.cancelAnimationFrame(frameRef.current)
      setView((current) => ({ ...current, status: success ? 'success' : 'miss' }))
      timerRef.current = window.setTimeout(() => {
        completeRef.current?.({ nonce: normalized.nonce, success })
      }, normalized.completionDelay)
    }
    runtime.finish = finish

    const tick = (now) => {
      if (runtime.completed) return

      if (runtime.waiting || now < runtime.startAt) {
        setView((current) => (
          current.round === runtime.round && current.status === 'intro'
            ? current
            : { phase: 0, round: runtime.round, status: 'intro' }
        ))
        frameRef.current = window.requestAnimationFrame(tick)
        return
      }

      const phase = Math.min(1, Math.max(0, (now - runtime.startAt) / normalized.roundDuration))
      if (phase > normalized.targetPhase + (normalized.hitWindow * 0.5)) {
        finish(false)
        return
      }

      setView({ phase, round: runtime.round, status: 'active' })
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => {
      runtime.completed = true
      window.cancelAnimationFrame(frameRef.current)
      window.clearTimeout(timerRef.current)
    }
  }, [normalized])

  useEffect(() => {
    if (pressNonce === lastPressRef.current) return
    lastPressRef.current = pressNonce

    const runtime = runtimeRef.current
    if (!runtime || runtime.completed || runtime.waiting) return

    const now = performance.now()
    const phase = (now - runtime.startAt) / runtime.challenge.roundDuration
    if (now < runtime.startAt
      || !isVehicleCloneHit(phase, runtime.challenge.targetPhase, runtime.challenge.hitWindow)) {
      runtime.finish(false)
      return
    }

    if (runtime.round >= runtime.challenge.rounds) {
      runtime.finish(true)
      return
    }

    runtime.waiting = true
    setView({ phase, round: runtime.round, status: 'hit' })
    timerRef.current = window.setTimeout(() => {
      if (runtime.completed) return
      runtime.round += 1
      runtime.startAt = performance.now()
      runtime.waiting = false
      setView({ phase: 0, round: runtime.round, status: 'active' })
    }, runtime.challenge.interRoundDelay)
  }, [pressNonce])

  if (!normalized?.nonce) return null

  const angle = vehicleCloneSweepAngle(view.phase, normalized.targetPhase)
  const screenHeight = Math.max(360, Number(layout?.screenHeight) || 1080)
  const scale = Math.min(1.35, Math.max(0.82, screenHeight / 1080))
  const style = {
    '--clone-qte-safe-right': `${Math.max(0, Number(layout?.insetRight) || 0)}px`,
    '--clone-qte-safe-bottom': `${Math.max(0, Number(layout?.insetBottom) || 0)}px`,
    '--clone-qte-scale': scale,
  }
  const statusText = view.status === 'success'
    ? 'CLONED'
    : view.status === 'miss'
      ? 'MISSED'
      : view.status === 'hit'
        ? 'GOOD'
        : 'CLONE KEY'

  return (
    <section
      className={`vehicle-clone-qte is-${view.status}`}
      style={style}
      aria-live="polite"
      aria-label={`Clone key timing, round ${view.round} of ${normalized.rounds}`}
    >
      <div className="vehicle-clone-qte__meta">
        <span>{statusText}</span>
        <span>{view.round}/{normalized.rounds}</span>
      </div>
      <div className="vehicle-clone-qte__dial" aria-hidden="true">
        <svg viewBox="0 0 100 100" role="presentation">
          <circle className="vehicle-clone-qte__track" cx="50" cy="50" r="39" />
          <circle className="vehicle-clone-qte__target" cx="50" cy="50" r="39" />
          <circle
            className="vehicle-clone-qte__sweep"
            cx="50"
            cy="50"
            r="39"
            transform={`rotate(${angle - 90} 50 50)`}
          />
        </svg>
        <span className="vehicle-clone-qte__key">{normalized.key}</span>
      </div>
      <span className="vehicle-clone-qte__hint">PRESS ON THE MARK</span>
    </section>
  )
}

export default VehicleCloneQte
