# Oxygen Indicator — Design Spec

**Date**: 2026-04-24  
**Status**: Approved

## Summary

Add a visible oxygen indicator that appears when the player is swimming/underwater. A new setting lets the user choose where it renders: in the bottom status cluster (full shape meter) or in the top indicator bar (icon + text).

Currently oxygen data is tracked in Lua and sent to NUI, but it only renders in the status cluster and is guarded behind `!isStandaloneFramework` — meaning it never shows in standalone mode even though oxygen is a native game mechanic.

## Requirements

- Oxygen indicator must appear when player is underwater (`oxygen < 100`)
- Must be visible in both standalone and framework modes
- Toggle setting: `oxygenDisplayLocation` — `"statusCluster"` (default) or `"indicator"`
- When "statusCluster": render as full shape meter using existing `renderStatusMeter` (bar / hexagon / circle)
- When "indicator": render as icon + percentage text inside the top Indicator bar, following the preset's indicator variant
- Must respect each design preset's theme color for oxygen
- Color-coded by criticality in indicator mode: preset color (>50%), amber (25-50%), red (<25%)

## Files Changed

### `config/shared.lua`
- Add `Config.oxygenDisplayLocation = "statusCluster"`

### `modules/settings/client.lua`
- Read/write `oxygenDisplayLocation` setting
- Send to NUI via `updateStatusConfig` action

### `web/src/App.jsx`

| Change | Detail |
|---|---|
| New state | `oxygenDisplayLocation: "statusCluster"` |
| `updateStatusConfig` handler | Store `oxygenDisplayLocation` from Lua |
| `Indicator` props | Pass `oxygen`, `oxygenDisplayLocation`, `oxygenColor` |
| `HUD` props | Pass `oxygenDisplayLocation` |

### `web/src/components/HUD.jsx`
- Remove `!isStandaloneFramework` guard on oxygen — show based on `oxygenDisplayLocation` only
- Gate: `{oxygenDisplayLocation === 'statusCluster' && oxygen < 100 && renderStatusMeter(oxygen, <BsLungsFill />, 'oxygen')}`

### `web/src/components/Indicator.jsx`
- New `IndicatorOxygen` internal component
- Color function: `>50%` → `oxygenColor`, `25-50%` → `#f59e0b`, `<25%` → `#ef4444` + CSS pulse class
- Render condition: `oxygenDisplayLocation === 'indicator' && oxygen < 100`
- Output: `<div className="indicator-box oxygen"><icon/><text>85%</text></div>`
- icon: `BsLungsFill` (already imported in HUD, need to import in Indicator)

### `web/src/components/Indicator.css`
- New rules for `.indicator-box.oxygen`
- `.indicator-box.oxygen.critical` — red pulse animation
- `.indicator-box.oxygen.low` — amber static
- Follows existing indicator variant styles (segmented/glass/slim/capsules)

### `web/src/components/SettingsModal.jsx`
- New field: "Oxygen Display" with options "Status Cluster" / "Indicator Bar"
- Maps to `oxygenDisplayLocation` setting

## Data Flow

```
Lua (status/client.lua)                React (App.jsx)
  getOxygenLevel() ──→ SendNUIMessage ──→ handleMessage('updateStatus')
    (returns 0-100)      {action:'updateStatus', oxygen:N}    setHudData({oxygen:N})
                                                                  │
                            ┌─────────────────────────────────────┤
                            │                                     │
                    oxygenDisplayLocation                 oxygenDisplayLocation
                       ="statusCluster"                      ="indicator"
                            │                                     │
                    HUD.jsx                              Indicator.jsx
                  renderStatusMeter()              IndicatorOxygen (icon+text)
                  (full shape: bar/hex/circle)     styled by variant + color
```

## Edge Cases

- **On land**: `getOxygenLevel()` returns 100 → not rendered in either location
- **Framework mode**: Standalone guard removed — oxygen is a native mechanic available to all
- **Preset switch**: Indicator variant class auto-applied via existing `.indicator-{variant}` CSS
- **Oxygen = 0**: Shows "0%", red critical state with pulse

## Omissions (Not in Scope)

- No change to Lua oxygen computation (`modules/status/client.lua:291-302` — already correct)
- No new FiveM natives or events
- No changes to VOIP or other status indicators
- No animation beyond the critical pulse in indicator mode
- No change to how `statusIconShape` determines shape rendering (already handled by `renderStatusMeter`)
