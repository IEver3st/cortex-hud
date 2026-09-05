local Radio = {}

local Nui = lib.require('modules.nui.client')

local Wait = Wait
local CreateThread = CreateThread
local GetGameTimer = GetGameTimer
local PlayerPedId = PlayerPedId
local GetVehiclePedIsIn = GetVehiclePedIsIn
local DoesEntityExist = DoesEntityExist
local IsEntityDead = IsEntityDead
local IsPauseMenuActive = IsPauseMenuActive
local IsScreenFadedIn = IsScreenFadedIn
local IsNuiFocused = IsNuiFocused
local DoesPlayerVehHaveRadio = DoesPlayerVehHaveRadio
local IsPlayerVehRadioEnable = IsPlayerVehRadioEnable
local GetPlayerRadioStationName = GetPlayerRadioStationName
local GetAudibleMusicTrackTextId = GetAudibleMusicTrackTextId
local SetVehicleRadioEnabled = SetVehicleRadioEnabled
local SetVehRadioStation = SetVehRadioStation
local SetRadioToStationName = SetRadioToStationName
local SetInitialPlayerStation = SetInitialPlayerStation
local SetRadioStationMusicOnly = SetRadioStationMusicOnly
local SetRadioTrack = SetRadioTrack
local FreezeRadioStation = FreezeRadioStation
local UnfreezeRadioStation = UnfreezeRadioStation
local SetRadioAutoUnfreeze = SetRadioAutoUnfreeze
local SkipRadioForward = SkipRadioForward
local DisableControlAction = DisableControlAction
local IsDisabledControlPressed = IsDisabledControlPressed
local IsDisabledControlJustPressed = IsDisabledControlJustPressed
local IsInputDisabled = IsInputDisabled
local LoadResourceFile = LoadResourceFile
local GetCurrentResourceName = GetCurrentResourceName
local GetResourceKvpString = GetResourceKvpString
local SetResourceKvp = SetResourceKvp

local MAX_STATIONS = 64
local MAX_TRACKS_PER_STATION = 192
local MAX_TEXT_ENTRIES = 2048
local ELIGIBILITY_RECHECK_MS = 250
local RADIO_OFF = 'OFF'
local RADIO_TRACK_MIX_NATIVE = 0x2CB0075110BE1E56
-- One mouse-wheel tick is exposed through several weapon controls depending on
-- whether the player is on foot, in a vehicle, or flying. Consume the complete
-- family while the custom radio owns scrolling so GTA cannot also cycle weapons.
local RADIO_SCROLL_BLOCK_CONTROLS = { 14, 15, 16, 17, 99, 115 }
local MODE_INTERACTION_ID = 'radio-mode-toggle'
local KVP_STATION = 'cortex_hud:radio:station'
local KVP_MODE = 'cortex_hud:radio:mode'
local KVP_MUTED = 'cortex_hud:radio:muted'

local state = {
    started = false,
    config = nil,
    visible = false,
    visibilitySource = nil,
    quickCloseAt = 0,
    mode = 'radio',
    muted = false,
    stationIndex = 1,
    stations = {},
    stationByName = {},
    catalogText = {},
    catalogTracks = {},
    trackIndexes = {},
    touchedMusicOnly = {},
    activeVehicle = 0,
    direction = 0,
    revision = 0,
    lastSelectionAt = 0,
    repeatDirection = 0,
    repeatAt = 0,
    nextMetadataAt = 0,
    nextInputModeAt = 0,
    inputMode = 'keyboard',
    lastMetadataKey = nil,
    lastItemsKey = nil,
    pendingTrack = nil,
    modeInteractionVisible = false,
    modeInteractionErrorLogged = false,
    eligibilityVehicle = 0,
    eligibilityCheckedAt = -ELIGIBILITY_RECHECK_MS,
    eligibilityAllowed = false,
}

local function clampInteger(value, minimum, maximum, fallback)
    value = tonumber(value)
    if not value or value ~= value then
        return fallback
    end

    value = math.floor(value + 0.5)
    if value < minimum then return minimum end
    if value > maximum then return maximum end
    return value
end

local function boundedString(value, maximumLength)
    if type(value) ~= 'string' then return nil end

    value = value:gsub('[%z\1-\31]', ' '):gsub('%s+', ' ')
    value = value:match('^%s*(.-)%s*$') or ''
    if value == '' then return nil end

    if #value > maximumLength then
        value = value:sub(1, maximumLength)
    end

    return value
end

