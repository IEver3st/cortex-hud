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
assert.doesNotMatch(
  weatherSource,
  /lib\.settings/,
  'dynamic weather must not read stale values from a private settings store',
)
assert.match(weatherSource, /exports\['cortex-lib'\]:getSetting\(key\)/)

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
