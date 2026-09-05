import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_REPOSITORY = 'https://github.com/HintSystem/GTA-V-Radio-Dumps'
const SOURCE_COMMIT = 'd85fa6d9a63a2bc0d75109a6a8a3f9f26228e0cc'
const SOURCE_URL = `https://raw.githubusercontent.com/HintSystem/GTA-V-Radio-Dumps/${SOURCE_COMMIT}/info_merged.json`

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDirectory, '..', 'data', 'radio_catalog.json')

const response = await fetch(SOURCE_URL)
if (!response.ok) {
  throw new Error(`Radio catalog download failed: ${response.status} ${response.statusText}`)
}

const upstream = await response.json()
if (!upstream || typeof upstream !== 'object' || Array.isArray(upstream)) {
  throw new TypeError('Radio catalog source is not an object')
}

const text = new Map()
const tracks = new Map()

const cleanString = (value, maxLength) => {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

const cleanInteger = (value, minimum, maximum) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  const integer = Math.round(number)
  return integer >= minimum && integer <= maximum ? integer : null
}

const upstreamStations = upstream.Stations
const upstreamTrackLists = upstream.TrackLists
if (!upstreamStations || typeof upstreamStations !== 'object' || !upstreamTrackLists || typeof upstreamTrackLists !== 'object') {
  throw new TypeError('Radio catalog source is missing Stations or TrackLists')
}

for (const station of Object.values(upstreamStations)) {
  const safeStationName = cleanString(station?.RadioName, 64)?.toUpperCase()
  if (!safeStationName || !station || typeof station !== 'object') continue

  const trackListIds = Array.isArray(station.TrackLists) ? station.TrackLists : []
  const stationTracks = []
  const seen = new Set()

  for (const trackListId of trackListIds) {
    const trackList = upstreamTrackLists[trackListId]
    if (!trackList || typeof trackList !== 'object' || String(trackList.Category) !== '2') continue

    const rawTracks = Array.isArray(trackList.Tracks) ? trackList.Tracks : []
    for (const track of rawTracks) {
      if (!track || typeof track !== 'object') continue

      const nativeName = cleanString(track.Id, 128)
      const markers = Array.isArray(track.Markers?.Track) ? track.Markers.Track : []
      if (!nativeName || markers.length === 0) continue

      const isMix = markers.length > 1 ? 1 : 0
      for (const marker of markers) {
        if (!marker || typeof marker !== 'object') continue

        const textId = cleanInteger(marker.Id, 0, 999999)
        const offset = cleanInteger(marker.Offset ?? 0, 0, 7_200_000) ?? 0
        const title = cleanString(marker.Title, 128)
        const artist = cleanString(marker.Artist, 128)
        if (textId === null || (!title && !artist)) continue

        const textKey = String(textId)
        if (!text.has(textKey)) text.set(textKey, [title, artist])

        const uniqueKey = `${nativeName}:${textId}:${offset}`
        if (seen.has(uniqueKey)) continue
        seen.add(uniqueKey)
        stationTracks.push([nativeName, textId, offset, isMix])
      }
    }
  }

  if (stationTracks.length > 0) tracks.set(safeStationName, stationTracks)
}

const sortedText = Object.fromEntries(
  [...text.entries()].sort(([left], [right]) => Number(left) - Number(right)),
)
const sortedTracks = Object.fromEntries(
  [...tracks.entries()].sort(([left], [right]) => left.localeCompare(right)),
)

const catalog = {
  version: 1,
  source: {
    repository: SOURCE_REPOSITORY,
    commit: SOURCE_COMMIT,
    url: SOURCE_URL,
    note: 'Derived factual GTA V radio metadata; regenerate to update the pinned source.',
  },
  text: sortedText,
  tracks: sortedTracks,
}

if (Object.keys(sortedText).length < 900 || Object.keys(sortedTracks).length < 20) {
  throw new Error('Generated radio catalog failed minimum coverage checks')
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(catalog)}\n`, 'utf8')

process.stdout.write(
  `Generated ${outputPath} with ${Object.keys(sortedText).length} metadata entries across ${Object.keys(sortedTracks).length} stations.\n`,
)
