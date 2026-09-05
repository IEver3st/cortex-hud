import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const hudStyles = readFileSync(
  path.join(testDir, '..', 'web', 'src', 'components', 'HUD.css'),
  'utf8',
).replace(/\r\n/g, '\n')

function selectorBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = [...hudStyles.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'g'))]
  assert.ok(matches.length > 0, `${selector} must exist`)
  return matches.at(-1)[1]
}

const cluster = selectorBlock('.gta6-weapon.gta6-weapon--authentic')
const ammo = selectorBlock('.gta6-authentic-ammo')
const value = selectorBlock('.gta6-authentic-ammo .gta6-authentic-ammo-value')
const reserve = selectorBlock('.gta6-authentic-ammo-value--reserve')
const art = selectorBlock('.gta6-weapon.gta6-weapon--authentic .gta6-weapon-art')
const digit = selectorBlock('.gta6-weapon.gta6-weapon--authentic .sliding-digit')
const pricedownFace = selectorBlock('@font-face')

assert.match(pricedownFace, /font-family:\s*'Pricedown Local'/)
assert.match(pricedownFace, /src:\s*local\('Pricedown Black'\)/)
assert.doesNotMatch(pricedownFace, /url\(/, 'Pricedown must stay locally installed, not bundled')

assert.match(cluster, /right:\s*calc\(24px \* var\(--es-ui-scale\)\)/)
assert.match(cluster, /width:\s*calc\(164px \* var\(--es-ui-scale\)\)/)
assert.match(cluster, /gap:\s*calc\(8px \* var\(--es-ui-scale\)\)/)

assert.match(ammo, /grid-template-columns:\s*repeat\(2, max-content\)/)
assert.match(ammo, /justify-content:\s*end/)
assert.match(ammo, /column-gap:\s*calc\(18px \* var\(--es-ui-scale\)\)/)
assert.match(ammo, /width:\s*100%/)

assert.match(value, /font-size:\s*calc\(23\.8px \* var\(--es-ui-scale\)\)/)
assert.match(value, /font-family:\s*'Pricedown Local', 'Pricedown Black'/)
assert.match(value, /font-weight:\s*400/)
assert.match(reserve, /color:\s*rgba\(166, 168, 172, 0\.72\)/)
assert.doesNotMatch(reserve, /font-size|transform/)

assert.match(art, /width:\s*calc\(106\.5px \* var\(--es-ui-scale\)\)/)
assert.match(art, /height:\s*calc\(37\.5px \* var\(--es-ui-scale\)\)/)
assert.match(digit, /-webkit-mask-image:\s*none/)
assert.match(digit, /mask-image:\s*none/)

console.log('Leonida weapon HUD contract: PASS')
