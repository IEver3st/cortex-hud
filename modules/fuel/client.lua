local config = lib.require("config.shared")

local GetResourceState = GetResourceState
local GetVehicleFuelLevel = GetVehicleFuelLevel
local GetResourceKvpString = GetResourceKvpString
local SetResourceKvp = SetResourceKvp
local IsPlayerPlaying = IsPlayerPlaying
local PlayerId = PlayerId
local Entity = Entity
local GetGameTimer = GetGameTimer
local PlaySoundFrontend = PlaySoundFrontend
local Wait = Wait

local Fuel = {}
Fuel.__index = Fuel

local kvpKey = "es_hud:fuelProvider"
local cachedSelection = nil
local hasPrompted = false
local lastDebugPrint = 0
local lastAlertVehicle = 0
local lastFuelValue = nil

local function getConfig()
    return config.Fuel or {}
end

local function getProviders()
    local fuelConfig = getConfig()
    return fuelConfig.providers or {}
end

local function normalizeSelection(value)
    if value == nil then
        return nil
    end
    local str = tostring(value)
    if str == "" then
        return nil
    end
    return str
end

local function getStoredSelection()
    local stored = GetResourceKvpString(kvpKey)
    return normalizeSelection(stored)
end

local function saveSelection(value)
    if value == nil then
        return
    end
    SetResourceKvp(kvpKey, value)
end

local function rememberSelection()
    local fuelConfig = getConfig()
    return fuelConfig.rememberSelection ~= false
end

local function setSelection(value)
    local normalized = normalizeSelection(value)
    cachedSelection = normalized
    if normalized and rememberSelection() then
        saveSelection(normalized)
    end
end

local function findProviderById(id)
    if not id then
        return nil
    end
    local providers = getProviders()
    for i = 1, #providers do
        local provider = providers[i]
        if provider and provider.id == id then
            return provider
        end
    end
    return nil
end

local function callExport(resourceName, getter, vehicle)
    local resourceExports = exports[resourceName]
    local fn = resourceExports and resourceExports[getter]
    if not fn then
        return nil
    end
    local ok, result = pcall(fn, vehicle)
    if not ok then
        return nil
    end
    return tonumber(result)
end

local function getStateFuel(vehicle)
    local entity = Entity(vehicle)
    if entity and entity.state then
        local stateFuel = tonumber(entity.state.fuel)
        if type(stateFuel) == "number" then
            return stateFuel
        end
    end
    return nil
end

local function getAlertConfig()
    local fuelConfig = getConfig()
    return fuelConfig.alerts or {}
end

local function getAlertCount(alerts, threshold)
    local counts = alerts.counts or {}
    return counts[threshold] or 1
end

local function playAlertSound(alerts, count)
    if count <= 0 then
        return
    end
    local sound = alerts.sound or {}
    local name = sound.name or "Beep_Red"
    local set = sound.set or "DLC_HEIST_HACKING_SNAKE_SOUNDS"
    local interval = alerts.interval or 220
    CreateThread(function()
        for i = 1, count do
            PlaySoundFrontend(-1, name, set, true)
            if i < count then
                Wait(interval)
            end
        end
    end)
end

function Fuel.handleAlerts(vehicle, fuel)
    if not vehicle or vehicle == 0 then
        return
    end
    local alerts = getAlertConfig()
    if alerts.enabled == false then
        return
    end
    local fuelValue = tonumber(fuel)
    if type(fuelValue) ~= "number" then
        return
    end
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
    local totalCount = 0
    for i = 1, #thresholds do
        local threshold = thresholds[i]
        if lastFuelValue > threshold and fuelValue <= threshold then
            totalCount = totalCount + getAlertCount(alerts, threshold)
        end
    end
    if totalCount > 0 then
        playAlertSound(alerts, totalCount)
    end
    lastFuelValue = fuelValue
end

local function getFuelFromProvider(provider, vehicle)
    if not provider then
        return nil, nil
    end
    local resources = provider.resources or {}
    for i = 1, #resources do
        local entry = resources[i]
        if entry and entry.name and GetResourceState(entry.name) == "started" then
            local getters = entry.getters or {}
            for j = 1, #getters do
                local result = callExport(entry.name, getters[j], vehicle)
                if type(result) == "number" then
                    return result, entry.name .. ":" .. getters[j]
                end
            end
        end
    end
    return nil, nil
end

