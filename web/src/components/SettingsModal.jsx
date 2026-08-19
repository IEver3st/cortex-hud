import React, { useState, useCallback, useEffect, useRef } from 'react'
import './SettingsModal.css'

const SPEED_UNIT_OPTIONS = [
    { value: 'mph', label: 'MPH' },
    { value: 'kph', label: 'KPH' },
]

const HUD_PRESET_OPTIONS = [
    { value: 'classic', label: 'Classic' },
    { value: 'street', label: 'Street Racer' },
    { value: 'dispatch', label: 'Dispatch' },
    { value: 'ghost', label: 'Ghost' },
]

const HUD_PRESET_COLORS = {
    classic: {
        colorHealth: '#22c55e',
        colorArmor: '#60a5fa',
        colorHunger: '#f59e0b',
        colorThirst: '#38bdf8',
        colorStress: '#ef4444',
        colorOxygen: '#06b6d4',
        colorAmmo: '#a3e635',
    },
    street: {
        colorHealth: '#34d399',
        colorArmor: '#38bdf8',
        colorHunger: '#f97316',
        colorThirst: '#22d3ee',
        colorStress: '#fb7185',
        colorOxygen: '#818cf8',
        colorAmmo: '#fb7185',
    },
    dispatch: {
        colorHealth: '#10b981',
        colorArmor: '#60a5fa',
        colorHunger: '#fbbf24',
        colorThirst: '#38bdf8',
        colorStress: '#ef4444',
        colorOxygen: '#06b6d4',
        colorAmmo: '#f59e0b',
    },
    ghost: {
        colorHealth: '#4ade80',
        colorArmor: '#93c5fd',
        colorHunger: '#fbbf24',
        colorThirst: '#67e8f9',
        colorStress: '#fb7185',
        colorOxygen: '#7dd3fc',
        colorAmmo: '#e2e8f0',
    },
}

