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
- **Native vehicle radio replacement** — a continuous station/track carousel with authentic square station artwork, active-device mute guidance, Live Radio/On Demand modes, a contextual cortex-lib mode hint, and live station, song, and artist metadata.
- **Optional custom weapon wheel** — an eight-station, mouse/gamepad-directed selector that reads the packaged weapon catalog, cycles every owned weapon inside its native category, and falls back to GTA's wheel when disabled, unavailable, driving, swimming, or parachuting.
- **Fuel integration** — auto-detects `ox_fuel`, `ps-fuel`, `cdn-fuel`, `LegacyFuel`, `qb-fuel`, `esx_fuel`, and many others; falls back to native fuel with low-fuel alerts.
- **Seatbelt & harness** — seatbelt (`B`) with ejection protection, harness (`H`) with timed apply/remove and progress UI.
- **Cruise control** — toggle with `Y` (configurable), supports both speed-cap and auto-throttle modes.
- **Engine stall / breakdown** — impact-based stalling with power reduction, smoke damage, and breakdown after too many stalls.
- **Aircraft HUD** — altitude, airspeed (knots), heading, engine/rotor health, hydraulics proxy, landing gear, and searchlight.
- **Location display styles** — choose the current street/zone/compass strip or a Leonida map-width location plaque; optional `nearest-postal` data remains available to the current strip.
- **Dynamic weather strip** — integrates `Dynamic_weather` / `dynamic_weather` for current/next weather and ETA, plus flash-flood/hurricane warnings.
- **Polcam integration** — hides the HUD when polcam is active and optionally forces the aircraft HUD overlay for the pilot.
- **Cinematic mode** — hides the HUD and radar for clean screenshots/recordings.
- **Settings UI** — open with `/hudsettings` (`I`) to switch layout/color presets, shape styles, blur/opacity, and move speedometer/ammo via drag.
- **World-space vehicle doors** — the nearest unlocked, intact door presents one grounded `OPEN`/`CLOSE` action at its physical bone while Leonida UI is active. A 220 ms hold fills the outer ring before the panel moves; destroyed or burning vehicles are not eligible.
- **Locked-vehicle access actions** — nearby locked, driveable side windows present stacked `CLONE KEY` and `SMASH WINDOW` actions with the same quick ring confirmation. Cloning uses a movement-safe phone animation and a 1 to 4 round white-ring/pink-sweep timing challenge while the server retains proximity, vehicle-health, token, minimum-time, lock-state, and key-provider authority.
- **Visibility reason system** — multiple independent reasons (`user`, `external`, `polcam`, `cinematic`, `framework`, `qbxCharacter`, `qbxSpawn`) all must be true for the HUD to show, making it easy for external scripts to hide/show the HUD safely.

---

## Dependencies

| Resource | Required | Notes |
|----------|----------|-------|
| **cortex-lib** | **Yes** | Must start before `cortex-hud`; provides settings, notifications, progress bars, and interaction prompts. |
| nearest-postal | Optional | Enables postal code/distance in the location strip. |
| polcam | Optional | Auto-detected; hides HUD when active. |
| Dynamic_weather / dynamic_weather | Optional | Enables the weather forecast strip and warnings. |
| qbx_vehiclekeys / qb-vehiclekeys | Optional | Receives cloned keys when running; otherwise the built-in runtime-session standalone access fallback is used. |
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
| Hold `E` briefly | Open or close the nearest eligible vehicle door while its world prompt is visible. |
| `G` | Smash the nearest eligible locked vehicle window after the hammer animation. |
| `K` | Clone a key for the nearest eligible locked vehicle after the phone hacking sequence. |
| `B` | Toggle seatbelt (when enabled in config). |
| `H` | Toggle racing harness (when enabled in config). |
| Hold `Q` / controller D-pad Left | Open the continuous vehicle-radio selector. |
| Mouse wheel / Left-Right while open | Move through stations or on-demand tracks; the list wraps at both ends. |
| `R` / controller `B` while open | Switch between Live Radio and On Demand. |
| `X` / controller `A` while open | Mute or resume the selected station; the inline control shows only the currently active keyboard or gamepad binding. |
| `,` / `.` | Quick previous/next radio selection. |
| Hold `Tab` / controller `LB` | Open the custom weapon wheel when its setting is enabled and the player is on foot. |
| Mouse / right stick while open | Highlight one of the eight weapon categories. |
| Mouse wheel while open | Move selection between the eight slots; the highlight wraps at both ends. |
| Arrow Left-Right / `,`-`.` / controller D-pad Left-Right while open | Cycle every owned weapon in the highlighted category; release `Tab` / `LB` to equip. |

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
| `setRadioMuted(muted)` | `boolean` | `boolean` | Mute/resume the native vehicle radio; returns whether state changed. |
| `isRadioMuted()` | — | `boolean` | Whether the radio replacement is muted. |
| `setRadioMode(mode)` | `'radio' \| 'onDemand'` | `boolean` | Change playback/browsing mode. |
| `getRadioMode()` | — | `string` | Current Live Radio/On Demand mode. |
| `setRadioStation(stationName)` | `string` | `boolean` | Select a configured native station by name. |

