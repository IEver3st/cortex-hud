# cortex-hud — Minimalist High-Performance HUD

A lightweight, customizable FiveM HUD built with React + Vite on the NUI side and modular Lua on the client. It replaces the default radar/health layout with a modern, reason-based visibility system, a custom square minimap, vehicle gauges, aircraft instruments, seatbelt/harness/cruise logic, engine stalling, and runtime VOIP/fuel integrations.

[![FiveM](https://img.shields.io/badge/FiveM-Resource-orange)](https://fivem.net/)
[![Lua](https://img.shields.io/badge/Lua-5.4-blue)](https://www.lua.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

- **Custom square/round minimap** — texture replacement via `stream/squaremap.ytd`, layout/clip/mask tuning, big-map recovery, and external map resource detection.
- **Player status cluster** — health, armor, hunger, thirst, stress, oxygen with configurable icon shapes (bar, hexagon, circle, square) and color themes.
- **VOIP indicator** — auto-detects `pma-voice`, `saltychat`, `mumble-voip`, `tokovoip_script`, and `zerio-radio`; shows talking state, proximity range, and radio channel/talk.
- **Vehicle HUD** — speedometer (mph/kph), gear, RPM, fuel, engine health, lights; supports disabling the speedometer entirely.
- **Fuel integration** — auto-detects `ox_fuel`, `ps-fuel`, `cdn-fuel`, `LegacyFuel`, `qb-fuel`, `esx_fuel`, and many others; falls back to native fuel with low-fuel alerts.
- **Seatbelt & harness** — seatbelt (`B`) with ejection protection, harness (`H`) with timed apply/remove and progress UI.
- **Cruise control** — toggle with `Y` (configurable), supports both speed-cap and auto-throttle modes.
- **Engine stall / breakdown** — impact-based stalling with power reduction, smoke damage, and breakdown after too many stalls.
- **Aircraft HUD** — altitude, airspeed (knots), heading, engine/rotor health, hydraulics proxy, landing gear, and searchlight.
- **Location strip** — street name, zone, heading compass, and optional `nearest-postal` postal code/distance.
- **Dynamic weather strip** — integrates `Dynamic_weather` / `dynamic_weather` for current/next weather and ETA, plus flash-flood/hurricane warnings.
- **Polcam integration** — hides the HUD when polcam is active and optionally forces the aircraft HUD overlay for the pilot.
- **Cinematic mode** — hides the HUD and radar for clean screenshots/recordings.
- **Settings UI** — open with `/hudsettings` (`I`) to switch layout/color presets, shape styles, blur/opacity, and move speedometer/ammo via drag.
- **World-space vehicle doors** — the nearest unlocked, intact door presents one grounded `OPEN`/`CLOSE` action at its physical bone while GTA 6 HUD mode is active.
- **Visibility reason system** — multiple independent reasons (`user`, `external`, `polcam`, `cinematic`, `framework`, `qbxCharacter`, `qbxSpawn`) all must be true for the HUD to show, making it easy for external scripts to hide/show the HUD safely.

---

## Dependencies

| Resource | Required | Notes |
|----------|----------|-------|
| **cortex-lib** | **Yes** | Must start before `cortex-hud`; provides settings, notifications, and progress bars. |
| nearest-postal | Optional | Enables postal code/distance in the location strip. |
| polcam | Optional | Auto-detected; hides HUD when active. |
| Dynamic_weather / dynamic_weather | Optional | Enables the weather forecast strip and warnings. |
| ox_fuel / ps-fuel / cdn-fuel / LegacyFuel / qb-fuel / esx_fuel / etc. | Optional | Provides accurate fuel values; falls back to native fuel. |
| pma-voice / saltychat / mumble-voip / tokovoip_script / zerio-radio | Optional | Enables VOIP/radio status. |

---

## Installation

1. Make sure `cortex-lib` is installed and starts before `cortex-hud`.
2. Build the NUI with Bun:

   ```bash
   cd web
   bun install --frozen-lockfile
   bun run build
   ```

3. Copy the `cortex-hud` folder into your FiveM `resources` directory.
4. Add to `server.cfg`:

   ```cfg
   ensure cortex-lib
   ensure cortex-hud
   ```

5. Edit `config/shared.lua` to match your server framework and preferences.

---

## Building the UI

The `fxmanifest.lua` expects a built NUI at `web/dist/`:

```bash
cd web
bun install --frozen-lockfile
bun run build
```

`web/dist` and `web/node_modules` are intentionally ignored by `.gitignore`. Do not commit generated build output.

---

## Commands & Keybinds

| Command / Key | Description |
|---------------|-------------|
| `/togglehud` | Toggle the entire HUD on/off (user visibility reason). |
| `/hudsettings` (`I`) | Open the HUD settings menu. |
| `/cinematicmode` (`F7` by default) | Toggle cinematic mode (hides HUD + radar). |
| `/cortex_hud_cruise` (`Y` by default) | Toggle cruise control while driving. |
| `E` | Open or close the nearest eligible vehicle door while its world prompt is visible. |
| `B` | Toggle seatbelt (when enabled in config). |
| `H` | Toggle racing harness (when enabled in config). |

> Keys can be changed in `config/shared.lua` or via FiveM key mapping settings.

---

## Client Exports

These exports can be called from other client scripts:

| Export | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `toggleHud(state)` | `boolean?` | — | Toggle or set the `external` visibility reason. |
| `isHudVisible()` | — | `boolean` | Whether the HUD is currently visible. |
| `hideHud(reason?)` | `string?` | — | Hide the HUD for a custom reason. |
| `showHud(reason?)` | `string?` | — | Show the HUD for a custom reason. |
| `setHudVisible(visible)` | `boolean` | — | Set the `external` visibility reason directly. |
| `setHudVisibleReason(reason, visible)` | `string, boolean` | — | Set a named visibility reason. |
| `setCharacterSelectionActive(active)` | `boolean` | — | Hides HUD during QBX character selection. |
| `setSpawnSelectorActive(active)` | `boolean` | — | Hides HUD during QBX spawn selection. |
| `toggleMap(state?)` | `boolean?` | — | Toggle or set minimap visibility. |
| `refreshMinimap(reason?)` | `string?` | — | Request a minimap refresh/re-layout. |
| `isSeatbeltOn()` | — | `boolean` | Whether the seatbelt is fastened. |
| `toggleSeatbelt(state?)` | `boolean?` | — | Toggle or set seatbelt state. |
| `isHarnessOn()` | — | `boolean` | Whether the harness is fastened. |
| `toggleHarness(state?)` | `boolean?` | — | Apply/remove the harness. |
| `isEngineStalled()` | — | `boolean` | Whether the current vehicle engine is stalled. |
| `isEngineBroken()` | — | `boolean` | Whether the engine has broken down. |
| `getStallCount()` | — | `number` | Number of stalls for the current vehicle. |
| `getEnginePower()` | — | `number` | Current engine power multiplier (`1.0` = full). |
| `repairEngine(vehicle?)` | `entity?` | — | Repair engine and reset stall state. |
| `setForceAircraftHud(forced)` | `boolean` | — | Force the aircraft HUD overlay on/off. |
| `isAircraftHudForced()` | — | `boolean` | Whether the aircraft HUD is being forced. |
| `isCruiseControlActive()` | — | `boolean` | Whether cruise control is active. |
| `getSettingsDefinition()` | — | `table` | Returns the settings schema used by the settings UI. |

---

## Configuration

All tuning is in `config/shared.lua`.

### Quick options

| Option | Default | Description |
|--------|---------|-------------|
| `Config.framework` | `'standalone'` | `'standalone'` or `'qbx'` for QBX/QBCore player-loaded hooks. |
| `Config.speedUnit` | `'mph'` | Speed display unit: `'mph'` or `'kph'`. |
| `Config.disableSpeedometer` | `false` | Disable the vehicle speedometer entirely. |
| `Config.disableWantedLevel` | `true` | Continuously clear the native wanted level. |
| `Config.cinematicKey` | `'F7'` | Default key for cinematic mode. |
| `Config.cruiseControl.enabled` | `true` | Enable cruise control. |
| `Config.useBuiltInSeatbeltLogic` | `false` | Enable the built-in seatbelt system. |
| `Config.useHarnessSystem` | `false` | Enable the racing harness system. |
| `Config.useStallSystem` | `false` | Enable impact-based engine stalling. |
| `Config.EnablePostal` | `false` | Show postal codes in the location strip. |
| `Config.voipResource` | `'auto'` | VOIP resource to use, or `'auto'` for detection. |
| `Config.showDynamicWeather` | `false` | Show the Dynamic_weather forecast strip. |
| `Config.VehicleDoorInteractions.enabled` | `true` | Enable the validated world-space vehicle door action. |
| `Config.VehicleDoorInteractions.panelOffsets` | See config | Fine-tune front door, rear door, hood, and trunk prompts in vehicle-local metres. Positive Y is forward and negative Y is rearward. |
| `Config.defaultHudPreset` | `'classic'` | Default layout preset. |

### Layout presets

`Config.HudPresets` ships with four presets:

- `classic` — top-center indicator, bottom-left status, bottom-right speedometer.
- `street` — top-left indicator, bottom-center speedometer, neon accent theme.
- `dispatch` — utility-heavy, amber accents, right-side speedometer.
- `ghost` — minimal top-center readouts, soft monochrome, compact right-side driving HUD.

### Minimap

`Config.Minimap` controls clip type, size, mask, blur, and texture replacement targets. Set `textureReplacement.enabled = false` if you use a minimap pack that does not provide the squaremap textures.

---

## Architecture

```
cortex-hud/
├── fxmanifest.lua          # Resource manifest (cerulean, lua54, fxv2_oal, strict NUI callbacks)
├── init.lua                # Client entry point; loads config, settings, HUD threads
├── server.lua              # Restarts the `maps` resource on server start
├── config/shared.lua       # All user-facing configuration
├── modules/
│   ├── bridge/client.lua       # Framework hooks (standalone / QBX)
│   ├── cruise/client.lua       # Cruise control logic
│   ├── fuel/client.lua         # Fuel provider detection and alerts
│   ├── harness/client.lua      # Racing harness apply/remove
│   ├── integrations/client/dynamic_weather.lua  # Weather resource integration
│   ├── interactions/             # Interaction projection plus vehicle-door client/server checks
│   ├── seatbelt/client.lua     # Seatbelt logic
│   ├── settings/client.lua     # Settings UI, persistence, presets
│   ├── stall/client.lua        # Engine stall/breakdown logic
│   ├── status/client.lua       # Player status and VOIP state gathering
│   ├── threads/client/hud.lua  # Main HUD loop, visibility, exports
│   ├── threads/client/vehicle_status.lua  # Vehicle/aircraft data loop
│   └── utility/shared/         # Minimap helpers and vehicle math
└── web/
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx / main.jsx
        ├── components/            # HUD, AircraftHUD, Indicator, StatusOxygenHex, SettingsModal, etc.
        ├── hooks/                 # Motion/animation hooks
        └── hudPresets.js          # Default layout/theme presets
```

The client Lua threads read game state, then push updates to the React UI through `SendNUIMessage`. Settings changes are persisted through `cortex-lib` and applied back to both the UI and native game state (minimap clip, radar, colors, etc.).

---

## Limitations

- **Requires `cortex-lib`** — this resource will not start without it.
- **Build step required** — source checkouts must generate `web/dist` with `bun run build` before use; release archives include the compiled NUI.
- **Minimap texture replacement** relies on `stream/squaremap.ytd`; disable it in config if you use a different minimap texture pack.
- **Aircraft hydraulics** is a proxy computed from body health and wing/control-panel damage because GTA V does not expose a dedicated elevator/hydraulics scalar.
- **Framework support** currently covers `standalone` and `qbx`; other frameworks may require bridge additions.
- **Experimental features** — `fxmanifest.lua` enables `lua54`, `use_experimental_fxv2_oal`, and strict NUI callbacks. Test on your target server build.

---

## License

[MIT](LICENSE) © 2026 Ever3st

---

## Disclaimer

`cortex-hud` is an independent FiveM community resource. It is **not affiliated with, endorsed by, or sponsored by Cfx.re, Rockstar Games, Take-Two Interactive, QBCore, QBX, or any other third-party project** mentioned in the documentation. All product names, trademarks, and registered trademarks are the property of their respective owners.
