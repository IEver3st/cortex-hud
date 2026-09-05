import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(
  path.join(testDir, '..', 'modules', 'settings', 'client.lua'),
  'utf8',
).replace(/\r\n/g, '\n')
const weatherSource = readFileSync(
  path.join(testDir, '..', 'modules', 'integrations', 'client', 'dynamic_weather.lua'),
  'utf8',
).replace(/\r\n/g, '\n')
const initSource = readFileSync(
  path.join(testDir, '..', 'init.lua'),
  'utf8',
).replace(/\r\n/g, '\n')

assert.doesNotMatch(
  source,
  /lib\.settings/,
  'HUD settings must not load a private settings store separate from cortex-lib',
)
assert.match(
  source,
  /exports\['cortex-lib'\]:getSetting\(libKey\)/,
  'HUD runtime reads must use the same central store as the shared menu',
)
assert.match(
  source,
  /exports\['cortex-lib'\]:setSetting\(key, value\)/,
  'HUD persistence must use the same central store as the shared menu',
)
assert.match(
  source,
  /function Settings\.initialize\(\)[\s\S]*registerSettingsScript\('cortex-hud', getSettingsDefinition\(\)\)[\s\S]*Settings\.apply\(Settings\.get\(\), \{ refreshMinimap = false \}\)/,
  'HUD startup must register its settings schema before reading and applying persisted values',
)
assert.doesNotMatch(
  source,
  /Wait\(2000\)[\s\S]*Settings\.apply\(Settings\.get\(\)\)/,
  'HUD settings startup must not depend on a timing delay',
)
const initializeIndex = initSource.indexOf('Settings.initialize()')
assert.ok(initializeIndex >= 0, 'HUD bootstrap must initialize settings')
for (const consumerModule of [
  'modules.threads.client.hud',
  'modules.status.client',
  'modules.layout.client',
  'modules.radio.client',
]) {
  assert.ok(
    initializeIndex < initSource.indexOf(consumerModule),
    `persisted settings must initialize before loading ${consumerModule}`,
  )
}
for (const consumerStart of [
  'ScreenEffects.start(',
  'hud.start(',
  'Status.start(',
  'ScreenLayout.start(',
  'Radio.start(',
]) {
  assert.ok(
    initializeIndex < initSource.indexOf(consumerStart),
    `persisted settings must initialize before ${consumerStart}`,
  )
}
assert.doesNotMatch(
  weatherSource,
  /lib\.settings/,
  'dynamic weather must not read stale values from a private settings store',
)
assert.match(weatherSource, /exports\['cortex-lib'\]:getSetting\(key\)/)
assert.match(
  source,
  /hud_locationDisplayStyle\s*=\s*'locationDisplayStyle'/,
  'location display style must use the shared cortex-lib settings contract',
)
assert.match(
  source,
  /\{ value = 'off', label = 'Off' \}[\s\S]*\{ value = 'current', label = 'Current' \}[\s\S]*\{ value = 'gta6', label = 'Leonida' \}/,
  'the shared settings dropdown must expose off, current, and Leonida styles',
)
assert.match(
  source,
  /local function normalizeLocationDisplayStyle\(value\)[\s\S]*if value == 'gta6' then[\s\S]*return 'current'/,
  'unknown persisted location styles must fall back to current',
)

const commandMatch = source.match(
  /RegisterCommand\('hudsettings', function\(\)([\s\S]*?)\nend, false\)/,
)

assert.ok(commandMatch, 'the hudsettings command must remain registered')
assert.match(
  commandMatch[1],
  /exports\['cortex-lib'\]:openSettingsMenu\(\)/,
  'the I-bound hudsettings command must open the shared Cortex settings menu',
)
assert.doesNotMatch(
  commandMatch[1],
  /Settings\.open\(\)/,
  'the I-bound hudsettings command must not open the HUD-only settings modal',
)
assert.match(
  source,
  /RegisterKeyMapping\('hudsettings', 'Open (?:HUD|Cortex) Settings', 'keyboard', 'I'\)/,
  'the shared Cortex settings menu must remain mapped to I by default',
)

console.log('settings keybind contract: PASS')
