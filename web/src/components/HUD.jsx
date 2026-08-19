import React, { useMemo, useEffect, useCallback, useId, useState } from 'react'
import { IoShieldHalf } from 'react-icons/io5'
import { FaBolt, FaBurger, FaDroplet, FaWalkieTalkie, FaLocationDot, FaMicrophone } from 'react-icons/fa6'
import { FaHeart } from 'react-icons/fa'
import { BsFuelPumpFill, BsLungsFill } from 'react-icons/bs'
import { LuBrain } from 'react-icons/lu'
import { PiEngineFill, PiSeatbeltFill } from 'react-icons/pi'
import { GiFullMotorcycleHelmet } from 'react-icons/gi'
import AmmoIcon from '../assets/machine-gun-magazine.svg'
import { resolveAnchorStyle } from './layout'
import StatusOxygenHex from './StatusOxygenHex'
import SlidingNumber from './SlidingNumber'
import { shouldShowWeaponOverlay } from '../hudVisibility.js'
import {
  usePresence,
  useOneShot,
  useDeltaFlash,
  useBreakAway,
  useArmorApplied,
  useArmorBypass,
  useReloadPulse,
} from '../hooks/hudMotion'

import './HUD.css'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

const BAR_SECTIONS = 4
const BAR_SECTION_PCT = 100 / BAR_SECTIONS

const Gta6WeaponIcon = ({ weaponIcon, onError }) => (
  <img
    src={`./weapons/${weaponIcon}.png`}
    alt=""
    aria-hidden="true"
    draggable={false}
    onError={() => onError(weaponIcon)}
  />
)

function getBarSectionWidths(value) {
  const v = clamp(value, 0, 100)
  const widths = []
  for (let i = 0; i < BAR_SECTIONS; i += 1) {
    const start = i * BAR_SECTION_PCT
    const end = (i + 1) * BAR_SECTION_PCT
    if (v >= end) widths.push(100)
    else if (v <= start) widths.push(0)
    else widths.push(((v - start) / BAR_SECTION_PCT) * 100)
  }
  return widths
}

function getUiScale() {
  const h = window.innerHeight || 1080
  const normalized = h / 1080
  return clamp(normalized, 1, 2)
}

function applyUiScale(value) {
  document.documentElement.style.setProperty('--es-ui-scale', value)
}

