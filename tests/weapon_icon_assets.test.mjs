import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const publicWeapons = new URL('../web/public/weapons/', import.meta.url)
const distWeapons = new URL('../web/dist/weapons/', import.meta.url)

function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a')

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

test('weapon manifest has one valid source and built PNG per icon', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', publicWeapons), 'utf8'))
  const sourceFiles = new Set(await readdir(publicWeapons))
  const builtFiles = new Set(await readdir(distWeapons))

  assert.equal(new Set(manifest).size, manifest.length, 'manifest entries must be unique')

  for (const weapon of manifest) {
    assert.match(weapon, /^weapon_[a-z0-9_]+$/)
    const filename = `${weapon}.png`
    assert.ok(sourceFiles.has(filename), `${filename} is missing from web/public/weapons`)
    assert.ok(builtFiles.has(filename), `${filename} is missing from web/dist/weapons`)

    const source = await readFile(new URL(filename, publicWeapons))
    const built = await readFile(new URL(filename, distWeapons))
    const { width, height } = pngDimensions(source)

    assert.ok(width > 0 && height > 0, `${filename} has invalid PNG dimensions`)
    assert.equal(width % 2, 0, `${filename} must retain high-DPI horizontal render density`)
    assert.equal(height % 2, 0, `${filename} must retain high-DPI vertical render density`)
    assert.ok(Math.max(width, height) >= 100, `${filename} is too small for high-DPI HUD rendering`)
    assert.ok(source.length >= 5_000, `${filename} appears blank or corrupt`)
    assert.equal(digest(built), digest(source), `${filename} differs between source and built assets`)
  }

  const expectedFiles = new Set(manifest.map((weapon) => `${weapon}.png`))
  const extraSourcePngs = [...sourceFiles].filter((file) => file.endsWith('.png') && !expectedFiles.has(file))
  assert.deepEqual(extraSourcePngs, [], 'unmanifested source weapon PNGs found')
})

test('restored weapon icons stay on clean high-DPI single-art canvases', async () => {
  const expectedDimensions = {
    weapon_battleaxe: [328, 150],
    weapon_heavypistol: [260, 192],
    weapon_molotov: [240, 240],
    weapon_precisionrifle: [328, 56],
    weapon_railgun: [328, 82],
    weapon_specialcarbine: [328, 122],
    weapon_tacticalrifle: [328, 88],
    weapon_tactilerifle: [328, 88],
    weapon_thermalcharge: [260, 124],
    weapon_thermite: [260, 124],
  }

  for (const [weapon, [expectedWidth, expectedHeight]] of Object.entries(expectedDimensions)) {
    const png = await readFile(new URL(`${weapon}.png`, publicWeapons))
    assert.deepEqual(pngDimensions(png), { width: expectedWidth, height: expectedHeight }, `${weapon} crop regressed`)
  }
})
