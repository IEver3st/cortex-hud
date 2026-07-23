/* eslint-disable react-hooks/set-state-in-effect --
 * Presence / one-shot flash hooks intentionally queue short-lived visual
 * state from prop transitions (enter/exit, damage flash, reload bounce).
 */
import { useEffect, useRef, useState } from 'react'

/**
 * Keep a node mounted through exit so CSS can play leave transitions.
 * Returns { mounted, visible } — apply hud-presence-in when visible.
 */
export function usePresence(show, exitMs = 280) {
  const [mounted, setMounted] = useState(Boolean(show))
  const [visible, setVisible] = useState(Boolean(show))

  useEffect(() => {
    if (show) {
      setMounted(true)
      let raf2 = 0
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        window.cancelAnimationFrame(raf1)
        window.cancelAnimationFrame(raf2)
      }
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), exitMs)
    return () => window.clearTimeout(timer)
  }, [show, exitMs])

  return { mounted, visible }
}

/**
 * One-shot class pulse whenever `token` changes to a truthy value.
 */
export function useOneShot(token, durationMs = 300) {
  const prev = useRef(token)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (token === prev.current) return undefined
    prev.current = token
    if (token == null || token === false || token === '') return undefined

    setActive(true)
    const timer = window.setTimeout(() => setActive(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [token, durationMs])

  return active
}

/**
 * Detect numeric rises/falls and emit a short flash mode.
 * Returns 'damage' | 'heal' | null.
 */
export function useDeltaFlash(value, durationMs = 420) {
  const prevRef = useRef(value)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value
    if (!Number.isFinite(prev) || !Number.isFinite(value) || prev === value) {
      return undefined
    }

    setMode(value < prev ? 'damage' : 'heal')
    const timer = window.setTimeout(() => setMode(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [value, durationMs])

  return mode
}

/**
 * When value drops to zero from positive, hold a break state then hide.
 * Returns { show, breaking }.
 */
export function useBreakAway(value, breakMs = 480) {
  const prevRef = useRef(value)
  const [show, setShow] = useState(value > 0)
  const [breaking, setBreaking] = useState(false)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value

    if (value > 0) {
      setShow(true)
      setBreaking(false)
      return undefined
    }

    if (prev > 0 && value <= 0) {
      setBreaking(true)
      const timer = window.setTimeout(() => {
        setShow(false)
        setBreaking(false)
      }, breakMs)
      return () => window.clearTimeout(timer)
    }

    setShow(false)
    setBreaking(false)
    return undefined
  }, [value, breakMs])

  return { show, breaking }
}

/**
 * Detect reload-like clip refill: clip jumps up while reserve drops.
 */
export function useReloadPulse(clip, reserve, durationMs = 360) {
  const prevClip = useRef(clip)
  const prevReserve = useRef(reserve)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const pClip = prevClip.current
    const pRes = prevReserve.current
    prevClip.current = clip
    prevReserve.current = reserve

    if (clip < 0 || pClip < 0) return undefined

    const clipUp = clip > pClip + 1
    const reserveDown = reserve < pRes
    if (!clipUp || !reserveDown) return undefined

    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [clip, reserve, durationMs])

  return pulse
}
