import React, { useState, useEffect, useCallback } from 'react'
import HUD from './components/HUD'
import AircraftHUD from './components/AircraftHUD'
import Indicator from './components/Indicator'

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
    engineHealth: 100,
    engineState: false,
    headlights: 0,
    belt: false,
    aircraftVisible: false,
    altitude: 0,
    altitudeAgl: 0,
    airspeed: 0,
    aircraftHeading: 0,
    aircraftFuel: 100,
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
    nosVisible: false,
    nosAmount: 0,
    nosActive: false
  })

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
          engineHealth: data.engineHealth ?? prev.engineHealth,
          engineState: data.engineState ?? prev.engineState,
          headlights: data.headlights ?? prev.headlights,
          belt: data.belt ?? prev.belt
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
      default:
        break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (!hudData.visible && !hudData.forceAircraftHud) return null

  const showMainHud = hudData.visible
  const showAircraftHud = hudData.aircraftVisible && (hudData.visible || hudData.forceAircraftHud)

  return (
    <div className="app">
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
            vehicleVisible={hudData.vehicleVisible}
            speedUnit={hudData.speedUnit}
            speed={hudData.speed}
            rpm={hudData.rpm}
            gears={hudData.gears}
            currentGear={hudData.currentGear}
            fuel={hudData.fuel}
            engineHealth={hudData.engineHealth}
            engineState={hudData.engineState}
            headlights={hudData.headlights}
            belt={hudData.belt}
            nosVisible={hudData.nosVisible}
            nosAmount={hudData.nosAmount}
            nosActive={hudData.nosActive}
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
    </div>
  )
}

export default App