---

## Configuration

All tuning is in `config/shared.lua`.

### Quick options

| Option | Default | Description |
|--------|---------|-------------|
| `Config.framework` | `'standalone'` | `'standalone'` or `'qbx'` for QBX/QBCore player-loaded hooks. |
| `Config.speedUnit` | `'mph'` | Speed display unit: `'mph'` or `'kph'`. |
| `Config.disableSpeedometer` | `false` | Disable the vehicle speedometer entirely. |
| `Config.Radio.enabled` | `true` | Enable the native vehicle-radio module. |
| `Config.Radio.replaceDefaultWheel` | `true` | Replace GTA's radio wheel and quick station controls with the continuous selector. |
| `Config.Radio.onDemandEnabled` | `true` | Allow deterministic browsing of catalogued music tracks. |
| `Config.Radio.defaultStation` | `'RADIO_01_CLASS_ROCK'` | Station restored when no remembered valid selection exists. |
| `Config.Radio.modeKeyboardLabel` | `'R'` | Keyboard key shown by the cortex-lib mode-switch hint. |
| `Config.Radio.modeGamepadLabel` | `'B'` | Gamepad key shown by the cortex-lib mode-switch hint. |
| `Config.Radio.modeHintPriority` | `40` | Arbitration priority for the contextual bottom-right cortex-lib action. |
| `Config.Radio.muteKeyboardLabel` | `'X'` | Keyboard key shown by the inline mute control. |
| `Config.Radio.muteGamepadLabel` | `'A'` | Gamepad key shown only while gamepad input is active. |
| `Config.Radio.inputModePollInterval` | `100` | Milliseconds between active-input checks while the selector is visible. |
| `Config.WeaponWheel.enabled` | `false` | Replace GTA's on-foot wheel with the eight-station Cortex selector. Players can override this in Cortex settings. |
| `Config.WeaponWheel.allowInVehicles` | `false` | Opt into custom selection in vehicles. The safe default leaves vehicle-specific weapon handling to GTA. |
| `Config.WeaponWheel.deadzone` | `0.22` | Directional deadzone before a category changes. |
| `Config.WeaponWheel.mouseSensitivity` | `2.2` | Speed of the persistent radial mouse selector. |
| `Config.WeaponWheel.screenBlur` | `true` | Use GTA's native screen blur while the custom wheel is open. |
| `Config.WeaponWheel.additionalWeapons` | `{}` | Optional add-on weapon records with `label`, `name`, `icon`, and one of the documented eight category IDs. |
| `Config.disableWantedLevel` | `true` | Continuously clear the native wanted level. |
| `Config.cinematicKey` | `'F7'` | Default key for cinematic mode. |
| `Config.cruiseControl.enabled` | `true` | Enable cruise control. |
| `Config.useBuiltInSeatbeltLogic` | `false` | Enable the built-in seatbelt system. |
| `Config.useHarnessSystem` | `false` | Enable the racing harness system. |
| `Config.useStallSystem` | `false` | Enable impact-based engine stalling. |
| `Config.EnablePostal` | `false` | Show postal codes in the location strip. |
| `Config.locationDisplayStyle` | `'current'` | Default location presentation: `'off'`, `'current'`, or `'gta6'`. |
| `Config.voipResource` | `'auto'` | VOIP resource to use, or `'auto'` for detection. |
| `Config.showDynamicWeather` | `false` | Show the Dynamic_weather forecast strip. |
| `Config.VehicleDoorInteractions.enabled` | `true` | Enable the validated world-space vehicle door action. |
| `Config.VehicleDoorInteractions.holdDuration` | `220` | Milliseconds required to fill the prompt ring before a door action runs. |
| `Config.VehicleDoorInteractions.panelOffsets` | See config | Fine-tune front door, rear door, hood, and trunk prompts in vehicle-local metres. Positive Y is forward and negative Y is rearward. |
| `Config.VehicleDoorInteractions.transitionTimeout` | `1600` | Keep the intended OPEN/CLOSE label stable while the physical door animation catches up, then fall back to the measured state. |
| `Config.VehicleAccessInteractions.enabled` | `true` | Enable locked-vehicle key cloning and window smashing actions. |
| `Config.VehicleAccessInteractions.holdDuration` | `220` | Milliseconds required to fill the prompt ring before an access action begins. |
| `Config.VehicleAccessInteractions.cloneKey.provider` | `'auto'` | Prefer `qbx_vehiclekeys`, then `qb-vehiclekeys`, then the runtime-session standalone fallback. |
| `Config.VehicleAccessInteractions.cloneKey.allowStandalone` | `true` | Permit standalone cloned access when no supported key resource is running. |
| `Config.VehicleAccessInteractions.cloneKey.qte` | See config | Bound the clone challenge to 1 to 4 rounds and tune spin time, target window, intro, and between-round timing. |
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
├── data/radio_catalog.json # Generated, pinned GTA V song/artist and track lookup
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
│   ├── interactions/             # Vehicle door/access gameplay and server checks; cortex-lib renders prompts
│   ├── radio/client.lua         # Native station, mute, on-demand, input, metadata, and NUI lifecycle
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

