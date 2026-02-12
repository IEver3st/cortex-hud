import React, { useState, useEffect, useCallback, useRef } from 'react'
import HUD from './components/HUD'
import AircraftHUD from './components/AircraftHUD'
import Indicator from './components/Indicator'
import SettingsModal from './components/SettingsModal'
import AmmoIcon from './assets/machine-gun-magazine.svg'


function App() {
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
    aircraftIsHelicopter: false,
    aircraftStalled: false,
    forceAircraftHud: false,
    useSeatbelt: true,
    nosVisible: false,
    nosAmount: 0,
    nosActive: false,
    hunger: 100,
    thirst: 100,
    stress: 0,
    oxygen: 100,
    voipTalking: false,
    voipRange: 'normal',
    voipConnected: false,
    radioChannel: 0,
    radioTalking: false,
    hungerThreshold: 100,
    thirstThreshold: 100,
    stressThreshold: 100,
    oxygenThreshold: 100,
    showVoip: true,
    colors: {
      health: '#10b981',
      armor: '#5eb2ff',
      hunger: '#f59e0b',
      thirst: '#ffffff',
      stress: '#ef4444',
      oxygen: '#06b6d4',
    },
    fuelDisplayStyle: 'bar',
    ammoPositionPreset: 'bottom-right',
    waypointDist: -1,
    waypointUnit: '',
    ammoClip: -1,
    ammoReserve: -1,
    ammoPos: null,
    ammoColor: '#10b981',
    showCrosshair: false,
    isArmed: false,
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

  const handleMessage = useCallback((event) => {
    const data = event.data

    switch (data.action) {
      case 'nos:update':
        setHudData(prev => ({
          ...prev,
          nosVisible: data.data?.visible ?? prev.nosVisible,
          nosAmount: data.data?.amount ?? prev.nosAmount,
          nosActive: data.data?.active ?? prev.nosActive
        }))
        break
      case 'updateStatus':
        setHudData(prev => ({
          ...prev,
          hunger: data.hunger ?? prev.hunger,
          thirst: data.thirst ?? prev.thirst,
          stress: data.stress ?? prev.stress,
          oxygen: data.oxygen ?? prev.oxygen
        }))
        break
      case 'updateVoip':
        setHudData(prev => ({
          ...prev,
          voipTalking: data.talking ?? prev.voipTalking,
          voipRange: data.range ?? prev.voipRange,
          voipConnected: data.connected ?? prev.voipConnected,
          radioChannel: data.radioChannel ?? prev.radioChannel,
          radioTalking: data.radioTalking ?? prev.radioTalking
        }))
        break
      case 'updateStatusConfig':
        setHudData(prev => ({
          ...prev,
          hungerThreshold: data.hungerThreshold ?? prev.hungerThreshold,
          thirstThreshold: data.thirstThreshold ?? prev.thirstThreshold,
          stressThreshold: data.stressThreshold ?? prev.stressThreshold,
          oxygenThreshold: data.oxygenThreshold ?? prev.oxygenThreshold,
          showVoip: data.showVoip ?? prev.showVoip,
          colors: data.colors ?? prev.colors,
          ammoPos: editModeRef.current
            ? prev.ammoPos
            : (Object.prototype.hasOwnProperty.call(data, 'ammoPos') ? data.ammoPos : prev.ammoPos),
          ammoColor: data.ammoColor ?? prev.ammoColor,
          speedometerPos: editModeRef.current
            ? prev.speedometerPos
            : (Object.prototype.hasOwnProperty.call(data, 'speedometerPos') ? data.speedometerPos : prev.speedometerPos),
          fuelDisplayStyle: data.fuelDisplayStyle ?? prev.fuelDisplayStyle,
          ammoPositionPreset: data.ammoPositionPreset ?? prev.ammoPositionPreset,
          showCrosshair: data.showCrosshair ?? prev.showCrosshair,
        }))
        break
      case 'updateHud':
        setHudData(prev => ({
          ...prev,
          health: data.health,
          armor: data.armor
        }))
        break
      case 'updateLocation':
        setHudData(prev => ({
          ...prev,
          heading: data.heading,
          street: data.street,
          zone: data.zone,
          postal: data.postal,
          postalDist: data.postalDist
        }))
        break
      case 'updateWaypoint':
        setHudData(prev => ({
          ...prev,
          waypointDist: data.waypointDist,
          waypointUnit: data.waypointUnit
        }))
        break
      case 'updateAmmo':
        setHudData(prev => ({
          ...prev,
          ammoClip: data.ammoClip,
          ammoReserve: data.ammoReserve,
          isArmed: data.isArmed ?? prev.isArmed,
        }))
        break
      case 'toggleVisibility':
        setHudData(prev => ({
          ...prev,
          visible: data.visible,
          forceAircraftHud: data.forceAircraftHud ?? prev.forceAircraftHud
        }))
        break
      case 'setForceAircraftHud':
        setHudData(prev => ({
          ...prev,
          forceAircraftHud: data.forced ?? false
        }))
        break
      case 'updateVehicle':
        setHudData(prev => ({
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
          useSeatbelt: data.useSeatbelt ?? prev.useSeatbelt
        }))
        break
      case 'updateAircraft':
        setHudData(prev => ({
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
          aircraftIsHelicopter: data.isHelicopter ?? prev.aircraftIsHelicopter,
          aircraftStalled: data.isStalled ?? prev.aircraftStalled
        }))
        break
      case 'init':
        setHudData(prev => ({
          ...prev,
          visible: data.visible
        }))
        break
      case 'setCinematicMode':
        setCinematicMode(!!data.enabled)
        break
      case 'openSettings':
        setSettingsData(data.settings || {})
        setSettingsOpen(true)
        break
      case 'closeSettings':
      case 'settingsClose':
        setSettingsOpen(false)
        break
      case 'startSpeedometerMove':
        setSettingsOpen(false)
        {
          const startPos = hudDataRef.current.speedometerPos || null
          dragPosRef.current = startPos
          setDragPos(startPos)
        }
        setEditMode(true)
        break
      default:
        break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  const handleSettingsSave = useCallback((values) => {
    fetch(`https://${GetParentResourceName()}/settings:save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
    setSettingsOpen(false)
  }, [])

  const handleSettingsClose = useCallback(() => {
    fetch(`https://${GetParentResourceName()}/settings:close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    setSettingsOpen(false)
  }, [])

  const handleStartMoveSpeedometer = useCallback(() => {
    // Notify Lua to ensure NUI focus is active for dragging
    fetch(`https://${GetParentResourceName()}/speedometer:startEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    setSettingsOpen(false)
    setEditMode(true)
    const startPos = hudData.speedometerPos || null
    dragPosRef.current = startPos
    setDragPos(startPos)
  }, [hudData.speedometerPos])

  const handleDrag = useCallback((nextPos) => {
    dragPosRef.current = nextPos
    setDragPos(nextPos)
  }, [])

  const handleResetSpeedometer = useCallback(() => {
    const newSettings = { ...settingsData, speedometerPos: null }
    handleSettingsSave(newSettings)
    setHudData(prev => ({ ...prev, speedometerPos: null }))
  }, [settingsData, handleSettingsSave])

  // Ammo position handlers
  const handleStartMoveAmmo = useCallback(() => {
    fetch(`https://${GetParentResourceName()}/speedometer:startEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    setSettingsOpen(false)
    setAmmoEditMode(true)
    const startPos = hudData.ammoPos || null
    ammoDragPosRef.current = startPos
    setAmmoDragPos(startPos)
  }, [hudData.ammoPos])

  const handleAmmoDrag = useCallback((e) => {
    if (!ammoEditMode) return
    const nextPos = { left: e.clientX - 30, top: e.clientY - 30 }
    ammoDragPosRef.current = nextPos
    setAmmoDragPos(nextPos)
  }, [ammoEditMode])

  const handleAmmoSaveEdit = useCallback(() => {
    const posToSave = ammoDragPosRef.current || null
    fetch(`https://${GetParentResourceName()}/ammo:endEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saved: true,
        left: posToSave?.left ?? 0,
        top: posToSave?.top ?? 0
      })
    })
    setHudData(prev => ({ ...prev, ammoPos: posToSave }))
    setAmmoEditMode(false)
  }, [])

  const handleAmmoCancelEdit = useCallback(() => {
    fetch(`https://${GetParentResourceName()}/ammo:endEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: false })
    })
    setAmmoEditMode(false)
  }, [])

  const handleResetAmmo = useCallback(() => {
    const newSettings = { ...settingsData, ammoPos: null }
    handleSettingsSave(newSettings)
    setHudData(prev => ({ ...prev, ammoPos: null }))
  }, [settingsData, handleSettingsSave])

  const handleSaveEdit = useCallback(() => {
    const posToSave = dragPosRef.current || null
    // Notify Lua to release NUI focus and persist the position
    fetch(`https://${GetParentResourceName()}/speedometer:endEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saved: true,
        left: posToSave?.left ?? 0,
        top: posToSave?.top ?? 0
      })
    })
    setHudData(prev => ({ ...prev, speedometerPos: posToSave }))
    setEditMode(false)
  }, [])

  const handleCancelEdit = useCallback(() => {
    // Notify Lua to release NUI focus without saving
    fetch(`https://${GetParentResourceName()}/speedometer:endEdit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: false })
    })
    setEditMode(false)
    dragPosRef.current = null
    setDragPos(null)
  }, [])

  const handleResetEdit = useCallback(() => {
    // Reset position to default during edit
    dragPosRef.current = null
    setDragPos(null)
  }, [])

  useEffect(() => {
    if (!editMode) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancelEdit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editMode, handleCancelEdit])

  useEffect(() => {
    if (!ammoEditMode) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleAmmoCancelEdit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ammoEditMode, handleAmmoCancelEdit])

  if (!hudData.visible && !hudData.forceAircraftHud && !settingsOpen && !cinematicMode && !editMode && !ammoEditMode) return null

  const showMainHud = hudData.visible || editMode
  const showAircraftHud = hudData.aircraftVisible && (hudData.visible || hudData.forceAircraftHud) && !editMode

  return (
    <div className="app">
      {hudData.showCrosshair && hudData.isArmed && (
        <div className="crosshair-dot" />
      )}
      {editMode && (
        <div className="edit-mode-overlay">
          <div className="edit-mode-header">
            <span className="edit-mode-title">Reposition Mode</span>
            <span className="edit-mode-subtitle">Drag the speedometer • Snaps to edges & center</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleSaveEdit}
                className="edit-button save"
              >
                Save
              </button>
              <button 
                onClick={handleResetEdit}
                className="edit-button reset"
              >
                Reset
              </button>
              <button 
                onClick={handleCancelEdit}
                className="edit-button cancel"
              >
                Cancel
              </button>
          </div>
        </div>
      )}
      {ammoEditMode && (
        <div className="edit-mode-overlay" onMouseMove={handleAmmoDrag} onClick={handleAmmoDrag}>
          <div className="edit-mode-header">
            <span className="edit-mode-title">Ammo Reposition</span>
            <span className="edit-mode-subtitle">Click anywhere to place the ammo display</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAmmoSaveEdit(); }}
                className="edit-button save"
              >
                Save
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAmmoCancelEdit(); }}
                className="edit-button cancel"
              >
                Cancel
              </button>
          </div>
          <div
            className="ammo-display"
            style={{
              position: 'fixed',
              left: `${(ammoDragPos?.left ?? window.innerWidth / 2 - 30)}px`,
              top: `${(ammoDragPos?.top ?? window.innerHeight / 2 - 30)}px`,
              right: 'auto',
              bottom: 'auto',
              pointerEvents: 'none',
            }}
          >
            <div className="ammo-icon-box">
              <img src={AmmoIcon} className="ammo-main-icon" alt="ammo" />
            </div>
            <div className="ammo-divider" />
            <div className="ammo-info-stack">
              <div className="ammo-clip" style={{ color: hudData.ammoColor || '#10b981' }}>12</div>
              <div className="ammo-reserve">85</div>
            </div>

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
            voipTalking={hudData.voipTalking}
            voipRange={hudData.voipRange}
            voipConnected={hudData.voipConnected}
            radioChannel={hudData.radioChannel}
            radioTalking={hudData.radioTalking}
            hungerThreshold={hudData.hungerThreshold}
            thirstThreshold={hudData.thirstThreshold}
            stressThreshold={hudData.stressThreshold}
            oxygenThreshold={hudData.oxygenThreshold}
            showVoip={hudData.showVoip}
            speedometerPos={editMode ? dragPos : hudData.speedometerPos}
            editMode={editMode}
            onDrag={handleDrag}
            colors={hudData.colors}
            fuelDisplayStyle={hudData.fuelDisplayStyle}
            waypointDist={hudData.waypointDist}
            waypointUnit={hudData.waypointUnit}
            ammoClip={hudData.ammoClip}
            ammoReserve={hudData.ammoReserve}
            ammoPos={ammoEditMode ? ammoDragPos : hudData.ammoPos}
            ammoColor={hudData.ammoColor}
            ammoPositionPreset={hudData.ammoPositionPreset}
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
          lightsOn={hudData.aircraftLightsOn}
          gearDown={hudData.aircraftGearDown}
          hasFixedGear={hudData.aircraftHasFixedGear}
          tailRotorHealth={hudData.aircraftTailRotorHealth}
          mainRotorHealth={hudData.aircraftMainRotorHealth}
          isHelicopter={hudData.aircraftIsHelicopter}
          isStalled={hudData.aircraftStalled}
        />
      )}
      <SettingsModal
        visible={settingsOpen && !editMode && !ammoEditMode}
        settings={settingsData}
        onSave={handleSettingsSave}
        onClose={handleSettingsClose}
        onStartMoveSpeedometer={handleStartMoveSpeedometer}
        onResetSpeedometer={handleResetSpeedometer}
        onStartMoveAmmo={handleStartMoveAmmo}
        onResetAmmo={handleResetAmmo}
      />
    </div>
  )
}

export default App
