import React, { useMemo } from 'react'
import './AircraftHUD.css'

const AircraftHUD = React.memo(({ altitude, altitudeAgl, airspeed, heading, fuel, engineHealth, engines, lightsOn, gearDown, hasFixedGear, tailRotorHealth, mainRotorHealth, isHelicopter, isStalled }) => {
    const fuelPercent = useMemo(() => Math.max(0, Math.min(1, fuel / 100)), [fuel])

    const compassDir = useMemo(() => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        const index = Math.round(heading / 45) % 8
        return dirs[index]
    }, [heading])

    const headingDisplay = useMemo(() => {
        return String(Math.round(heading)).padStart(3, '0')
    }, [heading])

    const engineStatus = useMemo(() => {
        const health = engines && engines.length > 0 ? engines[0] : engineHealth
        if (health >= 80) return 'ok'
        if (health >= 50) return 'warning'
        return 'critical'
    }, [engines, engineHealth])

    const fuelStatus = useMemo(() => {
        if (fuelPercent >= 0.25) return 'ok'
        if (fuelPercent >= 0.10) return 'warning'
        return 'critical'
    }, [fuelPercent])

    const tailStatus = useMemo(() => {
        if (!isHelicopter) return 'off'
        const health = tailRotorHealth ?? 1000
        if (health >= 800) return 'ok'
        if (health >= 400) return 'warning'
        return 'critical'
    }, [isHelicopter, tailRotorHealth])

    const gearStatus = useMemo(() => {
        if (hasFixedGear) return 'fixed'
        return gearDown ? 'ok' : 'warning'
    }, [hasFixedGear, gearDown])

    return (
        <div className="aircraft-hud">
            <div className="aircraft-readouts">
                <div className="aircraft-readout">
                    <span className="aircraft-readout-value">{airspeed}</span>
                    <span className="aircraft-readout-label">KTS</span>
                </div>
                <div className="aircraft-readout-divider" />
                <div className="aircraft-readout">
                    <span className="aircraft-readout-value">{altitude}</span>
                    <span className="aircraft-readout-label">MSL</span>
                </div>
                <div className="aircraft-readout-divider" />
                <div className="aircraft-readout">
                    <span className="aircraft-readout-value">{altitudeAgl}</span>
                    <span className="aircraft-readout-label">AGL</span>
                </div>
                <div className="aircraft-readout-divider" />
                <div className="aircraft-readout">
                    <span className="aircraft-readout-value">{headingDisplay}</span>
                    <span className="aircraft-readout-label">{compassDir}</span>
                </div>
            </div>

            <div className="aircraft-indicators">
                <div className={`aircraft-indicator ${engineStatus}`}>
                    <div className="aircraft-indicator-light" />
                    <span className="aircraft-indicator-label">MAIN</span>
                </div>
                {isHelicopter && (
                    <div className={`aircraft-indicator ${tailStatus}`}>
                        <div className="aircraft-indicator-light" />
                        <span className="aircraft-indicator-label">TAIL</span>
                    </div>
                )}
                <div className={`aircraft-indicator ${fuelStatus}`}>
                    <div className="aircraft-indicator-light" />
                    <span className="aircraft-indicator-label">FUEL</span>
                </div>
                {!hasFixedGear && (
                    <div className={`aircraft-indicator ${gearStatus}`}>
                        <div className="aircraft-indicator-light" />
                        <span className="aircraft-indicator-label">GEAR</span>
                    </div>
                )}
                {isStalled && (
                    <div className="aircraft-indicator critical blink">
                        <div className="aircraft-indicator-light" />
                        <span className="aircraft-indicator-label">STALL</span>
                    </div>
                )}
            </div>
        </div>
    )
})

AircraftHUD.displayName = 'AircraftHUD'

export default AircraftHUD
