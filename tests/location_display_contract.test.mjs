import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(testDir, '..')
const source = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n')

const minimap = source('modules/utility/shared/minimap.lua')
const layout = source('modules/layout/client.lua')
const app = source('web/src/App.jsx')
const navigation = source('web/src/components/Gta6Navigation.jsx')
const navigationCss = source('web/src/components/Gta6Navigation.css')
const locationStyles = source('web/src/locationDisplayStyle.js')

assert.doesNotMatch(
  navigationCss,
  /\b(?:min|max)-width\s*:/,
  'the Leonida plaque must never clamp away from the runtime minimap width',
)
assert.match(
  minimap,
  /function minimap\.getLayout\(config\)/,
  'the minimap owner must expose the same rectangle it applies to the native component',
)
assert.match(
  minimap,
  /SetScriptGfxAlign[\s\S]*GetScriptGfxPosition[\s\S]*ResetScriptGfxAlign/,
  'runtime bounds must use the game safe-zone/aspect coordinate transform',
)
assert.match(
  layout,
  /minimapBounds\s*=\s*minimap\.getPixelBounds\(/,
  'the client layout payload must include bounded runtime minimap pixels',
)
assert.match(
  app,
  /minimapBounds:\s*normalizeMinimapBounds\(data\.minimapBounds/,
  'the NUI boundary must normalize runtime minimap geometry before rendering',
)
assert.match(
  locationStyles,
  /\{ value: 'off', label: 'Off' \}/,
  'the settings dropdown must offer a persistent Off location style',
)
assert.match(
  navigation,
  /LOCATION_VISIBLE_MS[\s\S]*LOCATION_EXIT_MS[\s\S]*window\.setTimeout/,
  'the Leonida plaque must own a bounded reveal and fade lifecycle',
)

console.log('location display runtime contract: PASS')
