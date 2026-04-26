import React, { useMemo } from 'react'
import './AircraftHUD.css'

function tierFromHealth1000(h) {
    const v = Math.max(0, Math.min(1000, Number(h) || 0))
    if (v >= 800) return 'ok'
    if (v >= 400) return 'warning'
    return 'critical'
}

function pctFromHealth1000(h) {
    const v = Math.max(0, Math.min(1000, Number(h) || 0))
    return Math.max(0, Math.min(100, (v / 1000) * 100))
}

function PartHealthBar({ health1000 }) {
    const tier = tierFromHealth1000(health1000)
    const pct = pctFromHealth1000(health1000)
    return (
        <div className="aircraft-part-bar">
            <div
                className={`aircraft-part-bar-fill aircraft-part-bar-fill--${tier}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

const AircraftHUD = React.memo(
    ({
        altitude,
        altitudeAgl,
        airspeed,
        heading,
        fuel,
        hasFuelProvider,
        engineHealth,
        engines,
        gearDown,
        hasFixedGear,
        tailRotorHealth,
        isHelicopter,
        isStalled,
        hydraulicsHudEnabled,
        hydraulicsHealth,
    }) => {
        const fuelPercent = useMemo(() => Math.max(0, Math.min(1, fuel / 100)), [fuel])

        const compassDir = useMemo(() => {
            const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
            const index = Math.round(heading / 45) % 8
            return dirs[index]
        }, [heading])

        const headingDisplay = useMemo(() => {
            return String(Math.round(heading)).padStart(3, '0')
        }, [heading])

        const enginePercents = useMemo(() => {
            if (engines && engines.length > 0) return engines
            return [engineHealth ?? 100]
        }, [engines, engineHealth])

        const fuelStatus = useMemo(() => {
            if (fuelPercent >= 0.25) return 'ok'
            if (fuelPercent >= 0.10) return 'warning'
            return 'critical'
        }, [fuelPercent])

        const tailHealth1000 = useMemo(() => tailRotorHealth ?? 1000, [tailRotorHealth])

        const tailStatus = useMemo(() => {
            if (!isHelicopter) return 'off'
            return tierFromHealth1000(tailHealth1000)
        }, [isHelicopter, tailHealth1000])

        const gearMode = useMemo(() => {
            if (hasFixedGear) return 'fixed'
            return gearDown ? 'down' : 'up'
        }, [hasFixedGear, gearDown])

        const hydHealth1000 = useMemo(() => hydraulicsHealth ?? 1000, [hydraulicsHealth])
        const hydStatus = useMemo(() => tierFromHealth1000(hydHealth1000), [hydHealth1000])

        return (
            <div className="aircraft-hud-wrapper">
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
                    {enginePercents.map((pct, i) => {
                        const health1000 = Math.max(0, Math.min(1000, (Number(pct) || 0) * 10))
                        const st = tierFromHealth1000(health1000)
                        return (
                            <div key={`e-${i}`} className={`aircraft-indicator ${st}`}>
                                <PartHealthBar health1000={health1000} />
                                <span className="aircraft-indicator-label">{`E${i + 1}`}</span>
                            </div>
                        )
                    })}
                    {!isHelicopter && hydraulicsHudEnabled && (
                        <div className={`aircraft-indicator ${hydStatus}`}>
                            <PartHealthBar health1000={hydHealth1000} />
                            <span className="aircraft-indicator-label">HYD</span>
                        </div>
                    )}
                    {isHelicopter && (
                        <div className={`aircraft-indicator ${tailStatus}`}>
                            <PartHealthBar health1000={tailHealth1000} />
                            <span className="aircraft-indicator-label">TAIL</span>
                        </div>
                    )}
                    {hasFuelProvider && (
                        <div className={`aircraft-indicator ${fuelStatus}`}>
                            <div className="aircraft-indicator-light" />
                            <span className="aircraft-indicator-label">FUEL</span>
                        </div>
                    )}
                    <div className={`aircraft-indicator aircraft-gear aircraft-gear--${gearMode}`}>
                        <div className="aircraft-gear-lamp" />
                        <span className="aircraft-indicator-label">GEAR</span>
                    </div>
                    {isStalled && (
                        <div className="aircraft-indicator critical blink">
                            <div className="aircraft-indicator-light" />
                            <span className="aircraft-indicator-label">STALL</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }
)

AircraftHUD.displayName = 'AircraftHUD'

export default AircraftHUD
