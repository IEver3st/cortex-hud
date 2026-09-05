import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDefaultOpenSettingsPayload } from '../hudDevApply.js'
import { LOCATION_DISPLAY_OPTIONS } from '../locationDisplayStyle.js'
import {
  applyHudDevScenario,
  createDevVehicleIdentity,
  HUD_DEV_SCENARIOS,
} from '../hudDevScenarios.js'
import './HudDevPanel.css'

const TABS = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'player', label: 'Player' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'world', label: 'World' },
]

const STATUS_SHAPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'circle', label: 'Circle' },
]

const PREVIEW_BG_PRESETS = ['#0a0a0c', '#1a1a2e', '#2d1f14', '#3d6a4a', '#6eb5ff', '#e8e8ee']

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="hud-dev-section">
      <header className="hud-dev-section-header">
        {eyebrow && <span className="hud-dev-section-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="hud-dev-section-content">{children}</div>
    </section>
  )
}

function ToggleControl({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div className={`hud-dev-control${disabled ? ' is-disabled' : ''}`}>
      <div className="hud-dev-control-copy">
        <label htmlFor={id}>{label}</label>
        {description && <span>{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        className={`hud-dev-toggle${checked ? ' hud-dev-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label}
        disabled={disabled}
      >
        <span className="hud-dev-toggle-knob" aria-hidden="true" />
      </button>
    </div>
  )
}

function RangeControl({ id, label, value, min = 0, max = 100, step = 1, onChange, format }) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : min
  return (
    <div className="hud-dev-range-control">
      <div className="hud-dev-range-heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format ? format(numericValue) : Math.round(numericValue)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, numericValue))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function SelectControl({ id, label, value, options, onChange, description, disabled = false }) {
  return (
    <div className={`hud-dev-field${disabled ? ' is-disabled' : ''}`}>
      <div className="hud-dev-control-copy">
        <label htmlFor={id}>{label}</label>
        {description && <span>{description}</span>}
      </div>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

function TextControl({ id, label, value, onChange, placeholder, disabled = false }) {
  return (
    <div className={`hud-dev-field${disabled ? ' is-disabled' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

const HudDevPanel = ({
  hudData,
  setHudData,
  onOpenSettingsModal,
  onPreviewHitmarker,
  weaponWheelVisible,
  onToggleWeaponWheelPreview,
  onToggleCinematic,
  cinematicMode,
  playfieldColor,
  onPlayfieldColorChange,
}) => {
  const [open, setOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('scenes')
  const [activeScenario, setActiveScenario] = useState(null)
  const vehicleEntryRef = useRef(3000)
  const vehicleIntroTimerRef = useRef(null)

  const queueVehicleIdentity = useCallback((entryId) => {
    window.clearTimeout(vehicleIntroTimerRef.current)
    vehicleIntroTimerRef.current = window.setTimeout(() => {
      setHudData((previous) => ({
        ...previous,
        vehicleIdentity: createDevVehicleIdentity(entryId),
      }))
    }, 60)
  }, [setHudData])

  const mutate = useCallback((updater) => {
    setActiveScenario(null)
    setHudData((previous) => updater(previous))
  }, [setHudData])

  const patch = useCallback((partial) => {
    mutate((previous) => ({ ...previous, ...partial }))
  }, [mutate])

  const patchVehicleTelemetry = useCallback((partial) => {
    mutate((previous) => ({
      ...previous,
      ...partial,
      vehicleIdentity: previous.vehicleIdentity
        ? {
            ...previous.vehicleIdentity,
            ...(Object.prototype.hasOwnProperty.call(partial, 'engineState')
              ? { engineState: partial.engineState }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(partial, 'engineHealth')
              ? { engineHealth: partial.engineHealth }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(partial, 'fuel')
              ? { fuel: partial.fuel }
              : {}),
          }
        : null,
    }))
  }, [mutate])

  const replayVehicleIntro = useCallback(() => {
    vehicleEntryRef.current += 1
    const entryId = vehicleEntryRef.current
    mutate((previous) => ({
      ...previous,
      gta6HudEnabled: true,
      gta6VehicleIdentification: true,
      visible: true,
      vehicleVisible: true,
      aircraftVisible: false,
      forceAircraftHud: false,
      sniperScopeVisible: false,
      vehicleIdentity: null,
    }))
    queueVehicleIdentity(entryId)
  }, [mutate, queueVehicleIdentity])

  const applyScenario = useCallback((scenarioId) => {
    vehicleEntryRef.current += 1
    window.clearTimeout(vehicleIntroTimerRef.current)
    onToggleCinematic(false)
    setHudData((previous) => {
      const next = applyHudDevScenario(previous, scenarioId, vehicleEntryRef.current)
      return scenarioId === 'gta6-vehicle' ? { ...next, vehicleIdentity: null } : next
    })
    if (scenarioId === 'gta6-vehicle') {
      queueVehicleIdentity(vehicleEntryRef.current)
    }
    setActiveScenario(scenarioId)
  }, [onToggleCinematic, queueVehicleIdentity, setHudData])

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target
      const isEditing = target && (
        target.tagName === 'INPUT'
        || target.tagName === 'SELECT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
      )
      if (isEditing) return

      if (event.code === 'Backquote' || (event.shiftKey && event.key === 'Escape')) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  useEffect(() => () => {
    window.clearTimeout(vehicleIntroTimerRef.current)
  }, [])

  const currentContext = useMemo(() => {
    if (hudData.sniperScopeVisible) return 'SCOPE'
    if (hudData.aircraftVisible || hudData.forceAircraftHud) return 'AIR'
    if (hudData.vehicleVisible) return 'VEHICLE'
    return 'ON FOOT'
  }, [hudData.aircraftVisible, hudData.forceAircraftHud, hudData.sniperScopeVisible, hudData.vehicleVisible])

  const weaponMode = !hudData.isArmed
    ? 'none'
    : hudData.weaponUsesCharge
      ? 'charge'
      : hudData.weaponType === 'melee'
        ? 'melee'
        : 'firearm'

  const handleWeaponMode = (mode) => {
    if (mode === 'none') {
      patch({
        isArmed: false,
        weaponType: 'none',
        weaponReticleType: 'none',
        weaponIcon: null,
        weaponName: '',
        weaponUsesCharge: false,
        weaponAiming: false,
        ammoClip: -1,
        ammoReserve: -1,
      })
      return
    }
    if (mode === 'melee') {
      patch({
        isArmed: true,
        weaponType: 'melee',
        weaponReticleType: 'none',
        weaponIcon: 'weapon_knife',
        weaponName: 'Knife',
        weaponUsesCharge: false,
        weaponAiming: false,
        ammoClip: -1,
        ammoReserve: -1,
      })
      return
    }
    if (mode === 'charge') {
      patch({
        isArmed: true,
        weaponType: 'firearm',
        weaponReticleType: 'single',
        weaponIcon: 'weapon_raypistol',
        weaponName: 'Up-n-Atomizer',
        weaponUsesCharge: true,
        weaponChargeReady: false,
        weaponChargeProgress: 48,
        weaponAiming: false,
        ammoClip: -1,
        ammoReserve: -1,
      })
      return
    }
    patch({
      isArmed: true,
      weaponType: 'rifle',
      weaponReticleType: 'automatic',
      weaponIcon: 'weapon_carbinerifle',
      weaponName: 'Carbine Rifle',
      weaponUsesCharge: false,
      weaponBloom: Number.isFinite(Number(hudData.weaponBloom)) ? hudData.weaponBloom : 0,
      weaponAiming: Boolean(hudData.weaponAiming),
      ammoClip: hudData.ammoClip >= 0 ? hudData.ammoClip : 24,
      ammoReserve: hudData.ammoReserve >= 0 ? hudData.ammoReserve : 120,
    })
  }

  const toggleVehicle = (enabled) => {
    mutate((previous) => ({
      ...previous,
      vehicleVisible: enabled,
      aircraftVisible: enabled ? false : previous.aircraftVisible,
      forceAircraftHud: enabled ? false : previous.forceAircraftHud,
      sniperScopeVisible: enabled ? false : previous.sniperScopeVisible,
      vehicleIdentity: enabled ? previous.vehicleIdentity : null,
    }))
  }

  const toggleAircraft = (enabled) => {
    mutate((previous) => ({
      ...previous,
      aircraftVisible: enabled,
      forceAircraftHud: enabled,
      vehicleVisible: enabled ? false : previous.vehicleVisible,
      vehicleIdentity: enabled ? null : previous.vehicleIdentity,
      sniperScopeVisible: enabled ? false : previous.sniperScopeVisible,
    }))
  }

  return (
    <aside className={`hud-dev-panel${open ? '' : ' hud-dev-panel--collapsed'}`} aria-label="HUD browser development controls">
      <header className="hud-dev-header">
        <div className="hud-dev-brand-block">
          <span className="hud-dev-kicker">CORTEX HUD</span>
          <strong>Browser lab</strong>
          {open && <span className="hud-dev-shortcut">Backquote toggles panel</span>}
        </div>
        {open && (
          <div className="hud-dev-runtime" role="status" aria-live="polite">
            <span>{hudData.gta6HudEnabled ? 'LEONIDA' : 'CLASSIC'}</span>
            <span>{currentContext}</span>
          </div>
        )}
        <button
          type="button"
          className="hud-dev-collapse-button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? 'Collapse HUD browser lab' : 'Open HUD browser lab'}
        >
          {open ? 'Close' : 'Lab'}
        </button>
      </header>

      {open && (
        <>
          <nav className="hud-dev-tabs" aria-label="HUD development control groups">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="hud-dev-body">
            {activeTab === 'scenes' && (
              <>
                <Section
                  eyebrow="Reproduction states"
                  title="Scene launcher"
                  description="Each scene clears incompatible overlays before applying representative telemetry."
                >
                  <div className="hud-dev-scenes">
                    {HUD_DEV_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.id}
                        type="button"
                        className={`hud-dev-scene${activeScenario === scenario.id ? ' is-active' : ''}`}
                        onClick={() => applyScenario(scenario.id)}
                        aria-pressed={activeScenario === scenario.id}
                      >
                        <span className="hud-dev-scene-code">{scenario.code}</span>
                        <span className="hud-dev-scene-copy">
                          <strong>{scenario.label}</strong>
                          <span>{scenario.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section eyebrow="Canvas" title="Preview environment">
                  <div className="hud-dev-color-row">
                    <label htmlFor="huddev-bg">World backdrop</label>
                    <input
                      id="huddev-bg"
                      type="color"
                      className="hud-dev-color"
                      value={playfieldColor}
                      onChange={(event) => onPlayfieldColorChange(event.target.value)}
                      title="Browser-only simulated world color"
                    />
                    <code>{playfieldColor}</code>
                  </div>
                  <div className="hud-dev-swatches" role="group" aria-label="Preview background presets">
                    {PREVIEW_BG_PRESETS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={playfieldColor === hex ? 'is-active' : ''}
                        style={{ '--hud-dev-swatch': hex }}
                        onClick={() => onPlayfieldColorChange(hex)}
                        title={hex}
                        aria-label={`Set preview background ${hex}`}
                        aria-pressed={playfieldColor === hex}
                      />
                    ))}
                  </div>
                  <ToggleControl id="huddev-visible" label="HUD visible" checked={hudData.visible} onChange={(value) => patch({ visible: value })} />
                  <ToggleControl id="huddev-radar" label="Radar reserved" description="Preview minimap-safe positioning." checked={hudData.radarVisible} onChange={(value) => patch({ radarVisible: value })} />
                  <ToggleControl id="huddev-cinematic" label="Cinematic bars" checked={cinematicMode} onChange={onToggleCinematic} />
                </Section>
              </>
            )}

            {activeTab === 'player' && (
              <>
                <Section
                  eyebrow="Current feature set"
                  title="Leonida presentation"
                  description="Drive the navigation, contextual vitals, weapon lockup, and vehicle introduction modes."
                >
                  <ToggleControl id="huddev-gta6" label="Leonida UI" checked={hudData.gta6HudEnabled} onChange={(value) => patch({ gta6HudEnabled: value })} />
                  <ToggleControl id="huddev-gta6-auth" label="Compact weapon HUD" description="Compact ammo-over-weapon layout and minimal reticle." checked={hudData.gta6AuthenticWeaponHud} onChange={(value) => patch({ gta6AuthenticWeaponHud: value })} disabled={!hudData.gta6HudEnabled} />
                  <ToggleControl id="huddev-gta6-name" label="Weapon name" checked={hudData.gta6ShowWeaponName} onChange={(value) => patch({ gta6ShowWeaponName: value })} disabled={!hudData.gta6HudEnabled || hudData.gta6AuthenticWeaponHud} />
                  <ToggleControl id="huddev-gta6-vehicle-id" label="Vehicle introduction" checked={hudData.gta6VehicleIdentification} onChange={(value) => patch({ gta6VehicleIdentification: value })} disabled={!hudData.gta6HudEnabled} />
                </Section>

                <Section eyebrow="Telemetry" title="Vitals">
                  <div className="hud-dev-metric-grid">
                    <RangeControl id="huddev-health" label="Health" value={hudData.health} onChange={(value) => patch({ health: value })} />
                    <RangeControl id="huddev-armor" label="Armor" value={hudData.armor} onChange={(value) => patch({ armor: value })} />
                    <RangeControl id="huddev-stamina" label="Stamina" value={hudData.stamina} onChange={(value) => patch({ stamina: value })} />
                    <RangeControl id="huddev-hunger" label="Hunger" value={hudData.hunger} onChange={(value) => patch({ hunger: value })} />
                    <RangeControl id="huddev-thirst" label="Thirst" value={hudData.thirst} onChange={(value) => patch({ thirst: value })} />
                    <RangeControl id="huddev-stress" label="Stress" value={hudData.stress} onChange={(value) => patch({ stress: value })} />
                    <RangeControl id="huddev-oxygen" label="Oxygen" value={hudData.oxygen} onChange={(value) => patch({ oxygen: value })} />
                  </div>
                  <ToggleControl id="huddev-damaged" label="Recently damaged" description="Keeps the Leonida health bar visible." checked={hudData.healthRecentlyDamaged} onChange={(value) => patch({ healthRecentlyDamaged: value })} />
                  <ToggleControl id="huddev-stamina-regen" label="Stamina regenerating" checked={hudData.staminaRegenerating} onChange={(value) => patch({ staminaRegenerating: value })} />
                  <ToggleControl id="huddev-water" label="Underwater" description="Switches the contextual stamina meter to oxygen." checked={hudData.underwater} onChange={(value) => patch({ underwater: value, inWater: value })} />
                </Section>

                <Section eyebrow="Combat" title="Weapon and scope">
                  <ToggleControl
                    id="huddev-custom-weapon-wheel"
                    label="Custom weapon wheel setting"
                    checked={hudData.customWeaponWheel}
                    onChange={(value) => patch({ customWeaponWheel: value })}
                  />
                  <ToggleControl
                    id="huddev-weapon-wheel-preview"
                    label="Weapon wheel preview"
                    description="Preview the eight-station layout without FiveM input."
                    checked={weaponWheelVisible}
                    onChange={onToggleWeaponWheelPreview}
                  />
                  <SelectControl
                    id="huddev-weapon-mode"
                    label="Weapon state"
                    value={weaponMode}
                    onChange={handleWeaponMode}
                    options={[
                      { value: 'none', label: 'Unarmed' },
                      { value: 'firearm', label: 'Firearm' },
                      { value: 'melee', label: 'Melee' },
                      { value: 'charge', label: 'Charge weapon' },
                    ]}
                  />
                  <TextControl id="huddev-weapon-name" label="Weapon name" value={hudData.weaponName} onChange={(value) => patch({ weaponName: value })} disabled={!hudData.isArmed} />
                  {hudData.isArmed && hudData.weaponType !== 'melee' && (
                    <SelectControl
                      id="huddev-reticle-type"
                      label="Reticle profile"
                      value={hudData.weaponReticleType}
                      onChange={(value) => patch({ weaponReticleType: value })}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'automatic', label: 'Automatic (ring)' },
                        { value: 'single', label: 'Semi-auto (three-line)' },
                        { value: 'shotgun', label: 'Shotgun (wide ring)' },
                        { value: 'tazer', label: 'Tazer (hitmarker X)' },
                        { value: 'rpg', label: 'RPG (thin ring)' },
                        { value: 'homing', label: 'Homing (vanilla lock-on)' },
                      ]}
                    />
                  )}
                  {hudData.isArmed && hudData.weaponType !== 'melee' && !hudData.weaponUsesCharge && (
                    <>
                      <div className="hud-dev-metric-grid">
                        <RangeControl id="huddev-clip" label="Clip" value={Math.max(0, hudData.ammoClip)} min={0} max={100} onChange={(value) => patch({ ammoClip: value, isArmed: true })} />
                        <RangeControl id="huddev-reserve" label="Reserve" value={Math.max(0, hudData.ammoReserve)} min={0} max={300} onChange={(value) => patch({ ammoReserve: value, isArmed: true })} />
                        {hudData.weaponReticleType !== 'none' && (
                          <>
                            <RangeControl id="huddev-bloom" label="Bloom" value={hudData.weaponBloom} onChange={(value) => patch({ weaponBloom: value })} format={(value) => `${Math.round(value)}%`} />
                            <ToggleControl id="huddev-ads" label="Aim down sights" checked={Boolean(hudData.weaponAiming)} onChange={(value) => patch({ weaponAiming: value })} />
                          </>
                        )}
                      </div>
                      <div className="hud-dev-hitmarker-row" aria-label="Preview hitmarkers">
                        <span>Hitmarker</span>
                        {[
                          ['regular', 'Regular'],
                          ['knockout', 'Knockout'],
                          ['critical', 'Critical'],
                          ['vehicle', 'Vehicle'],
                        ].map(([kind, label]) => (
                          <button key={kind} type="button" onClick={() => onPreviewHitmarker?.(kind)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {hudData.weaponUsesCharge && (
                    <>
                      <RangeControl id="huddev-charge" label="Charge" value={hudData.weaponChargeProgress} onChange={(value) => patch({ weaponChargeProgress: value, weaponChargeReady: value >= 100 })} format={(value) => `${Math.round(value)}%`} />
                      <ToggleControl id="huddev-charge-ready" label="Charge ready" checked={hudData.weaponChargeReady} onChange={(value) => patch({ weaponChargeReady: value, weaponChargeProgress: value ? 100 : hudData.weaponChargeProgress })} />
                    </>
                  )}
                  <ToggleControl id="huddev-crosshair" label="Classic crosshair" description="Leonida compact mode supplies its own reticle." checked={hudData.showCrosshair} onChange={(value) => patch({ showCrosshair: value })} />
                  <ToggleControl id="huddev-scope" label="Sniper scope" checked={hudData.sniperScopeVisible} onChange={(value) => mutate((previous) => ({ ...previous, sniperScopeVisible: value, isArmed: value || previous.isArmed, vehicleVisible: value ? false : previous.vehicleVisible, aircraftVisible: value ? false : previous.aircraftVisible, forceAircraftHud: value ? false : previous.forceAircraftHud }))} />
                  {hudData.sniperScopeVisible && (
                    <div className="hud-dev-metric-grid">
                      <RangeControl id="huddev-scope-zoom" label="Zoom" value={hudData.sniperScopeZoom} min={1} max={20} step={0.5} onChange={(value) => patch({ sniperScopeZoom: value })} format={(value) => `${value.toFixed(1)}×`} />
                      <RangeControl id="huddev-scope-range" label="Range" value={hudData.sniperScopeRange ?? 0} min={0} max={1200} onChange={(value) => patch({ sniperScopeRange: value || null })} format={(value) => `${Math.round(value)}m`} />
                      <RangeControl id="huddev-scope-steady" label="Steady" value={hudData.sniperScopeSteadiness} onChange={(value) => patch({ sniperScopeSteadiness: value })} format={(value) => `${Math.round(value)}%`} />
                    </div>
                  )}
                </Section>

                <Section eyebrow="Comms" title="Voice and radio">
                  <ToggleControl id="huddev-voip" label="Voice talking" checked={hudData.voipTalking} onChange={(value) => patch({ voipTalking: value, voipConnected: true })} />
                  <ToggleControl id="huddev-radio" label="Radio talking" checked={hudData.radioTalking} onChange={(value) => patch({ radioTalking: value, radioChannel: value ? (hudData.radioChannel || 12) : hudData.radioChannel, voipConnected: true })} />
                  <RangeControl id="huddev-voip-proximity" label="Proximity" value={(hudData.voipProximity ?? 0.62) * 100} onChange={(value) => patch({ voipProximity: value / 100, voipConnected: true })} format={(value) => `${Math.round(value)}%`} />
                  <SelectControl id="huddev-voip-range" label="Voice range" value={hudData.voipRange || 'normal'} onChange={(value) => patch({ voipRange: value, voipConnected: true })} options={[
                    { value: 'whisper', label: 'Whisper' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'shout', label: 'Shout' },
                  ]} />
                  <RangeControl id="huddev-radio-channel" label="Radio channel" value={hudData.radioChannel || 0} min={0} max={999} onChange={(value) => patch({ radioChannel: value, voipConnected: true })} />
                </Section>
              </>
            )}

            {activeTab === 'vehicle' && (
              <>
                <Section eyebrow="Ground vehicle" title="Driving state">
                  <ToggleControl id="huddev-vehicle" label="Vehicle occupied" checked={hudData.vehicleVisible} onChange={toggleVehicle} />
                  <ToggleControl id="huddev-disable-speedo" label="Disable speedometer" description={hudData.gta6HudEnabled ? 'Leonida UI hides it automatically.' : undefined} checked={hudData.disableSpeedometer || hudData.gta6HudEnabled} onChange={(value) => patch({ disableSpeedometer: value })} disabled={hudData.gta6HudEnabled} />
                  <button type="button" className="hud-dev-action" onClick={replayVehicleIntro}>
                    <span>Replay Leonida vehicle intro</span>
                    <small>Enables Leonida UI and creates a fresh entry event.</small>
                  </button>
                  <div className="hud-dev-field-pair">
                    <TextControl id="huddev-vehicle-brand" label="Brand" value={hudData.vehicleIdentity?.brand || 'Vapid'} onChange={(value) => mutate((previous) => ({ ...previous, vehicleIdentity: previous.vehicleIdentity ? { ...previous.vehicleIdentity, brand: value } : previous.vehicleIdentity }))} disabled={!hudData.vehicleIdentity} />
                    <TextControl id="huddev-vehicle-name" label="Model" value={hudData.vehicleIdentity?.name || 'Dominator GT'} onChange={(value) => mutate((previous) => ({ ...previous, vehicleIdentity: previous.vehicleIdentity ? { ...previous.vehicleIdentity, name: value } : previous.vehicleIdentity }))} disabled={!hudData.vehicleIdentity} />
                  </div>
                  <div className="hud-dev-metric-grid">
                    <RangeControl id="huddev-speed" label="Speed" value={hudData.speed} min={0} max={220} onChange={(value) => patch({ speed: value })} format={(value) => `${Math.round(value)} ${String(hudData.speedUnit || 'mph').toUpperCase()}`} />
                    <RangeControl id="huddev-rpm" label="RPM" value={hudData.rpm} onChange={(value) => patch({ rpm: value })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-fuel" label="Fuel" value={hudData.fuel} onChange={(value) => patchVehicleTelemetry({ fuel: value, hasFuelProvider: true })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-engine-health" label="Engine" value={hudData.engineHealth} onChange={(value) => patchVehicleTelemetry({ engineHealth: value })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-nos" label="NOS" value={hudData.nosAmount} onChange={(value) => patch({ nosAmount: value, nosVisible: true })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-cruise-speed" label="Cruise" value={hudData.cruiseSpeed} min={0} max={220} onChange={(value) => patch({ cruiseSpeed: value, cruiseActive: value > 0 })} />
                  </div>
                  <SelectControl id="huddev-gear" label="Gear" value={String(hudData.currentGear ?? 'N')} onChange={(value) => patch({ currentGear: value })} options={['N', 'R', '1', '2', '3', '4', '5', '6', '7', '8'].map((value) => ({ value, label: value }))} />
                  <SelectControl id="huddev-speed-unit" label="Speed unit" value={hudData.speedUnit || 'mph'} onChange={(value) => patch({ speedUnit: value })} options={[
                    { value: 'mph', label: 'MPH' },
                    { value: 'kph', label: 'KPH' },
                  ]} />
                  <ToggleControl id="huddev-engine" label="Engine running" checked={hudData.engineState} onChange={(value) => patchVehicleTelemetry({ engineState: value })} />
                  <ToggleControl id="huddev-belt" label="Seatbelt" checked={hudData.belt} onChange={(value) => patch({ belt: value })} />
                  <ToggleControl id="huddev-harness" label="Harness" checked={hudData.harness} onChange={(value) => patch({ harness: value })} />
                  <ToggleControl id="huddev-cruise" label="Cruise active" checked={hudData.cruiseActive} onChange={(value) => patch({ cruiseActive: value, cruiseSpeed: value ? (hudData.cruiseSpeed || hudData.speed) : 0 })} />
                  <ToggleControl id="huddev-headlights" label="Headlights" checked={hudData.headlights > 0} onChange={(value) => patch({ headlights: value ? 2 : 0 })} />
                  <ToggleControl id="huddev-nos-visible" label="NOS installed" checked={hudData.nosVisible} onChange={(value) => patch({ nosVisible: value, nosActive: value ? hudData.nosActive : false })} />
                  <ToggleControl id="huddev-nos-active" label="NOS firing" checked={hudData.nosActive} onChange={(value) => patch({ nosActive: value, nosVisible: value || hudData.nosVisible })} disabled={!hudData.nosVisible} />
                </Section>

                <Section eyebrow="Aircraft" title="Flight state">
                  <ToggleControl id="huddev-aircraft" label="Aircraft occupied" checked={hudData.aircraftVisible || hudData.forceAircraftHud} onChange={toggleAircraft} />
                  <div className="hud-dev-metric-grid">
                    <RangeControl id="huddev-airspeed" label="Airspeed" value={hudData.airspeed} min={0} max={500} onChange={(value) => patch({ airspeed: value })} format={(value) => `${Math.round(value)} KTS`} />
                    <RangeControl id="huddev-altitude" label="Altitude MSL" value={hudData.altitude} min={0} max={12000} step={10} onChange={(value) => patch({ altitude: value })} />
                    <RangeControl id="huddev-altitude-agl" label="Altitude AGL" value={hudData.altitudeAgl} min={0} max={6000} step={10} onChange={(value) => patch({ altitudeAgl: value })} />
                    <RangeControl id="huddev-air-fuel" label="Fuel" value={hudData.aircraftFuel} onChange={(value) => patch({ aircraftFuel: value, aircraftHasFuelProvider: true })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-air-engine" label="Engine" value={hudData.aircraftEngineHealth} onChange={(value) => patch({ aircraftEngineHealth: value, engines: [value, Math.min(100, value + 18)] })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-hydraulics" label="Hydraulics" value={(hudData.aircraftHydraulicsHealth ?? 1000) / 10} onChange={(value) => patch({ aircraftHydraulicsHealth: value * 10, aircraftHydraulicsHudEnabled: true })} format={(value) => `${Math.round(value)}%`} />
                    <RangeControl id="huddev-tail-rotor" label="Tail rotor" value={(hudData.aircraftTailRotorHealth ?? 1000) / 10} onChange={(value) => patch({ aircraftTailRotorHealth: value * 10, aircraftIsHelicopter: true })} format={(value) => `${Math.round(value)}%`} />
                  </div>
                  <ToggleControl id="huddev-heli" label="Helicopter" checked={hudData.aircraftIsHelicopter} onChange={(value) => patch({ aircraftIsHelicopter: value })} />
                  <ToggleControl id="huddev-gear-down" label="Landing gear down" checked={hudData.aircraftGearDown} onChange={(value) => patch({ aircraftGearDown: value })} />
                  <ToggleControl id="huddev-hyd-enabled" label="Hydraulics indicator" checked={hudData.aircraftHydraulicsHudEnabled} onChange={(value) => patch({ aircraftHydraulicsHudEnabled: value })} />
                  <ToggleControl id="huddev-stall" label="Stall warning" checked={hudData.aircraftStalled} onChange={(value) => patch({ aircraftStalled: value })} />
                </Section>
              </>
            )}

            {activeTab === 'world' && (
              <>
                <Section eyebrow="Location" title="Navigation context">
                  <SelectControl
                    id="huddev-location-style"
                    label="Display style"
                    value={hudData.locationDisplayStyle || 'current'}
                    onChange={(value) => patch({ locationDisplayStyle: value })}
                    options={LOCATION_DISPLAY_OPTIONS}
                  />
                  <div className="hud-dev-field-pair">
                    <TextControl id="huddev-street" label="Street" value={hudData.street} onChange={(value) => patch({ street: value })} placeholder="Street" />
                    <TextControl id="huddev-zone" label="Zone" value={hudData.zone} onChange={(value) => patch({ zone: value })} placeholder="Zone" />
                    <TextControl id="huddev-zone-code" label="Zone code" value={hudData.zoneCode} onChange={(value) => patch({ zoneCode: value.toUpperCase() })} placeholder="DELPE" />
                    <TextControl id="huddev-postal" label="Postal" value={hudData.postal} onChange={(value) => patch({ postal: value })} placeholder="821" />
                  </div>
                  <RangeControl id="huddev-heading" label="Heading" value={hudData.heading} min={0} max={360} onChange={(value) => patch({ heading: value })} format={(value) => `${Math.round(value)}°`} />
                  <RangeControl id="huddev-waypoint" label="Waypoint" value={Math.max(0, hudData.waypointDist)} min={0} max={5000} step={10} onChange={(value) => patch({ waypointDist: value > 0 ? value : -1, waypointUnit: value > 0 ? 'm' : '' })} format={(value) => value > 0 ? `${Math.round(value)}m` : 'OFF'} />
                </Section>

                <Section eyebrow="Presentation" title="Layout variants">
                  <SelectControl id="huddev-framework" label="Framework" value={hudData.devFrameworkOverride ?? ''} onChange={(value) => patch({ devFrameworkOverride: value === '' ? null : value })} description="Controls whether needs are available." options={[
                    { value: '', label: 'Server default' },
                    { value: 'esx', label: 'ESX / ox_core' },
                    { value: 'qb', label: 'QBCore' },
                    { value: 'standalone', label: 'Standalone' },
                  ]} />
                  <SelectControl id="huddev-shape" label="Status shape" value={hudData.resolvedStatusIconShape || 'bar'} onChange={(value) => patch({ statusIconShape: value, resolvedStatusIconShape: value })} options={STATUS_SHAPES} />
                  <SelectControl id="huddev-oxygen-location" label="Oxygen display" value={hudData.oxygenDisplayLocation || 'statusCluster'} onChange={(value) => patch({ oxygenDisplayLocation: value })} options={[
                    { value: 'statusCluster', label: 'Status cluster' },
                    { value: 'indicator', label: 'Indicator bar' },
                  ]} />
                  <SelectControl id="huddev-fuel-style" label="Fuel style" value={hudData.resolvedFuelDisplayStyle || 'bar'} onChange={(value) => patch({ fuelDisplayStyle: value, resolvedFuelDisplayStyle: value })} options={[
                    { value: 'bar', label: 'Bar' },
                    { value: 'radial', label: 'Radial' },
                  ]} />
                  <ToggleControl id="huddev-sectioned-bars" label="Sectioned status bars" checked={hudData.sectionedBars} onChange={(value) => patch({ sectionedBars: value })} />
                  <ToggleControl id="huddev-sectioned-indicator" label="Segmented top bar" checked={hudData.sectionedIndicator} onChange={(value) => patch({ sectionedIndicator: value })} />
                </Section>

                <Section eyebrow="Dynamic weather" title="Warnings and forecast">
                  <ToggleControl id="huddev-weather" label="Forecast visible" checked={hudData.dynamicWeatherShow && hudData.showDynamicWeather} onChange={(value) => patch({ dynamicWeatherResourceAvailable: true, showDynamicWeather: value, dynamicWeatherShow: value, dynamicWeatherDisplay: value ? (hudData.dynamicWeatherDisplay || 'THUNDER') : '', dynamicWeatherForecastLine: value ? (hudData.dynamicWeatherForecastLine || 'Heavy rain moving east') : '' })} />
                  <div className="hud-dev-field-pair">
                    <TextControl id="huddev-weather-name" label="Weather" value={hudData.dynamicWeatherDisplay} onChange={(value) => patch({ dynamicWeatherDisplay: value, dynamicWeatherShow: true, showDynamicWeather: true })} placeholder="THUNDER" disabled={!hudData.dynamicWeatherShow} />
                    <TextControl id="huddev-season" label="Season" value={hudData.dynamicWeatherSeason} onChange={(value) => patch({ dynamicWeatherSeason: value })} placeholder="SUMMER" disabled={!hudData.dynamicWeatherShow} />
                  </div>
                  <TextControl id="huddev-forecast" label="Forecast line" value={hudData.dynamicWeatherForecastLine} onChange={(value) => patch({ dynamicWeatherForecastLine: value })} placeholder="Heavy rain moving east" disabled={!hudData.dynamicWeatherShow} />
                  <ToggleControl id="huddev-flood" label="Flash flood strip" checked={hudData.floodWarningActive} onChange={(value) => patch({ floodWarningActive: value, floodWarningDetail: value ? (hudData.floodWarningDetail || 'Seek higher ground') : '' })} />
                  <ToggleControl id="huddev-hurricane" label="Hurricane strip" checked={hudData.hurricaneWarningActive} onChange={(value) => patch({ hurricaneWarningActive: value, hurricaneWarningDetail: value ? (hudData.hurricaneWarningDetail || 'Evacuation advised') : '', showHurricaneWarning: true })} />
                </Section>
              </>
            )}
          </div>

          <footer className="hud-dev-footer">
            <button
              type="button"
              className="hud-dev-open-settings"
              onClick={() => onOpenSettingsModal(getDefaultOpenSettingsPayload(hudData))}
            >
              Open player settings
            </button>
            <p>Browser changes stay in this page. No NUI callback or game state is written.</p>
          </footer>
        </>
      )}
    </aside>
  )
}

export default HudDevPanel
