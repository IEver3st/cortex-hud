import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const read = (...segments) => readFileSync(path.join(testDir, '..', ...segments), 'utf8')
  .replace(/\r\n/g, '\n');

const settingsLua = read('modules', 'settings', 'client.lua');
const configLua = read('config', 'shared.lua');
const appSource = read('web', 'src', 'App.jsx');
const modalSource = read('web', 'src', 'components', 'SettingsModal.jsx');
const hudStyles = read('web', 'src', 'components', 'HUD.css');
const indicatorStyles = read('web', 'src', 'components', 'Indicator.css');
const aircraftStyles = read('web', 'src', 'components', 'AircraftHUD.css');
const locationStyles = read('web', 'src', 'locationDisplayStyle.js');
const combinedSource = [settingsLua, configLua, appSource, modalSource, hudStyles, locationStyles].join('\n');

assert.doesNotMatch(
  combinedSource,
  /panelOpacity|hud_panelOpacity|Panel opacity|--es-panel-opacity/,
  'panel opacity must be removed from configuration, persistence, and both settings surfaces',
);

assert.match(settingsLua, /label = 'Leonida UI'/, 'the shared HUD settings must use the Leonida UI name');
assert.match(locationStyles, /\{ value: 'gta6', label: 'Leonida' \}/, 'the preserved location value must expose the Leonida label');
assert.doesNotMatch(combinedSource, /GTA 6/, 'user-facing source copy must not retain the old GTA 6 name');

const hudStyleSection = settingsLua.match(/\{ label = 'HUD Style', keys = \{[^\n]+\} \}/);
assert.ok(hudStyleSection, 'the shared settings schema must define one HUD Style section');

assert.match(
  settingsLua,
  /local function buildColorOptions\([\s\S]*?local colorOptions = buildColorOptions\(/,
  'HUD color defaults must be included in the options sent to cortex-lib',
);
const colorSettings = [
  'hud_color_health',
  'hud_color_armor',
  'hud_color_hunger',
  'hud_color_thirst',
  'hud_color_stress',
  'hud_color_oxygen',
  'hud_color_ammo',
];
for (const key of colorSettings) {
  const setting = settingsLua.match(
    new RegExp(`key = '${key}'[\\s\\S]*?options = ([A-Za-z_][A-Za-z0-9_]*)`),
  );
  assert.equal(setting?.[1], 'colorOptions', `${key} must use the validated dynamic color options`);
}

for (const key of [
  'hud_colorPreset',
  'hud_backdropBlur',
  'hud_locationDisplayStyle',
  'hud_gta6HudEnabled',
  'hud_gta6AuthenticWeaponHud',
  'hud_gta6ShowWeaponName',
  'hud_gta6VehicleIdentification',
]) {
  assert.match(hudStyleSection[0], new RegExp(`'${key}'`), `${key} must live under HUD Style`);
}

assert.match(hudStyles, /--es-glass-blur:\s*calc\(12px \* var\(--es-ui-scale\) \* var\(--es-backdrop-blur\)\);/);
assert.match(hudStyles, /--es-glass-filter:\s*blur\(var\(--es-glass-blur\)\) saturate\(1\.12\);/);
assert.match(appSource, /setProperty\('--es-backdrop-blur', String\(blur\)\)/, 'the saved setting must drive the CSS blur multiplier');

for (const [name, source, selector] of [
  ['waypoint', hudStyles, '.waypoint-distance'],
  ['status icon', hudStyles, '.status-icon-shell'],
  ['ammo', hudStyles, '.ammo-display.ammo-variant-inline'],
  ['indicator', indicatorStyles, '.indicator-container'],
  ['aircraft readouts', aircraftStyles, '.aircraft-readouts'],
]) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    source,
    new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*?backdrop-filter:\\s*var\\(--es-glass-filter\\);`),
    `${name} glass must consume the working blur filter`,
  );
}

console.log('HUD style settings contract: PASS');
