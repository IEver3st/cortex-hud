import React, { useCallback, useEffect, useState } from 'react'
import { getDefaultOpenSettingsPayload } from '../hudDevApply.js'
import './HudDevPanel.css'

const STATUS_SHAPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'circle', label: 'Circle' },
]

const PREVIEW_BG_PRESETS = ['#0a0a0c', '#1a1a2e', '#2d1f14', '#3d6a4a', '#6eb5ff', '#e8e8ee']

const HudDevPanel = ({
  hudData,
  setHudData,
  onOpenSettingsModal,
  onToggleCinematic,
  cinematicMode,
  playfieldColor,
  onPlayfieldColorChange,
}) => {
  const [open, setOpen] = useState(true)

  const patch = useCallback(
    (partial) => {
      setHudData((prev) => ({ ...prev, ...partial }))
    },
    [setHudData],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' || e.key === 'Backquote' || (e.shiftKey && e.key === 'Escape')) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
          return
        }
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div className={`hud-dev-panel${open ? '' : ' hud-dev-panel--collapsed'}`}>
      <div className="hud-dev-header" onClick={() => setOpen((o) => !o)} role="button" tabIndex={0}>
        <div>
          <div className="hud-dev-title">HUD dev</div>
          <div className="hud-dev-hint">` to toggle &middot; browser only</div>
        </div>
        <span className="hud-dev-hint" aria-hidden>
          {open ? '▾' : '◀'}
        </span>
      </div>
      {open && (
        <div className="hud-dev-body">
          <div className="hud-dev-section">
            <div className="hud-dev-section-title">View</div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-fwk">Framework</label>
              <select
                id="huddev-fwk"
                value={hudData.devFrameworkOverride ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  patch({ devFrameworkOverride: v === '' ? null : v })
                }}
                title="Standalone hides hunger/thirst; ESX/QB show them (same as in-game)"
              >
                <option value="">Server default</option>
                <option value="esx">ESX / ox_core needs</option>
                <option value="qb">QBCore / metadata</option>
                <option value="standalone">Standalone (no need meters)</option>
              </select>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-bg">Preview bg</label>
              <input
                id="huddev-bg"
                type="color"
                className="hud-dev-color"
                value={playfieldColor}
                onChange={(e) => onPlayfieldColorChange(e.target.value)}
                title="Browser-only backdrop (simulated world)"
              />
            </div>
            <div className="hud-dev-presets" role="group" aria-label="Preview background presets">
              {PREVIEW_BG_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`hud-dev-swatch${playfieldColor === hex ? ' hud-dev-swatch--active' : ''}`}
                  style={{ background: hex }}
                  onClick={() => onPlayfieldColorChange(hex)}
                  title={hex}
                  aria-label={`Set preview background ${hex}`}
                />
              ))}
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-visible">HUD visible</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.visible ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-visible"
                onClick={() => patch({ visible: !hudData.visible })}
                aria-pressed={hudData.visible}
                title="Toggle main HUD"
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-cine">Cinematic</label>
              <button
                type="button"
                className={`hud-dev-toggle${cinematicMode ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-cine"
                onClick={() => onToggleCinematic(!cinematicMode)}
                aria-pressed={cinematicMode}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-sectioned-bars">Sectioned bars</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.sectionedBars ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-sectioned-bars"
                onClick={() => patch({ sectionedBars: !hudData.sectionedBars })}
                aria-pressed={hudData.sectionedBars}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-sectioned-ind">Segmented top bar</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.sectionedIndicator ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-sectioned-ind"
                onClick={() => patch({ sectionedIndicator: !hudData.sectionedIndicator })}
                aria-pressed={hudData.sectionedIndicator}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-shape">Status shape</label>
              <select
                id="huddev-shape"
                value={hudData.resolvedStatusIconShape || 'bar'}
                onChange={(e) =>
                  patch({
                    statusIconShape: e.target.value,
                    resolvedStatusIconShape: e.target.value,
                  })
                }
              >
                {STATUS_SHAPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-o2">Oxygen in</label>
              <select
                id="huddev-o2"
                value={hudData.oxygenDisplayLocation}
                onChange={(e) => patch({ oxygenDisplayLocation: e.target.value })}
              >
                <option value="statusCluster">Status cluster</option>
                <option value="indicator">Indicator bar</option>
              </select>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-flood">Flash flood strip</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.floodWarningActive ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-flood"
                onClick={() =>
                  patch(
                    hudData.floodWarningActive
                      ? { floodWarningActive: false, floodWarningDetail: '' }
                      : {
                          floodWarningActive: true,
                          floodWarningDetail: 'Seek higher ground',
                        },
                  )
                }
                aria-pressed={hudData.floodWarningActive}
                title="Browser-only preview (in-game uses Dynamic_weather exports)"
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-hurricane">Hurricane strip</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.hurricaneWarningActive ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-hurricane"
                onClick={() =>
                  patch(
                    hudData.hurricaneWarningActive
                      ? { hurricaneWarningActive: false, hurricaneWarningDetail: '' }
                      : {
                          hurricaneWarningActive: true,
                          hurricaneWarningDetail: 'Evacuation advised',
                        },
                  )
                }
                aria-pressed={hudData.hurricaneWarningActive}
                title="Browser-only preview (in-game uses Dynamic_weather exports)"
              />
            </div>
          </div>

          <div className="hud-dev-section">
            <div className="hud-dev-section-title">Status</div>
            {['health', 'armor', 'hunger', 'thirst', 'stress', 'oxygen'].map((key) => (
              <div className="hud-dev-row" key={key}>
                <label htmlFor={`huddev-${key}`}>{key}</label>
                <input
                  id={`huddev-${key}`}
                  type="range"
                  min="0"
                  max="100"
                  value={Number(hudData[key] ?? 0)}
                  onChange={(e) => patch({ [key]: Number(e.target.value) })}
                />
                <span className="hud-dev-value">{Math.round(hudData[key] ?? 0)}</span>
              </div>
            ))}
            <div className="hud-dev-row">
              <label htmlFor="huddev-uw">Underwater</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.underwater ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-uw"
                onClick={() => patch({ underwater: !hudData.underwater })}
                aria-pressed={hudData.underwater}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-voip">VOIP talking</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.voipTalking ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-voip"
                onClick={() => patch({ voipTalking: !hudData.voipTalking, voipConnected: true })}
                aria-pressed={hudData.voipTalking}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-voip-prox">VOIP proximity</label>
              <input
                id="huddev-voip-prox"
                type="range"
                min="0"
                max="100"
                value={Math.round((Number.isFinite(hudData.voipProximity) ? hudData.voipProximity : 0.62) * 100)}
                onChange={(e) => patch({ voipProximity: Number(e.target.value) / 100, voipConnected: true })}
              />
              <span className="hud-dev-value">{Math.round((Number.isFinite(hudData.voipProximity) ? hudData.voipProximity : 0.62) * 100)}%</span>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-voip-range">VOIP range</label>
              <select
                id="huddev-voip-range"
                value={hudData.voipRange || 'normal'}
                onChange={(e) => patch({ voipRange: e.target.value, voipConnected: true })}
              >
                <option value="whisper">whisper</option>
                <option value="normal">normal</option>
                <option value="shout">shout</option>
              </select>
            </div>
          </div>

          <div className="hud-dev-section">
            <div className="hud-dev-section-title">Top bar (location)</div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-heading">Heading °</label>
              <input
                id="huddev-heading"
                type="range"
                min="0"
                max="360"
                value={hudData.heading ?? 0}
                onChange={(e) => patch({ heading: Number(e.target.value) })}
              />
              <span className="hud-dev-value">{Math.round(hudData.heading)}</span>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-street">Street</label>
              <input
                id="huddev-street"
                type="text"
                value={hudData.street}
                onChange={(e) => patch({ street: e.target.value })}
                placeholder="Street"
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-zone">Zone</label>
              <input
                id="huddev-zone"
                type="text"
                value={hudData.zone}
                onChange={(e) => patch({ zone: e.target.value })}
                placeholder="Zone"
              />
            </div>
          </div>

          <div className="hud-dev-section">
            <div className="hud-dev-section-title">Vehicle</div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-veh">Show vehicle HUD</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.vehicleVisible ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-veh"
                onClick={() =>
                  setHudData((prev) => {
                    const nextV = !prev.vehicleVisible
                    return {
                      ...prev,
                      vehicleVisible: nextV,
                      aircraftVisible: nextV ? false : prev.aircraftVisible,
                    }
                  })
                }
              />
            </div>
            {hudData.vehicleVisible && (
              <>
                <div className="hud-dev-row">
                  <label htmlFor="huddev-spd">Speed</label>
                  <input
                    id="huddev-spd"
                    type="range"
                    min="0"
                    max="200"
                    value={Math.min(200, Math.max(0, Math.round(hudData.speed || 0)))}
                    onChange={(e) => patch({ speed: Number(e.target.value) })}
                  />
                  <span className="hud-dev-value">{Math.round(hudData.speed)}</span>
                </div>
                <div className="hud-dev-row">
                  <label htmlFor="huddev-fuel">Fuel</label>
                  <input
                    id="huddev-fuel"
                    type="range"
                    min="0"
                    max="100"
                    value={hudData.fuel ?? 0}
                    onChange={(e) => patch({ fuel: Number(e.target.value), hasFuelProvider: true })}
                  />
                  <span className="hud-dev-value">{Math.round(hudData.fuel)}</span>
                </div>
                <div className="hud-dev-row">
                  <label htmlFor="huddev-belt">Seatbelt</label>
                  <button
                    type="button"
                    className={`hud-dev-toggle${hudData.belt ? ' hud-dev-toggle--on' : ''}`}
                    id="huddev-belt"
                    onClick={() => patch({ belt: !hudData.belt })}
                    aria-pressed={hudData.belt}
                  />
                </div>
              </>
            )}
          </div>

          <div className="hud-dev-section">
            <div className="hud-dev-section-title">Aircraft</div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-air">Aircraft overlay</label>
              <button
                type="button"
                className={`hud-dev-toggle${(hudData.forceAircraftHud || hudData.aircraftVisible) ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-air"
                onClick={() =>
                  setHudData((prev) => {
                    const on = prev.forceAircraftHud || prev.aircraftVisible
                    const next = !on
                    return {
                      ...prev,
                      forceAircraftHud: next,
                      aircraftVisible: next,
                      vehicleVisible: next ? false : prev.vehicleVisible,
                    }
                  })
                }
                aria-pressed={hudData.forceAircraftHud || hudData.aircraftVisible}
              />
            </div>
            {(hudData.forceAircraftHud || hudData.aircraftVisible) && (
              <div className="hud-dev-row">
                <label htmlFor="huddev-as">Airspeed</label>
                <input
                  id="huddev-as"
                  type="range"
                  min="0"
                  max="500"
                  value={Math.min(500, Math.round(hudData.airspeed || 0))}
                  onChange={(e) => patch({ airspeed: Number(e.target.value) })}
                />
                <span className="hud-dev-value">{Math.round(hudData.airspeed)}</span>
              </div>
            )}
          </div>

          <div className="hud-dev-section">
            <div className="hud-dev-section-title">Ammo / waypoint</div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-armed">Armed (crosshair test)</label>
              <button
                type="button"
                className={`hud-dev-toggle${hudData.isArmed ? ' hud-dev-toggle--on' : ''}`}
                id="huddev-armed"
                onClick={() => patch({ isArmed: !hudData.isArmed, showCrosshair: true })}
                aria-pressed={hudData.isArmed}
              />
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-clip">Ammo clip</label>
              <input
                id="huddev-clip"
                type="range"
                min="0"
                max="30"
                value={hudData.ammoClip < 0 ? 0 : Math.min(30, hudData.ammoClip)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (n <= 0) {
                    patch({ ammoClip: -1, isArmed: false })
                  } else {
                    patch({ ammoClip: n, isArmed: true, ammoReserve: 120 })
                  }
                }}
              />
              <span className="hud-dev-value">
                {hudData.ammoClip < 0 ? 'off' : hudData.ammoClip}
              </span>
            </div>
            <div className="hud-dev-row">
              <label htmlFor="huddev-wp">Waypoint (m)</label>
              <input
                id="huddev-wp"
                type="range"
                min="0"
                max="5000"
                value={hudData.waypointDist < 0 ? 0 : Math.min(5000, hudData.waypointDist)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (n <= 0) {
                    patch({ waypointDist: -1, waypointUnit: '' })
                  } else {
                    patch({ waypointDist: n, waypointUnit: 'm' })
                  }
                }}
              />
              <span className="hud-dev-value">
                {hudData.waypointDist < 0 ? '—' : Math.round(hudData.waypointDist)}
              </span>
            </div>
          </div>

          <div className="hud-dev-actions">
            <button
              type="button"
              className="hud-dev-btn-primary"
              onClick={() => onOpenSettingsModal(getDefaultOpenSettingsPayload())}
            >
              Open full settings&hellip;
            </button>
            <div className="hud-dev-note">
              NUI fetches to <code>https://&lt;resource&gt;/&hellip;</code> are skipped in the browser. Layout/colors
              from &ldquo;Save&rdquo; apply in-page only.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HudDevPanel
