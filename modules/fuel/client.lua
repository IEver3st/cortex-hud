local config = lib.require("config.shared")

local GetResourceState = GetResourceState
local GetVehicleFuelLevel = GetVehicleFuelLevel
local Entity = Entity
local GetGameTimer = GetGameTimer
local PlaySoundFrontend = PlaySoundFrontend
local Wait = Wait

local Fuel = {}

local lastAlertVehicle = 0
local lastFuelValue = nil
local lastDebugPrint = 0




local KNOWN_EXPORTS = {
    { "ox_fuel",     "GetFuel" },
    { "ox_fuel",     "GetFuelLevel" },
    { "ps-fuel",     "GetFuel" },
    { "ps-fuel",     "GetFuelLevel" },
    { "cdn-fuel",    "GetFuel" },
    { "cdn-fuel",    "GetFuelLevel" },
    { "LegacyFuel",  "GetFuel" },
    { "LegacyFuel",  "GetFuelLevel" },
    { "LegacyFuel",  "getFuel" },
    { "legacyfuel",  "GetFuel" },
    { "legacyfuel",  "GetFuelLevel" },
    { "legacyfuel",  "getFuel" },
    { "fuel",        "GetFuel" },
    { "fuel",        "getFuel" },
    { "frfuel",      "getCurrentFuel" },
    { "esx_fuel",    "GetFuel" },
    { "qb-fuel",     "GetFuel" },
    { "lj-fuel",     "GetFuel" },
}

local cachedResource = nil
local cachedGetter = nil
local cacheChecked = false
local nextDetectionAt = 0
local PROVIDER_RECHECK_MS = 3000



local function callExport(resourceName, getter, vehicle)
    local ok, fn = pcall(function()
        return exports[resourceName][getter]
    end)
    if not ok or not fn then
        return nil
    end

    local success, result = pcall(fn, vehicle)
    if not success then
        return nil
    end
    return tonumber(result)
end

local function getStateFuel(vehicle)
    local entity = Entity(vehicle)
    if entity and entity.state then
        local val = tonumber(entity.state.fuel)
        if type(val) == "number" then
            return val
        end
    end
    return nil
end


local function detectExport(vehicle)
    if cacheChecked and cachedResource then
        local result = callExport(cachedResource, cachedGetter, vehicle)
        if type(result) == "number" then
            return result, cachedResource .. ":" .. cachedGetter
        end

        cachedResource = nil
        cachedGetter = nil
        cacheChecked = false
        nextDetectionAt = 0
    end

    local now = GetGameTimer()
    if cacheChecked and now >= 0 and now < nextDetectionAt then
        return nil, nil
    end

    local checkedResource = nil
    local checkedResourceStarted = false
    for i = 1, #KNOWN_EXPORTS do
        local entry = KNOWN_EXPORTS[i]
        local resName, getter = entry[1], entry[2]
        if resName ~= checkedResource then
            checkedResource = resName
            checkedResourceStarted = GetResourceState(resName) == "started"
        end

        if checkedResourceStarted then
            local result = callExport(resName, getter, vehicle)
            if type(result) == "number" then
                cachedResource = resName
                cachedGetter = getter
                cacheChecked = true
                nextDetectionAt = 0
                return result, resName .. ":" .. getter
            end
        end
    end

    cacheChecked = true
    nextDetectionAt = now + PROVIDER_RECHECK_MS
    return nil, nil
end



local function getAlertConfig()
    local fc = config.Fuel or {}
    return fc.alerts or {}
end

local function playAlertSound(alerts, count)
    if count <= 0 then return end
    local sound = alerts.sound or {}
    local name = sound.name or "Beep_Red"
    local set = sound.set or "DLC_HEIST_HACKING_SNAKE_SOUNDS"
    local interval = alerts.interval or 220
    CreateThread(function()
        for i = 1, count do
            PlaySoundFrontend(-1, name, set, true)
            if i < count then Wait(interval) end
        end
    end)
end

function Fuel.handleAlerts(vehicle, fuel)
    if not vehicle or vehicle == 0 then return end
    local alerts = getAlertConfig()
    if alerts.enabled == false then return end

    local fuelValue = tonumber(fuel)
    if type(fuelValue) ~= "number" then return end

    if lastAlertVehicle ~= vehicle then
        lastAlertVehicle = vehicle
        lastFuelValue = fuelValue
        return
    end
    if lastFuelValue == nil then
        lastFuelValue = fuelValue
        return
    end

    local thresholds = alerts.thresholds or { 20, 10, 5 }
    local counts = alerts.counts or {}
    local totalCount = 0
    for i = 1, #thresholds do
        local t = thresholds[i]
        if lastFuelValue > t and fuelValue <= t then
            totalCount = totalCount + (counts[t] or 1)
        end
    end

    if totalCount > 0 then
        playAlertSound(alerts, totalCount)
    end

    lastFuelValue = fuelValue
end





function Fuel.init() end



function Fuel.get(vehicle)
    if not vehicle or vehicle == 0 then
        return 0, false
    end

    local fc = config.Fuel or {}
    local result = nil
    local source = "none"

    local stateFuel = getStateFuel(vehicle)
    if type(stateFuel) == "number" then
        result = stateFuel
        source = "statebag"
    end

    if type(result) ~= "number" then
        local detected, detectedSource = detectExport(vehicle)
        if type(detected) == "number" then
            result = detected
            source = "export:" .. (detectedSource or "unknown")
        end
    end

    if type(result) == "number" and fc.treatZeroAsInvalid and result <= 0 then
        local native = GetVehicleFuelLevel(vehicle)
        if native > 0 then
            result = native
            source = "native-zero-fallback"
        end
    end

    if type(result) ~= "number" then
        if fc.fallbackToNative == false then
            return 0, false
        end
        result = GetVehicleFuelLevel(vehicle)
        source = "native"
    end



    local hasFuelProvider = source == "statebag"
        or source:sub(1, 7) == "export:"

    if fc.debug and type(result) == "number" then
        local now = GetGameTimer()
        if not lastDebugPrint or (now - lastDebugPrint > 5000) then
            print(string.format(
                "[cortex-hud:fuel] Vehicle: %d | Source: %s | Fuel: %.2f | HasProvider: %s",
                vehicle, source, result, tostring(hasFuelProvider)
            ))
            lastDebugPrint = now
        end
    end

    return result or 0, hasFuelProvider
end

return Fuel
