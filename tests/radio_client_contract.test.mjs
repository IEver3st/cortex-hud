import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(
  path.join(testDirectory, '..', 'modules', 'radio', 'client.lua'),
  'utf8',
).replace(/\r\n/g, '\n')
const settingsSource = readFileSync(
  path.join(testDirectory, '..', 'modules', 'settings', 'client.lua'),
  'utf8',
).replace(/\r\n/g, '\n')
const settingsModalSource = readFileSync(
  path.join(testDirectory, '..', 'web', 'src', 'components', 'SettingsModal.jsx'),
  'utf8',
).replace(/\r\n/g, '\n')

test('radio replacement uses local native playback and bounded NUI messages', () => {
  assert.match(source, /GetPlayerRadioStationName/)
  assert.match(source, /GetAudibleMusicTrackTextId/)
  assert.match(source, /SetVehRadioStation/)
  assert.match(source, /SetRadioTrack/)
  assert.match(source, /SetRadioStationMusicOnly/)
  assert.match(source, /SkipRadioForward/)
  assert.match(source, /LoadResourceFile\(GetCurrentResourceName\(\), 'data\/radio_catalog\.json'\)/)
  assert.match(source, /MAX_TRACKS_PER_STATION\s*=\s*192/)
  assert.match(source, /action = 'radio:state'/)
  assert.match(source, /onDemandAvailable = isOnDemandAvailable\(\)/)
  assert.match(source, /action = 'radio:metadata'/)
  assert.match(source, /action = 'radio:inputMode'/)
  assert.match(source, /action = 'radio:visibility'/)
})

test('radio replacement owns and releases only client-side state', () => {
  assert.match(source, /DisableControlAction\(0, state\.config\.openControl, true\)/)
  assert.match(source, /replaceDefaultWheel == false/)
  assert.match(source, /AddEventHandler\('onResourceStop'/)
  assert.match(source, /restoreNativeState\(\)/)
  assert.doesNotMatch(source, /TriggerServerEvent|TriggerLatentServerEvent|RegisterNetEvent/)
  assert.doesNotMatch(source, /SetNuiFocus/)
})

test('radio scrolling consumes every mouse-wheel weapon selection binding while visible', () => {
  const blockedControls = source.match(
    /local RADIO_SCROLL_BLOCK_CONTROLS = \{([^}]+)\}/,
  )?.[1] ?? ''

  for (const control of [14, 15, 16, 17, 99, 115]) {
    assert.match(
      blockedControls,
      new RegExp(`(?:^|[,\\s])${control}(?:[,\\s]|$)`),
      `expected scroll-linked weapon control ${control} to be blocked`,
    )
  }

  assert.match(
    source,
    /else\s+disableControls\(RADIO_SCROLL_BLOCK_CONTROLS\)[\s\S]*?local direction = readNavigation\(now\)/,
  )
})

test('radio UI preference swaps the custom selector with the base GTA wheel', () => {
  assert.match(settingsSource, /hud_customRadioUi\s*=\s*'customRadioUi'/)
  assert.match(
    settingsSource,
    /config\.Radio\.replaceDefaultWheel\s*=\s*toBoolean\(data\.customRadioUi/,
  )
  assert.match(settingsSource, /label = 'Custom Radio UI'/)
  assert.match(settingsSource, /label = 'Vehicle Radio', keys = \{ 'hud_customRadioUi' \}/)
  assert.match(settingsModalSource, /customRadioUi:\s*true/)
  assert.match(settingsModalSource, /set\('customRadioUi', !local\.customRadioUi\)/)
  assert.match(settingsModalSource, /aria-pressed=\{local\.customRadioUi\}/)
  assert.match(
    source,
    /state\.config\.replaceDefaultWheel == false[\s\S]*hideRadio\(\)[\s\S]*restoreNativeState\(\)/,
  )
})

test('mute uses one inline key scheme selected from the active input method', () => {
  assert.match(source, /IsInputDisabled\(2\)/)
  assert.match(source, /return IsInputDisabled\(2\) and 'keyboard' or 'gamepad'/)
  assert.match(source, /muteKeyboardLabel/)
  assert.match(source, /muteGamepadLabel/)
  assert.match(
    source,
    /IsDisabledControlJustPressed\(0, state\.config\.muteControl\)/,
  )
  assert.doesNotMatch(source, /MUTE_INTERACTION_ID/)
  assert.doesNotMatch(source, /X \/ A/)
})

test('mode switching uses the shared cortex-lib bottom-right interaction lifecycle', () => {
  assert.match(source, /MODE_INTERACTION_ID\s*=\s*'radio-mode-toggle'/)
  assert.match(source, /lib\.showInteraction\(\{/)
  assert.match(source, /label = state\.mode == 'onDemand' and 'Switch to Live Radio' or 'Switch to On Demand'/)
  assert.match(source, /key = currentModeKeyLabel\(\)/)
  assert.match(source, /lib\.hideInteraction\(MODE_INTERACTION_ID\)/)
  assert.match(source, /modeKeyboardLabel/)
  assert.match(source, /modeGamepadLabel/)
  assert.match(source, /local function hideRadio\(\)[\s\S]*hideModeInteraction\(\)/)
})

test('entering on-demand playback keeps a matching song or explicitly cues the selection', () => {
  assert.match(source, /local playingSelection = alignTrackIndexToMetadata\(\)/)
  assert.match(source, /if not playingSelection then playSelectedTrack\(\) end/)
  assert.match(source, /local textId = readAudibleTextId\(\)/)
  assert.match(
    source,
    /state\.mode == 'onDemand' and not metadata\.requested[\s\S]*findTrackIndexByTextId\(metadata\.textId\)[\s\S]*sendFullState\(0\)/,
  )
})

test('on-demand selection commits the requested track through GTA radio forcing', () => {
  const playback = source.match(
    /local function playSelectedTrack\(\)([\s\S]*?)\nend\n\nlocal function setMuted/,
  )?.[1] ?? ''

  assert.match(playback, /SetVehicleRadioEnabled\(state\.activeVehicle, true\)/)
  assert.match(
    playback,
    /SetVehRadioStation\(state\.activeVehicle, station\.name\)[\s\S]*SetRadioToStationName\(station\.name\)[\s\S]*SetInitialPlayerStation\(station\.name\)/,
  )
  assert.match(
    playback,
    /FreezeRadioStation\(station\.name\)[\s\S]*SetRadioAutoUnfreeze\(false\)[\s\S]*(?:SetRadioTrack|RADIO_TRACK_MIX_NATIVE)[\s\S]*UnfreezeRadioStation\(station\.name\)[\s\S]*SetRadioAutoUnfreeze\(true\)/,
  )
})

test('radio exposes explicit integration controls', () => {
  for (const exportName of [
    'setRadioMuted',
    'isRadioMuted',
    'setRadioMode',
    'getRadioMode',
    'setRadioStation',
  ]) {
    assert.match(source, new RegExp(`exports\\('${exportName}'`))
  }
})
