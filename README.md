# es_hud - Minimalist High-Performance HUD

A lightweight FiveM HUD featuring a custom square minimap, player status, vehicle gauges, aircraft instruments, seatbelt logic, and an engine stall system.

## Dependencies

| Resource | Required | Notes |
|----------|----------|-------|
| **es_lib** | **Yes** | Must be started before es_hud. |
| **nearest-postal** | Optional | Provides postal code data for the location bar. |
| **polcam** | Optional | Auto-detected. HUD hides automatically when the helicopter camera is active. |

## Installation

1. Place `es_hud` in your resources directory.
2. Ensure `es_lib` is started before `es_hud` in your `server.cfg`.
3. Configure settings in `config/shared.lua`.

## Commands

| Command | Description |
|---------|-------------|
| `/togglehud` | Toggle HUD visibility on/off |

## Keybinds

| Key | Action |
|-----|--------|
| `B` | Toggle seatbelt (while in a vehicle) |

## Client Exports

### HUD Visibility

| Export | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `toggleHud(state)` | `boolean?` | — | Toggle or set HUD visibility. `nil` toggles, `true`/`false` sets directly. |
| `toggleMap(state)` | `boolean?` | — | Toggle or set minimap visibility. `nil` toggles, `true`/`false` sets directly. |
| `isHudVisible()` | — | `boolean` | Whether the HUD is fully visible (all visibility reasons are true). |
| `hideHud(reason)` | `string?` | — | Hide the HUD for a given reason (default `'external'`). Multiple reasons can hide the HUD independently. |
| `showHud(reason)` | `string?` | — | Show the HUD for a given reason (default `'external'`). |
| `setHudVisible(visible)` | `boolean` | — | Set the `'external'` visibility reason directly. |
| `setHudVisibleReason(reason, visible)` | `string?, boolean` | — | Set a specific visibility reason. |

### Seatbelt

| Export | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `isSeatbeltOn()` | — | `boolean` | Whether the seatbelt is currently fastened. |
| `toggleSeatbelt(state)` | `boolean?` | — | Toggle or set seatbelt state. |

### Engine Stall

| Export | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `isEngineStalled()` | — | `boolean` | Whether the engine is currently stalled. |
| `isEngineBroken()` | — | `boolean` | Whether the engine has broken down from too many stalls. |
| `getStallCount()` | — | `number` | Number of stalls for the current vehicle. |
| `getEnginePower()` | — | `number` | Current engine power multiplier (1.0 = full power). |
| `repairEngine(vehicle)` | `entity?` | — | Repair and reset stall state. Uses current vehicle if not specified. |

### Aircraft HUD

| Export | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setForceAircraftHud(forced)` | `boolean` | — | Force the aircraft HUD overlay on/off. Used by polcam. |
| `isAircraftHudForced()` | — | `boolean` | Whether the aircraft HUD is currently forced. |

## Visibility Reason System

es_hud uses a reason-based visibility system. The HUD is only visible when **all** reasons are `true`. Built-in reasons:

| Reason | Description |
|--------|-------------|
| `user` | Controlled by the `/togglehud` command. |
| `polcam` | Auto-managed when polcam is active. |
| `external` | Default reason for external scripts. |

Other resources can register custom reasons via `hideHud('myReason')` / `showHud('myReason')`.

## Events

| Event | Description |
|-------|-------------|
| `es_nos:update` | Receives NOS data from es_nos and forwards it to the NUI. |

## Configuration

All settings are in `config/shared.lua`.

### General

```lua
Config.UpdateInterval = 200          -- HUD update rate (ms)
Config.disableWantedLevel = true     -- Continuously clear wanted level
```

### Postal Codes

```lua
Config.EnablePostal = true           -- Show postal codes in the location bar
Config.ShowPostalDistance = false     -- Show distance to nearest postal
Config.PostalUpdateInterval = 400    -- Postal lookup rate (ms)
Config.PostalFile = "ocrp-postals.json"  -- Postal JSON file from nearest-postal resource
```

### Speed and Units

```lua
Config.speedUnit = "mph"             -- "mph" or "kph"
```

### Seatbelt

```lua
Config.useBuiltInSeatbeltLogic = true  -- Enable the built-in seatbelt system
Config.ejectMinSpeed = 20.0            -- Minimum speed for windshield ejection (in speedUnit)
```

### Engine Stall

```lua
Config.useStallSystem = true              -- Enable impact-based engine stalling
Config.stallImpactThreshold = 35.0        -- Minimum speed drop to trigger a stall (in speedUnit)
Config.stallDuration = 2000               -- How long the engine stays stalled before auto-restart (ms)
Config.stallRecoveryKey = 'E'             -- Key to manually restart (reserved)
Config.stallMaxCount = 6                  -- Max stalls before engine breakdown
Config.stallPowerReduction = 0.05         -- Power reduction per stall (5% each)
Config.stallBreakdownDisablesEngine = true -- Fully disable engine on breakdown

Config.stallSound = {                     -- Sound played on stall
    name = "Engine_fail",
    set = "DLC_PILOT_ENGINE_FAILURE_SOUNDS"
}

Config.restartSound = {                   -- Sound played on engine restart
    name = "CONFIRM_BEEP",
    set = "HUD_MINI_GAME_SOUNDSET"
}
```

### Polcam Integration

```lua
Config.PolcamForceAircraftHud = false  -- Force aircraft HUD for pilot when polcam is active
```

### Minimap

```lua
Config.Minimap = {
    sizeX   = 0.1638,    -- Minimap width
    sizeY   = 0.183,     -- Minimap height
    maskSizeX = 0.128,   -- Mask width
    maskSizeY = 0.20,    -- Mask height
    blurSizeX = 0.262,   -- Blur width
    blurSizeY = 0.300,   -- Blur height
}
```
