import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const resourceDirectory = path.join(testDirectory, '..')
const catalog = JSON.parse(readFileSync(path.join(resourceDirectory, 'data', 'radio_catalog.json'), 'utf8'))
const configSource = readFileSync(path.join(resourceDirectory, 'config', 'shared.lua'), 'utf8')
const generatorSource = readFileSync(path.join(resourceDirectory, 'scripts', 'generate-radio-catalog.mjs'), 'utf8')
const expectedCommit = 'd85fa6d9a63a2bc0d75109a6a8a3f9f26228e0cc'

test('radio catalog is pinned, bounded, and has broad metadata coverage', () => {
  assert.equal(catalog.version, 1)
  assert.equal(catalog.source?.commit, expectedCommit)
  assert.match(catalog.source?.repository ?? '', /^https:\/\/github\.com\/HintSystem\/GTA-V-Radio-Dumps$/)
  assert.match(generatorSource, new RegExp(expectedCommit))

  const metadataEntries = Object.entries(catalog.text ?? {})
  const stations = Object.entries(catalog.tracks ?? {})
  assert.ok(metadataEntries.length >= 900, `expected at least 900 metadata entries, got ${metadataEntries.length}`)
  assert.ok(metadataEntries.length <= 2048, 'catalog exceeds the Lua metadata safety bound')
  assert.ok(stations.length >= 20, `expected at least 20 music stations, got ${stations.length}`)

  for (const [textId, value] of metadataEntries) {
    assert.match(textId, /^\d+$/)
    assert.ok(Array.isArray(value) && value.length === 2)
    assert.ok(value[0] === null || typeof value[0] === 'string')
    assert.ok(value[1] === null || typeof value[1] === 'string')
  }

  let trackCount = 0
  for (const [stationName, tracks] of stations) {
    assert.match(stationName, /^RADIO_[A-Z0-9_]+$/)
    assert.ok(Array.isArray(tracks) && tracks.length > 0)
    assert.ok(tracks.length <= 192, `${stationName} exceeds the Lua per-station safety bound`)

    for (const track of tracks) {
      assert.ok(Array.isArray(track) && track.length === 4)
      assert.equal(typeof track[0], 'string')
      assert.ok(Object.hasOwn(catalog.text, String(track[1])), `${stationName} references missing text ID ${track[1]}`)
      assert.ok(Number.isInteger(track[2]) && track[2] >= 0 && track[2] <= 7_200_000)
      assert.ok(track[3] === 0 || track[3] === 1)
      trackCount += 1
    }
  }

  assert.ok(trackCount >= 900, `expected at least 900 selectable entries, got ${trackCount}`)
})

test('configured station names are unique and include native fallback stations', () => {
  const radioBlock = configSource.match(/Config\.Radio\s*=\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
  const stationNames = [...radioBlock.matchAll(/\{\s*name\s*=\s*'([^']+)'/g)].map((match) => match[1])

  assert.equal(stationNames.length, 27)
  assert.equal(new Set(stationNames).size, stationNames.length)
  assert.ok(stationNames.includes('RADIO_19_USER'), 'Self Radio must remain available through native fallback')
  assert.ok(stationNames.includes('RADIO_36_AUDIOPLAYER'), 'Media Player must remain available through native fallback')
})
