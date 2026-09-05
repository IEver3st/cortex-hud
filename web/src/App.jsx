import React, { useState, useEffect, useCallback, useRef } from 'react'
import HUD from './components/HUD'
import AircraftHUD from './components/AircraftHUD'
import Indicator from './components/Indicator'
import SettingsModal from './components/SettingsModal'
import HudDevPanel from './components/HudDevPanel'
import { isHudDevBrowser, loadDevPlayfieldColor, saveDevPlayfieldColor } from './hudDevEnv'
import { applyDevSettingsSave } from './hudDevApply'

function App() {
  const [devPlayfieldColor, setDevPlayfieldColor] = useState(() =>
    isHudDevBrowser ? loadDevPlayfieldColor() : null,
  )

  useEffect(() => {
    if (isHudDevBrowser && devPlayfieldColor) {
      saveDevPlayfieldColor(devPlayfieldColor)
    }
  }, [devPlayfieldColor])

  const getParentResourceName = useCallback(
    () => (typeof window.GetParentResourceName === 'function' ? window.GetParentResourceName() : 'es_hud'),
    [],
  )

  const [hudData, setHudData] = useState({
    health: 100,
    armor: 50,
    visible: true,
    heading: 0,
    street: 'Unknown',
    zone: 'Unknown',
    postal: '',
    postalDist: 0,
    vehicleVisible: false,
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
    sectionedBars: false,
    sectionedIndicator: false,
    oxygenDisplayLocation: 'statusCluster',
    isArmed: false,
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
  const [editMode, setEditMode] = useState(false)
  const [dragPos, setDragPos] = useState(null)
  const dragPosRef = useRef(null)
  const editModeRef = useRef(false)
  const hudDataRef = useRef(hudData)
  const [ammoEditMode, setAmmoEditMode] = useState(false)
  const [ammoDragPos, setAmmoDragPos] = useState(null)
  const ammoDragPosRef = useRef(null)

  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  useEffect(() => {
    hudDataRef.current = hudData
  }, [hudData])

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

    switch (data.action) {
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
        setHudData((prev) => ({ ...prev, health: data.health, armor: data.armor }))
        break
      case 'updateLocation':
        setHudData((prev) => ({
          ...prev,
          heading: data.heading,
          street: data.street,
          zone: data.zone,
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
        }))
        break
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
        }))
        break
      case 'updateAircraft':
        setHudData((prev) => ({
          ...prev,
          aircraftVisible: data.visible,
          vehicleVisible: false,
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

  const handleSettingsSave = useCallback((values) => {
    if (isHudDevBrowser) {
      setSettingsData(values)
      setHudData((prev) => applyDevSettingsSave(values, prev))
      setSettingsOpen(false)
      return
    }
    fetch(`https://${getParentResourceName()}/settings:save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSettingsOpen(false)
  }, [getParentResourceName])

  const handleSettingsClose = useCallback(() => {
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/settings:close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    }
    setSettingsOpen(false)
  }, [getParentResourceName])

  const handleStartMoveSpeedometer = useCallback(() => {
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/speedometer:startEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    }
    setSettingsOpen(false)
    setEditMode(true)
    const startPos = hudData.speedometerPos || null
    dragPosRef.current = startPos
    setDragPos(startPos)
  }, [getParentResourceName, hudData.speedometerPos])

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
      fetch(`https://${getParentResourceName()}/speedometer:startEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    }
    setSettingsOpen(false)
    setAmmoEditMode(true)
    const startPos = hudData.ammoPos || null
    ammoDragPosRef.current = startPos
    setAmmoDragPos(startPos)
  }, [getParentResourceName, hudData.ammoPos])

  const handleAmmoDrag = useCallback((pos) => {
    ammoDragPosRef.current = pos
    setAmmoDragPos(pos)
  }, [])

  const handleAmmoSaveEdit = useCallback(() => {
    const posToSave = ammoDragPosRef.current || null
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/ammo:endEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saved: true,
          left: posToSave?.left ?? 0,
          top: posToSave?.top ?? 0,
        }),
      })
    }
    setHudData((prev) => ({ ...prev, ammoPos: posToSave, ammoPositionPreset: 'custom' }))
    setAmmoEditMode(false)
  }, [getParentResourceName])

  const handleAmmoCancelEdit = useCallback(() => {
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/ammo:endEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved: false }),
      })
    }
    setAmmoEditMode(false)
  }, [getParentResourceName])

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
    setHudData((prev) => ({ ...prev, ammoPos: null, ammoPositionPreset: 'preset' }))
  }, [handleSettingsSave, settingsData])

  const handleSaveEdit = useCallback(() => {
    const posToSave = dragPosRef.current || null
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/speedometer:endEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saved: true,
          left: posToSave?.left ?? 0,
          top: posToSave?.top ?? 0,
        }),
      })
    }
    setHudData((prev) => ({ ...prev, speedometerPos: posToSave }))
    setEditMode(false)
  }, [getParentResourceName])

  const handleCancelEdit = useCallback(() => {
    if (!isHudDevBrowser) {
      fetch(`https://${getParentResourceName()}/speedometer:endEdit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved: false }),
      })
    }
    setEditMode(false)
    dragPosRef.current = null
    setDragPos(null)
  }, [getParentResourceName])

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
    !ammoEditMode

  if (appUiEmpty && !isHudDevBrowser) {
    return null
  }

  const showMainHud = hudData.visible || editMode || ammoEditMode
  const showAircraftHud = hudData.aircraftVisible && (hudData.visible || hudData.forceAircraftHud) && !editMode

  return (
    <div
      className="app"
      style={
        isHudDevBrowser && devPlayfieldColor
          ? { background: devPlayfieldColor }
          : undefined
      }
    >
      {hudData.showCrosshair && hudData.isArmed && <div className="crosshair-dot" />}
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
        <>
          <Indicator
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
          />
          <HUD
            health={hudData.health}
            armor={hudData.armor}
            vehicleVisible={hudData.vehicleVisible || editMode}
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
            ammoEditMode={ammoEditMode}
            onAmmoDrag={handleAmmoDrag}
            layout={hudData.layout}
            theme={hudData.theme}
            sectionedBars={hudData.sectionedBars}
            oxygenDisplayLocation={hudData.oxygenDisplayLocation}
          />
        </>
      )}
      {showAircraftHud && (
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