const COLOR_KEYS = [
    'colorHealth',
    'colorArmor',
    'colorHunger',
    'colorThirst',
    'colorStress',
    'colorOxygen',
    'colorAmmo',
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
    { value: 'preset', label: 'HUD Preset' },
    { value: 'custom', label: 'Custom (Drag)' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
    { value: 'bottom-center', label: 'Bottom Middle' },
]

const OXYGEN_DISPLAY_OPTIONS = [
    { value: 'statusCluster', label: 'Status Cluster' },
    { value: 'indicator', label: 'Indicator Bar' },
]

const STATUS_SHAPE_OPTIONS = [
    { value: 'bar', label: 'Bar' },
    { value: 'circle', label: 'Circle' },
    { value: 'hexagon', label: 'Hexagon' },
]

const DEFAULTS = {
    layoutPreset: 'classic',
    colorPreset: 'classic',
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
    ammoPositionPreset: 'preset',
    showCrosshair: false,
    gta6HudEnabled: false,
    gta6ShowWeaponName: true,
    gta6VehicleIdentification: true,
    showDynamicWeather: false,
    showFlashFloodWarning: true,
    showHurricaneWarning: true,
    sectionedBars: false,
    sectionedIndicator: false,
    statusIconShape: 'bar',
    oxygenDisplayLocation: 'statusCluster',
    backdropBlur: 1,
    panelOpacity: 1,
}

const getPresetColor = (presetName, colorKey) => {
    const presetColors = HUD_PRESET_COLORS[presetName] || HUD_PRESET_COLORS[DEFAULTS.colorPreset]
    return presetColors[colorKey] || DEFAULTS[colorKey]
}

const buildInitialState = (settings = {}) => {
    const layoutPreset = settings.layoutPreset || DEFAULTS.layoutPreset
    const colorPreset = settings.colorPreset || layoutPreset
    const initialState = {
        ...DEFAULTS,
        ...settings,
        layoutPreset,
        colorPreset,
    }

    for (const colorKey of COLOR_KEYS) {
        if (!initialState[colorKey] || initialState[colorKey] === 'preset') {
            initialState[colorKey] = getPresetColor(colorPreset, colorKey)
        }
    }

    const b = Number(initialState.backdropBlur)
    initialState.backdropBlur = Number.isFinite(b) ? Math.min(3, Math.max(0.25, b)) : 1

    let po = Number(initialState.panelOpacity)
    if (Number.isFinite(po) && po >= 15 && po <= 100) po = po / 100
    initialState.panelOpacity = Number.isFinite(po) ? Math.min(1, Math.max(0.15, po)) : 1

    return initialState
}

const SettingsModal = ({
  visible,
  settings,
  onSave,
  onClose,
  onStartMoveSpeedometer,
  onResetSpeedometer,
  onStartMoveAmmo,
  onResetAmmo,
  showDynamicWeatherSetting = true,
}) => {
    const [local, setLocal] = useState(() => buildInitialState(settings))
    const initialState = buildInitialState(settings)
    const selectedAmmoPosition = local.ammoPositionPreset || settings?.resolvedAmmoPositionPreset || 'preset'

    const set = useCallback((key, value) => {
        setLocal(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleSave = useCallback(() => {
        const payload = { ...local }

        if (local.colorPreset !== initialState.colorPreset) {
            for (const colorKey of COLOR_KEYS) {
                if (local[colorKey] === initialState[colorKey]) {
                    payload[colorKey] = 'preset'
                }
            }
        }

        onSave(payload)
    }, [initialState, local, onSave])

    const handleReset = useCallback(() => {
        setLocal(buildInitialState())
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
                    <div className="settings-title">Cortex Settings</div>
                    <button className="settings-close" onClick={onClose}>✕</button>
                </div>

                <div className="settings-body">
                    <div className="settings-section">
                        <div className="settings-section-title">Appearance</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Color Preset</div>
                                <div className="settings-row-desc">Apply a unified color and accent theme without changing layout</div>
                            </div>
                            <CustomDropdown
                                value={local.colorPreset}
                                options={HUD_PRESET_OPTIONS}
                                onChange={(val) => set('colorPreset', val)}
                            />
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Glass blur</div>
                                <div className="settings-row-desc">Frost strength: panel tint + rim. FiveM CEF cannot do real backdrop blur (black rects); this simulates glass without backdrop-filter.</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="25"
                                    max="300"
                                    step="5"
                                    value={Math.min(300, Math.max(25, Math.round(Number(local.backdropBlur) * 100)))}
                                    onChange={(e) => set('backdropBlur', Number(e.target.value) / 100)}
                                />
                                <span className="settings-slider-value">{Math.round(Number(local.backdropBlur) * 100)}%</span>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Panel opacity</div>
                                <div className="settings-row-desc">Glass fill strength. 15% minimum so HUD never fully disappears.</div>
                            </div>
                            <div className="settings-slider-wrap">
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="15"
                                    max="100"
                                    step="5"
                                    value={Math.min(100, Math.max(15, Math.round(Number(local.panelOpacity) * 100)))}
                                    onChange={(e) => set('panelOpacity', Number(e.target.value) / 100)}
                                />
                                <span className="settings-slider-value">{Math.round(Number(local.panelOpacity) * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {}
                    <div className="settings-section">
                        <div className="settings-section-title">Display</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">GTA 6 HUD</div>
                                <div className="settings-row-desc">Damage-triggered vitals, active weapon, and brief GTA V place discoveries</div>
                            </div>
                            <button
                                type="button"
                                className={`settings-toggle ${local.gta6HudEnabled ? 'active' : ''}`}
                                onClick={() => set('gta6HudEnabled', !local.gta6HudEnabled)}
                                aria-pressed={local.gta6HudEnabled}
                            >
                                <span className="settings-toggle-knob" />
                            </button>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Show Weapon Name</div>
                                <div className="settings-row-desc">Show the active weapon name beside its icon in GTA 6 HUD mode</div>
                            </div>
                            <button
                                type="button"
                                className={`settings-toggle ${local.gta6ShowWeaponName ? 'active' : ''}`}
                                onClick={() => set('gta6ShowWeaponName', !local.gta6ShowWeaponName)}
                                aria-pressed={local.gta6ShowWeaponName}
                            >
                                <span className="settings-toggle-knob" />
                            </button>
                        </div>

                        {local.gta6HudEnabled && (
                            <div className="settings-row">
                                <div>
                                    <div className="settings-row-label">Vehicle Introduction</div>
                                    <div className="settings-row-desc">Show brand, model, engine health, and fuel when entering a vehicle</div>
                                </div>
                                <button
                                    type="button"
                                    className={`settings-toggle ${local.gta6VehicleIdentification ? 'active' : ''}`}
                                    onClick={() => set('gta6VehicleIdentification', !local.gta6VehicleIdentification)}
                                    aria-pressed={local.gta6VehicleIdentification}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        )}

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

                        {showDynamicWeatherSetting && (
                        <>
                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Dynamic Weather (indicator)</div>
                                <div className="settings-row-desc">Forecast icons and rain ETA when Dynamic_weather is running and detected</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showDynamicWeather ? 'active' : ''}`}
                                onClick={() => set('showDynamicWeather', !local.showDynamicWeather)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Flash flood warning (indicator)</div>
                                <div className="settings-row-desc">Top bar flash flood segment when Dynamic_weather reports an active flood</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showFlashFloodWarning ? 'active' : ''}`}
                                onClick={() => set('showFlashFloodWarning', !local.showFlashFloodWarning)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Hurricane warning (indicator)</div>
                                <div className="settings-row-desc">Top bar hurricane segment when Dynamic_weather reports an active hurricane</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.showHurricaneWarning ? 'active' : ''}`}
                                onClick={() => set('showHurricaneWarning', !local.showHurricaneWarning)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>
                        </>
                        )}

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Sectioned Bars</div>
                                <div className="settings-row-desc">Four 25% capsules for health &amp; armor (bar status layout)</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.sectionedBars ? 'active' : ''}`}
                                onClick={() => set('sectionedBars', !local.sectionedBars)}
                            >
                                <div className="settings-toggle-knob" />
                            </div>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Segmented top bar</div>
                                <div className="settings-row-desc">Gapped capsules for compass / street / zone strip</div>
                            </div>
                            <div
                                className={`settings-toggle ${local.sectionedIndicator ? 'active' : ''}`}
                                onClick={() => set('sectionedIndicator', !local.sectionedIndicator)}
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
                                <div className="settings-row-label">Ammo Display Position</div>
                                <div className="settings-row-desc">Choose an anchor or use manual drag placement</div>
                            </div>
                            <CustomDropdown
                                value={selectedAmmoPosition}
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

                    {}
                    <div className="settings-section">
                        <div className="settings-section-title">Status Icons</div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Status Icon Shape</div>
                                <div className="settings-row-desc">Choose the status icon style</div>
                            </div>
                            <CustomDropdown
                                value={local.statusIconShape}
                                options={STATUS_SHAPE_OPTIONS}
                                onChange={(val) => set('statusIconShape', val)}
                            />
                        </div>

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

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Oxygen Display</div>
                                <div className="settings-row-desc">Show oxygen as a full status meter or in the top indicator bar</div>
                            </div>
                            <CustomDropdown
                                value={local.oxygenDisplayLocation}
                                options={OXYGEN_DISPLAY_OPTIONS}
                                onChange={(val) => set('oxygenDisplayLocation', val)}
                            />
                        </div>
                    </div>

                    <div className="settings-divider" />

                    {}
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

                    {}
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

                    {}
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

                    {}
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

