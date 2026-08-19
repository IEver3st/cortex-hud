import React, { useState, useEffect, useCallback, useRef } from 'react'
import HUD from './components/HUD'
import AircraftHUD from './components/AircraftHUD'
import Indicator from './components/Indicator'
import Gta6Navigation from './components/Gta6Navigation'
import VehicleIdentification from './components/VehicleIdentification'
import VehicleCloneQte from './components/VehicleCloneQte'
import SniperScope from './components/SniperScope'
import SettingsModal from './components/SettingsModal'
import HudDevPanel from './components/HudDevPanel'
import { isHudDevBrowser, loadDevPlayfieldColor, saveDevPlayfieldColor } from './hudDevEnv'
import { applyDevSettingsSave } from './hudDevApply'
import { postNui } from './nui'
import { normalizeVehicleIdentity } from './vehicleIdentity.js'
import { shouldShowSpeedometer } from './hudVisibility.js'

function App() {
  const [devPlayfieldColor, setDevPlayfieldColor] = useState(() =>
    isHudDevBrowser ? loadDevPlayfieldColor() : null,
  )

  useEffect(() => {
    if (isHudDevBrowser && devPlayfieldColor) {
      saveDevPlayfieldColor(devPlayfieldColor)
    }
  }, [devPlayfieldColor])

  const [hudData, setHudData] = useState({
    health: 100,
    healthRecentlyDamaged: false,
    armor: 50,
    stamina: 100,
    staminaRegenerating: false,
    visible: true,
    heading: 0,
    street: 'Unknown',
    zone: 'Unknown',
    zoneCode: '',
    postal: '',
    postalDist: 0,
    vehicleVisible: false,
    disableSpeedometer: false,
    speedUnit: 'mph',
    speed: 0,
    rpm: 0,
    gears: 0,
    currentGear: 'N',
    fuel: 100,
    hasFuelProvider: false,
    engineHealth: 100,
    engineState: false,
    cruiseActive: false,
    cruiseSpeed: 0,
    headlights: 0,
    belt: false,
    harness: false,
    aircraftVisible: false,
    altitude: 0,
    altitudeAgl: 0,
    airspeed: 0,
    aircraftHeading: 0,
    aircraftFuel: 100,
    aircraftHasFuelProvider: false,
    aircraftEngineHealth: 100,
    engines: [],
    aircraftLightsOn: false,
    aircraftGearDown: true,
    aircraftHasFixedGear: false,
    aircraftTailRotorHealth: 1000,
    aircraftMainRotorHealth: 1000,
    aircraftGearHealth: 1000,
    aircraftIsHelicopter: false,
    aircraftStalled: false,
    aircraftHydraulicsHudEnabled: false,
    aircraftHydraulicsHealth: 1000,
    forceAircraftHud: false,
    useSeatbelt: true,
    nosVisible: false,
    nosAmount: 0,
    nosActive: false,
    hunger: 100,
    thirst: 100,
    stress: 0,
    oxygen: 100,
    underwater: false,
    inWater: false,
    voipTalking: false,
    voipRange: 'normal',
    voipConnected: false,
    voipProximity: 0.62,
    radioChannel: 0,
    radioTalking: false,
    hungerThreshold: 100,
    thirstThreshold: 100,
    stressThreshold: 100,
    oxygenThreshold: 100,
    statusIconShape: 'bar',
    resolvedStatusIconShape: 'bar',
    statusRingWidth: 42,
    statusRingHeight: 48,
    showVoip: true,
    framework: 'standalone',
    standaloneVoipHudEnabled: false,
    layoutPreset: 'classic',
    colorPreset: 'classic',
    layout: {},
    theme: {
      surface: 'rgba(10, 14, 20, 0.48)',
      surfaceBorder: 'rgba(255, 255, 255, 0.12)',
      text: '#f8fafc',
      mutedText: 'rgba(226, 232, 240, 0.68)',
      indicatorAccent: '#60a5fa',
      speedometerAccent: '#22c55e',
      voipAccent: '#22c55e',
      ammo: '#a3e635',
      backdropBlur: 1,
      panelOpacity: 1,
    },
    colors: {
      health: '#10b981',
      armor: '#5eb2ff',
      hunger: '#f59e0b',
      thirst: '#38bdf8',
      stress: '#ef4444',
      oxygen: '#06b6d4',
    },
    fuelDisplayStyle: 'bar',
    resolvedFuelDisplayStyle: 'bar',
    ammoPositionPreset: 'preset',
    resolvedAmmoPositionPreset: 'preset',
    waypointDist: -1,
    waypointUnit: '',
    ammoClip: -1,
    ammoReserve: -1,
    ammoPos: null,
    ammoColor: '#10b981',
    speedometerPos: null,
    showCrosshair: false,
    gta6HudEnabled: false,
    gta6AuthenticWeaponHud: false,
    gta6ShowWeaponName: true,
    gta6VehicleIdentification: true,
    vehicleIdentity: null,
    sniperScopeVisible: false,
    sniperScopeWeapon: 'SNIPER',
    sniperScopeZoom: 1,
    sniperScopeRange: null,
    sniperScopeSteadiness: 100,
    sectionedBars: false,
    sectionedIndicator: false,
    oxygenDisplayLocation: 'statusCluster',
    isArmed: false,
    weaponType: 'none',
    weaponIcon: null,
    weaponName: '',
    weaponUsesCharge: false,
    weaponChargeReady: true,
    weaponChargeProgress: 100,
    interactionLayout: {
      insetRight: 0,
      insetBottom: 0,
      screenWidth: isHudDevBrowser ? window.innerWidth : 1920,
      screenHeight: isHudDevBrowser ? window.innerHeight : 1080,
    },
    radarVisible: true,

    devFrameworkOverride: isHudDevBrowser ? 'esx' : null,
    dynamicWeatherShow: false,
    dynamicWeatherResourceAvailable: false,
    dynamicWeatherDisplay: '',
    dynamicWeatherSeason: '',
    dynamicWeatherForecastLine: '',
    dynamicWeatherWetLabel: '',
    dynamicWeatherNext: '',
    dynamicWeatherTempF: null,
    dynamicWeatherWindMph: null,
    showDynamicWeather: false,
    showHurricaneWarning: true,
    floodWarningActive: false,
    floodWarningDetail: '',
    hurricaneWarningActive: false,
    hurricaneWarningDetail: '',
  })

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsData, setSettingsData] = useState({})
  const [cinematicMode, setCinematicMode] = useState(false)
  const [vehicleIdentityActive, setVehicleIdentityActive] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [dragPos, setDragPos] = useState(null)
  const dragPosRef = useRef(null)
  const editModeRef = useRef(false)
  const hudDataRef = useRef(hudData)
  const [ammoEditMode, setAmmoEditMode] = useState(false)
  const [ammoDragPos, setAmmoDragPos] = useState(null)
  const ammoDragPosRef = useRef(null)
  const [cloneQte, setCloneQte] = useState(null)
  const [cloneQtePressNonce, setCloneQtePressNonce] = useState(0)
  const cloneQteRef = useRef(null)

  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  useEffect(() => {
    hudDataRef.current = hudData
  }, [hudData])

  useEffect(() => {
    if (!isHudDevBrowser) return undefined

    let frame = 0
    const syncDevViewport = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight
        setHudData((prev) => {
          if (
            prev.interactionLayout.screenWidth === screenWidth
            && prev.interactionLayout.screenHeight === screenHeight
          ) {
            return prev
          }
          return {
            ...prev,
            interactionLayout: {
              ...prev.interactionLayout,
              screenWidth,
              screenHeight,
            },
          }
        })
      })
    }

    syncDevViewport()
    window.addEventListener('resize', syncDevViewport)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', syncDevViewport)
    }
  }, [])

  useEffect(() => {
    const raw = Number(hudData.theme?.backdropBlur)
    const blur = Number.isFinite(raw) ? Math.min(3, Math.max(0.25, raw)) : 1
    document.documentElement.style.setProperty('--es-backdrop-blur', String(blur))
    const norm = (blur - 0.25) / 2.75
    document.documentElement.style.setProperty('--es-backdrop-norm', String(norm))

    let op = Number(hudData.theme?.panelOpacity)
    if (Number.isFinite(op) && op >= 15 && op <= 100) op = op / 100
    if (!Number.isFinite(op)) op = 1
    op = Math.min(1, Math.max(0.15, op))
    document.documentElement.style.setProperty('--es-panel-opacity', String(op))

    const normAtDefaultBlur = (1 - 0.25) / 2.75
    const frostMult = Math.min(1.15, Math.max(0.82, 1 + 0.4 * (norm - normAtDefaultBlur)))
    const fillAlpha = Math.min(1, Math.max(0.15, op * frostMult))
    document.documentElement.style.setProperty('--es-glass-fill-alpha', String(fillAlpha))
  }, [hudData.theme?.backdropBlur, hudData.theme?.panelOpacity])

  const handleMessage = useCallback((event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return

    switch (data.action) {
      case 'vehicleCloneQte:start': {
        const next = data.data && typeof data.data === 'object' ? data.data : null
        if (!next || typeof next.nonce !== 'string' || !next.nonce || next.nonce.length > 96) break
        cloneQteRef.current = next
        setCloneQte(next)
        setCloneQtePressNonce(0)
        break
      }
      case 'vehicleCloneQte:press': {
        const nonce = data.data?.nonce
        if (cloneQteRef.current && nonce === cloneQteRef.current.nonce) {
          setCloneQtePressNonce((current) => current + 1)
        }
        break
      }
      case 'vehicleCloneQte:cancel': {
        const nonce = data.data?.nonce
        if (cloneQteRef.current && (!nonce || nonce === cloneQteRef.current.nonce)) {
          cloneQteRef.current = null
          setCloneQte(null)
        }
        break
      }
      case 'nos:update':
        setHudData((prev) => ({
          ...prev,
          nosVisible: data.data?.visible ?? prev.nosVisible,
          nosAmount: data.data?.amount ?? prev.nosAmount,
          nosActive: data.data?.active ?? prev.nosActive,
        }))
        break
      case 'updateStatus':
        setHudData((prev) => ({
          ...prev,
          hunger: data.hunger ?? prev.hunger,
          thirst: data.thirst ?? prev.thirst,
          stress: data.stress ?? prev.stress,
          oxygen: data.oxygen ?? prev.oxygen,
          underwater: data.underwater ?? prev.underwater,
          inWater: data.inWater ?? prev.inWater,
        }))
        break
      case 'updateVoip':
        setHudData((prev) => ({
          ...prev,
          voipTalking: data.talking ?? prev.voipTalking,
          voipRange: data.range ?? prev.voipRange,
          voipConnected: data.connected ?? prev.voipConnected,
          voipProximity: typeof data.proximity === 'number' && Number.isFinite(data.proximity) ? data.proximity : prev.voipProximity,
          radioChannel: data.radioChannel ?? prev.radioChannel,
          radioTalking: data.radioTalking ?? prev.radioTalking,
        }))
        break
      case 'updateStatusConfig':
        setHudData((prev) => ({
          ...prev,
          hungerThreshold: data.hungerThreshold ?? prev.hungerThreshold,
          thirstThreshold: data.thirstThreshold ?? prev.thirstThreshold,
          stressThreshold: data.stressThreshold ?? prev.stressThreshold,
          oxygenThreshold: data.oxygenThreshold ?? prev.oxygenThreshold,
          statusIconShape: data.statusIconShape ?? prev.statusIconShape,
          resolvedStatusIconShape:
            data.resolvedStatusIconShape ?? data.statusIconShape ?? prev.resolvedStatusIconShape,
          statusRingWidth: data.statusRingWidth ?? prev.statusRingWidth,
          statusRingHeight: data.statusRingHeight ?? prev.statusRingHeight,
          showVoip: data.showVoip ?? prev.showVoip,
          framework: data.framework ?? prev.framework,
          standaloneVoipHudEnabled:
            data.standaloneVoipHudEnabled ?? prev.standaloneVoipHudEnabled,
          layoutPreset: data.layoutPreset ?? prev.layoutPreset,
          colorPreset: data.colorPreset ?? prev.colorPreset,
          layout: data.layout ?? prev.layout,
          theme: data.theme ?? prev.theme,
          colors: data.colors ?? prev.colors,
          ammoPos:
            ammoEditMode
              ? prev.ammoPos
              : (Object.prototype.hasOwnProperty.call(data, 'ammoPos') ? data.ammoPos : prev.ammoPos),
          ammoColor: data.ammoColor ?? prev.ammoColor,
          speedometerPos:
            editModeRef.current
              ? prev.speedometerPos
              : (Object.prototype.hasOwnProperty.call(data, 'speedometerPos') ? data.speedometerPos : prev.speedometerPos),
          fuelDisplayStyle: data.fuelDisplayStyle ?? prev.fuelDisplayStyle,
          resolvedFuelDisplayStyle:
            data.resolvedFuelDisplayStyle ?? data.fuelDisplayStyle ?? prev.resolvedFuelDisplayStyle,
          ammoPositionPreset: data.ammoPositionPreset ?? prev.ammoPositionPreset,
          resolvedAmmoPositionPreset:
            data.resolvedAmmoPositionPreset ?? data.ammoPositionPreset ?? prev.resolvedAmmoPositionPreset,
          showCrosshair: data.showCrosshair ?? prev.showCrosshair,
          disableSpeedometer: Object.prototype.hasOwnProperty.call(data, 'disableSpeedometer')
            ? data.disableSpeedometer === true
            : prev.disableSpeedometer,
          gta6HudEnabled: Object.prototype.hasOwnProperty.call(data, 'gta6HudEnabled')
            ? data.gta6HudEnabled === true
            : prev.gta6HudEnabled,
          gta6AuthenticWeaponHud: Object.prototype.hasOwnProperty.call(data, 'gta6AuthenticWeaponHud')
            ? data.gta6AuthenticWeaponHud === true
            : prev.gta6AuthenticWeaponHud,
          gta6ShowWeaponName: Object.prototype.hasOwnProperty.call(data, 'gta6ShowWeaponName')
            ? data.gta6ShowWeaponName !== false
            : prev.gta6ShowWeaponName,
          gta6VehicleIdentification: Object.prototype.hasOwnProperty.call(data, 'gta6VehicleIdentification')
            ? data.gta6VehicleIdentification !== false
            : prev.gta6VehicleIdentification,
          sectionedBars: data.sectionedBars ?? prev.sectionedBars,
          sectionedIndicator: data.sectionedIndicator ?? prev.sectionedIndicator,
          oxygenDisplayLocation: data.oxygenDisplayLocation ?? prev.oxygenDisplayLocation,
          showDynamicWeather: Object.prototype.hasOwnProperty.call(data, 'showDynamicWeather')
            ? Boolean(data.showDynamicWeather)
            : prev.showDynamicWeather,
          showHurricaneWarning: Object.prototype.hasOwnProperty.call(data, 'showHurricaneWarning')
            ? Boolean(data.showHurricaneWarning)
            : prev.showHurricaneWarning,
          ...(Object.prototype.hasOwnProperty.call(data, 'showHurricaneWarning') && !data.showHurricaneWarning
            ? { hurricaneWarningActive: false, hurricaneWarningDetail: '' }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(data, 'showDynamicWeather') && !data.showDynamicWeather
            ? {
                dynamicWeatherShow: false,
                dynamicWeatherDisplay: '',
                dynamicWeatherSeason: '',
                dynamicWeatherForecastLine: '',
                dynamicWeatherWetLabel: '',
                dynamicWeatherNext: '',
                dynamicWeatherTempF: null,
                dynamicWeatherWindMph: null,
              }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(data, 'showDynamicWeather') &&
          data.showDynamicWeather &&
          String(prev.dynamicWeatherDisplay || '').trim() !== ''
            ? { dynamicWeatherShow: true }
            : {}),
        }))
        break
      case 'updateHud':
        setHudData((prev) => ({
          ...prev,
          health: data.health ?? prev.health,
          healthRecentlyDamaged: data.healthRecentlyDamaged ?? prev.healthRecentlyDamaged,
          armor: data.armor ?? prev.armor,
          stamina: data.stamina ?? prev.stamina,
          staminaRegenerating: data.staminaRegenerating ?? prev.staminaRegenerating,
        }))
        break
      case 'updateLocation':
        setHudData((prev) => ({
          ...prev,
          heading: data.heading,
          street: data.street,
          zone: data.zone,
          zoneCode: typeof data.zoneCode === 'string' ? data.zoneCode : prev.zoneCode,
          postal: data.postal,
          postalDist: data.postalDist,
        }))
        break
      case 'updateDynamicWeather': {
        if (data.show !== true) {
          setHudData((prev) => ({
            ...prev,
            dynamicWeatherShow: false,
            dynamicWeatherDisplay: '',
            dynamicWeatherSeason: '',
            dynamicWeatherForecastLine: '',
            dynamicWeatherWetLabel: '',
            dynamicWeatherNext: '',
            dynamicWeatherTempF: null,
            dynamicWeatherWindMph: null,
          }))
          break
        }
        setHudData((prev) => ({
          ...prev,

          dynamicWeatherShow: true,
          dynamicWeatherDisplay: data.clientDisplay ?? prev.dynamicWeatherDisplay,
          dynamicWeatherSeason: data.season != null && data.season !== '' ? String(data.season) : prev.dynamicWeatherSeason,
          dynamicWeatherForecastLine:
            data.forecastLine != null ? String(data.forecastLine) : prev.dynamicWeatherForecastLine,
          dynamicWeatherWetLabel: data.wetEtaLabel ?? '',
          dynamicWeatherNext: data.serverNext ?? prev.dynamicWeatherNext,
          dynamicWeatherTempF: null,
          dynamicWeatherWindMph: null,
        }))
        break
      }
      case 'setDynamicWeatherAvailable':
        setHudData((prev) => ({
          ...prev,
          dynamicWeatherResourceAvailable: data.available === true,
        }))
        break
      case 'updateFloodWarning':
        setHudData((prev) => ({
          ...prev,
          floodWarningActive: data.active === true,
          floodWarningDetail: data.detail != null && String(data.detail).trim() !== '' ? String(data.detail).trim() : '',
        }))
        break
      case 'updateHurricaneWarning':
        setHudData((prev) => ({
          ...prev,
          hurricaneWarningActive: data.active === true,
          hurricaneWarningDetail:
            data.detail != null && String(data.detail).trim() !== '' ? String(data.detail).trim() : '',
        }))
        break
      case 'updateWaypoint':
        setHudData((prev) => ({
          ...prev,
          waypointDist: data.waypointDist,
          waypointUnit: data.waypointUnit,
        }))
        break
      case 'updateAmmo':
        setHudData((prev) => ({
          ...prev,
          ammoClip: data.ammoClip,
          ammoReserve: data.ammoReserve,
          isArmed: data.isArmed ?? prev.isArmed,
          weaponType: typeof data.weaponType === 'string' ? data.weaponType : prev.weaponType,
          weaponIcon:
            typeof data.weaponIcon === 'string' && /^weapon_[a-z0-9_]+$/i.test(data.weaponIcon)
              ? data.weaponIcon.toLowerCase()
              : null,
          weaponName: typeof data.weaponName === 'string'
            ? data.weaponName.trim().slice(0, 48)
            : prev.weaponName,
          weaponUsesCharge: typeof data.weaponUsesCharge === 'boolean'
            ? data.weaponUsesCharge
            : prev.weaponUsesCharge,
          weaponChargeReady: typeof data.weaponChargeReady === 'boolean'
            ? data.weaponChargeReady
            : prev.weaponChargeReady,
          weaponChargeProgress: Number.isFinite(Number(data.weaponChargeProgress))
            ? Math.min(100, Math.max(0, Math.round(Number(data.weaponChargeProgress))))
            : prev.weaponChargeProgress,
        }))
        break
      case 'interaction:layout': {
        const screenWidth = Math.min(7680, Math.max(640, Number(data.screenWidth) || 1920))
        const screenHeight = Math.min(4320, Math.max(360, Number(data.screenHeight) || 1080))
        setHudData((prev) => ({
          ...prev,
          interactionLayout: {
            insetRight: Math.min(screenWidth * 0.2, Math.max(0, Number(data.insetRight) || 0)),
            insetBottom: Math.min(screenHeight * 0.2, Math.max(0, Number(data.insetBottom) || 0)),
            screenWidth,
            screenHeight,
          },
        }))
        break
      }
      case 'setSniperScope': {
        const zoom = Number(data.zoom)
        const range = Number(data.range)
        const steadiness = Number(data.steadiness)
        setHudData((prev) => ({
          ...prev,
          sniperScopeVisible: data.visible === true,
          sniperScopeWeapon: typeof data.weapon === 'string' ? data.weapon : prev.sniperScopeWeapon,
          sniperScopeZoom: Number.isFinite(zoom)
            ? Math.min(20, Math.max(1, zoom))
            : prev.sniperScopeZoom,
          sniperScopeRange: Number.isFinite(range) && range > 0 && range <= 1200
            ? Math.round(range)
            : null,
          sniperScopeSteadiness: Number.isFinite(steadiness)
            ? Math.min(100, Math.max(0, Math.round(steadiness)))
            : prev.sniperScopeSteadiness,
        }))
        break
      }
      case 'toggleVisibility':
        setHudData((prev) => ({
          ...prev,
          visible: data.visible,
          forceAircraftHud: data.forceAircraftHud ?? prev.forceAircraftHud,
        }))
        break
      case 'setForceAircraftHud':
        setHudData((prev) => ({ ...prev, forceAircraftHud: data.forced ?? false }))
        break
      case 'showVehicleIdentification': {
        const identity = normalizeVehicleIdentity(data)
        if (identity) {
          setHudData((prev) => ({ ...prev, vehicleIdentity: identity }))
        }
        break
      }
      case 'updateVehicleIdentification':
        setHudData((prev) => {
          if (!prev.vehicleIdentity || Number(data.entryId) !== prev.vehicleIdentity.entryId) {
            return prev
          }

          const identity = normalizeVehicleIdentity({ ...prev.vehicleIdentity, ...data })
          return identity ? { ...prev, vehicleIdentity: identity } : prev
        })
        break
      case 'hideVehicleIdentification':
        setHudData((prev) => {
          if (!prev.vehicleIdentity) return prev
          const entryId = Number(data.entryId)
          if (Number.isSafeInteger(entryId) && entryId > 0 && entryId !== prev.vehicleIdentity.entryId) {
            return prev
          }
          return { ...prev, vehicleIdentity: null }
        })
        break
      case 'updateVehicle':
        setHudData((prev) => ({
          ...prev,
          vehicleVisible: data.visible,
          aircraftVisible: false,
          speedUnit: data.speedUnit ?? prev.speedUnit,
          speed: data.speed ?? prev.speed,
          rpm: data.rpm ?? prev.rpm,
          gears: data.gears ?? prev.gears,
          currentGear: data.currentGear ?? prev.currentGear,
          fuel: data.fuel ?? prev.fuel,
          hasFuelProvider: data.hasFuelProvider ?? prev.hasFuelProvider,
          engineHealth: data.engineHealth ?? prev.engineHealth,
          engineState: data.engineState ?? prev.engineState,
          headlights: data.headlights ?? prev.headlights,
          belt: data.belt ?? prev.belt,
          harness: data.harness ?? prev.harness,
          useSeatbelt: data.useSeatbelt ?? prev.useSeatbelt,
          cruiseActive: data.visible ? (data.cruiseActive ?? false) : false,
          cruiseSpeed: data.visible ? (data.cruiseSpeed ?? 0) : 0,
          vehicleIdentity: data.visible === false ? null : prev.vehicleIdentity,
        }))
        break
      case 'updateAircraft':
        setHudData((prev) => ({
          ...prev,
          aircraftVisible: data.visible,
          vehicleVisible: false,
          vehicleIdentity: data.visible ? null : prev.vehicleIdentity,
          altitude: data.altitude ?? prev.altitude,
          altitudeAgl: data.altitudeAgl ?? prev.altitudeAgl,
          airspeed: data.airspeed ?? prev.airspeed,
          aircraftHeading: data.heading ?? prev.aircraftHeading,
          aircraftFuel: data.fuel ?? prev.aircraftFuel,
          aircraftHasFuelProvider: data.hasFuelProvider ?? prev.aircraftHasFuelProvider,
          aircraftEngineHealth: data.engineHealth ?? prev.aircraftEngineHealth,
          engines: data.engines ?? prev.engines,
          aircraftLightsOn: data.lightsOn ?? prev.aircraftLightsOn,
          aircraftGearDown: data.gearDown ?? prev.aircraftGearDown,
          aircraftHasFixedGear: data.hasFixedGear ?? prev.aircraftHasFixedGear,
          aircraftTailRotorHealth: data.tailRotorHealth ?? prev.aircraftTailRotorHealth,
          aircraftMainRotorHealth: data.mainRotorHealth ?? prev.aircraftMainRotorHealth,
          aircraftGearHealth: data.gearHealth ?? prev.aircraftGearHealth,
          aircraftIsHelicopter: data.isHelicopter ?? prev.aircraftIsHelicopter,
          aircraftStalled: data.isStalled ?? prev.aircraftStalled,
          aircraftHydraulicsHudEnabled: data.hydraulicsHudEnabled ?? prev.aircraftHydraulicsHudEnabled,
          aircraftHydraulicsHealth: data.hydraulicsHealth ?? prev.aircraftHydraulicsHealth,
        }))
        break
      case 'init':
        setHudData((prev) => ({
          ...prev,
          visible: data.visible,
          radarVisible: data.radarVisible ?? prev.radarVisible,
        }))
        break
      case 'setRadarVisible':
        setHudData((prev) => ({ ...prev, radarVisible: data.visible === true }))
        break
      case 'setCinematicMode':
        setCinematicMode(Boolean(data.enabled))
        break
      case 'openSettings':
        setSettingsData(data.settings || {})
        setSettingsOpen(true)
        break
      case 'closeSettings':
      case 'settingsClose':
        setSettingsOpen(false)
        break
      case 'startSpeedometerMove': {
        setSettingsOpen(false)
        const startPos = hudDataRef.current.speedometerPos || null
        dragPosRef.current = startPos
        setDragPos(startPos)
        setEditMode(true)
        break
      }
      case 'startAmmoMove': {
        setSettingsOpen(false)
        const startPos = hudDataRef.current.ammoPos || null
        ammoDragPosRef.current = startPos
        setAmmoDragPos(startPos)
        setAmmoEditMode(true)
        break
      }
      default:
        break
    }
  }, [ammoEditMode])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  useEffect(() => {
    if (isHudDevBrowser) {
      return
    }

    postNui('nui:ready').catch(() => {})
  }, [])

  const handleSettingsSave = useCallback((values) => {
    if (isHudDevBrowser) {
      setSettingsData(values)
      setHudData((prev) => applyDevSettingsSave(values, prev))
      setSettingsOpen(false)
      return
    }
    postNui('settings:save', values).catch(() => {})
    setSettingsOpen(false)
  }, [])

  const handleSettingsClose = useCallback(() => {
    if (!isHudDevBrowser) {
      postNui('settings:close').catch(() => {})
    }
    setSettingsOpen(false)
  }, [])

  const handleStartMoveSpeedometer = useCallback(() => {
    if (hudData.disableSpeedometer || hudData.gta6HudEnabled) {
      return
    }

    if (!isHudDevBrowser) {
      postNui('speedometer:startEdit').catch(() => {})
    }
    setSettingsOpen(false)
    setEditMode(true)
    const startPos = hudData.speedometerPos || null
    dragPosRef.current = startPos
    setDragPos(startPos)
  }, [hudData.disableSpeedometer, hudData.gta6HudEnabled, hudData.speedometerPos])

  const handleDrag = useCallback((nextPos) => {
    dragPosRef.current = nextPos
    setDragPos(nextPos)
  }, [])

  const handleResetSpeedometer = useCallback(() => {
    const newSettings = {
      ...settingsData,
      speedometerPos: null,
      speedometerPosX: 0,
      speedometerPosY: 0,
      speedometerPositionMode: 'preset',
    }
    setSettingsData(newSettings)
    handleSettingsSave(newSettings)
    setHudData((prev) => ({ ...prev, speedometerPos: null }))
  }, [handleSettingsSave, settingsData])

  const handleStartMoveAmmo = useCallback(() => {
    if (!isHudDevBrowser) {
      postNui('ammo:startEdit').catch(() => {})
    }
    setSettingsOpen(false)
    setAmmoEditMode(true)
    const startPos = hudData.ammoPos || null
    ammoDragPosRef.current = startPos
    setAmmoDragPos(startPos)
  }, [hudData.ammoPos])

  const handleAmmoDrag = useCallback((pos) => {
    ammoDragPosRef.current = pos
    setAmmoDragPos(pos)
  }, [])

  const handleAmmoSaveEdit = useCallback(() => {
    const posToSave = ammoDragPosRef.current || null
    const hasPosition = posToSave !== null
    if (!isHudDevBrowser) {
      postNui('ammo:endEdit', {
        saved: hasPosition,
        hasPosition,
        left: posToSave?.left ?? 0,
        top: posToSave?.top ?? 0,
      }).catch(() => {})
    }
    if (hasPosition) {
      setHudData((prev) => ({
        ...prev,
        ammoPos: posToSave,
        ammoPositionPreset: 'custom',
        resolvedAmmoPositionPreset: 'custom',
      }))
    }
    setAmmoDragPos(null)
    setAmmoEditMode(false)
  }, [])

  const handleAmmoCancelEdit = useCallback(() => {
    if (!isHudDevBrowser) {
      postNui('ammo:endEdit', { saved: false }).catch(() => {})
    }
    setAmmoDragPos(null)
    setAmmoEditMode(false)
  }, [])

  const handleResetAmmo = useCallback(() => {
    const newSettings = {
      ...settingsData,
      ammoPos: null,
      ammoPosX: 0,
      ammoPosY: 0,
      ammoPositionPreset: 'preset',
    }
    setSettingsData(newSettings)
    handleSettingsSave(newSettings)
    setHudData((prev) => ({
      ...prev,
      ammoPos: null,
      ammoPositionPreset: 'preset',
      resolvedAmmoPositionPreset: prev.layout?.ammo?.anchor || 'bottom-right',
    }))
  }, [handleSettingsSave, settingsData])

  const handleSaveEdit = useCallback(() => {
    const posToSave = dragPosRef.current || null
    if (!isHudDevBrowser) {
      postNui('speedometer:endEdit', {
        saved: true,
        left: posToSave?.left ?? 0,
        top: posToSave?.top ?? 0,
      }).catch(() => {})
    }
    setHudData((prev) => ({ ...prev, speedometerPos: posToSave }))
    setEditMode(false)
  }, [])

  const handleCancelEdit = useCallback(() => {
    if (!isHudDevBrowser) {
      postNui('speedometer:endEdit', { saved: false }).catch(() => {})
    }
    setEditMode(false)
    dragPosRef.current = null
    setDragPos(null)
  }, [])

  const handleResetEdit = useCallback(() => {
    dragPosRef.current = null
    setDragPos(null)
  }, [])

  const handleOpenDevSettingsModal = useCallback((seed) => {
    setSettingsData(seed && typeof seed === 'object' ? seed : {})
    setSettingsOpen(true)
  }, [])

  const handleDevCinematic = useCallback((enabled) => {
    setCinematicMode(Boolean(enabled))
  }, [])

  const handleCloneQteComplete = useCallback((result) => {
    const active = cloneQteRef.current
    if (!active || result?.nonce !== active.nonce) return

    cloneQteRef.current = null
    setCloneQte(null)
    if (!isHudDevBrowser) {
      postNui('vehicleCloneQte:complete', {
        nonce: result.nonce,
        success: result.success === true,
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!editMode) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCancelEdit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editMode, handleCancelEdit])

  useEffect(() => {
    if (!ammoEditMode) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleAmmoCancelEdit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ammoEditMode, handleAmmoCancelEdit])

  const appUiEmpty =
    !hudData.visible &&
    !hudData.forceAircraftHud &&
    !settingsOpen &&
    !cinematicMode &&
    !editMode &&
    !ammoEditMode &&
    !cloneQte

  if (appUiEmpty && !isHudDevBrowser) {
    return null
  }

  const showSniperScope = hudData.sniperScopeVisible
    && hudData.visible
    && !cinematicMode
    && !settingsOpen
    && !editMode
    && !ammoEditMode
  const showMainHud = hudData.visible || editMode || ammoEditMode
  const showAircraftHud = hudData.aircraftVisible
    && (hudData.visible || hudData.forceAircraftHud)
    && !editMode
  const playerInVehicle = Boolean(hudData.vehicleVisible || hudData.aircraftVisible)

  return (
    <div
      className="app"
      style={
        isHudDevBrowser && devPlayfieldColor
          ? { background: devPlayfieldColor }
          : undefined
      }
    >
      <SniperScope
        visible={showSniperScope}
        zoom={hudData.sniperScopeZoom}
        range={hudData.sniperScopeRange}
        steadiness={hudData.sniperScopeSteadiness}
      />
      <VehicleCloneQte
        key={cloneQte?.nonce || 'vehicle-clone-idle'}
        challenge={cloneQte}
        pressNonce={cloneQtePressNonce}
        layout={hudData.interactionLayout}
        onComplete={handleCloneQteComplete}
      />
      {!playerInVehicle && hudData.isArmed && hudData.weaponType !== 'melee' && !showSniperScope && (
        hudData.gta6HudEnabled && hudData.gta6AuthenticWeaponHud
          ? (
              <div className="gta6-crosshair" aria-hidden="true">
                <span className="gta6-crosshair-arm gta6-crosshair-arm--left" />
                <span className="gta6-crosshair-arm gta6-crosshair-arm--right" />
                <span className="gta6-crosshair-arm gta6-crosshair-arm--stem" />
              </div>
            )
          : hudData.showCrosshair && <div className="crosshair-dot" aria-hidden="true" />
      )}
      {editMode && (
        <div className="edit-mode-overlay">
          <div className="edit-mode-header">
            <span className="edit-mode-title">Reposition Mode</span>
            <span className="edit-mode-subtitle">Drag the speedometer. Snap zones stay active.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveEdit} className="edit-button save">Save</button>
            <button onClick={handleResetEdit} className="edit-button reset">Reset</button>
            <button onClick={handleCancelEdit} className="edit-button cancel">Cancel</button>
          </div>
        </div>
      )}
      {ammoEditMode && (
        <div className="edit-mode-overlay">
          <div className="edit-mode-header">
            <span className="edit-mode-title">Ammo Reposition</span>
            <span className="edit-mode-subtitle">Drag the ammo counter. Snap zones stay active.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={handleAmmoSaveEdit} className="edit-button save">Save</button>
            <button type="button" onClick={handleAmmoCancelEdit} className="edit-button cancel">Cancel</button>
          </div>
        </div>
      )}
      {cinematicMode && (
        <div className="cinematic-bars">
          <div className="cinematic-bar top" />
          <div className="cinematic-bar bottom" />
        </div>
      )}
      {showMainHud && (
        <div className={`main-hud-layer${showSniperScope ? ' main-hud-layer--scope-hidden' : ''}`}>
          {!hudData.gta6HudEnabled && <Indicator
            heading={hudData.heading}
            street={hudData.street}
            zone={hudData.zone}
            postal={hudData.postal}
            postalDist={hudData.postalDist}
            layout={hudData.layout?.indicator}
            theme={hudData.theme}
            sectionedIndicator={hudData.sectionedIndicator}
            oxygen={hudData.oxygen}
            underwater={hudData.underwater}
            oxygenDisplayLocation={hudData.oxygenDisplayLocation}
            oxygenColor={hudData.colors?.oxygen}
            dynamicWeatherShow={hudData.dynamicWeatherShow && Boolean(hudData.showDynamicWeather)}
            dynamicWeatherDisplay={hudData.dynamicWeatherDisplay}
            dynamicWeatherSeason={hudData.dynamicWeatherSeason}
            dynamicWeatherWetLabel={hudData.dynamicWeatherWetLabel}
            dynamicWeatherNext={hudData.dynamicWeatherNext}
            dynamicWeatherForecastLine={hudData.dynamicWeatherForecastLine}
            floodWarningActive={hudData.floodWarningActive}
            floodWarningDetail={hudData.floodWarningDetail}
            hurricaneWarningActive={hudData.hurricaneWarningActive && Boolean(hudData.showHurricaneWarning)}
            hurricaneWarningDetail={hudData.hurricaneWarningDetail}
          />}
          {hudData.gta6HudEnabled && (
            <VehicleIdentification
              identity={hudData.vehicleIdentity}
              enabled={hudData.gta6VehicleIdentification && !cinematicMode && !settingsOpen}
              vehicleVisible={Boolean(hudData.vehicleIdentity)}
              radarVisible={hudData.radarVisible}
              layout={hudData.interactionLayout}
              onActiveChange={setVehicleIdentityActive}
            />
          )}
          {hudData.gta6HudEnabled && (
            <Gta6Navigation
              street={hudData.street}
              zone={hudData.zone}
              zoneCode={hudData.zoneCode}
              radarVisible={hudData.radarVisible}
              layout={hudData.interactionLayout}
              suspended={vehicleIdentityActive}
            />
          )}
          <HUD
            health={hudData.health}
            healthRecentlyDamaged={hudData.healthRecentlyDamaged}
            armor={hudData.armor}
            stamina={hudData.stamina}
            staminaRegenerating={hudData.staminaRegenerating}
            vehicleVisible={shouldShowSpeedometer({
              vehicleVisible: hudData.vehicleVisible,
              editMode,
              disableSpeedometer: hudData.disableSpeedometer,
              gta6HudEnabled: hudData.gta6HudEnabled,
            })}
            playerInVehicle={playerInVehicle}
            speedUnit={hudData.speedUnit}
            speed={hudData.speed}
            rpm={hudData.rpm}
            gears={hudData.gears}
            currentGear={hudData.currentGear}
            fuel={hudData.fuel}
            hasFuelProvider={hudData.hasFuelProvider}
            engineHealth={hudData.engineHealth}
            engineState={hudData.engineState}
            cruiseActive={hudData.cruiseActive}
            cruiseSpeed={hudData.cruiseSpeed}
            headlights={hudData.headlights}
            belt={hudData.belt}
            harness={hudData.harness}
            useSeatbelt={hudData.useSeatbelt}
            nosVisible={hudData.nosVisible}
            nosAmount={hudData.nosAmount}
            nosActive={hudData.nosActive}
            hunger={hudData.hunger}
            thirst={hudData.thirst}
            stress={hudData.stress}
            oxygen={hudData.oxygen}
            underwater={hudData.underwater}
            inWater={hudData.inWater}
            voipTalking={hudData.voipTalking}
            voipRange={hudData.voipRange}
            voipConnected={hudData.voipConnected}
            voipProximity={hudData.voipProximity}
            radioChannel={hudData.radioChannel}
            radioTalking={hudData.radioTalking}
            hungerThreshold={hudData.hungerThreshold}
            thirstThreshold={hudData.thirstThreshold}
            stressThreshold={hudData.stressThreshold}
            oxygenThreshold={hudData.oxygenThreshold}
            statusIconShape={hudData.statusIconShape}
            resolvedStatusIconShape={hudData.resolvedStatusIconShape}
            statusRingWidth={hudData.statusRingWidth}
            statusRingHeight={hudData.statusRingHeight}
            showVoip={hudData.showVoip}
            framework={
              isHudDevBrowser && hudData.devFrameworkOverride
                ? hudData.devFrameworkOverride
                : hudData.framework
            }
            standaloneVoipHudEnabled={hudData.standaloneVoipHudEnabled}
            speedometerPos={editMode ? dragPos : hudData.speedometerPos}
            editMode={editMode}
            onDrag={handleDrag}
            colors={hudData.colors}
            fuelDisplayStyle={hudData.fuelDisplayStyle}
            resolvedFuelDisplayStyle={hudData.resolvedFuelDisplayStyle}
            waypointDist={hudData.waypointDist}
            waypointUnit={hudData.waypointUnit}
            ammoClip={hudData.ammoClip}
            ammoReserve={hudData.ammoReserve}
            ammoPos={ammoEditMode ? ammoDragPos : hudData.ammoPos}
            ammoColor={hudData.ammoColor}
            ammoPositionPreset={hudData.ammoPositionPreset}
            resolvedAmmoPositionPreset={hudData.resolvedAmmoPositionPreset}
            isArmed={hudData.isArmed}
            weaponType={hudData.weaponType}
            weaponIcon={hudData.weaponIcon}
            weaponName={hudData.weaponName}
            weaponUsesCharge={hudData.weaponUsesCharge}
            weaponChargeReady={hudData.weaponChargeReady}
            weaponChargeProgress={hudData.weaponChargeProgress}
            gta6HudEnabled={hudData.gta6HudEnabled}
            gta6AuthenticWeaponHud={hudData.gta6AuthenticWeaponHud}
            gta6ShowWeaponName={hudData.gta6ShowWeaponName}
            ammoEditMode={ammoEditMode}
            onAmmoDrag={handleAmmoDrag}
            layout={hudData.layout}
            theme={hudData.theme}
            sectionedBars={hudData.sectionedBars}
            oxygenDisplayLocation={hudData.oxygenDisplayLocation}
          />
        </div>
      )}
      {showAircraftHud && (
        <div className={`aircraft-hud-layer${showSniperScope ? ' aircraft-hud-layer--scope-hidden' : ''}`}>
          <AircraftHUD
            altitude={hudData.altitude}
            altitudeAgl={hudData.altitudeAgl}
            airspeed={hudData.airspeed}
            heading={hudData.aircraftHeading}
            fuel={hudData.aircraftFuel}
            hasFuelProvider={hudData.aircraftHasFuelProvider}
            engineHealth={hudData.aircraftEngineHealth}
            engines={hudData.engines}
            gearDown={hudData.aircraftGearDown}
            hasFixedGear={hudData.aircraftHasFixedGear}
            tailRotorHealth={hudData.aircraftTailRotorHealth}
            isHelicopter={hudData.aircraftIsHelicopter}
            isStalled={hudData.aircraftStalled}
            hydraulicsHudEnabled={hudData.aircraftHydraulicsHudEnabled}
            hydraulicsHealth={hudData.aircraftHydraulicsHealth}
          />
        </div>
      )}
      <SettingsModal
        key={JSON.stringify(settingsData)}
        visible={settingsOpen && !editMode && !ammoEditMode}
        showDynamicWeatherSetting={hudData.dynamicWeatherResourceAvailable || isHudDevBrowser}
        settings={settingsData}
        onSave={handleSettingsSave}
        onClose={handleSettingsClose}
        onStartMoveSpeedometer={handleStartMoveSpeedometer}
        onResetSpeedometer={handleResetSpeedometer}
        onStartMoveAmmo={handleStartMoveAmmo}
        onResetAmmo={handleResetAmmo}
      />
      {isHudDevBrowser && (
        <HudDevPanel
          hudData={hudData}
          setHudData={setHudData}
          cinematicMode={cinematicMode}
          onToggleCinematic={handleDevCinematic}
          onOpenSettingsModal={handleOpenDevSettingsModal}
          playfieldColor={devPlayfieldColor}
          onPlayfieldColorChange={setDevPlayfieldColor}
        />
      )}
    </div>
  )
}

export default App
