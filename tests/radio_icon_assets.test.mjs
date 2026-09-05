import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const resourceDirectory = path.join(testDirectory, '..')
const iconDirectory = path.join(resourceDirectory, 'web', 'public', 'radio-icons')
const builtIconDirectory = path.join(resourceDirectory, 'web', 'dist', 'radio-icons')
const manifest = JSON.parse(readFileSync(path.join(iconDirectory, 'manifest.json'), 'utf8'))
const configSource = readFileSync(path.join(resourceDirectory, 'config', 'shared.lua'), 'utf8')
const mappingSource = readFileSync(path.join(resourceDirectory, 'web', 'src', 'radioIcons.js'), 'utf8')
const selectorSource = readFileSync(
  path.join(resourceDirectory, 'web', 'src', 'components', 'RadioSelector.jsx'),
  'utf8',
)
const selectorStyles = readFileSync(
  path.join(resourceDirectory, 'web', 'src', 'components', 'RadioSelector.css'),
  'utf8',
)
const manifestSource = readFileSync(path.join(resourceDirectory, 'fxmanifest.lua'), 'utf8')
const expectedCommit = '1262633a78e33b28ae796d04ff9fc4d669427530'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('radio artwork is complete, pinned, bounded, and locally integrity checked', () => {
  assert.equal(manifest.version, 1)
  assert.equal(manifest.generatedFrom?.commit, expectedCommit)
  assert.equal(manifest.files.length, 27)

  const stationIds = new Set()
  const filenames = new Set()

  for (const file of manifest.files) {
    assert.match(file.stationId, /^RADIO_[A-Z0-9_]+$/)
    assert.equal(path.basename(file.file), file.file, 'icon filenames may not traverse directories')
    assert.match(file.file, /\.(?:jpe?g|png|svg|webp)$/i)
    assert.ok(!stationIds.has(file.stationId), `duplicate artwork ID ${file.stationId}`)
    assert.ok(!filenames.has(file.file), `duplicate artwork file ${file.file}`)

    const bytes = readFileSync(path.join(iconDirectory, file.file))
    assert.equal(bytes.length, file.bytes, `${file.file} size differs from its manifest`)
    assert.equal(sha256(bytes), file.sha256, `${file.file} checksum differs from its manifest`)
    assert.ok(bytes.length > 0 && bytes.length <= 750_000, `${file.file} exceeds the asset safety bound`)

    if (file.file.endsWith('.svg')) {
      const svg = bytes.toString('utf8')
      assert.match(svg, /<svg[\s>]/i)
      assert.doesNotMatch(
        svg,
        /<script|<foreignObject|\son\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|javascript:)/i,
      )
    }

    stationIds.add(file.stationId)
    filenames.add(file.file)
  }

  const expectedFiles = [...filenames, 'manifest.json'].sort()
  assert.deepEqual(readdirSync(iconDirectory).sort(), expectedFiles)
  assert.deepEqual(readdirSync(builtIconDirectory).sort(), expectedFiles)

  for (const filename of expectedFiles) {
    assert.equal(
      sha256(readFileSync(path.join(builtIconDirectory, filename))),
      sha256(readFileSync(path.join(iconDirectory, filename))),
      `${filename} differs between the source and built NUI`,
    )
  }

  const radioBlock = configSource.match(/Config\.Radio\s*=\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
  const configuredIds = new Set(
    [...radioBlock.matchAll(/\{\s*name\s*=\s*'([^']+)'/g)].map((match) => match[1]),
  )
  assert.deepEqual(stationIds, configuredIds)
})

test('the NUI maps artwork into square frames and keeps an initials fallback', () => {
  const mappedIds = new Set(
    [...mappingSource.matchAll(/^\s{2}(RADIO_[A-Z0-9_]+):\s*'([^']+)'/gm)].map((match) => {
      assert.ok(manifest.files.some((file) => file.stationId === match[1] && file.file === match[2]))
      return match[1]
    }),
  )

  assert.equal(mappedIds.size, 27)
  assert.match(selectorSource, /getRadioStationIconUrl\(item\.id\)/)
  assert.match(selectorSource, /className="radio-selector__art"/)
  assert.match(selectorSource, /className="radio-selector__mark"/)
  assert.equal((selectorSource.match(/className="radio-selector__mute-key"/g) ?? []).length, 1)
  assert.match(selectorSource, /data-input-mode=\{inputMode\}/)
  assert.match(
    selectorStyles,
    /\.radio-selector__tile\s*\{[\s\S]*?width:\s*var\(--radio-tile-size\);[\s\S]*?height:\s*var\(--radio-tile-size\);/,
  )
  assert.match(selectorStyles, /\.radio-selector__art\s*\{[\s\S]*?object-fit:\s*contain;/)
  assert.match(selectorStyles, /\.radio-selector__mute\s*\{/)
  assert.match(selectorStyles, /\.radio-selector__mute-key\s*\{/)
  const muteKeyBlock = selectorStyles.match(/\.radio-selector__mute-key\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  assert.match(muteKeyBlock, /color:\s*#090909;/)
  assert.match(muteKeyBlock, /background:\s*#fff;/)
  assert.match(
    selectorStyles,
    /\.radio-selector__mute-key::after\s*\{[\s\S]*?inset:\s*-7px;[\s\S]*?border:\s*2px solid #fff;/,
  )
  assert.match(
    selectorStyles,
    /\.radio-selector--muted\s+\.radio-selector__mute-key::after\s*\{[\s\S]*?opacity:\s*1;/,
  )

  const endpointBlock = selectorStyles.match(
    /\.radio-selector__mode-switch::before,\s*\.radio-selector__mode-switch::after\s*\{([\s\S]*?)\}/,
  )?.[1] ?? ''
  const activeBlock = selectorStyles.match(/\.radio-selector__mode-knob\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const endpointSize = Number(endpointBlock.match(/width:\s*(\d+)px/)?.[1])
  const activeSize = Number(activeBlock.match(/width:\s*(\d+)px/)?.[1])
  assert.ok(activeSize > endpointSize, 'the active playback-mode circle must be visibly larger')
  assert.match(
    selectorStyles,
    /\.radio-selector--on-demand\s+\.radio-selector__mode-knob\s*\{\s*top:\s*100%;/,
  )
  assert.match(manifestSource, /'web\/dist\/radio-icons\/\*'/)
  assert.match(manifestSource, /'web\/third-party\/gta-radio-icons-NOTICE\.txt'/)
})