function withAlpha(color, alpha) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`

  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const normalized = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex

    if (normalized.length === 6) {
      const r = Number.parseInt(normalized.slice(0, 2), 16)
      const g = Number.parseInt(normalized.slice(2, 4), 16)
      const b = Number.parseInt(normalized.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }

  return color
}

const VOIP_BAR_COUNT = 8
const VOIP_BAR_INDICES = Array.from({ length: VOIP_BAR_COUNT }, (_, k) => k + 1)
const VOIP_CENTER = (VOIP_BAR_COUNT + 1) / 2

const VOIP_RANGE_WAVES = {
  whisper: (i) => {
    const d = Math.abs(i - VOIP_CENTER)
    return Math.max(22, 46 - d * 7)
  },
  normal: (i) => {
    const d = Math.abs(i - VOIP_CENTER)
    return Math.max(25, 100 - d * 18)
  },
  shout: (i) => {
    const d = Math.abs(i - VOIP_CENTER)
    return Math.max(58, 96 - d * 5.5)
  },
}

const VoipVisualizer = ({ isTalking, color, range }) => {
  const waveKey = VOIP_RANGE_WAVES[range] ? range : 'normal'
  const heightFn = VOIP_RANGE_WAVES[waveKey]
  // Stable persona per range band (no Math.random — keeps render pure).
  const vizPersona = useMemo(() => {
    let h = 0
    for (let i = 0; i < waveKey.length; i += 1) h = (h + waveKey.charCodeAt(i) * (i + 3)) % 4
    return h
  }, [waveKey])

  return (
    <div
      className={[
        'voip-waveform',
        `voip-wave-${waveKey}`,
        `voip-viz-${vizPersona}`,
        isTalking ? 'voip-mode-talk' : 'voip-mode-idle',
      ].join(' ')}
    >
      {VOIP_BAR_INDICES.map((i, idx) => (
        <div
          key={i}
          className="voip-waveform-bar"
          style={{
            '--bar-index': idx,
            '--base-height': `${heightFn(i)}%`,
            backgroundColor: isTalking ? color : 'rgba(255, 255, 255, 0.15)',
          }}
        />
      ))}
    </div>
  )
}

const HUD = React.memo(({
  health,
  healthRecentlyDamaged,
  armor,
  stamina,
  staminaRegenerating,
  vehicleVisible,
  playerInVehicle,
  speedUnit,
  speed,
  rpm,
  currentGear,
  fuel,
  hasFuelProvider,
  engineHealth,
  cruiseActive,
  cruiseSpeed,
  belt,
  harness,
  useSeatbelt,
  nosVisible,
  nosAmount,
  nosActive,
  hunger,
  thirst,
  stress,
  oxygen,
  underwater,
  inWater,
  voipTalking,
  voipRange,
  voipConnected,
  voipProximity,
  radioChannel,
  radioTalking,
  hungerThreshold,
  thirstThreshold,
  stressThreshold,
  oxygenThreshold,
  statusIconShape,
  resolvedStatusIconShape,
  statusRingWidth,
  statusRingHeight,
  showVoip,
  framework,
  standaloneVoipHudEnabled,
  speedometerPos,
  editMode,
  onDrag,
  ammoEditMode,
  onAmmoDrag,
  colors,
  theme,
  layout,
  fuelDisplayStyle,
  waypointDist,
  waypointUnit,
  ammoClip,
  ammoReserve,
  ammoPos,
  ammoColor,
  ammoPositionPreset,
  isArmed,
  weaponType,
  weaponIcon,
  weaponName,
  weaponUsesCharge,
  weaponChargeReady,
  weaponChargeProgress,
  gta6HudEnabled,
  gta6AuthenticWeaponHud,
  gta6ShowWeaponName,
  sectionedBars,
  oxygenDisplayLocation,
}) => {
  const showAmmo = ammoClip >= 0 || ammoEditMode
  const showWaypoint = waypointDist > 0
  const gta6Health = clamp(Number(health) || 0, 0, 100)
  const armorValue = clamp(Number(armor) || 0, 0, 100)
  const gta6Stamina = clamp(Number(stamina) || 0, 0, 100)
  const gta6Oxygen = clamp(Number(oxygen) || 0, 0, 100)
  const gta6SecondaryValue = inWater ? gta6Oxygen : gta6Stamina
  const gta6SecondaryLabel = inWater ? 'Oxygen' : 'Stamina'

  const speedoPresence = usePresence(vehicleVisible, 220)
  const ammoPresence = usePresence(showAmmo, 240)
  const gta6WeaponPresence = usePresence(shouldShowWeaponOverlay({
    gta6HudEnabled,
    isArmed,
    ammoEditMode,
    playerInVehicle,
  }), 220)
  const armorApplied = useArmorApplied(armorValue, 6000)
  const gta6HealthPresence = usePresence(gta6HudEnabled && (healthRecentlyDamaged || armorApplied), 320)
  const gta6StaminaPresence = usePresence(
    gta6HudEnabled && (inWater || gta6Stamina < 99.5),
    380,
  )
  const waypointPresence = usePresence(showWaypoint, 260)

  const healthFlash = useDeltaFlash(gta6Health, 420)
  const armorFlash = useDeltaFlash(armorValue, 420)
  const armorBreak = useBreakAway(armorValue, 480)
  const armorBypassed = useArmorBypass(gta6Health, armorValue, 1100)
  const gearTick = useOneShot(currentGear, 300)
  const cruisePop = useOneShot(cruiseActive ? `on-${cruiseSpeed}` : null, 420)
  const reloadPulse = useReloadPulse(ammoClip, ammoReserve, 440)

  const talkToken = (voipTalking || radioTalking) ? 'talk' : null
  const voipTalkRamp = useOneShot(talkToken, 320)

  const displayClip = ammoClip >= 0 ? ammoClip : 12
  const displayReserve = ammoClip >= 0 ? ammoReserve : 85
  const ammoLow = displayClip > 0 && displayClip <= 5
  const ammoEmpty = displayClip === 0
  const gta6WeaponName = String(weaponName || weaponType || 'Weapon').trim().slice(0, 48)
  const isMeleeWeapon = weaponType === 'melee'
  const showGta6WeaponName = gta6ShowWeaponName !== false && !gta6AuthenticWeaponHud
  const showGta6WeaponDetails = showGta6WeaponName || !isMeleeWeapon
  const gta6WeaponChargeProgress = clamp(Number(weaponChargeProgress) || 0, 0, 100)
  const [failedWeaponIcon, setFailedWeaponIcon] = useState(null)
  const hasGta6WeaponIcon = Boolean(weaponIcon && failedWeaponIcon !== weaponIcon)

  const oxygenUrgency = useMemo(() => {
    const v = clamp(Number(oxygen) || 0, 0, 100)
    // 0–1: higher = more urgent (lower oxygen)
    return clamp((35 - v) / 35, 0, 1)
  }, [oxygen])

  useEffect(() => {
    applyUiScale(getUiScale())
    const handleResize = () => applyUiScale(getUiScale())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const mergedColors = colors || {}
    const mergedTheme = theme || {}
    const resolvedAmmo = ammoColor || mergedTheme.ammo || '#10b981'
    const indicatorAccent = mergedTheme.indicatorAccent || mergedColors.armor || '#5eb2ff'
    const speedometerAccent = mergedTheme.speedometerAccent || mergedColors.health || '#10b981'
    const voipAccent = mergedTheme.voipAccent || mergedColors.health || '#10b981'

    root.style.setProperty('--hud-surface', mergedTheme.surface || 'rgba(10, 14, 20, 0.48)')
    root.style.setProperty('--hud-surface-border', mergedTheme.surfaceBorder || 'rgba(255, 255, 255, 0.12)')
    root.style.setProperty('--hud-text', mergedTheme.text || '#f8fafc')
    root.style.setProperty('--hud-muted-text', mergedTheme.mutedText || 'rgba(226, 232, 240, 0.68)')
    root.style.setProperty('--indicator-accent', indicatorAccent)
    root.style.setProperty('--indicator-accent-soft', withAlpha(indicatorAccent, 0.35))
    root.style.setProperty('--speedometer-accent', speedometerAccent)
    root.style.setProperty('--speedometer-accent-soft', withAlpha(speedometerAccent, 0.45))
    root.style.setProperty('--voip-accent', voipAccent)
    root.style.setProperty('--voip-accent-soft', withAlpha(voipAccent, 0.4))
    root.style.setProperty('--ammo-color', resolvedAmmo)
    root.style.setProperty('--health-color', mergedColors.health || '#10b981')
    root.style.setProperty('--health-glow', withAlpha(mergedColors.health || '#10b981', 0.4))
    root.style.setProperty('--armor-color', mergedColors.armor || '#5eb2ff')
    root.style.setProperty('--armor-glow', withAlpha(mergedColors.armor || '#5eb2ff', 0.4))
    root.style.setProperty('--hunger-color', mergedColors.hunger || '#f59e0b')
    root.style.setProperty('--hunger-glow', withAlpha(mergedColors.hunger || '#f59e0b', 0.45))
    root.style.setProperty('--thirst-color', mergedColors.thirst || '#38bdf8')
    root.style.setProperty('--thirst-glow', withAlpha(mergedColors.thirst || '#38bdf8', 0.45))
    root.style.setProperty('--stress-color', mergedColors.stress || '#ef4444')
    root.style.setProperty('--stress-glow', withAlpha(mergedColors.stress || '#ef4444', 0.4))
    root.style.setProperty('--oxygen-color', mergedColors.oxygen || '#06b6d4')
    root.style.setProperty('--oxygen-glow', withAlpha(mergedColors.oxygen || '#06b6d4', 0.4))
  }, [ammoColor, colors, theme])

  const handleMouseDown = useCallback((e) => {
    if (!editMode) return

    const startX = e.clientX
    const startY = e.clientY
    const rect = e.currentTarget.getBoundingClientRect()
    const initialLeft = rect.left
    const initialTop = rect.top
    const elW = rect.width
    const elH = rect.height
    e.preventDefault()

    const SNAP_DIST = 30
    const MARGIN = 10

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      let newLeft = initialLeft + dx
      let newTop = initialTop + dy

      const vw = window.innerWidth
      const vh = window.innerHeight

      if (newLeft < SNAP_DIST) newLeft = MARGIN
      if (newLeft + elW > vw - SNAP_DIST) newLeft = vw - elW - MARGIN
      if (newTop < SNAP_DIST) newTop = MARGIN
      if (newTop + elH > vh - SNAP_DIST) newTop = vh - elH - MARGIN

      const centerX = (vw - elW) / 2
      if (Math.abs(newLeft - centerX) < SNAP_DIST) newLeft = centerX
      const centerY = (vh - elH) / 2
      if (Math.abs(newTop - centerY) < SNAP_DIST) newTop = centerY

      onDrag({ left: newLeft, top: newTop })
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [editMode, onDrag])

  const handleAmmoMouseDown = useCallback((e) => {
    if (!ammoEditMode || typeof onAmmoDrag !== 'function') return

    const startX = e.clientX
    const startY = e.clientY
    const rect = e.currentTarget.getBoundingClientRect()
    const initialLeft = rect.left
    const initialTop = rect.top
    const elW = rect.width
    const elH = rect.height
    e.preventDefault()

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      let newLeft = initialLeft + dx
      let newTop = initialTop + dy

      const vw = window.innerWidth
      const vh = window.innerHeight

      newLeft = clamp(newLeft, 0, Math.max(0, vw - elW))
      newTop = clamp(newTop, 0, Math.max(0, vh - elH))

      onAmmoDrag({ left: newLeft, top: newTop })
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [ammoEditMode, onAmmoDrag])

  const voipHexClipId = useId().replace(/:/g, '')

  const normalizedStatusShape = useMemo(() => {
    const supportedShapes = ['hexagon', 'circle', 'bar']
    const raw = resolvedStatusIconShape || statusIconShape
    return supportedShapes.includes(raw) ? raw : 'hexagon'
  }, [resolvedStatusIconShape, statusIconShape])

  const barRailMode = normalizedStatusShape === 'bar'

  const normalizedFramework = typeof framework === 'string'
    ? framework.trim().toLowerCase()
    : 'standalone'
  const isStandaloneFramework = normalizedFramework === 'standalone'

  const showStandaloneVoip = showVoip
    && (!isStandaloneFramework || standaloneVoipHudEnabled)
  // Presence computed after framework normalize; tray-eligible check applied at render.

  const statusTrayStyle = useMemo(() => {
    const width = clamp(Number(statusRingWidth) || 42, 28, 84)
    const height = clamp(Number(statusRingHeight) || 48, 28, 90)

    return {
      '--status-ring-width': `calc(${width}px * var(--es-ui-scale))`,
      '--status-ring-height': `calc(${height}px * var(--es-ui-scale))`,
    }
  }, [statusRingWidth, statusRingHeight])

  const statusClusterStyle = useMemo(() => resolveAnchorStyle(layout?.statusCluster, {
    anchor: 'bottom-left',
    offsetX: 18,
    offsetY: 20,
  }), [layout])

  const waypointStyle = useMemo(() => {
    if (gta6HudEnabled) {
      return {
        position: 'fixed',
        left: 'calc(var(--hud-minimap-left) + calc(10px * var(--es-ui-scale)))',
        bottom: 'calc(var(--hud-safezone-bottom) + var(--hud-minimap-height) + calc(12px * var(--es-ui-scale)))',
      }
    }

    return resolveAnchorStyle(layout?.waypoint, {
      anchor: 'above-minimap',
      offsetX: 0,
      offsetY: 54,
    })
  }, [gta6HudEnabled, layout])

  const voipStyle = useMemo(() => resolveAnchorStyle(layout?.voip, {
    anchor: 'bottom-right',
    offsetX: 16,
    offsetY: 18,
  }), [layout])

  const speedoStyle = useMemo(() => {
    let style
    if (speedometerPos) {
      style = {
        position: 'fixed',
        left: `${speedometerPos.left}px`,
        top: `${speedometerPos.top}px`,
        right: 'auto',
        bottom: 'auto',
      }
    } else {
      style = resolveAnchorStyle(layout?.speedometer, {
        anchor: 'bottom-right',
        offsetX: 24,
        offsetY: 22,
      })
    }

    if (editMode) {
      style.cursor = 'move'
      style.pointerEvents = 'auto'
    }

    return style
  }, [editMode, layout, speedometerPos])

  const ammoContainerStyle = useMemo(() => {
    let style

    if (ammoPos && (ammoPositionPreset === 'custom' || ammoEditMode)) {
      style = {
        position: 'fixed',
        left: `${ammoPos.left}px`,
        top: `${ammoPos.top}px`,
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
      }
    } else if (
      ammoPositionPreset &&
      ammoPositionPreset !== 'preset' &&
      ammoPositionPreset !== 'custom'
    ) {
      const explicitAnchorStyle = { position: 'fixed' }
      switch (ammoPositionPreset) {
        case 'top-right':
          style = {
            ...explicitAnchorStyle,
            top: `calc(4vh * var(--es-ui-scale))`,
            right: `calc(4vw * var(--es-ui-scale))`,
            left: 'auto',
            bottom: 'auto',
            transform: 'none',
          }
          break
        case 'top-left':
          style = {
            ...explicitAnchorStyle,
            top: `calc(4vh * var(--es-ui-scale))`,
            left: `calc(4vw * var(--es-ui-scale))`,
            right: 'auto',
            bottom: 'auto',
            transform: 'none',
          }
          break
        case 'bottom-center':
          style = {
            ...explicitAnchorStyle,
            bottom: `calc(1vh * var(--es-ui-scale))`,
            left: '50%',
            right: 'auto',
            top: 'auto',
            transform: 'translateX(-50%)',
          }
          break
        case 'bottom-right':
        default:
          style = {
            ...explicitAnchorStyle,
            bottom: `calc(1vh * var(--es-ui-scale))`,
            right: `calc(4vw * var(--es-ui-scale))`,
            left: 'auto',
            top: 'auto',
            transform: 'none',
          }
      }
    } else {
      style = resolveAnchorStyle(layout?.ammo, {
        anchor: 'bottom-right',
        offsetX: 62,
        offsetY: 132,
      })
    }

    if (ammoEditMode) {
      style = { ...style, cursor: 'move', pointerEvents: 'auto' }
    }

    return style
  }, [ammoPos, ammoPositionPreset, layout, ammoEditMode])

  const healthColorClass = useMemo(() => {
    if (gta6Health <= 20) return 'critical health-heartbeat'
    if (gta6Health <= 40) return 'low'
    return ''
  }, [gta6Health])

  const healthFlashClass = healthFlash === 'damage'
    ? 'flash-damage'
    : healthFlash === 'heal'
      ? 'flash-heal'
      : ''

  const healthSectionWidths = useMemo(() => getBarSectionWidths(gta6Health), [gta6Health])
  const armorSectionWidths = useMemo(() => getBarSectionWidths(armorValue), [armorValue])
  const showArmorOverlay = armorBreak.show || armorBreak.breaking

  const rpmPercent = useMemo(() => clamp(rpm / 100, 0, 1), [rpm])
  const rpmColor = useMemo(() => {
    const p = rpmPercent
    if (p < 0.6) return { color: 'var(--speedometer-accent)', glow: 'var(--speedometer-accent-soft)' }
    if (p < 0.9) return { color: '#ffaa00', glow: 'rgba(255, 170, 0, 0.5)' }
    return { color: '#ff4444', glow: 'rgba(255, 68, 68, 0.6)' }
  }, [rpmPercent])

  const rpmArcDynamicStyle = useMemo(() => ({
    strokeDasharray: `${rpmPercent * 212} 283`,
    strokeDashoffset: 0,
    opacity: rpmPercent < 0.01 ? 0 : 1,
    stroke: rpmColor.color,
    filter: `drop-shadow(0 0 calc(6px * var(--es-ui-scale)) ${rpmColor.glow})`,
  }), [rpmColor, rpmPercent])

  const nosArcStyle = useMemo(() => ({
    strokeDasharray: `${clamp(nosAmount / 100, 0, 1) * 191} 255`,
    strokeDashoffset: 0,
    opacity: nosVisible ? 1 : 0,
    stroke: nosActive ? '#a855f7' : 'rgba(216, 180, 254, 0.4)',
  }), [nosAmount, nosVisible, nosActive])

  const fuelPercent = useMemo(() => clamp(fuel / 100, 0, 1), [fuel])
  const fuelLow = fuelPercent <= 0.15
  const useRadialFuel = fuelDisplayStyle === 'radial'

  const ticks = useMemo(() => {
    const result = []
    for (let i = 0; i <= 7; i += 1) {
      const angleRad = ((135 + (i * 270) / 7) * Math.PI) / 180
      result.push({
        i,
        x1: 50 + Math.cos(angleRad) * 42,
        y1: 50 + Math.sin(angleRad) * 42,
        x2: 50 + Math.cos(angleRad) * 48,
        y2: 50 + Math.sin(angleRad) * 48,
        numX: 50 + Math.cos(angleRad) * 35,
        numY: 50 + Math.sin(angleRad) * 35,
      })
    }
    return result
  }, [])

  const statusVariant = layout?.statusCluster?.variant || 'stacked'
  const voipVariant = layout?.voip?.variant || 'minimal'
  const ammoVariant = layout?.ammo?.variant || 'stacked'

  const voipTrayEligible = showVoip
    && !gta6HudEnabled
    && (!isStandaloneFramework || standaloneVoipHudEnabled)
    && (normalizedStatusShape === 'hexagon' || normalizedStatusShape === 'circle')

  const renderVoipStatusTraySlot = () => {
    const rawProx = Number(voipProximity)
    const proximity01 = Number.isFinite(rawProx) ? clamp(rawProx, 0, 1) : 0.62
    const displayFill = voipConnected ? Math.max(0.06, proximity01) : 0.1
    const voiceHot = voipTalking
    const radioHot = radioTalking
    const fillColor = radioHot && !voiceHot
      ? '#fb7185'
      : voiceHot
        ? '#facc15'
        : '#94a3b8'
    const ghostFill = 'rgba(30, 41, 59, 0.58)'
    const icon = <FaMicrophone />

    if (normalizedStatusShape === 'hexagon') {
      return (
        <div
          key="voip-tray"
          className={[
            'status-tray-item',
            'status-item-enter',
            'status-voip',
            voiceHot ? 'status-voip--voice' : '',
            radioHot ? 'status-voip--radio' : '',
            voipConnected ? '' : 'status-voip--disconnected',
            voipTalkRamp ? 'voip-talk-ramp' : '',
          ].filter(Boolean).join(' ')}
        >
          <div
            className="status-icon-shell-hexagon"
            style={{
              position: 'relative',
              width: 'var(--status-ring-width)',
              height: 'var(--status-ring-height)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '125%', height: '125%', opacity: 0.72, zIndex: 0 }} aria-hidden>
              <path d="M15 30 L50 10 L85 30 L85 70 L50 90 L15 70 Z" fill={ghostFill} />
            </svg>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', zIndex: 1 }} aria-hidden>
              <clipPath id={voipHexClipId}>
                <rect x="0" y={`${100 - clamp(displayFill, 0, 1) * 100}`} width="100" height="100" />
              </clipPath>
              <path d="M15 30 L50 10 L85 30 L85 70 L50 90 L15 70 Z" fill={fillColor} clipPath={`url(#${voipHexClipId})`} />
            </svg>
            <div className="status-meter-icon status-voip-meter-icon" style={{ position: 'relative', zIndex: 2 }}>{icon}</div>
          </div>
        </div>
      )
    }

    if (normalizedStatusShape === 'circle') {
      const pct = clamp(displayFill, 0, 1)
      const r = 44
      const circumference = 2 * Math.PI * r
      const dashOffset = circumference * (1 - pct)
      const ringGlow = radioHot && !voiceHot ? 'rgba(251, 113, 133, 0.5)' : 'rgba(250, 204, 21, 0.45)'
      return (
        <div
          key="voip-tray"
          className={[
            'status-tray-item',
            'status-item-enter',
            'status-voip',
            voiceHot ? 'status-voip--voice' : '',
            radioHot ? 'status-voip--radio' : '',
            voipConnected ? '' : 'status-voip--disconnected',
            voipTalkRamp ? 'voip-talk-ramp' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="status-circle-wrap status-voip-circle-wrap">
            <svg className="status-circle-svg" viewBox="0 0 100 100" aria-hidden>
              <circle className="status-circle-track" cx="50" cy="50" r={r} />
              <circle
                className="status-circle-ring status-voip-circle-ring"
                cx="50"
                cy="50"
                r={r}
                style={{
                  stroke: fillColor,
                  strokeDasharray: `${circumference}`,
                  strokeDashoffset: `${dashOffset}`,
                  filter: (voiceHot || radioHot)
                    ? `drop-shadow(0 0 calc(7px * var(--es-ui-scale)) ${ringGlow})`
                    : 'drop-shadow(0 0 calc(4px * var(--es-ui-scale)) rgba(148, 163, 184, 0.35))',
                }}
              />
            </svg>
            <div className="status-circle-icon">
              <div className="status-meter-icon status-voip-meter-icon">{icon}</div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const renderStatusMeter = (value, icon, type, isReversed = false) => {
    const displayValue = isReversed ? 1 - value / 100 : value / 100
    let state = ''
    if (isReversed) {
      if (value >= 80) state = 'critical'
      else if (value >= 50) state = 'low'
    } else {
      if (value <= 10) state = 'critical'
      else if (value <= 25) state = 'low'
    }

    const oxygenUrgent = type === 'oxygen' && oxygenUrgency > 0.15
    const oxygenStyle = oxygenUrgent
      ? { '--oxygen-pulse-ms': `${Math.round(900 - oxygenUrgency * 520)}ms` }
      : undefined
    const itemClass = [
      'status-tray-item',
      'status-item-enter',
      state,
      `status-${type}`,
      oxygenUrgent ? 'status-oxygen-urgent' : '',
      type === 'health' && healthFlashClass ? healthFlashClass : '',
      type === 'armor' && armorBreak.breaking ? 'armor-breaking' : '',
    ].filter(Boolean).join(' ')

    const oxygenBarHexShell = (extraClass = '') => (
      <div
        className={`status-icon-shell-hexagon ${extraClass}`.trim()}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusOxygenHex value={value} variant="tray" />
      </div>
    )

    if (normalizedStatusShape === 'hexagon') {
      return (
        <div key={type} className={itemClass} style={oxygenStyle}>
          <div className="status-icon-shell-hexagon" style={{ position: 'relative', width: 'var(--status-ring-width)', height: 'var(--status-ring-height)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '125%', height: '125%', opacity: 0.45, zIndex: 0 }}>
              <path d="M15 30 L50 10 L85 30 L85 70 L50 90 L15 70 Z" fill="var(--status-color)" />
            </svg>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', zIndex: 1 }}>
              <clipPath id={`clip-${type}`}>
                <rect x="0" y={`${100 - clamp(displayValue, 0, 1) * 100}`} width="100" height="100" />
              </clipPath>
              <path d="M15 30 L50 10 L85 30 L85 70 L50 90 L15 70 Z" fill="var(--status-color)" clipPath={`url(#clip-${type})`} />
            </svg>
            <div className="status-meter-icon" style={{ position: 'relative', zIndex: 2 }}>{icon}</div>
          </div>
        </div>
      )
    }

    if (normalizedStatusShape === 'bar') {
      if (type === 'oxygen') {
        return (
          <div key={type} className={`${itemClass} status-tray-item--oxygen-only`} style={oxygenStyle}>
            {oxygenBarHexShell('status-icon-shell-hexagon--bar')}
          </div>
        )
      }
      const fillPct = clamp(displayValue, 0, 1) * 100
      return (
        <div key={type} className={itemClass} style={oxygenStyle}>
          <div className="status-meter-line">
            <div className="status-meter-line-fill" style={{ height: `${fillPct}%`, width: '100%' }} />
          </div>
          <div className="status-icon-shell">
            <div className="status-icon-core">
              <div className="status-meter-icon">{icon}</div>
            </div>
          </div>
        </div>
      )
    }

    if (normalizedStatusShape === 'circle') {
      const pct = clamp(displayValue, 0, 1)
      const r = 44
      const circumference = 2 * Math.PI * r
      const dashOffset = circumference * (1 - pct)
      return (
        <div key={type} className={itemClass} style={oxygenStyle}>
          <div className="status-circle-wrap">
            <svg className="status-circle-svg" viewBox="0 0 100 100">
              <circle className="status-circle-track" cx="50" cy="50" r={r} />
              <circle
                className="status-circle-ring"
                cx="50"
                cy="50"
                r={r}
                style={{
                  strokeDasharray: `${circumference}`,
                  strokeDashoffset: `${dashOffset}`,
                }}
              />
            </svg>
            <div className="status-circle-icon">
              <div className="status-meter-icon">{icon}</div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={type} className={itemClass} style={oxygenStyle}>
        <div className="status-icon-shell">
          <div className="status-icon-fill" style={{ height: `${clamp(displayValue, 0, 1) * 100}%` }} />
          <div className="status-icon-core">
            <div className="status-meter-icon">{icon}</div>
          </div>
        </div>
      </div>
    )
  }

  const voipStandaloneShow = showStandaloneVoip && !voipTrayEligible
  const voipStandalonePresence = usePresence(voipStandaloneShow, 240)

  return (
    <>
      {(gta6HealthPresence.mounted || gta6StaminaPresence.mounted) && (
        <div className="gta6-vitals" role="group" aria-label={`Health and ${gta6SecondaryLabel.toLowerCase()}`}>
          {gta6HealthPresence.mounted && (
          <div
            className={`gta6-vital gta6-vital--health ${gta6HealthPresence.visible ? 'hud-presence-in' : 'hud-presence-out'}`}
          >
            <div className="gta6-vital-badge gta6-vital-badge--heart" aria-hidden="true">
              <FaHeart />
            </div>
            <div
              className={`gta6-vital-track${armorValue > 0 ? ' has-armor' : ''}`}
              role="group"
              aria-label="Health and armor"
            >
              <div
                className="gta6-vital-fill gta6-vital-fill--health"
                style={{ width: `${gta6Health}%` }}
                role="progressbar"
                aria-label="Health"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(gta6Health)}
              />
              {armorValue > 0 && (
                <div
                  className="gta6-vital-fill gta6-vital-fill--armor"
                  style={{ width: `${armorValue}%` }}
                  role="progressbar"
                  aria-label="Armor"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={Math.round(armorValue)}
                />
              )}
            </div>
          </div>
          )}
          {gta6StaminaPresence.mounted && (
          <div
            className={[
              'gta6-vital',
              'gta6-vital--stamina',
              !inWater && staminaRegenerating ? 'is-regenerating' : '',
              gta6StaminaPresence.visible ? 'hud-presence-in' : 'hud-presence-out',
            ].filter(Boolean).join(' ')}
          >
            <div className="gta6-vital-badge gta6-vital-badge--stamina" aria-hidden="true">
              {inWater ? (
                <span className="gta6-vital-o2">
                  O<sub>2</sub>
                </span>
              ) : <FaBolt />}
            </div>
            <div
              className="gta6-vital-track"
              role="progressbar"
              aria-label={gta6SecondaryLabel}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(gta6SecondaryValue)}
            >
              <div className="gta6-vital-fill" style={{ width: `${gta6SecondaryValue}%` }} />
            </div>
          </div>
          )}
        </div>
      )}

      {gta6WeaponPresence.mounted && (
        <div
          className={[
            'gta6-weapon',
            gta6AuthenticWeaponHud ? 'gta6-weapon--authentic' : '',
            gta6WeaponPresence.visible ? 'hud-presence-in' : 'hud-presence-out',
            !isMeleeWeapon && !weaponUsesCharge && ammoLow ? 'ammo-low' : '',
            !isMeleeWeapon && !weaponUsesCharge && ammoEmpty ? 'ammo-empty' : '',
            !isMeleeWeapon && !weaponUsesCharge && reloadPulse ? 'ammo-reload' : '',
            hasGta6WeaponIcon ? 'has-weapon-image' : 'gta6-weapon--text-only',
            hasGta6WeaponIcon && !showGta6WeaponDetails ? 'gta6-weapon--image-only' : '',
          ].filter(Boolean).join(' ')}
          role="group"
          aria-label={isMeleeWeapon || weaponUsesCharge
            ? `Active ${gta6WeaponName}`
            : `Active ${gta6WeaponName} ammunition`}
        >
          {gta6AuthenticWeaponHud ? (
            <>
              {!isMeleeWeapon && !weaponUsesCharge && (
                <div
                  className="gta6-authentic-ammo"
                  aria-label={`${displayClip} rounds loaded, ${displayReserve} in reserve`}
                >
                  <span className="gta6-authentic-ammo-value" aria-hidden="true">
                    <SlidingNumber value={displayClip} minDigits={2} durationMs={180} />
                  </span>
                  <span className="gta6-authentic-ammo-value gta6-authentic-ammo-value--reserve" aria-hidden="true">
                    <SlidingNumber value={displayReserve} minDigits={2} durationMs={240} />
                  </span>
                </div>
              )}
              {hasGta6WeaponIcon && (
                <div className="gta6-weapon-art">
                  <Gta6WeaponIcon weaponIcon={weaponIcon} onError={setFailedWeaponIcon} />
                </div>
              )}
              {!isMeleeWeapon && weaponUsesCharge && (
                <div
                  className={`gta6-charge${weaponChargeReady ? ' is-ready' : ' is-charging'}`}
                >
                  <span className="gta6-charge-label" role="status" aria-live="polite">
                    {weaponChargeReady ? 'READY' : 'CHARGING'}
                  </span>
                  <span
                    className="gta6-charge-track"
                    role="progressbar"
                    aria-label="Weapon charge"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={Math.round(gta6WeaponChargeProgress)}
                  >
                    <span
                      className="gta6-charge-fill"
                      style={{ width: `${gta6WeaponChargeProgress}%` }}
                      aria-hidden="true"
                    />
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {hasGta6WeaponIcon && (
                <div className="gta6-weapon-art">
                  <Gta6WeaponIcon weaponIcon={weaponIcon} onError={setFailedWeaponIcon} />
                </div>
              )}
            </>
          )}
          {!gta6AuthenticWeaponHud && showGta6WeaponDetails && (
            <>
              {hasGta6WeaponIcon && <div className="gta6-weapon-divider" aria-hidden="true" />}
              <div className="gta6-weapon-info">
                {showGta6WeaponName && (
                  <div className="gta6-weapon-name">{gta6WeaponName}</div>
                )}
                {!isMeleeWeapon && weaponUsesCharge && (
                  <div
                    className={`gta6-charge${weaponChargeReady ? ' is-ready' : ' is-charging'}`}
                  >
                    <span className="gta6-charge-label" role="status" aria-live="polite">
                      {weaponChargeReady ? 'READY' : 'CHARGING'}
                    </span>
                    <span
                      className="gta6-charge-track"
                      role="progressbar"
                      aria-label="Weapon charge"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={Math.round(gta6WeaponChargeProgress)}
                    >
                      <span
                        className="gta6-charge-fill"
                        style={{ width: `${gta6WeaponChargeProgress}%` }}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                )}
                {!isMeleeWeapon && !weaponUsesCharge && (
                  <div
                    className="gta6-ammo-readout"
                    aria-label={`${displayClip} rounds loaded, ${displayReserve} in reserve`}
                  >
                    <span className="gta6-ammo-clip" aria-hidden="true">
                      <SlidingNumber value={displayClip} minDigits={2} durationMs={180} />
                    </span>
                    <span className="gta6-ammo-separator" aria-hidden="true" />
                    <span className="gta6-ammo-reserve" aria-hidden="true">
                      <SlidingNumber value={displayReserve} durationMs={240} />
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {voipStandalonePresence.mounted && (
        <div className="hud-presence-shell" style={voipStyle}>
          <div
            className={[
              'voip-container-modern',
              `voip-variant-${voipVariant}`,
              voipConnected ? '' : 'muted',
              voipTalking ? 'talking' : '',
              radioTalking ? 'radio-talking' : '',
              voipTalkRamp ? 'voip-talk-ramp' : '',
              voipStandalonePresence.visible ? 'hud-presence-in' : 'hud-presence-out',
            ].filter(Boolean).join(' ')}
          >
            <div className="voip-content-modern">
              <div className="voip-indicator-group">
                <div className="voip-main-stack">
                  <VoipVisualizer
                    isTalking={voipTalking || radioTalking}
                    color={radioTalking ? '#ff4444' : 'var(--voip-accent)'}
                    range={voipRange}
                  />
                  <div className="voip-range-modern">
                    <span className={`voip-pip-modern ${voipRange === 'whisper' || voipRange === 'normal' || voipRange === 'shout' ? 'on' : ''}`} />
                    <span className={`voip-pip-modern ${voipRange === 'normal' || voipRange === 'shout' ? 'on' : ''}`} />
                    <span className={`voip-pip-modern ${voipRange === 'shout' ? 'on' : ''}`} />
                  </div>
                </div>
                {voipConnected && radioChannel > 0 && (
                  <div className="voip-radio-icon-modern voip-radio-chip-in" key={radioChannel}>
                    <FaWalkieTalkie />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!gta6HudEnabled && (
      <div className={`status-cluster variant-${statusVariant}${barRailMode ? ' status-cluster--bar-rail' : ''}`} style={statusClusterStyle}>
        {barRailMode && (
          <div className="hud-bar-deck">
            <div className={`hud-container${sectionedBars ? ' hud-container--sectioned-bars' : ''}`}>
              <div
                className={[
                  'hud-bar',
                  'health-bar',
                  'vital-overlay-bar',
                  healthColorClass,
                  healthFlashClass,
                  showArmorOverlay ? 'has-armor' : '',
                  armorFlash === 'damage' ? 'armor-hit' : '',
                  armorBreak.breaking ? 'armor-breaking' : '',
                  armorBypassed ? 'armor-bypassed' : '',
                ].filter(Boolean).join(' ')}
                role="group"
                aria-label={`Health ${Math.round(gta6Health)}, armor ${Math.round(armorValue)}${armorBypassed ? ', health damage bypassed armor' : ''}`}
              >
                <div className="bar-icon vital-overlay-icon" aria-hidden="true">
                  <span className="vital-overlay-layer vital-overlay-health"><FaHeart /></span>
                  {showArmorOverlay && (
                    <span className="vital-overlay-layer vital-overlay-armor"><IoShieldHalf /></span>
                  )}
                </div>
                <div className="bar-value vital-overlay-value" aria-hidden="true">
                  <span className="vital-overlay-layer vital-overlay-health">{Math.round(gta6Health)}</span>
                  {showArmorOverlay && (
                    <span className="vital-overlay-layer vital-overlay-armor">{Math.round(armorValue)}</span>
                  )}
                </div>
                <div className={`bar-track${sectionedBars ? ' bar-track--sectioned' : ''}`}>
                  {sectionedBars ? (
                    healthSectionWidths.map((w, i) => (
                      <div key={`h-${i}`} className="bar-chunk">
                        <div className="bar-chunk-fill health-fill" style={{ width: `${w}%` }}>
                          <div className="bar-glow" />
                        </div>
                        {showArmorOverlay && (
                          <div className="bar-chunk-fill armor-fill" style={{ width: `${armorSectionWidths[i]}%` }}>
                            <div className="bar-glow" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="bar-fill health-fill" style={{ width: `${gta6Health}%` }}><div className="bar-glow" /></div>
                      {showArmorOverlay && (
                        <div className="bar-fill armor-fill" style={{ width: `${armorValue}%` }}><div className="bar-glow" /></div>
                      )}
                      <div className="bar-segments" />
                    </>
                  )}
                </div>
              </div>
            </div>
            {!isStandaloneFramework && (
              <div className="status-tray shape-bar shape-bar--rail" style={statusTrayStyle}>
                {(barRailMode || hunger <= hungerThreshold) && renderStatusMeter(hunger, <FaBurger />, 'hunger')}
                {(barRailMode || thirst <= thirstThreshold) && renderStatusMeter(thirst, <FaDroplet />, 'thirst')}
                {stressThreshold > 0 && (barRailMode || (stress > 0 && stress >= 100 - stressThreshold)) && renderStatusMeter(stress, <LuBrain />, 'stress', true)}
                {oxygenDisplayLocation === 'statusCluster' && oxygen <= oxygenThreshold && (underwater || oxygen < 100) && renderStatusMeter(oxygen, <BsLungsFill />, 'oxygen')}
              </div>
            )}
          </div>
        )}

        {!barRailMode && (!isStandaloneFramework || normalizedStatusShape === 'hexagon' || normalizedStatusShape === 'circle') && (
          <div className={`status-tray shape-${normalizedStatusShape}`} style={statusTrayStyle}>
            {voipTrayEligible && renderVoipStatusTraySlot()}
            {(normalizedStatusShape === 'hexagon' || normalizedStatusShape === 'circle') && renderStatusMeter(health, <FaHeart />, 'health')}
            {(normalizedStatusShape === 'hexagon' || normalizedStatusShape === 'circle') && (armorBreak.show || armorBreak.breaking) && renderStatusMeter(armor, <IoShieldHalf />, 'armor')}
            {!isStandaloneFramework && hunger <= hungerThreshold && renderStatusMeter(hunger, <FaBurger />, 'hunger')}
            {!isStandaloneFramework && thirst <= thirstThreshold && renderStatusMeter(thirst, <FaDroplet />, 'thirst')}
            {!isStandaloneFramework && stress > 0 && stressThreshold > 0 && stress >= 100 - stressThreshold && renderStatusMeter(stress, <LuBrain />, 'stress', true)}
            {oxygenDisplayLocation === 'statusCluster' && oxygen <= oxygenThreshold && (underwater || oxygen < 100) && renderStatusMeter(oxygen, <BsLungsFill />, 'oxygen')}
          </div>
        )}
      </div>
      )}

      {waypointPresence.mounted && (
        <div className="hud-presence-shell" style={waypointStyle}>
          <div
            className={[
              'waypoint-distance',
              gta6HudEnabled ? 'waypoint-distance--gta6' : '',
              waypointPresence.visible ? 'hud-presence-in' : 'hud-presence-out',
            ].filter(Boolean).join(' ')}
            role="status"
            aria-live="polite"
            aria-label={`${Math.max(0, waypointDist).toFixed(2)} ${waypointUnit}`}
          >
            {!gta6HudEnabled && <FaLocationDot className="waypoint-icon waypoint-pin-pulse" />}
            <span className="waypoint-value" aria-hidden="true">
              <SlidingNumber
                value={Math.floor(Math.max(0, waypointDist))}
                durationMs={160}
                className="waypoint-sliding"
              />
              <span className="waypoint-frac">
                {`.${String(Math.floor((Math.max(0, waypointDist) % 1) * 100)).padStart(2, '0')}`}
              </span>
            </span>
            <span className="waypoint-unit" aria-hidden="true">{waypointUnit}</span>
          </div>
        </div>
      )}

      {speedoPresence.mounted && (
        <div
          className="hud-presence-shell"
          style={speedoStyle}
          onMouseDown={handleMouseDown}
        >
        <div
          className={[
            'speedo-container',
            speedoPresence.visible ? 'hud-presence-in' : 'hud-presence-out',
          ].join(' ')}
        >
          <div className="speedo-ring">
            <svg className="speedo-svg" viewBox="0 0 100 100" aria-hidden="true">
              <circle className="speedo-track" cx="50" cy="50" r="45" />
              <circle className="speedo-arc" cx="50" cy="50" r="45" style={rpmArcDynamicStyle} />
              <circle className="speedo-track-nos" cx="50" cy="50" r="40.5" style={{ opacity: nosVisible ? 1 : 0 }} />
              <circle className="speedo-arc-nos" cx="50" cy="50" r="40.5" style={nosArcStyle} />
              <g className="speedo-ticks">
                {ticks.map((t) => (
                  <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
                ))}
              </g>
              <g className="speedo-numbers">
                {ticks.map((t) => (
                  <text key={t.i} x={t.numX} y={t.numY} dominantBaseline="middle" textAnchor="middle">
                    {t.i}
                  </text>
                ))}
              </g>
            </svg>
            {useRadialFuel && hasFuelProvider && (
              <svg className="speedo-fuel-radial" viewBox="0 0 100 100">
                <path className="speedo-fuel-radial-track" d="M 11 90.2 A 56 56 0 0 1 11 9.8" fill="none" />
                <path className={`speedo-fuel-radial-fill${fuelLow ? ' low' : ''}`} d="M 11 90.2 A 56 56 0 0 1 11 9.8" fill="none" style={{ strokeDasharray: `${fuelPercent * 91} 91` }} />
              </svg>
            )}
            <div className="speedo-center">
              <div className="speedo-speed">{speed}</div>
              <div className="speedo-unit">{speedUnit.toUpperCase()}</div>
              {currentGear && (
                <div
                  className={`speedo-gear${gearTick ? ' gear-tick' : ''}`}
                  style={{ color: rpmColor.color, textShadow: `0 0 calc(8px * var(--es-ui-scale)) ${rpmColor.glow}` }}
                >
                  {currentGear}
                </div>
              )}
            </div>
            {useRadialFuel && hasFuelProvider && (
              <div className={`speedo-fuel-radial-label${fuelLow ? ' fuel-low-breathe' : ''}`}>
                <BsFuelPumpFill />
              </div>
            )}
            {cruiseActive && (
              <div
                className={`speedo-cruise-sign${cruisePop ? ' cruise-pop' : ''}`}
                aria-label={`Cruise set speed ${cruiseSpeed}`}
              >
                <div className="speedo-cruise-sign__masthead" aria-hidden="true">
                  <span className="speedo-cruise-sign__word">SPEED</span>
                  <span className="speedo-cruise-sign__word">LIMIT</span>
                </div>
                <span className="speedo-cruise-sign__value">{cruiseSpeed}</span>
              </div>
            )}
          </div>
          <div className="speedo-status">
            {hasFuelProvider && !useRadialFuel && (
              <div className={`speedo-statusItem speedo-statusItem-fuel ${fuelLow ? 'warning fuel-low-breathe' : ''}`}>
                <div className="speedo-statusBar speedo-statusBar-vertical">
                  <div className="speedo-statusFill speedo-statusFill-vertical" style={{ height: `${fuel}%` }} />
                </div>
                <div className="speedo-statusIcon-label">
                  <BsFuelPumpFill />
                </div>
              </div>
            )}
            {engineHealth / 100 <= 0.65 && (
              <div className={`speedo-statusItem speedo-statusIcon engine-warning-in ${engineHealth / 100 <= 0.35 ? 'critical engine-critical-blink' : 'warning'}`}>
                <div className="speedo-statusIcon-label">
                  <PiEngineFill />
                </div>
              </div>
            )}
            {(harness || useSeatbelt) && (
              <div className="speedo-statusItem speedo-statusIcon-slot">
                {harness ? (
                  <div className="speedo-statusIcon harness-on">
                    <div className="speedo-statusIcon-label">
                      <GiFullMotorcycleHelmet />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`speedo-statusIcon ${!belt ? 'critical seatbelt-alert' : 'seatbelt-ok'}`}
                    style={{ opacity: !belt ? 1 : 0 }}
                  >
                    <div className="speedo-statusIcon-label">
                      <PiSeatbeltFill />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {(!gta6HudEnabled || ammoEditMode) && ammoPresence.mounted && (
        <div
          className="hud-presence-shell"
          style={ammoContainerStyle}
          onMouseDown={ammoEditMode ? handleAmmoMouseDown : undefined}
        >
          <div
            className={[
              'ammo-display',
              `ammo-variant-${ammoVariant}`,
              ammoPresence.visible ? 'hud-presence-in' : 'hud-presence-out',
              ammoLow ? 'ammo-low' : '',
              ammoEmpty ? 'ammo-empty' : '',
              reloadPulse ? 'ammo-reload' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="ammo-icon-box">
              <img src={AmmoIcon} className="ammo-main-icon" alt="ammo" />
            </div>
            <div className="ammo-divider" />
            <div className="ammo-info-stack">
              <div className="ammo-clip" style={{ color: ammoColor || 'var(--ammo-color)' }}>
                <SlidingNumber value={displayClip} durationMs={180} />
              </div>
              <div className="ammo-reserve">
                <SlidingNumber value={displayReserve} durationMs={240} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

HUD.displayName = 'HUD'
export default HUD


