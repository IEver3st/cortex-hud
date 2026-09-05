import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(testDir, '..')
const source = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n')

const component = source('web/src/components/VehicleIdentification.jsx')
const css = source('web/src/components/VehicleIdentification.css')

assert.match(
  component,
  /resolveVehicleIdentificationStyle\(layout\?\.minimapBounds/,
  'the vehicle card must align from the measured runtime minimap rectangle',
)
assert.doesNotMatch(
  css,
  /--vehicle-id-minimap-bottom|--hud-minimap-(?:left|width|height)/,
  'the vehicle card must not mix runtime minimap pixels with legacy viewport estimates',
)

console.log('vehicle identification minimap geometry contract: PASS')
