# Agent instructions — `es_hud` (FiveM NUI)

## Hard rule: no `backdrop-filter` on in-game HUD chrome

FiveM’s CEF build does **not** composite `backdrop-filter: blur()` like Chrome. It typically draws an **opaque black (or near-black) plane** behind the blurred layer. **Lighter `background` / `rgba` / `color-mix` does not remove that** — players still see dark “bars” behind HUD panels.

### Do not add (ever) to these surfaces

On any **floating HUD** that sits over the 3D world (not the settings modal):

- `backdrop-filter`
- `-webkit-backdrop-filter`

This applies to (non-exhaustive — grep before changing):

- `web/src/components/Indicator.css` — `.indicator-container`, `.indicator-capsules .indicator-box`
- `web/src/components/AircraftHUD.css` — `.aircraft-readouts`, `.aircraft-indicators`
- `web/src/components/HUD.css` — `.waypoint-distance`, `.voip-variant-boxed .voip-content-modern`, `.status-icon-shell`, `.ammo-display.ammo-variant-inline`, and similar world-overlay panels

### Required pattern instead

- `background: transparent` (or omit)
- Optional **thin light border** only, e.g. `border: 1px solid rgba(255, 255, 255, …)` (can scale with `--es-backdrop-norm` if the slider should still tune rim strength)
- **No** heavy `box-shadow` with black `rgba(0,0,0,…)` meant to fake depth on those panels
- **Readability:** `text-shadow` and/or `filter: drop-shadow(...)` on text/icons — not a filled card behind them

### Where blur-like UI is OK

- **Settings / editor UI** inside `SettingsModal.css` (fullscreen-ish, not over live gameplay) — different constraints; still avoid `backdrop-filter` if it misbehaves in CEF on your build.
- **SVG-only** elements (e.g. speedometer strokes) — not the same as `backdrop-filter` on a div.

### Before merging HUD styling changes

1. Grep: `backdrop-filter` / `-webkit-backdrop-filter` under `web/src/`.
2. If any hit maps to world-overlay HUD (above), **remove** and use the transparent + border + shadow-on-text pattern.
3. Run `npm run build` in `web/` so `web/dist/` matches `src/` (NUI serves `web/dist` per `fxmanifest.lua`).

### Why this file exists

Regressions happened by reintroducing “glass blur” for visual parity with browsers. **That cannot work reliably on FiveM NUI.** This doc blocks that class of change unless the runtime is verified to fix CEF compositing (assume it won’t).
