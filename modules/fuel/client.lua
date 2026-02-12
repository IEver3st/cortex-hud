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

-- ============================================================================
-- Known fuel script exports, checked in priority order.
-- Each entry: { resource, getter }
-- ============================================================================

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

-- Cache the resolved export so we don't scan every frame
local cachedResource = nil
local cachedGetter = nil
local cacheChecked = false

-- ============================================================================
-- Helpers
-- ============================================================================

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

--- Scan KNOWN_EXPORTS for the first resource that is started and returns a
--- valid number. Caches the result so subsequent calls skip the scan.
local function detectExport(vehicle)
    if cacheChecked and cachedResource then
        local result = callExport(cachedResource, cachedGetter, vehicle)
        if type(result) == "number" then
            return result, cachedResource .. ":" .. cachedGetter
        end
        -- Cached export stopped working — clear cache and rescan
        cachedResource = nil
        cachedGetter = nil
        cacheChecked = false
    end

    for i = 1, #KNOWN_EXPORTS do
        local entry = KNOWN_EXPORTS[i]
        local resName, getter = entry[1], entry[2]
        if GetResourceState(resName) == "started" then
            local result = callExport(resName, getter, vehicle)
            if type(result) == "number" then
                cachedResource = resName
                cachedGetter = getter
                cacheChecked = true
                return result, resName .. ":" .. getter
            end
        end
    end

    cacheChecked = true
    return nil, nil
end

-- ============================================================================
-- Alerts
-- ============================================================================

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

    -- Reset tracking when vehicle changes
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

-- ============================================================================
-- Public API
-- ============================================================================

--- Backward-compatible no-op. The old module used this for the "ask" mode
--- context menu prompt, which has been removed.
function Fuel.init() end

--- Get the current fuel level for a vehicle.
--- @param vehicle number  The vehicle entity handle
--- @return number fuel     Fuel level 0-100
--- @return boolean hasFuelProvider  True if an external fuel script was used
function Fuel.get(vehicle)
    if not vehicle or vehicle == 0 then
        return 0, false
    end

    local fc = config.Fuel or {}
    local result = nil
    local source = "none"

    -- 1. Statebag (ox_lib / entity state)
    local stateFuel = getStateFuel(vehicle)
    if type(stateFuel) == "number" then
        result = stateFuel
        source = "statebag"
    end

    -- 2. Known fuel script exports
    if type(result) ~= "number" then
        local detected, detectedSource = detectExport(vehicle)
        if type(detected) == "number" then
            result = detected
            source = "export:" .. (detectedSource or "unknown")
        end
    end

    -- 3. Handle zero-as-invalid (fuel script returned 0 but native says otherwise)
    if type(result) == "number" and fc.treatZeroAsInvalid and result <= 0 then
        local native = GetVehicleFuelLevel(vehicle)
        if native > 0 then
            result = native
            source = "native-zero-fallback"
        end
    end

    -- 4. Native GTA fallback
    if type(result) ~= "number" then
        if fc.fallbackToNative == false then
            return 0, false
        end
        result = GetVehicleFuelLevel(vehicle)
        source = "native"
    end

    -- A fuel provider means either an external resource export or a statebag
    -- was used (e.g. ox_fuel sets entity.state.fuel). Only the native GTA
    -- fallback is NOT considered a fuel provider.
    local hasFuelProvider = source == "statebag"
        or source:sub(1, 7) == "export:"

    if fc.debug and type(result) == "number" then
        local now = GetGameTimer()
        if not lastDebugPrint or (now - lastDebugPrint > 5000) then
            print(string.format(
                "[es_hud:fuel] Vehicle: %d | Source: %s | Fuel: %.2f | HasProvider: %s",
                vehicle, source, result, tostring(hasFuelProvider)
            ))
            lastDebugPrint = now
        end
    end

    return result or 0, hasFuelProvider
end

return Fuel