### Radio metadata

`data/radio_catalog.json` is a deterministic generated artifact. Regenerate it with `node scripts/generate-radio-catalog.mjs`; the generator pins the exact [GTA V Radio Dumps](https://github.com/HintSystem/GTA-V-Radio-Dumps) commit and refuses unexpectedly incomplete input. Station identifiers follow the [official Cfx.re radio-station reference](https://docs.fivem.net/docs/game-references/radiostations/). The old [Vina-Radio](https://github.com/VinaStar/Vina-Radio) project was used only as evidence that a custom selector is viable; no Vina code or assets are included.

The 27 station artwork files are also pinned and checksum-manifested. Regenerate them with `node scripts/generate-radio-icons.mjs`; provenance and third-party rights are documented in `web/public/radio-icons/manifest.json` and `web/third-party/gta-radio-icons-NOTICE.txt`. The selector preserves each source image's aspect ratio inside a square frame and falls back to the configured station initials if an asset cannot load.

---

## Limitations

- **Requires `cortex-lib`** — this resource will not start without it.
- **Build step required** — source checkouts must generate `web/dist` with `bun run build` before use; release archives include the compiled NUI.
- **Minimap texture replacement** relies on `stream/squaremap.ytd`; disable it in config if you use a different minimap texture pack.
- **Aircraft hydraulics** is a proxy computed from body health and wing/control-panel damage because GTA V does not expose a dedicated elevator/hydraulics scalar.
- **Framework support** currently covers `standalone` and `qbx`; other frameworks may require bridge additions.
- **Radio playback is client-local** — FiveM does not synchronize a vehicle's exact radio track between players. The selector does not add a server event or audio-streaming layer.
- **Radio metadata is best effort** — GTA adverts, DJ speech, Media Player, Self Radio, custom add-on stations, and unknown game-build tracks fall back to a live-broadcast label.
- **On-demand mixes require runtime verification** — direct songs use the documented station/track natives; continuous DJ mixes use Rockstar's native mix offset and can vary by target game build.
- **Experimental features** — `fxmanifest.lua` enables `lua54`, `use_experimental_fxv2_oal`, and strict NUI callbacks. Test on your target server build.

---

## License

[MIT](LICENSE) © 2026 Ever3st

The bundled GTA V radio station names, logos, and related game artwork are not covered by this resource's MIT license. Those rights remain with Rockstar Games and Take-Two Interactive; see `web/third-party/gta-radio-icons-NOTICE.txt`.

---

## Disclaimer

`cortex-hud` is an independent FiveM community resource. It is **not affiliated with, endorsed by, or sponsored by Cfx.re, Rockstar Games, Take-Two Interactive, QBCore, QBX, or any other third-party project** mentioned in the documentation. All product names, trademarks, and registered trademarks are the property of their respective owners.
