import React, { useMemo, useEffect } from 'react'
import { IoShieldHalf } from 'react-icons/io5'
import { FaHeartPulse } from 'react-icons/fa6'
import { BsFuelPumpFill, BsLightningChargeFill } from 'react-icons/bs'
import { PiEngineFill, PiSeatbeltFill } from 'react-icons/pi'
import './HUD.css'

// es_lib UI scaling - matches es_lib/ui/app.js
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
}

function getUiScale() {
    const h = window.innerHeight || 1080
    const normalized = h / 1080
    return clamp(normalized, 1, 2)
}

function applyUiScale(value) {
    document.documentElement.style.setProperty('--es-ui-scale', value)
}

const HUD = React.memo(({ health, armor, vehicleVisible, speedUnit, speed, rpm, gears, currentGear, fuel, engineHealth, engineState, headlights, belt, nosVisible, nosAmount, nosActive }) => {
    // Apply es_lib UI scaling on mount and resize
    useEffect(() => {
        applyUiScale(getUiScale())
        const handleResize = () => applyUiScale(getUiScale())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const healthBarStyle = useMemo(() => ({
        width: `${health}%`
    }), [health])

    const armorBarStyle = useMemo(() => ({
        width: `${armor}%`
    }), [armor])

    // Determine health color based on percentage
    const healthColorClass = useMemo(() => {
        if (health <= 20) return 'critical'
        if (health <= 40) return 'low'
        return ''
    }, [health])

    // Arc geometry: 270° arc with a bottom gap
    // Full circumference = 2 * PI * 45 = 282.74
    // 270° portion = 282.74 * (270/360) ≈ 212
    const fullCircumference = 283
    const arcLength = 212
    
    // Use RPM for the arc (0-100 from Lua)
    // Arc fills clockwise from bottom-left (0) to bottom-right (7)
    // Use full circumference as gap to prevent dasharray pattern from repeating
    // Hide arc completely when RPM is 0 to prevent round linecap artifacts
    const rpmPercent = useMemo(() => clamp(rpm / 100, 0, 1), [rpm])
    const rpmArcStyle = useMemo(() => ({
        strokeDasharray: `${rpmPercent * arcLength} ${fullCircumference}`,
        strokeDashoffset: 0,
        opacity: rpmPercent < 0.01 ? 0 : 1
    }), [rpmPercent, arcLength, fullCircumference])

    // Dynamic color based on RPM - transitions as approaching rev limit
    // Green (0-60%) -> Yellow (60-80%) -> Orange (80-90%) -> Red (90-100%)
    const rpmColor = useMemo(() => {
        const p = rpmPercent
        if (p < 0.6) {
            // Health bar green
            return { color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }
        } else if (p < 0.8) {
            // Transition green to yellow
            const t = (p - 0.6) / 0.2
            return {
                color: `rgb(${Math.round(16 + (255 - 16) * t)}, ${Math.round(185 - (185 - 170) * t)}, ${Math.round(129 - 129 * t)})`,
                glow: `rgba(${Math.round(16 + (255 - 16) * t)}, ${Math.round(185 - (185 - 170) * t)}, ${Math.round(129 - 129 * t)}, 0.5)`
            }
        } else if (p < 0.9) {
            // Transition yellow to orange
            const t = (p - 0.8) / 0.1
            return {
                color: `rgb(255, ${Math.round(170 - 70 * t)}, 0)`,
                glow: `rgba(255, ${Math.round(170 - 70 * t)}, 0, 0.5)`
            }
        } else {
            // Red zone - approaching/at rev limit
            const t = (p - 0.9) / 0.1
            return {
                color: `rgb(255, ${Math.round(100 - 32 * t)}, ${Math.round(68 * t)})`,
                glow: `rgba(255, ${Math.round(100 - 32 * t)}, ${Math.round(68 * t)}, 0.6)`
            }
        }
    }, [rpmPercent])

    // Apply dynamic color to arc style
    const rpmArcDynamicStyle = useMemo(() => ({
        ...rpmArcStyle,
        stroke: rpmColor.color,
        filter: `drop-shadow(0 0 calc(6px * var(--es-ui-scale)) ${rpmColor.glow})`
    }), [rpmArcStyle, rpmColor])

    // NOS Arc Geometry (Inner ring, hugging RPM arc)
    // Full circumference = 2 * PI * 40.5 = 254.47
    // 270° portion = 254.47 * 0.75 ≈ 191
    const nosPercent = useMemo(() => clamp(nosAmount / 100, 0, 1), [nosAmount])
    const nosArcStyle = useMemo(() => ({
        strokeDasharray: `${nosPercent * 191} 255`,
        strokeDashoffset: 0,
        opacity: nosVisible ? 1 : 0,
        stroke: nosActive ? '#a855f7' : 'rgba(216, 180, 254, 0.4)',
        filter: nosActive ? 'drop-shadow(0 0 calc(8px * var(--es-ui-scale)) rgba(168, 85, 247, 0.8))' : 'none'
    }), [nosPercent, nosVisible, nosActive])

    const enginePercent = useMemo(() => {
        return Math.max(0, Math.min(1, engineHealth / 100))
    }, [engineHealth])

    const fuelPercent = useMemo(() => {
        return Math.max(0, Math.min(1, fuel / 100))
    }, [fuel])

    // Generate tick positions (0-7, 8 ticks total)
    // Arc starts at 135° (bottom-left) and goes 270° clockwise to 45° (bottom-right)
    // Arc has stroke-width 7 centered on r=45, so it spans from r=41.5 to r=48.5
    const ticks = useMemo(() => {
        const result = []
        for (let i = 0; i <= 7; i++) {
            // Start angle 135°, end angle 405° (45° + 360°), spread across 8 ticks
            const angleDeg = 135 + (i * 270) / 7
            const angleRad = (angleDeg * Math.PI) / 180
            const cx = 50, cy = 50, r = 45
            // Tick crosses the arc (stroke-width 7: from r-3.5 to r+3.5)
            // Short ticks for cleaner look
            const x1 = cx + Math.cos(angleRad) * (r - 3)
            const y1 = cy + Math.sin(angleRad) * (r - 3)
            const x2 = cx + Math.cos(angleRad) * (r + 3)
            const y2 = cy + Math.sin(angleRad) * (r + 3)
            // Number position inside the arc
            const numR = r - 10
            const numX = cx + Math.cos(angleRad) * numR
            const numY = cy + Math.sin(angleRad) * numR
            result.push({ i, x1, y1, x2, y2, numX, numY })
        }
        return result
    }, [])

    return (
        <div className="hud-container">
            {/* Health Bar */}
            <div className={`hud-bar health-bar ${healthColorClass}`}>
                <div className="bar-icon">
                    <FaHeartPulse />
                </div>
                <div className="bar-value">{health}</div>
                <div className="bar-track">
                    <div className="bar-fill health-fill" style={healthBarStyle}>
                        <div className="bar-glow"></div>
                    </div>
                </div>
            </div>

            {/* Armor Bar */}
            {armor > 0 && (
                <div className="hud-bar armor-bar">
                    <div className="bar-icon">
                        <IoShieldHalf />
                    </div>
                    <div className="bar-value">{armor}</div>
                    <div className="bar-track">
                        <div className="bar-fill armor-fill" style={armorBarStyle}>
                            <div className="bar-glow"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Speedometer */}
            {vehicleVisible && (
                <div className="speedo-container">
                    <div className="speedo-ring">
                        <svg className="speedo-svg" viewBox="0 0 100 100" aria-hidden="true">
                            <circle className="speedo-track" cx="50" cy="50" r="45" />
                            <circle className="speedo-arc" cx="50" cy="50" r="45" style={rpmArcDynamicStyle} />
                            
                            {/* NOS Inner Arc - Hugs the main track */}
                            <circle className="speedo-track-nos" cx="50" cy="50" r="40.5" style={{ opacity: nosVisible ? 1 : 0 }} />
                            <circle className="speedo-arc-nos" cx="50" cy="50" r="40.5" style={nosArcStyle} />

                            <g className="speedo-ticks">
                                {ticks.map(t => (
                                    <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
                                ))}
                            </g>
                            <g className="speedo-numbers">
                                {ticks.map(t => (
                                    <text key={t.i} x={t.numX} y={t.numY} dominantBaseline="middle" textAnchor="middle">
                                        {t.i}
                                    </text>
                                ))}
                            </g>
                        </svg>
                        <div className="speedo-center">
                            <div className="speedo-speed">{speed}</div>
                            <div className="speedo-unit">{speedUnit.toUpperCase()}</div>
                            {currentGear && <div className="speedo-gear" style={{ color: rpmColor.color, textShadow: `0 0 calc(8px * var(--es-ui-scale)) ${rpmColor.glow}` }}>{currentGear}</div>}
                        </div>
                    </div>

                    <div className="speedo-status">
                        <div className={`speedo-statusItem speedo-statusItem-fuel ${fuelPercent <= 0.15 ? 'warning' : ''}`}>
                            <div className="speedo-statusIcon-label"><BsFuelPumpFill /></div>
                            <div className="speedo-statusBar speedo-statusBar-vertical" aria-hidden="true">
                                <div className="speedo-statusFill speedo-statusFill-vertical" style={{ height: `${Math.round(fuelPercent * 100)}%` }} />
                            </div>
                        </div>
                        {enginePercent <= 0.65 && (
                            <div className={`speedo-statusItem speedo-statusIcon ${enginePercent <= 0.35 ? 'critical' : 'warning'}`}>
                                <div className="speedo-statusIcon-label"><PiEngineFill /></div>
                            </div>
                        )}
                        {!belt && (
                            <div className="speedo-statusItem speedo-statusIcon critical">
                                <div className="speedo-statusIcon-label"><PiSeatbeltFill /></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})

HUD.displayName = 'HUD'

export default HUD
