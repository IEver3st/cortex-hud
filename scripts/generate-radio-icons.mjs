import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GITHUB_REPOSITORY = 'https://github.com/jtaomas/GTA-V-Radio'
const GITHUB_COMMIT = '1262633a78e33b28ae796d04ff9fc4d669427530'
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/jtaomas/GTA-V-Radio/${GITHUB_COMMIT}/public/radiostation`
const MAX_ASSET_BYTES = 750_000

const githubAssets = {
  RADIO_01_CLASS_ROCK: 'los-santos-rock-radio.png',
  RADIO_02_POP: 'non-stop-pop-fm.png',
  RADIO_03_HIPHOP_NEW: 'radio-los-santos.png',
  RADIO_04_PUNK: 'channel-x.png',
  RADIO_05_TALK_01: 'wctr.png',
  RADIO_06_COUNTRY: 'rebel-radio.webp',
  RADIO_07_DANCE_01: 'soulwax-fm.jpg',
  RADIO_08_MEXICAN: 'east-los-fm.png',
  RADIO_09_HIPHOP_OLD: 'west-coast-classics.webp',
  RADIO_11_TALK_02: 'blaine-county-talk-radio.png',
  RADIO_12_REGGAE: 'the-blue-ark.png',
  RADIO_13_JAZZ: 'worldwide-fm.png',
  RADIO_14_DANCE_02: 'fly-lo-fm.png',
  RADIO_15_MOTOWN: 'the-lowdown.webp',
  RADIO_16_SILVERLAKE: 'radio-mirror-park.webp',
  RADIO_17_FUNK: 'space.png',
  RADIO_18_90S_ROCK: 'vinewood-boulevard-radio.webp',
  RADIO_20_THELAB: 'the-lab.webp',
  RADIO_21_DLC_XM17: 'blonded-los-santos.webp',
  RADIO_22_DLC_BATTLE_MIX1_RADIO: 'los-santos-underground-radio.png',
  RADIO_23_DLC_XM19_RADIO: 'ifruit-radio.webp',
  RADIO_27_DLC_PRHEI4: 'still-slipping-los-santos.png',
  RADIO_34_DLC_HEI4_KULT: 'kult-fm.webp',
  RADIO_35_DLC_HEI4_MLR: 'music-locker-radio.png',
  RADIO_37_MOTOMAMI: 'motomami.svg',
}

const fandomAssets = {
  RADIO_19_USER: {
    filename: 'SelfRadio-GTAV-Logo.svg',
    url: 'https://static.wikia.nocookie.net/gtawiki/images/1/10/SelfRadio-GTAV-Logo.svg?cb=20160917180231&format=original',
    description: 'https://gta.fandom.com/wiki/File:SelfRadio-GTAV-Logo.svg',
    sha1: 'c37a1a1c20dab9d7be665e9c2fef5f2d81bcc9b4',
  },
  RADIO_36_AUDIOPLAYER: {
    filename: 'MediaPlayer-GTAO-HUDIcon.png',
    url: 'https://static.wikia.nocookie.net/gtawiki/images/0/0e/MediaPlayer-GTAO-HUDIcon.png?cb=20210722054342&format=original',
    description: 'https://gta.fandom.com/wiki/File:MediaPlayer-GTAO-HUDIcon.png',
    sha1: 'ea21b1a3e67059c045d11c95da1fb16cbbb33f7c',
  },
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputDirectory = resolve(scriptDirectory, '..', 'web', 'public', 'radio-icons')

const getExtension = (filename) => extname(filename).toLowerCase()
const getOutputFilename = (stationId, filename) => `${stationId}${getExtension(filename)}`
const sha = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex')

function validateAsset(filename, bytes) {
  if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES) {
    throw new Error(`${filename} has an invalid size: ${bytes.length} bytes`)
  }

  const extension = getExtension(filename)
  const header = bytes.subarray(0, 16)
  const text = extension === '.svg' ? bytes.toString('utf8') : ''

  if (extension === '.png' && !header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`${filename} is not a PNG`)
  }
  if (extension === '.webp' && !(header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP')) {
    throw new Error(`${filename} is not a WebP image`)
  }
  if ((extension === '.jpg' || extension === '.jpeg') && !(header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)) {
    throw new Error(`${filename} is not a JPEG`)
  }
  if (extension === '.svg') {
    if (!/<svg[\s>]/i.test(text)) throw new Error(`${filename} is not an SVG`)
    if (/<script|<foreignObject|\son\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|javascript:)/i.test(text)) {
      throw new Error(`${filename} contains active or remote SVG content`)
    }
  }
}

async function download(stationId, source) {
  const response = await fetch(source.url, {
    headers: { 'User-Agent': 'cortex-hud-radio-icon-generator/1.0' },
  })
  if (!response.ok) {
    throw new Error(`${stationId} download failed: ${response.status} ${response.statusText}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  validateAsset(source.filename, bytes)

  const sha1 = sha('sha1', bytes)
  if (source.sha1 && sha1 !== source.sha1) {
    throw new Error(`${stationId} checksum mismatch: expected ${source.sha1}, got ${sha1}`)
  }

  const output = getOutputFilename(stationId, source.filename)
  await writeFile(resolve(outputDirectory, output), bytes)

  return {
    stationId,
    file: output,
    bytes: bytes.length,
    sha1,
    sha256: sha('sha256', bytes),
    source: source.url,
    description: source.description,
  }
}

await mkdir(outputDirectory, { recursive: true })

const sources = [
  ...Object.entries(githubAssets).map(([stationId, filename]) => ({
    stationId,
    filename,
    url: `${GITHUB_RAW_BASE}/${filename}`,
    description: `${GITHUB_REPOSITORY}/blob/${GITHUB_COMMIT}/public/radiostation/${filename}`,
  })),
  ...Object.entries(fandomAssets).map(([stationId, source]) => ({ stationId, ...source })),
]

const files = await Promise.all(sources.map(({ stationId, ...source }) => download(stationId, source)))
files.sort((left, right) => left.stationId.localeCompare(right.stationId))

const manifest = {
  version: 1,
  generatedFrom: {
    repository: GITHUB_REPOSITORY,
    commit: GITHUB_COMMIT,
    gtaWiki: 'https://gta.fandom.com/',
  },
  rights: 'GTA V radio station branding and game artwork are owned by Rockstar Games and Take-Two Interactive. See web/third-party/gta-radio-icons-NOTICE.txt.',
  files,
}

await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
process.stdout.write(`Generated ${files.length} pinned radio icons in ${outputDirectory}.\n`)
