local CANDIDATE_WEATHER_RES = { 'Dynamic_weather', 'dynamic_weather' }
local config = lib.require('config.shared')
local libSettings = lib.settings
local SendNUIMessage = lib.require('modules.nui.client').send
local PlayerPedId = PlayerPedId
local GetEntityCoords = GetEntityCoords

local WET_ETA_CANDIDATES = {
    'getWetEtaSeconds',
    'getWetWeatherEta',
    'getRainEta',
    'getRainEtaSeconds',
    'getTimeUntilRain',
    'getTimeUntilPrecip',
}

local lastPayloadJson = nil
local lastAvailSent = nil
local lastFloodJson = nil
local lastHurricaneJson = nil
local resolvedWeatherRes = nil

local function asWeatherString(v)
    if v == nil or v == '' then
        return nil
    end
    if type(v) == 'string' then
        return v
    end
    if type(v) == 'table' then
        local t = v.weather or v.name or v.type or v.label
        if type(t) == 'string' and t ~= '' then
            return t
        end
        if type(t) == 'number' then
            return tostring(t)
        end
    end
    if type(v) == 'number' or type(v) == 'boolean' then
        return tostring(v)
    end
    return nil
end

local function buildExportForecastLine(snap, wetLabel)
    for _, key in ipairs({ 'hudForecastLine', 'forecastLine', 'hudForecastText', 'forecastSummary' }) do
        local t = snap[key]
        if type(t) == 'string' and t:match('%S') then
            return (t:gsub('^%s+', ''):gsub('%s+$', ''))
        end
    end
    local parts = {}
    if type(wetLabel) == 'string' and wetLabel:match('%S') then
        parts[#parts + 1] = (wetLabel:gsub('^%s+', ''):gsub('%s+$', ''))
    end
    local a = asWeatherString(snap.clientDisplay) or ''
    local b = asWeatherString(snap.serverNext) or ''
    if b ~= '' then
        local aN = a:gsub('^%s+', ''):gsub('%s+$', ''):lower()
        local bN = b:gsub('^%s+', ''):gsub('%s+$', ''):lower()
        if aN ~= bN then
            parts[#parts + 1] = (b:upper())
        end
    end
    if #parts == 0 and type(snap.forecast) == 'table' and snap.forecast[1] then
        local e = snap.forecast[1]
        if type(e) == 'string' and e:match('%S') then
            return (e:gsub('^%s+', ''):gsub('%s+$', ''))
        end
        if type(e) == 'table' then
            local s = e.summary or e.text or e.message
            if type(s) == 'string' and s:match('%S') then
                return (s:gsub('^%s+', ''):gsub('%s+$', ''))
            end
            local w = asWeatherString(e.weather or e.name or e.type) or ''
            local lbl = e.label or e.time
            if type(lbl) == 'string' and lbl:match('%S') and w:match('%S') then
                if not (lbl:lower():match('^%d+%s*am$') or lbl:lower():match('^%d+%s*pm$')) then
                    return (lbl .. ' ' .. w):gsub('^%s+', ''):gsub('%s+$', '')
                end
            end
            if w:match('%S') then
                return (w:gsub('^%s+', ''):gsub('%s+$', ''))
            end
        end
    end
    return table.concat(parts, ' · ')
end

local function truthySetting(v)
    if v == true or v == 1 then
        return true
    end
    if type(v) == 'string' then
        local s = v:lower()
        return s == 'true' or s == '1'
    end
    return false
end

local function settingFromLib(keys)
    for _, key in ipairs(keys) do
        local ok, v = pcall(function()
            return libSettings.getSetting(key)
        end)
        if ok and v ~= nil then
            return truthySetting(v)
        end
    end
    return nil
end

local function floodSettingEnabled()
    local fromLib = settingFromLib({
        'hud_showFlashFloodWarning',
        'showFlashFloodWarning',
    })
    if fromLib ~= nil then
        return fromLib
    end
    return config.showFlashFloodWarning ~= false
end

local function hurricaneSettingEnabled()
    local fromLib = settingFromLib({
        'hud_showHurricaneWarning',
        'showHurricaneWarning',
    })
    if fromLib ~= nil then
        return fromLib
    end
    return config.showHurricaneWarning ~= false
end

local function settingEnabled()
    local fromLib = settingFromLib({
        'hud_showDynamicWeather',
        'showDynamicWeather',
        'dynamic_weather_hud_indicator',
    })
    if fromLib ~= nil then
        return fromLib
    end
    return config.showDynamicWeather == true
end

local function getExport(wres, name)
    if not wres or wres == '' then
        return nil
    end
    local ok, fn = pcall(function()
        return exports[wres] and exports[wres][name]
    end)
    if ok and type(fn) == 'function' then
        return fn
    end
    return nil
end

local function getExportAny(wres, names)
    for _, name in ipairs(names) do
        local f = getExport(wres, name)
        if f then
            return f
        end
    end
    return nil
end

local function isWeatherResourceCapable(wres)
    if not wres or GetResourceState(wres) ~= 'started' then
        return false
    end
    if getExport(wres, 'getHudWeatherSnapshot') then
        return true
    end
    if getExport(wres, 'getPlayerWeather') or getExport(wres, 'getCurrentWeather') then
        return true
    end

    if getExport(wres, 'isFloodEventActive') or getExport(wres, 'getFloodEventState') then
        return true
    end
    if getExport(wres, 'IsHurricaneActive') or getExport(wres, 'isHurricaneActive')
        or getExport(wres, 'GetHurricaneState') or getExport(wres, 'getHurricaneState') then
        return true
    end
    return false
end

local function resolveWeatherResource()
    if resolvedWeatherRes and isWeatherResourceCapable(resolvedWeatherRes) then
        return resolvedWeatherRes
    end
    resolvedWeatherRes = nil
    for _, name in ipairs(CANDIDATE_WEATHER_RES) do
        if isWeatherResourceCapable(name) then
            resolvedWeatherRes = name
            return name
        end
    end
    return nil
end

local function callExportString(wres, name)
    local f = getExport(wres, name)
    if not f then
        return nil
    end
    local ok, a, b, c = pcall(f)
    if not ok then
        return nil
    end
    if b ~= nil or c ~= nil then
        return asWeatherString(a) or asWeatherString(b) or asWeatherString(c) or tostring(a)
    end
    return asWeatherString(a) or (type(a) == 'string' and a) or tostring(a)
end

local function tryWetEtaFromExports(wres)
    for _, name in ipairs(WET_ETA_CANDIDATES) do
        local f = getExport(wres, name)
        if f then
            local ok, a, b = pcall(f)
            if ok then
                if type(a) == 'number' and a == a and a > -1 then
                    return a, name
                end
                if type(b) == 'number' and b == b and b > -1 then
                    return b, name
                end
            end
        end
    end
    return nil, nil
end

local function formatWetLabel(wsec)
    if wsec == nil then
        return nil
    end
    if wsec <= 0 then
        return 'Precipitation active'
    end
    local s = math.floor(tonumber(wsec) + 0.5)
    if s < 60 then
        return ('Rain ~%ds'):format(s)
    elseif s < 3600 then
        return ('Rain ~%dm'):format(math.floor(s / 60))
    else
        local h = math.floor(s / 3600)
        local m = math.floor((s % 3600) / 60)
        return ('Rain ~%dh %dm'):format(h, m)
    end
end

local function buildSnapshotFromPublicExports(wres)
    local p = callExportString(wres, 'getPlayerWeather')
    local c = callExportString(wres, 'getCurrentWeather')
    local a = p or c or 'UNKNOWN'
    c = c or p

    local pNorm = p and p:gsub('^%s+', ''):gsub('%s+$', ''):lower() or ''
    local cNorm = c and c:gsub('^%s+', ''):gsub('%s+$', ''):lower() or ''
    local serverNext = (p and c and pNorm ~= cNorm) and c or nil

    local season = callExportString(wres, 'getSeason')

    local wetS = tryWetEtaFromExports(wres)
    local wetLabel = formatWetLabel(wetS)

    local gff = callExportString(wres, 'getForcedWeather')
    local lockedF = getExport(wres, 'isWeatherForceLocked')
    local locked = false
    if lockedF then
        local ok, lv = pcall(lockedF)
        locked = ok and truthySetting(lv)
    end
    if locked and gff and gff ~= '' and not (wetLabel and wetLabel:find('Rain')) then
        wetLabel = (wetLabel and (wetLabel .. ' · ') or '') .. 'Forced: ' .. gff
    end

    local inZone, zoneLabel
    do
        local ped = PlayerPedId and PlayerPedId()
        local coords = ped and GetEntityCoords(ped)
        if coords and getExport(wres, 'getZoneAt') then
            local ok, zr = pcall(function()
                return exports[wres].getZoneAt(coords)
            end)
            if (not ok or not zr) and coords.x then
                ok, zr = pcall(function()
                    return exports[wres].getZoneAt(coords.x, coords.y, coords.z)
                end)
            end
            if ok and type(zr) == 'string' and zr ~= '' then
                inZone, zoneLabel = true, zr
            end
        end
    end

    local gbd = getExport(wres, 'getBlackout')
    if gbd then
        local ok, b = pcall(gbd)
        if ok and truthySetting(b) then
            if wetLabel and not wetLabel:find('Blackout', 1, true) then
                wetLabel = 'Blackout · ' .. wetLabel
            else
                wetLabel = 'Blackout'
            end
        end
    end

    return {
        clientDisplay = a,
        season = season,
        serverCurrent = c,
        serverNext = serverNext,
        timeUntilAdvance = nil,
        intervalMinutes = nil,
        forecast = {},
        wetEtaSeconds = wetS,
        wetEtaLabel = wetLabel,
        inZone = inZone,
        zoneLabel = zoneLabel,
    }
end

local function stringFromFloodState(st)
    if st == nil then
        return ''
    end
    if type(st) == 'string' then
        local t = (st:gsub('^%s+', ''):gsub('%s+$', ''))
        return t:match('%S') and t or ''
    end
    if type(st) == 'table' then
        for _, key in ipairs({
            'message',
            'detail',
            'text',
            'label',
            'phase',
            'status',
            'mode',
            'name',
            'reason',
            'title',
            'alert',
            'subtitle',
            'description',
        }) do
            local v = st[key]
            if type(v) == 'string' and v:match('%S') then
                return (v:gsub('^%s+', ''):gsub('%s+$', ''))
            end
        end
        if type(st.intensity) == 'number' and st.intensity == st.intensity then
            return ('Intensity %d'):format(math.floor(st.intensity + 0.5))
        end
    end
    return ''
end

local FLOOD_PHASE_IDLE = {
    idle = true,
    inactive = true,
    none = true,
    ended = true,
    ['end'] = true,
    complete = true,
    completed = true,
    stopped = true,
    cooldown = true,
    clear = true,
    ['false'] = true,
}

local function floodPhaseStringActive(s)
    if type(s) ~= 'string' then
        return false
    end
    local k = s:lower():gsub('^%s+', ''):gsub('%s+$', '')
    if k == '' or k == '0' or k == 'false' then
        return false
    end
    return not FLOOD_PHASE_IDLE[k]
end

local function floodActiveFromStateTable(t)
    if type(t) ~= 'table' then
        return false
    end
    if t.active == true or t.isActive == true or t.enabled == true or t.running == true then
        return true
    end
    if t.isFloodEventActive == true or t.floodEventActive == true or t.flashFlood == true then
        return true
    end
    if floodPhaseStringActive(t.phase) or floodPhaseStringActive(t.state) or floodPhaseStringActive(t.status) or floodPhaseStringActive(t.mode) then
        return true
    end
    if type(t.intensity) == 'number' and t.intensity == t.intensity and t.intensity > 0 then
        return true
    end
    return false
end

local function floodActiveFromReturn(v)
    if v == nil or v == false then
        return false
    end
    if v == true then
        return true
    end
    if type(v) == 'number' then
        return v ~= 0 and v == v
    end
    if type(v) == 'string' then
        return floodPhaseStringActive(v)
    end
    if type(v) == 'table' then
        return floodActiveFromStateTable(v)
    end
    return truthySetting(v)
end

local function snapshotTruth(v)
    if v == true or v == 1 then
        return true
    end
    if type(v) == 'string' then
        return truthySetting(v)
    end
    return false
end

local function snapshotFieldFloodActive(v)
    if snapshotTruth(v) then
        return true
    end
    if type(v) == 'table' then
        return floodActiveFromStateTable(v)
    end
    return false
end

local function floodFromHudSnapshot(snap)
    if type(snap) ~= 'table' then
        return false, ''
    end
    if snapshotFieldFloodActive(snap.isFloodEventActive) or snapshotFieldFloodActive(snap.floodEventActive)
        or snapshotFieldFloodActive(snap.flashFloodActive) or snapshotFieldFloodActive(snap.flashFlood)
        or snapshotFieldFloodActive(snap.flash_flood) or snapshotFieldFloodActive(snap.floodWarning)
        or snapshotFieldFloodActive(snap.flood_warning) then
        local nested = snap.floodEventState or snap.floodState or snap.flashFlood or snap.flash_flood or snap.flood
        local d = ''
        if nested ~= nil then
            d = stringFromFloodState(nested)
        end
        if d == '' then
            d = stringFromFloodState(snap)
        end
        return true, d
    end
    if type(snap.flood) == 'table' then
        local fa = floodActiveFromStateTable(snap.flood)
        if fa then
            return true, stringFromFloodState(snap.flood)
        end
    end
    return false, ''
end


local function readFloodState(wres, snap)
    local activeFn = getExportAny(wres, {
        'isFloodEventActive',
        'IsFloodEventActive',
        'isFlashFloodActive',
        'IsFlashFloodActive',
    })
    local stateFn = getExportAny(wres, {
        'getFloodEventState',
        'GetFloodEventState',
        'getFlashFloodState',
        'GetFlashFloodState',
    })

    local active = false
    local detail = ''

    if stateFn then
        local ok, st = pcall(stateFn)
        if ok then
            active = floodActiveFromReturn(st)
            detail = stringFromFloodState(st)
        end
    end

    if activeFn then
        local ok, v = pcall(activeFn)
        if ok then
            if type(v) == 'boolean' then
                active = active or v
            elseif type(v) == 'number' then
                active = active or (v ~= 0)
            elseif type(v) == 'table' then
                active = active or floodActiveFromStateTable(v)
            else
                active = active or truthySetting(v)
            end
        end
    end

    if type(snap) == 'table' then
        local sa, sd = floodFromHudSnapshot(snap)
        if sa then
            active = true
            if (detail == '' or detail == nil) and sd ~= '' then
                detail = sd
            end
        end
    end

    return active, detail or ''
end

local function hurricaneActiveFromStateTable(t)
    if floodActiveFromStateTable(t) then
        return true
    end
    if type(t) ~= 'table' then
        return false
    end
    if t.isHurricaneActive == true or t.hurricaneActive == true or t.hurricane == true then
        return true
    end
    return false
end

local function hurricaneActiveFromReturn(v)
    if v == nil or v == false then
        return false
    end
    if v == true then
        return true
    end
    if type(v) == 'number' then
        return v ~= 0 and v == v
    end
    if type(v) == 'string' then
        return floodPhaseStringActive(v)
    end
    if type(v) == 'table' then
        return hurricaneActiveFromStateTable(v)
    end
    return truthySetting(v)
end

local function snapshotFieldHurricaneActive(v)
    if snapshotTruth(v) then
        return true
    end
    if type(v) == 'table' then
        return hurricaneActiveFromStateTable(v)
    end
    return false
end

local function hurricaneFromHudSnapshot(snap)
    if type(snap) ~= 'table' then
        return false, ''
    end
    if snapshotFieldHurricaneActive(snap.isHurricaneActive) or snapshotFieldHurricaneActive(snap.hurricaneActive)
        or snapshotFieldHurricaneActive(snap.hurricane) or snapshotFieldHurricaneActive(snap.hurricaneWarning) then
        local nested = snap.hurricaneState or snap.hurricane
        local d = ''
        if nested ~= nil then
            d = stringFromFloodState(nested)
        end
        if d == '' then
            d = stringFromFloodState(snap)
        end
        return true, d
    end
    return false, ''
end

local function readHurricaneState(wres, snap)
    local activeFn = getExportAny(wres, {
        'IsHurricaneActive',
        'isHurricaneActive',
    })
    local stateFn = getExportAny(wres, {
        'GetHurricaneState',
        'getHurricaneState',
    })

    local active = false
    local detail = ''

    if stateFn then
        local ok, st = pcall(stateFn)
        if ok then
            active = hurricaneActiveFromReturn(st)
            detail = stringFromFloodState(st)
        end
    end

    if activeFn then
        local ok, v = pcall(activeFn)
        if ok then
            if type(v) == 'boolean' then
                active = active or v
            elseif type(v) == 'number' then
                active = active or (v ~= 0)
            elseif type(v) == 'table' then
                active = active or hurricaneActiveFromStateTable(v)
            else
                active = active or truthySetting(v)
            end
        end
    end

    if type(snap) == 'table' then
        local sa, sd = hurricaneFromHudSnapshot(snap)
        if sa then
            active = true
            if (detail == '' or detail == nil) and sd ~= '' then
                detail = sd
            end
        end
    end

    return active, detail or ''
end

local function pushHurricanePayload(active, detail)
    detail = detail or ''
    local payload = {
        action = 'updateHurricaneWarning',
        active = active == true,
        detail = (detail ~= '' and detail) or nil,
    }
    local enc = json.encode(payload)
    if enc ~= lastHurricaneJson then
        lastHurricaneJson = enc
        SendNUIMessage(payload)
    end
end

local function pushHurricaneOff()
    pushHurricanePayload(false, '')
end

local function pushFloodPayload(active, detail)
    detail = detail or ''
    local payload = {
        action = 'updateFloodWarning',
        active = active == true,
        detail = (detail ~= '' and detail) or nil,
    }
    local enc = json.encode(payload)
    if enc ~= lastFloodJson then
        lastFloodJson = enc
        SendNUIMessage(payload)
    end
end

local function pushFloodOff()
    pushFloodPayload(false, '')
end

local function pushOff()
    if lastPayloadJson == 'off' then
        return
    end
    lastPayloadJson = 'off'
    SendNUIMessage({ action = 'updateDynamicWeather', show = false })
end

local function sendAvailability(available)
    if lastAvailSent == available then
        return
    end
    lastAvailSent = available
    SendNUIMessage({ action = 'setDynamicWeatherAvailable', available = available == true })
end

local M = {}

function M.start()
    sendAvailability(false)
    CreateThread(function()
        while true do
            local sleep = 1000
            if GetResourceState('cortex-lib') ~= 'started' then
                sendAvailability(false)
                pushOff()
                pushFloodOff()
                pushHurricaneOff()
                Wait(sleep)
            else
                local wres = resolveWeatherResource()
                local capable = wres and isWeatherResourceCapable(wres) or false
                sendAvailability(capable)

                local hudSnap = nil
                if capable and wres then
                    local hSnapEarly = getExport(wres, 'getHudWeatherSnapshot')
                    if hSnapEarly then
                        local ok, s = pcall(hSnapEarly)
                        if ok and type(s) == 'table' then
                            hudSnap = s
                        end
                    end
                end

                if capable and wres then
                    local fa, fd = readFloodState(wres, hudSnap)
                    if floodSettingEnabled() then
                        pushFloodPayload(fa, fd)
                    else
                        pushFloodOff()
                    end
                    local ha, hd = readHurricaneState(wres, hudSnap)
                    if hurricaneSettingEnabled() then
                        pushHurricanePayload(ha, hd)
                    else
                        pushHurricaneOff()
                    end
                else
                    pushFloodOff()
                    pushHurricaneOff()
                end

                if not wres or not capable then
                    pushOff()
                    Wait(3000)
                elseif not settingEnabled() then
                    pushOff()
                    Wait(2000)
                else
                    sleep = 2000
                    local snap
                    local snapOk = false
                    if hudSnap then
                        snap, snapOk = hudSnap, true
                    else
                        local hSnap = getExport(wres, 'getHudWeatherSnapshot')
                        if hSnap then
                            local ok, s = pcall(hSnap)
                            if ok and type(s) == 'table' then
                                snap, snapOk = s, true
                            end
                        end
                    end
                    if not snapOk then
                        snap = buildSnapshotFromPublicExports(wres)
                        snapOk = true
                    end
                    if not snapOk or type(snap) ~= 'table' then
                        pushOff()
                    else
                        local wetLabel
                        local wsec = snap.wetEtaSeconds
                        if wsec == nil and snap.wetEta then
                            wsec = snap.wetEta
                        end
                        if wsec == nil and type(snap.wetEtaLabel) == 'string' and snap.wetEtaLabel ~= '' then
                            wetLabel = snap.wetEtaLabel
                        elseif wsec ~= nil then
                            local n = tonumber(wsec)
                            if n ~= nil and n == n then
                                wetLabel = formatWetLabel(n)
                            end
                        end
                        if (wetLabel == nil or wetLabel == '') and type(snap.wetEtaLabel) == 'string' and snap.wetEtaLabel ~= '' then
                            wetLabel = snap.wetEtaLabel
                        end

                        local forecastLine = buildExportForecastLine(snap, wetLabel)

                        local payload = {
                            action = 'updateDynamicWeather',
                            show = true,
                            clientDisplay = snap.clientDisplay,
                            season = snap.season,
                            serverCurrent = snap.serverCurrent,
                            serverNext = snap.serverNext,
                            timeUntilAdvance = snap.timeUntilAdvance,
                            intervalMinutes = snap.intervalMinutes,
                            forecastLine = forecastLine,
                            wetEtaSeconds = snap.wetEtaSeconds,
                            wetEtaLabel = wetLabel,
                            inZone = snap.inZone,
                            zoneLabel = snap.zoneLabel,
                        }

                        local encoded = json.encode(payload)
                        if encoded ~= lastPayloadJson then
                            lastPayloadJson = encoded
                            SendNUIMessage(payload)
                        end
                    end

                    Wait(sleep)
                end
            end
        end
    end)
end

return M