local function detectProvider(vehicle)
    local providers = getProviders()
    for i = 1, #providers do
        local provider = providers[i]
        local result, source = getFuelFromProvider(provider, vehicle)
        if type(result) == "number" then
            return provider, result, source
        end
    end
    return nil, nil, nil
end

local function buildOptions()
    local options = {}
    local providers = getProviders()
    for i = 1, #providers do
        local provider = providers[i]
        if provider and provider.id then
            options[#options + 1] = {
                value = provider.id,
                label = provider.label or provider.id
            }
        end
    end
    options[#options + 1] = {
        value = "auto",
        label = "Auto-detect"
    }
    return options
end

local function promptSelection()
    if not lib or not lib.contextMenu then
        return nil
    end
    local options = buildOptions()
    if #options == 0 then
        return nil
    end
    local result = lib.contextMenu({
        title = "Fuel Script",
        fields = {
            {
                type = "select",
                name = "fuelScript",
                label = "Fuel Script",
                required = true,
                options = options
            }
        },
        values = {
            fuelScript = "auto"
        },
        labels = {
            confirm = "SAVE",
            cancel = "SKIP"
        }
    })
    return result and result.fuelScript or nil
end

local function resolveSelection()
    if cachedSelection then
        return cachedSelection
    end
    local fuelConfig = getConfig()
    local mode = fuelConfig.mode or "auto"
    if mode == "manual" then
        cachedSelection = normalizeSelection(fuelConfig.manual)
        return cachedSelection
    end
    local stored = rememberSelection() and getStoredSelection() or nil
    if stored then
        cachedSelection = stored
        return cachedSelection
    end
    if mode == "ask" then
        return nil
    end
    return "auto"
end

function Fuel.init()
    local fuelConfig = getConfig()
    if fuelConfig.mode ~= "ask" then
        return
    end
    if hasPrompted then
        return
    end
    hasPrompted = true
    CreateThread(function()
        while not IsPlayerPlaying(PlayerId()) do
            Wait(250)
        end
        local selection = resolveSelection()
        if selection then
            return
        end
        local chosen = promptSelection()
        if chosen then
            setSelection(chosen)
            if lib and lib.notify then
                lib.notify({
                    type = "success",
                    title = "Fuel Script",
                    description = "Fuel script set to " .. chosen,
                    duration = 2000
                })
            end
        end
    end)
end

function Fuel.get(vehicle)
    if not vehicle or vehicle == 0 then
        return 0
    end
    local fuelConfig = getConfig()
    local result = nil
    local source = "none"

    local stateFuel = getStateFuel(vehicle)
    if type(stateFuel) == "number" then
        result = stateFuel
        source = "statebag"
    end

    local selection = nil
    if type(result) ~= "number" then
        selection = resolveSelection()
        if selection and selection ~= "auto" then
            local provider = findProviderById(selection)
            local value, providerSource = getFuelFromProvider(provider, vehicle)
            if type(value) == "number" then
                result = value
                source = "provider:" .. selection
                if providerSource then
                    source = source .. ":" .. providerSource
                end
            end
        end
        if type(result) ~= "number" then
            local provider, detected, detectedSource = detectProvider(vehicle)
            if type(detected) == "number" then
                result = detected
                source = "detected:" .. (provider and provider.id or "unknown")
                if detectedSource then
                    source = source .. ":" .. detectedSource
                end
            end
            if selection == nil and provider and provider.id and fuelConfig.mode ~= "ask" then
                setSelection(provider.id)
            end
        end
    end

    if type(result) == "number" and fuelConfig.treatZeroAsInvalid and result <= 0 then
        local native = GetVehicleFuelLevel(vehicle)
        if native > 0 then
            result = native
            source = "native-zero-fallback"
        elseif fuelConfig.fallbackToNative then
            result = native
            source = "native"
        end
    end

    if type(result) ~= "number" then
        if fuelConfig.fallbackToNative == false then
            if fuelConfig.debug then
                print("[es_hud:fuel] No script found and fallback disabled. Returning 0.")
            end
            return 0
        end
        result = GetVehicleFuelLevel(vehicle)
        source = "native"
    end

    if fuelConfig.debug and type(result) == "number" then
        local now = GetGameTimer()
        if not lastDebugPrint or (now - lastDebugPrint > 5000) then
            print(string.format("[es_hud:fuel] Vehicle: %d | Source: %s | Fuel: %.2f", vehicle, source, result))
            lastDebugPrint = now
        end
    end

    return result or 0
end

return Fuel
