import React, { useState, useCallback, useEffect, useRef } from 'react'
import './SettingsModal.css'

const SPEED_UNIT_OPTIONS = [
    { value: 'mph', label: 'MPH' },
    { value: 'kph', label: 'KPH' },
]

const CustomDropdown = ({ value, options, onChange }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const selected = options.find(o => o.value === value)

    return (
        <div className={`settings-dropdown ${open ? 'open' : ''}`} ref={ref}>
            <div className="settings-dropdown-trigger" onClick={() => setOpen(!open)}>
                <span>{selected ? selected.label : value}</span>
                <span className="settings-dropdown-arrow">▼</span>
            </div>
            {open && (
                <div className="settings-dropdown-menu">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`settings-dropdown-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const CINEMATIC_KEY_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'F7', label: 'F7' },
    { value: 'F8', label: 'F8' },
    { value: 'F9', label: 'F9' },
    { value: 'F10', label: 'F10' },
    { value: 'F11', label: 'F11' },
    { value: 'HOME', label: 'HOME' },
    { value: 'END', label: 'END' },
    { value: 'DELETE', label: 'DEL' },
    { value: 'INSERT', label: 'INS' },
]

const AMMO_POSITION_OPTIONS = [
    { value: 'custom', label: 'Custom (Drag)' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
    { value: 'bottom-center', label: 'Bottom Middle' },
]

const DEFAULTS = {
    speedUnit: 'mph',
    disableSpeedometer: false,
    showPostal: true,
    showPostalDistance: false,
    hungerThreshold: 100,
    thirstThreshold: 100,
    stressThreshold: 100,
    oxygenThreshold: 100,
    colorHealth: '#10b981',
    colorArmor: '#5eb2ff',
    colorHunger: '#f59e0b',
    colorThirst: '#ffffff',
    colorStress: '#ef4444',
    colorOxygen: '#06b6d4',
    colorAmmo: '#10b981',
    mapNotifications: true,
    lowFuelAlert: true,
    cinematicNotifications: true,
    cinematicKey: 'F7',
    minimapOnlyInVehicle: false,
    ammoPositionPreset: 'bottom-right',
    showCrosshair: false,
}

const SettingsModal = ({ visible, settings, onSave, onClose, onStartMoveSpeedometer, onResetSpeedometer, onStartMoveAmmo, onResetAmmo }) => {
    const [local, setLocal] = useState({ ...DEFAULTS })

    useEffect(() => {
        if (visible && settings) {
            setLocal(prev => ({ ...DEFAULTS, ...settings }))
        }
    }, [visible, settings])

    const set = useCallback((key, value) => {
        setLocal(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleSave = useCallback(() => {
        onSave(local)
    }, [local, onSave])

    const handleReset = useCallback(() => {
        setLocal({ ...DEFAULTS })
    }, [])

    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        if (!visible) return
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [visible, onClose])

    if (!visible) return null

    return (
        <div className="settings-overlay" onClick={handleOverlayClick}>
            <div className="settings-modal">
                <div className="settings-header">
                    <div className="settings-title">HUD Settings</div>
                    <button className="settings-close" onClick={onClose}>✕</button>
                </div>

                <div className="settings-body">
                    {/* Display Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Display</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Speed Unit</div>
                                <div className="settings-row-desc">Speedometer display unit</div>
                            </div>
                            <CustomDropdown
                                value={local.speedUnit}
                                options={SPEED_UNIT_OPTIONS}
                                onChange={(val) => set('speedUnit', val)}
                            />
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Disable Speedometer</div>
                                <div className="settings-row-desc">Hide the vehicle speedometer HUD element</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.disableSpeedometer ? 'active' : ''}`}
                                onClick={() => set('disableSpeedometer', !local.disableSpeedometer)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Show Postal</div>
                                <div className="settings-row-desc">Display nearest postal code</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showPostal ? 'active' : ''}`}
                                onClick={() => set('showPostal', !local.showPostal)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Postal Distance</div>
                                <div className="settings-row-desc">Show distance to nearest postal</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showPostalDistance ? 'active' : ''}`}
                                onClick={() => set('showPostalDistance', !local.showPostalDistance)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Crosshair Dot</div>
                                <div className="settings-row-desc">yes i cant aim please help</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showCrosshair ? 'active' : ''}`}
                                onClick={() => set('showCrosshair', !local.showCrosshair)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-section">
                        <div className="settings-section-title">Layout</div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Speedometer Position</div>
                                <div className="settings-row-desc">Move or reset speedometer</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="settings-btn-small settings-btn-move" 
                                    onClick={onStartMoveSpeedometer}
                                >
                                    Move
                                </button>
                                <button 
                                    className="settings-btn-small settings-btn-reset-small" 
                                    onClick={onResetSpeedometer}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Ammo Display Preset</div>
                                <div className="settings-row-desc">Quick presets for ammo position</div>
                            </div>
                            <CustomDropdown
                                value={local.ammoPositionPreset || 'bottom-right'}
                                options={AMMO_POSITION_OPTIONS}
                                onChange={(val) => set('ammoPositionPreset', val)}
                            />
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Manual Ammo Position</div>
                                <div className="settings-row-desc">Drag to reposition ammo</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="settings-btn-small settings-btn-move" 
                                    onClick={onStartMoveAmmo}
                                >
                                    Move
                                </button>
                                <button 
                                    className="settings-btn-small settings-btn-reset-small" 
                                    onClick={onResetAmmo}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {/* Status Icons Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Status Icons</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Hunger Threshold</div>
                                <div className="settings-row-desc">Show icon when hunger is below this %</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="0"
                                    max="100"
                                    value={local.hungerThreshold}
                                    onChange={(e) => set('hungerThreshold', Number(e.target.value))}
                                />
                                <span className="settings-slider-value">{local.hungerThreshold}%</span>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Thirst Threshold</div>
                                <div className="settings-row-desc">Show icon when thirst is below this %</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="0"
                                    max="100"
                                    value={local.thirstThreshold}
                                    onChange={(e) => set('thirstThreshold', Number(e.target.value))}
                                />
                                <span className="settings-slider-value">{local.thirstThreshold}%</span>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Stress Threshold</div>
                                <div className="settings-row-desc">Show icon when stress is above this %</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="0"
                                    max="100"
                                    value={local.stressThreshold}
                                    onChange={(e) => set('stressThreshold', Number(e.target.value))}
                                />
                                <span className="settings-slider-value">{local.stressThreshold}%</span>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Oxygen Threshold</div>
                                <div className="settings-row-desc">Show icon when oxygen is below this %</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="0"
                                    max="100"
                                    value={local.oxygenThreshold}
                                    onChange={(e) => set('oxygenThreshold', Number(e.target.value))}
                                />
                                <span className="settings-slider-value">{local.oxygenThreshold}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {/* Colors Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Colors</div>
                        
                        <div className="settings-row">
                            <div className="settings-row-label">Health Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorHealth} 
                                onChange={(e) => set('colorHealth', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Armor Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorArmor} 
                                onChange={(e) => set('colorArmor', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Hunger Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorHunger} 
                                onChange={(e) => set('colorHunger', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Thirst Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorThirst} 
                                onChange={(e) => set('colorThirst', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Stress Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorStress} 
                                onChange={(e) => set('colorStress', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Oxygen Bar</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorOxygen} 
                                onChange={(e) => set('colorOxygen', e.target.value)} 
                            />
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-label">Ammo Counter</div>
                            <input 
                                type="color" 
                                className="settings-color-input" 
                                value={local.colorAmmo} 
                                onChange={(e) => set('colorAmmo', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {/* Minimap Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Minimap</div>

                        <div
                            className={`settings-checkbox ${local.minimapOnlyInVehicle ? 'checked' : ''}`}
                            onClick={() => set('minimapOnlyInVehicle', !local.minimapOnlyInVehicle)}
                        >
                            <div className="settings-checkbox-box">
                                <span className="settings-checkbox-check">✓</span>
                            </div>
                            <span className="settings-checkbox-label">Show Minimap Only In Vehicle</span>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {/* Notifications Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Notifications</div>

                        <div
                            className={`settings-checkbox ${local.mapNotifications ? 'checked' : ''}`}
                            onClick={() => set('mapNotifications', !local.mapNotifications)}
                        >
                            <div className="settings-checkbox-box">
                                <span className="settings-checkbox-check">✓</span>
                            </div>
                            <span className="settings-checkbox-label">Map Notifications Enabled</span>
                        </div>

                        <div
                            className={`settings-checkbox ${local.lowFuelAlert ? 'checked' : ''}`}
                            onClick={() => set('lowFuelAlert', !local.lowFuelAlert)}
                        >
                            <div className="settings-checkbox-box">
                                <span className="settings-checkbox-check">✓</span>
                            </div>
                            <span className="settings-checkbox-label">Low Fuel Alert Enabled</span>
                        </div>

                        <div
                            className={`settings-checkbox ${local.cinematicNotifications ? 'checked' : ''}`}
                            onClick={() => set('cinematicNotifications', !local.cinematicNotifications)}
                        >
                            <div className="settings-checkbox-box">
                                <span className="settings-checkbox-check">✓</span>
                            </div>
                            <span className="settings-checkbox-label">Cinematic Mode Notifications Enabled</span>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {/* Cinematic Mode Section */}
                    <div className="settings-section">
                        <div className="settings-section-title">Cinematic Mode</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Cinematic Hotkey</div>
                                <div className="settings-row-desc">Key to toggle cinematic mode</div>
                            </div>
                            <CustomDropdown
                                value={local.cinematicKey}
                                options={CINEMATIC_KEY_OPTIONS}
                                onChange={(val) => set('cinematicKey', val)}
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="settings-btn settings-btn-reset" onClick={handleReset}>
                        Reset
                    </button>
                    <button className="settings-btn settings-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="settings-btn settings-btn-save" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SettingsModal