local function wrapIndex(index, count)
    if count <= 0 then return 1 end
    return ((index - 1) % count) + 1
end

local function makeMark(value)
    value = boundedString(value, 96) or 'PLAY'

    local letters = {}
    for word in value:gmatch('[%w]+') do
        letters[#letters + 1] = word:sub(1, 1):upper()
        if #letters >= 4 then break end
    end

    if #letters == 0 then
        return value:sub(1, 4):upper()
    end

    return table.concat(letters)
end

local function normalizeMode(value)
    if value == 'onDemand' and state.config and state.config.onDemandEnabled ~= false then
        return 'onDemand'
    end

    return 'radio'
end

local function currentStation()
    return state.stations[state.stationIndex]
end

local function currentStationTracks()
    local station = currentStation()
    if not station then return {} end
    return state.catalogTracks[station.name] or {}
end

local function isOnDemandAvailable()
    return state.config ~= nil
        and state.config.onDemandEnabled ~= false
        and #currentStationTracks() > 0
end

local function currentTrackIndex()
    local station = currentStation()
    local tracks = currentStationTracks()
    if not station or #tracks == 0 then return 1 end

    local index = state.trackIndexes[station.name] or 1
    index = wrapIndex(index, #tracks)
    state.trackIndexes[station.name] = index
    return index
end

local function findTrackIndexByTextId(textId)
    if type(textId) ~= 'number' or textId < 0 then return nil end

    local tracks = currentStationTracks()
    for i = 1, #tracks do
        if tracks[i].textId == textId then return i end
    end

    return nil
end

local function selectedOnDemandTrack()
    local tracks = currentStationTracks()
    return tracks[currentTrackIndex()]
end

local function loadStations(config)
    local radioConfig = type(config.Radio) == 'table' and config.Radio or {}
    local rawStations = type(radioConfig.stations) == 'table' and radioConfig.stations or {}
    local stations = {}
    local stationByName = {}

    for i = 1, math.min(#rawStations, MAX_STATIONS) do
        local entry = rawStations[i]
        if type(entry) == 'table' then
            local name = boundedString(entry.name, 64)
            local label = boundedString(entry.label, 64)
            if name and label then
                name = name:upper()
                if not stationByName[name] then
                    local station = {
                        id = name,
                        name = name,
                        label = label,
                        mark = boundedString(entry.mark, 8) or makeMark(label),
                    }
                    stations[#stations + 1] = station
                    stationByName[name] = #stations
                end
            end
        end
    end

    state.stations = stations
    state.stationByName = stationByName
end

local function decodeCatalog()
    local raw = LoadResourceFile(GetCurrentResourceName(), 'data/radio_catalog.json')
    if type(raw) ~= 'string' or raw == '' then
        print('^3[cortex-hud:radio] data/radio_catalog.json is missing; song metadata and direct on-demand selection are unavailable.^7')
        return
    end

    local ok, catalog = pcall(json.decode, raw)
    if not ok or type(catalog) ~= 'table' then
        print('^3[cortex-hud:radio] Radio catalog is invalid JSON; continuing with native station controls only.^7')
        return
    end

    local text = {}
    local textCount = 0
    if type(catalog.text) == 'table' then
        for textId, value in pairs(catalog.text) do
            if textCount >= MAX_TEXT_ENTRIES then break end
            if type(value) == 'table' then
                local title = boundedString(value[1], 128)
                local artist = boundedString(value[2], 128)
                if title or artist then
                    text[tostring(textId)] = {
                        title = title,
                        artist = artist,
                    }
                    textCount = textCount + 1
                end
            end
        end
    end

    local tracksByStation = {}
    if type(catalog.tracks) == 'table' then
        for stationName, rawTracks in pairs(catalog.tracks) do
            stationName = boundedString(stationName, 64)
            if stationName and type(rawTracks) == 'table' then
                stationName = stationName:upper()
                local tracks = {}
                local seen = {}

                for i = 1, math.min(#rawTracks, MAX_TRACKS_PER_STATION) do
                    local rawTrack = rawTracks[i]
                    if type(rawTrack) == 'table' then
                        local nativeName = boundedString(rawTrack[1], 128)
                        local textId = clampInteger(rawTrack[2], 0, 999999, nil)
                        local offset = clampInteger(rawTrack[3], 0, 7200000, 0)
                        local isMix = rawTrack[4] == 1 or rawTrack[4] == true
                        local metadata = textId and text[tostring(textId)] or nil

                        if nativeName and textId and metadata then
                            local uniqueKey = ('%s:%d:%d'):format(nativeName, textId, offset)
                            if not seen[uniqueKey] then
                                seen[uniqueKey] = true
                                local title = metadata.title or 'Untitled track'
                                local artist = metadata.artist or 'Unknown artist'
                                tracks[#tracks + 1] = {
                                    nativeName = nativeName,
                                    textId = textId,
                                    offset = offset,
                                    isMix = isMix,
                                    title = title,
                                    artist = artist,
                                    public = {
                                        id = uniqueKey,
                                        label = title,
                                        subtitle = artist,
                                        mark = makeMark(title),
                                        kind = 'track',
                                    },
                                }
                            end
                        end
                    end
                end

                tracksByStation[stationName] = tracks
            end
        end
    end

    state.catalogText = text
    state.catalogTracks = tracksByStation
end

local function restorePersistence()
    local radioConfig = state.config
    local savedStation = radioConfig.rememberSelection ~= false and GetResourceKvpString(KVP_STATION) or nil
    if type(savedStation) == 'string' then
        local index = state.stationByName[savedStation:upper()]
        if index then state.stationIndex = index end
    end

    if radioConfig.rememberMode ~= false then
        state.mode = normalizeMode(GetResourceKvpString(KVP_MODE))
    end

    if radioConfig.rememberMute == true then
        state.muted = GetResourceKvpString(KVP_MUTED) == '1'
    end
end

local function persistStation()
    if state.config.rememberSelection == false then return end
    local station = currentStation()
    if station then SetResourceKvp(KVP_STATION, station.name) end
end

local function persistMode()
    if state.config.rememberMode ~= false then
        SetResourceKvp(KVP_MODE, state.mode)
    end
end

local function persistMuted()
    if state.config.rememberMute == true then
        SetResourceKvp(KVP_MUTED, state.muted and '1' or '0')
    end
end

local function setStationMusicOnly(stationName, enabled)
    if not stationName then return end
    SetRadioStationMusicOnly(stationName, enabled == true)
    if enabled then
        state.touchedMusicOnly[stationName] = true
    else
        state.touchedMusicOnly[stationName] = nil
    end
end

local function syncStationFromGame()
    local ok, stationName = pcall(GetPlayerRadioStationName)
    stationName = ok and boundedString(stationName, 64) or nil
    if stationName and (stationName:upper() == RADIO_OFF or stationName:upper() == 'RADIO_OFF') then
        stationName = nil
    end

    if stationName then
        state.muted = false
        local index = state.stationByName[stationName:upper()]
        if index then
            state.stationIndex = index
            persistStation()
        end
        return
    end

    -- GTA returns an empty station name while the radio is off. Treat that as
    -- mute while retaining the last valid station for a lossless unmute.
    if not stationName then
        state.muted = true
    end
end

local function getEligibleVehicle()
    local ped = PlayerPedId()
    if ped == 0 or IsEntityDead(ped) or IsPauseMenuActive() or not IsScreenFadedIn() then
        return 0
    end

    local vehicle = GetVehiclePedIsIn(ped, false)
    if vehicle == 0 or not DoesEntityExist(vehicle) then
        state.eligibilityVehicle = 0
        state.eligibilityAllowed = false
        return 0
    end

    local now = GetGameTimer()
    local eligibilityFresh = vehicle == state.eligibilityVehicle
        and now >= state.eligibilityCheckedAt
        and (now - state.eligibilityCheckedAt) < ELIGIBILITY_RECHECK_MS
    if eligibilityFresh then
        return state.eligibilityAllowed and vehicle or 0
    end

    local hasRadio = false
    local okHasRadio, resultHasRadio = pcall(DoesPlayerVehHaveRadio)
    if okHasRadio then hasRadio = resultHasRadio == true end

    local enabled = true
    if hasRadio then
        local okEnabled, resultEnabled = pcall(IsPlayerVehRadioEnable)
        if okEnabled then enabled = resultEnabled == true end
    end

    state.eligibilityVehicle = vehicle
    state.eligibilityCheckedAt = now
    state.eligibilityAllowed = hasRadio and enabled

    return state.eligibilityAllowed and vehicle or 0
end

local function fallbackMetadata()
    local station = currentStation()
    if state.mode == 'onDemand' then
        local selected = selectedOnDemandTrack()
        if selected then
            return {
                textId = selected.textId,
                title = selected.title,
                artist = selected.artist,
                available = true,
                requested = state.pendingTrack ~= nil,
            }
        end
    end

    return {
        textId = -1,
        title = 'Live broadcast',
        artist = station and station.label or 'Vehicle radio',
        available = false,
        requested = false,
    }
end

local function readAudibleTextId()
    local textId = -1
    local ok, result = pcall(GetAudibleMusicTrackTextId)
    if ok and type(result) == 'number' and result == result then
        textId = math.floor(result)
    end

    return textId
end

local function readMetadata()
    local textId = readAudibleTextId()

    local metadata = state.catalogText[tostring(textId)]
    local now = GetGameTimer()
    if state.pendingTrack then
        if textId == state.pendingTrack.textId then
            state.pendingTrack = nil
        elseif now - state.pendingTrack.requestedAt <= 1800 then
            return {
                textId = state.pendingTrack.textId,
                title = state.pendingTrack.title,
                artist = state.pendingTrack.artist,
                available = true,
                requested = true,
            }
        else
            state.pendingTrack = nil
        end
    end

    if metadata then
        return {
            textId = textId,
            title = metadata.title or 'Untitled track',
            artist = metadata.artist or 'Unknown artist',
            available = true,
            requested = false,
        }
    end

    return fallbackMetadata()
end

local function metadataKey(metadata)
    return table.concat({
        tostring(metadata.textId or -1),
        metadata.title or '',
        metadata.artist or '',
        metadata.available and '1' or '0',
        metadata.requested and '1' or '0',
        state.muted and '1' or '0',
    }, '|')
end

local function publicItems(metadata)
    if state.mode == 'radio' then
        local result = {}
        for i = 1, #state.stations do
            local station = state.stations[i]
            result[i] = {
                id = station.id,
                label = station.label,
                subtitle = 'Radio station',
                mark = station.mark,
                kind = 'station',
            }
        end
        return result, state.stationIndex
    end

    local tracks = currentStationTracks()
    if #tracks > 0 then
        local result = {}
        for i = 1, #tracks do
            result[i] = tracks[i].public
        end
        return result, currentTrackIndex()
    end

    return {
        {
            id = 'native-skip',
            label = metadata.title or 'Next track',
            subtitle = metadata.artist or 'Native radio queue',
            mark = makeMark(metadata.title or 'Play'),
            kind = 'track',
        },
    }, 1
end

local function readInputMode()
    return IsInputDisabled(2) and 'keyboard' or 'gamepad'
end

local function currentMuteKeyLabel()
    if state.inputMode == 'gamepad' then
        return state.config.muteGamepadLabel
    end

    return state.config.muteKeyboardLabel
end

local function currentModeKeyLabel()
    if state.inputMode == 'gamepad' then
        return state.config.modeGamepadLabel
    end

    return state.config.modeKeyboardLabel
end

local function hideModeInteraction()
    if not state.modeInteractionVisible then return end

    if type(lib.hideInteraction) == 'function' then
        lib.hideInteraction(MODE_INTERACTION_ID)
    end
    state.modeInteractionVisible = false
end

local function refreshModeInteraction()
    if not state.visible or not isOnDemandAvailable() then
        hideModeInteraction()
        return
    end

    if type(lib.showInteraction) ~= 'function' then
        if not state.modeInteractionErrorLogged then
            print('^3[cortex-hud:radio] cortex-lib interaction UI is unavailable; the radio mode hint cannot be shown.^7')
            state.modeInteractionErrorLogged = true
        end
        return
    end

    local ok, err = lib.showInteraction({
        id = MODE_INTERACTION_ID,
        label = state.mode == 'onDemand' and 'Switch to Live Radio' or 'Switch to On Demand',
        key = currentModeKeyLabel(),
        priority = state.config.modeHintPriority,
    })

    if ok then
        state.modeInteractionVisible = true
        return
    end

    if state.modeInteractionVisible and type(lib.hideInteraction) == 'function' then
        lib.hideInteraction(MODE_INTERACTION_ID)
    end
    state.modeInteractionVisible = false

    if not state.modeInteractionErrorLogged then
        print(('^3[cortex-hud:radio] Failed to show the radio mode hint: %s^7'):format(tostring(err or 'unknown error')))
        state.modeInteractionErrorLogged = true
    end
end

local function sendFullState(direction)
    if not state.visible then return end

    local station = currentStation()
    if not station then return end

    local metadata = readMetadata()
    if state.mode == 'onDemand' and not metadata.requested then
        local audibleIndex = findTrackIndexByTextId(metadata.textId)
        if audibleIndex then state.trackIndexes[station.name] = audibleIndex end
    end
    local items, selectedIndex = publicItems(metadata)
    state.revision = state.revision + 1
    state.lastMetadataKey = metadataKey(metadata)

    local itemsKey = state.mode == 'radio' and 'radio' or ('onDemand:' .. station.name)
    local payload = {
        action = 'radio:state',
        visible = true,
        mode = state.mode,
        onDemandAvailable = isOnDemandAvailable(),
        muted = state.muted,
        selectedIndex = selectedIndex - 1,
        direction = direction or 0,
        revision = state.revision,
        station = {
            id = station.id,
            label = station.label,
            mark = station.mark,
        },
        track = metadata,
        controls = {
            mode = state.config.modeControl,
            mute = state.config.muteControl,
            inputMode = state.inputMode,
            muteKey = currentMuteKeyLabel(),
        },
    }

    if itemsKey ~= state.lastItemsKey then
        state.lastItemsKey = itemsKey
        payload.items = items
    end

    Nui.send(payload)
end

local function sendMetadataIfChanged(force)
    if not state.visible then return end

    local metadata = readMetadata()
    if state.mode == 'onDemand' and not metadata.requested then
        local station = currentStation()
        local audibleIndex = findTrackIndexByTextId(metadata.textId)
        if station and audibleIndex and audibleIndex ~= currentTrackIndex() then
            state.trackIndexes[station.name] = audibleIndex
            sendFullState(0)
            return
        end
    end

    local key = metadataKey(metadata)
    if not force and key == state.lastMetadataKey then return end

    state.lastMetadataKey = key
    Nui.send({
        action = 'radio:metadata',
        muted = state.muted,
        track = metadata,
    })
end

local function sendInputModeIfChanged()
    if not state.visible then return false end

    local inputMode = readInputMode()
    if inputMode == state.inputMode then return false end

    state.inputMode = inputMode
    Nui.send({
        action = 'radio:inputMode',
        controls = {
            inputMode = state.inputMode,
            muteKey = currentMuteKeyLabel(),
        },
    })
    refreshModeInteraction()
    return true
end

local function hideRadio()
    hideModeInteraction()
    if not state.visible then return end

    state.visible = false
    state.visibilitySource = nil
    state.quickCloseAt = 0
    state.nextInputModeAt = 0
    state.repeatDirection = 0
    state.repeatAt = 0
    state.pendingTrack = nil
    state.lastMetadataKey = nil
    state.lastItemsKey = nil
    Nui.send({ action = 'radio:visibility', visible = false })
end

local function openRadio(source)
    if #state.stations == 0 then return end

    syncStationFromGame()
    state.visible = true
    state.visibilitySource = source or 'hold'
    state.quickCloseAt = source == 'quick'
        and (GetGameTimer() + state.config.quickSwitchDisplayTime)
        or 0
    state.nextMetadataAt = GetGameTimer() + state.config.metadataPollInterval
    state.nextInputModeAt = GetGameTimer() + state.config.inputModePollInterval
    state.inputMode = readInputMode()

    if state.mode == 'onDemand' and not isOnDemandAvailable() then
        state.mode = 'radio'
        persistMode()
    end

    if state.mode == 'onDemand' and not state.muted and #currentStationTracks() > 0 then
        local station = currentStation()
        if station then setStationMusicOnly(station.name, true) end
    end

    refreshModeInteraction()
    sendFullState(0)
end

local function keepQuickRadioOpen()
    if state.visibilitySource == 'quick' then
        state.quickCloseAt = GetGameTimer() + state.config.quickSwitchDisplayTime
    end
end

local function applyStation()
    local station = currentStation()
    if not station or state.activeVehicle == 0 then return end

    if state.muted then
        SetVehRadioStation(state.activeVehicle, RADIO_OFF)
        return
    end

    SetVehRadioStation(state.activeVehicle, station.name)
    if state.mode == 'onDemand' and #currentStationTracks() > 0 then
        setStationMusicOnly(station.name, true)
    end
end

local function alignTrackIndexToMetadata()
    local textId = readAudibleTextId()
    local index = findTrackIndexByTextId(textId)
    if not index then return false end

    local station = currentStation()
    if station then state.trackIndexes[station.name] = index end
    return true
end

local function playSelectedTrack()
    local station = currentStation()
    local track = selectedOnDemandTrack()
    if not station or not track or state.muted or state.activeVehicle == 0 then return false end

    SetVehicleRadioEnabled(state.activeVehicle, true)
    SetVehRadioStation(state.activeVehicle, station.name)
    SetRadioToStationName(station.name)
    SetInitialPlayerStation(station.name)
    setStationMusicOnly(station.name, true)

    -- GTA does not reliably commit a new audio record to an already-running
    -- station. Force the same transaction the game uses for scripted radio:
    -- hold the station, submit the chosen record, then release it immediately.
    FreezeRadioStation(station.name)
    SetRadioAutoUnfreeze(false)
    if track.isMix then
        Citizen.InvokeNative(RADIO_TRACK_MIX_NATIVE, station.name, track.nativeName, track.offset)
    else
        SetRadioTrack(station.name, track.nativeName)
    end
    UnfreezeRadioStation(station.name)
    SetRadioAutoUnfreeze(true)

    state.pendingTrack = {
        textId = track.textId,
        title = track.title,
        artist = track.artist,
        requestedAt = GetGameTimer(),
    }
    return true
end

local function setMuted(muted)
    muted = muted == true
    if state.muted == muted then return false end

    state.muted = muted
    persistMuted()

    if state.activeVehicle ~= 0 then
        if muted then
            SetVehRadioStation(state.activeVehicle, RADIO_OFF)
        else
            applyStation()
            if state.mode == 'onDemand' then playSelectedTrack() end
        end
    end

    if state.visible then sendFullState(0) end
    return true
end

local function setMode(mode)
    mode = normalizeMode(mode)
    if mode == 'onDemand' and not isOnDemandAvailable() then return false end
    if state.mode == mode then return false end

    local station = currentStation()
    if station and state.mode == 'onDemand' then
        setStationMusicOnly(station.name, false)
    end

    state.mode = mode
    persistMode()
    state.pendingTrack = nil

    if state.mode == 'onDemand' then
        local playingSelection = alignTrackIndexToMetadata()
        if station and not state.muted and #currentStationTracks() > 0 then
            setStationMusicOnly(station.name, true)
            if not playingSelection then playSelectedTrack() end
        end
    end

    if state.visible then
        refreshModeInteraction()
        sendFullState(0)
    end
    return true
end

local function selectStationByIndex(index, direction)
    if #state.stations == 0 then return false end

    local previousStation = currentStation()
    local nextIndex = wrapIndex(index, #state.stations)
    local changed = nextIndex ~= state.stationIndex

    if changed and state.mode == 'onDemand' and previousStation then
        setStationMusicOnly(previousStation.name, false)
    end

    state.stationIndex = nextIndex
    state.direction = direction or 0
    state.pendingTrack = nil

    if state.mode == 'onDemand' and not isOnDemandAvailable() then
        state.mode = 'radio'
        persistMode()
    end

    persistStation()
    applyStation()
    if state.visible then
        refreshModeInteraction()
        sendFullState(state.direction)
    end
    return changed
end

local function selectTrackByDelta(delta)
    local tracks = currentStationTracks()
    if #tracks == 0 then
        if not state.muted then SkipRadioForward() end
        state.direction = delta
        state.pendingTrack = nil
        if state.visible then sendFullState(delta) end
        return true
    end

    local station = currentStation()
    local index = wrapIndex(currentTrackIndex() + delta, #tracks)
    if station then state.trackIndexes[station.name] = index end
    state.direction = delta
    playSelectedTrack()
    if state.visible then sendFullState(delta) end
    return true
end

local function navigate(delta)
    local now = GetGameTimer()
    if now - state.lastSelectionAt < state.config.selectionCooldown then return false end
    state.lastSelectionAt = now

    if state.mode == 'onDemand' then
        return selectTrackByDelta(delta)
    end

    return selectStationByIndex(state.stationIndex + delta, delta)
end

local function anyJustPressed(controls)
    for i = 1, #controls do
        if IsDisabledControlJustPressed(0, controls[i]) then return true end
    end
    return false
end

local function anyPressed(controls)
    for i = 1, #controls do
        if IsDisabledControlPressed(0, controls[i]) then return true end
    end
    return false
end

local function disableControls(controls)
    for i = 1, #controls do
        DisableControlAction(0, controls[i], true)
    end
end

local function readNavigation(now)
    local previousJust = anyJustPressed(state.config.previousControls)
        or IsDisabledControlJustPressed(0, state.config.previousTrackControl)
    local nextJust = anyJustPressed(state.config.nextControls)
        or IsDisabledControlJustPressed(0, state.config.nextTrackControl)

    if previousJust ~= nextJust then
        local direction = previousJust and -1 or 1
        state.repeatDirection = direction
        state.repeatAt = now + state.config.inputRepeatDelay
        return direction
    end

    local previousHeld = anyPressed(state.config.previousControls)
        or IsDisabledControlPressed(0, state.config.previousTrackControl)
    local nextHeld = anyPressed(state.config.nextControls)
        or IsDisabledControlPressed(0, state.config.nextTrackControl)
    local direction = 0
    if previousHeld ~= nextHeld then direction = previousHeld and -1 or 1 end

    if direction == 0 then
        state.repeatDirection = 0
        state.repeatAt = 0
        return 0
    end

    if direction ~= state.repeatDirection then
        state.repeatDirection = direction
        state.repeatAt = now + state.config.inputRepeatDelay
        return 0
    end

    if state.repeatAt > 0 and now >= state.repeatAt then
        state.repeatAt = now + state.config.inputRepeatInterval
        return direction
    end

    return 0
end

local function sanitizeControls(radioConfig)
    local function controlList(value, fallback)
        if type(value) ~= 'table' then return fallback end
        local result = {}
        local seen = {}
        for i = 1, math.min(#value, 12) do
            local control = clampInteger(value[i], 0, 360, nil)
            if control and not seen[control] then
                seen[control] = true
                result[#result + 1] = control
            end
        end
        return #result > 0 and result or fallback
    end

    radioConfig.openControl = clampInteger(radioConfig.openControl, 0, 360, 85)
    radioConfig.nextControls = controlList(radioConfig.nextControls, { 14, 81, 175, 180 })
    radioConfig.previousControls = controlList(radioConfig.previousControls, { 15, 82, 174, 181 })
    radioConfig.nextTrackControl = clampInteger(radioConfig.nextTrackControl, 0, 360, 83)
    radioConfig.previousTrackControl = clampInteger(radioConfig.previousTrackControl, 0, 360, 84)
    radioConfig.modeControl = clampInteger(radioConfig.modeControl, 0, 360, 80)
    radioConfig.muteControl = clampInteger(radioConfig.muteControl, 0, 360, 73)
    radioConfig.modeKeyboardLabel = boundedString(radioConfig.modeKeyboardLabel, 16) or 'R'
    radioConfig.modeGamepadLabel = boundedString(radioConfig.modeGamepadLabel, 16) or 'B'
    radioConfig.muteKeyboardLabel = boundedString(radioConfig.muteKeyboardLabel, 16) or 'X'
    radioConfig.muteGamepadLabel = boundedString(radioConfig.muteGamepadLabel, 16) or 'A'
    radioConfig.modeHintPriority = clampInteger(radioConfig.modeHintPriority, -1000, 1000, 40)
    radioConfig.inputModePollInterval = clampInteger(radioConfig.inputModePollInterval, 50, 1000, 100)
    radioConfig.selectionCooldown = clampInteger(radioConfig.selectionCooldown, 40, 500, 90)
    radioConfig.inputRepeatDelay = clampInteger(radioConfig.inputRepeatDelay, 150, 1000, 300)
    radioConfig.inputRepeatInterval = clampInteger(radioConfig.inputRepeatInterval, 60, 500, 115)
    radioConfig.quickSwitchDisplayTime = clampInteger(radioConfig.quickSwitchDisplayTime, 500, 5000, 1400)
    radioConfig.metadataPollInterval = clampInteger(radioConfig.metadataPollInterval, 125, 2000, 250)
end

local function restoreNativeState()
    for stationName in pairs(state.touchedMusicOnly) do
        SetRadioStationMusicOnly(stationName, false)
    end
    state.touchedMusicOnly = {}
end

function Radio.start(config)
    if state.started then return end

    local radioConfig = type(config.Radio) == 'table' and config.Radio or {}
    if radioConfig.enabled == false then return end

    state.started = true
    state.config = radioConfig
    sanitizeControls(radioConfig)
    loadStations(config)

    if #state.stations == 0 then
        state.started = false
        print('^3[cortex-hud:radio] Radio replacement is enabled but no valid stations are configured.^7')
        return
    end

    local defaultName = boundedString(radioConfig.defaultStation, 64) or 'RADIO_01_CLASS_ROCK'
    state.stationIndex = state.stationByName[defaultName:upper()] or 1
    decodeCatalog()
    restorePersistence()

    Nui.onReady(function()
        if state.visible then sendFullState(0) end
    end)

    CreateThread(function()
        while state.started do
            local sleep = 250
            local vehicle = getEligibleVehicle()

            if vehicle ~= 0 and IsNuiFocused() then
                -- Studios and menus may keep gameplay input enabled. Disabled
                -- controls still report scrolls, so yield radio input to NUI.
                sleep = 0
                state.activeVehicle = vehicle
                hideRadio()
                DisableControlAction(0, state.config.openControl, true)
                DisableControlAction(0, 81, true)
                DisableControlAction(0, 82, true)
                DisableControlAction(0, state.config.nextTrackControl, true)
                DisableControlAction(0, state.config.previousTrackControl, true)
            elseif vehicle ~= 0 and state.config.replaceDefaultWheel == false then
                state.activeVehicle = vehicle
                hideRadio()
                restoreNativeState()
            elseif vehicle ~= 0 then
                sleep = 0
                state.activeVehicle = vehicle

                DisableControlAction(0, state.config.openControl, true)
                DisableControlAction(0, 81, true)
                DisableControlAction(0, 82, true)
                DisableControlAction(0, state.config.nextTrackControl, true)
                DisableControlAction(0, state.config.previousTrackControl, true)

                local now = GetGameTimer()
                local openHeld = IsDisabledControlPressed(0, state.config.openControl)

                if openHeld and not state.visible then
                    openRadio('hold')
                elseif openHeld and state.visibilitySource == 'quick' then
                    state.visibilitySource = 'hold'
                    state.quickCloseAt = 0
                end

                if not state.visible then
                    local previousQuick = IsDisabledControlJustPressed(0, 82)
                    local nextQuick = IsDisabledControlJustPressed(0, 81)
                    local previousTrack = IsDisabledControlJustPressed(0, state.config.previousTrackControl)
                    local nextTrack = IsDisabledControlJustPressed(0, state.config.nextTrackControl)

                    if previousQuick ~= nextQuick or previousTrack ~= nextTrack then
                        openRadio('quick')
                        local direction = (previousQuick or previousTrack) and -1 or 1
                        navigate(direction)
                    end
                else
                    disableControls(RADIO_SCROLL_BLOCK_CONTROLS)
                    disableControls(state.config.nextControls)
                    disableControls(state.config.previousControls)
                    DisableControlAction(0, state.config.nextTrackControl, true)
                    DisableControlAction(0, state.config.previousTrackControl, true)
                    DisableControlAction(0, state.config.modeControl, true)
                    DisableControlAction(0, state.config.muteControl, true)

                    local direction = readNavigation(now)
                    if direction ~= 0 and navigate(direction) then keepQuickRadioOpen() end

                    if now >= state.nextInputModeAt then
                        sendInputModeIfChanged()
                        state.nextInputModeAt = now + state.config.inputModePollInterval
                    end

                    if IsDisabledControlJustPressed(0, state.config.modeControl) then
                        setMode(state.mode == 'radio' and 'onDemand' or 'radio')
                        keepQuickRadioOpen()
                    end

                    if IsDisabledControlJustPressed(0, state.config.muteControl) then
                        setMuted(not state.muted)
                        keepQuickRadioOpen()
                    end

                    if now >= state.nextMetadataAt then
                        sendMetadataIfChanged(false)
                        state.nextMetadataAt = now + state.config.metadataPollInterval
                    end

                    if not openHeld then
                        if state.visibilitySource == 'hold' then
                            hideRadio()
                        elseif state.visibilitySource == 'quick' and now >= state.quickCloseAt then
                            hideRadio()
                        end
                    end
                end
            else
                state.activeVehicle = 0
                hideRadio()
                restoreNativeState()
            end

            Wait(sleep)
        end
    end)
end

function Radio.setMuted(muted)
    if not state.started then return false end
    return setMuted(muted)
end

function Radio.isMuted()
    return state.muted
end

function Radio.setMode(mode)
    if not state.started then return false end
    return setMode(mode)
end

function Radio.getMode()
    return state.mode
end

function Radio.setStation(stationName)
    if not state.started then return false end
    stationName = boundedString(stationName, 64)
    if not stationName then return false end

    local index = state.stationByName[stationName:upper()]
    if not index then return false end
    return selectStationByIndex(index, 0)
end

exports('setRadioMuted', Radio.setMuted)
exports('isRadioMuted', Radio.isMuted)
exports('setRadioMode', Radio.setMode)
exports('getRadioMode', Radio.getMode)
exports('setRadioStation', Radio.setStation)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end

    state.started = false
    hideRadio()
    restoreNativeState()
end)

return Radio
