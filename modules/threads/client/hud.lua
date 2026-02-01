local hud = {}

local PlayerId = PlayerId
local PlayerPedId = PlayerPedId
local IsPlayerPlaying = IsPlayerPlaying
local GetEntityCoords = GetEntityCoords
local GetEntityHealth = GetEntityHealth
local GetEntityMaxHealth = GetEntityMaxHealth
local GetPedArmour = GetPedArmour
local GetStreetNameAtCoord = GetStreetNameAtCoord
local GetStreetNameFromHashKey = GetStreetNameFromHashKey
local GetNameOfZone = GetNameOfZone
local GetLabelText = GetLabelText
local GetEntityHeading = GetEntityHeading
local GetSafeZoneSize = GetSafeZoneSize
local GetActiveScreenResolution = GetActiveScreenResolution
local SendNUIMessage = SendNUIMessage
local IsPedInAnyVehicle = IsPedInAnyVehicle
local DisplayRadar = DisplayRadar
local Wait = Wait
local math_abs = math.abs
local math_floor = math.floor
local math_max = math.max
local math_min = math.min

local minimap = lib.require("modules.utility.shared.minimap")
local SeatbeltLogic = lib.require("modules.seatbelt.client")
local StallLogic = lib.require("modules.stall.client")
local VehicleStatusThread = lib.require("modules.threads.client.vehicle_status")

local visibilityReasons = {
    user = true,
    polcam = true,
    external = true
}

local aircraftHudForced = false

local minimapVisible = true

local lastVisibleState = true

local function updateVisibility()
    local shouldBeVisible = true
    for _, allowed in pairs(visibilityReasons) do
        if not allowed then
            shouldBeVisible = false
            break
        end
    end
    
    if shouldBeVisible ~= lastVisibleState then
        lastVisibleState = shouldBeVisible
        SendNUIMessage({
            action = 'toggleVisibility',
            visible = shouldBeVisible,
            forceAircraftHud = aircraftHudForced
        })
    end

    DisplayRadar(shouldBeVisible and minimapVisible)
    
    return shouldBeVisible
end

local function setVisibilityReason(reason, visible)
    visibilityReasons[reason] = visible
    return updateVisibility()
end

local function getVisibilityReason(reason)
    return visibilityReasons[reason]
end

local function isFullyVisible()
    for _, allowed in pairs(visibilityReasons) do
        if not allowed then
            return false
        end
    end
    return true
end

local function setForceAircraftHud(forced)
    aircraftHudForced = forced
    SendNUIMessage({
        action = 'setForceAircraftHud',
        forced = forced
    })
end

local function pushMinimapLayout(config)
    minimap.apply(config)
    updateVisibility()
end

local function startPolcamDetection(config)
    local polcamResource = GetResourceState('polcam')
    if polcamResource ~= 'started' then
        return
    end
    
    CreateThread(function()
        local wasActive = false
        local wasPilot = false
        local GetVehiclePedIsIn = GetVehiclePedIsIn
        local GetPedInVehicleSeat = GetPedInVehicleSeat
        
        while true do
            local isActive = false
            local success, result = pcall(function()
                return exports.polcam:IsPolCamActive()
            end)
            if success then
                isActive = result == true
            end
            
            local isPilot = false
            if isActive then
                local ped = PlayerPedId()
                local vehicle = GetVehiclePedIsIn(ped, false)
                if vehicle and vehicle ~= 0 then
                    local driver = GetPedInVehicleSeat(vehicle, -1)
                    isPilot = driver == ped
                end
            end
            
            if isActive ~= wasActive or isPilot ~= wasPilot then
                wasActive = isActive
                wasPilot = isPilot
                setVisibilityReason('polcam', not isActive)
                
                if isActive and isPilot and config.PolcamForceAircraftHud then
                    setForceAircraftHud(true)
                else
                    setForceAircraftHud(false)
                end
            end
            
            Wait(250)
        end
    end)
end

function hud.start(config)
    local lastHealth = -1
    local lastArmor = -1
    local lastStreet = ""
    local lastZone = ""
    local lastHeading = -1
    local lastPostal = ""
    local lastPostalDist = -1

    local postals = nil
    local nearestPostalCode = ""
    local nearestPostalDist = 0

    local seatbelt = SeatbeltLogic and SeatbeltLogic.new() or nil

    local stall = StallLogic and StallLogic.new() or nil

    local vehicleStatus = VehicleStatusThread.new(seatbelt, stall)

    if config.disableWantedLevel then
        CreateThread(function()
            local playerId = PlayerId()
            local SetPlayerWantedLevel = SetPlayerWantedLevel
            local SetPlayerWantedLevelNow = SetPlayerWantedLevelNow
            local SetMaxWantedLevel = SetMaxWantedLevel
            while true do
                SetPlayerWantedLevel(playerId, 0, false)
                SetPlayerWantedLevelNow(playerId, false)
                SetMaxWantedLevel(0)
                Wait(1000)
            end
        end)
    end

    CreateThread(function()
        while not IsPlayerPlaying(PlayerId()) do
            Wait(200)
        end

        pushMinimapLayout(config)

        for i = 1, 4 do
            Wait(750)
            pushMinimapLayout(config)
        end

        local lastSafezone = GetSafeZoneSize()
        local lastResX, lastResY = GetActiveScreenResolution()
        while true do
            Wait(1000)
            local safezone = GetSafeZoneSize()
            local resX, resY = GetActiveScreenResolution()
            if safezone ~= lastSafezone or resX ~= lastResX or resY ~= lastResY then
                lastSafezone = safezone
                lastResX, lastResY = resX, resY
                pushMinimapLayout(config)
            end
        end
    end)

    CreateThread(function()
        if config.EnablePostal then
            local raw = LoadResourceFile('nearest-postal', config.PostalFile)
            if raw then
                postals = json.decode(raw)
                for i, p in ipairs(postals) do
                    postals[i] = {vec(p.x, p.y), code = p.code}
                end
            else
                print("^1[ES HUD] Error: Could not load postal file from nearest-postal resource!^7")
            end
        end
    end)

    CreateThread(function()
        while true do
            if config.EnablePostal and postals then
                local ped = PlayerPedId()
                local coords = GetEntityCoords(ped)
                local playerXY = vec(coords.x, coords.y)

                local minD = nil
                local minCode = ""

                for i = 1, #postals do
                    local d = #(playerXY - postals[i][1])
                    if not minD or d < minD then
                        minD = d
                        minCode = postals[i].code
                    end
                end

                nearestPostalCode = minCode
                if config.ShowPostalDistance then
                    nearestPostalDist = minD
                else
                    nearestPostalDist = -1
                end
            end
            Wait(config.PostalUpdateInterval or 500)
        end
    end)

    CreateThread(function()
        Wait(1000)

        while true do
            if isFullyVisible() then
                local ped = PlayerPedId()
                local coords = GetEntityCoords(ped)

                local health = GetEntityHealth(ped)
                local maxHealth = GetEntityMaxHealth(ped)
                local armor = GetPedArmour(ped)

                local healthPercent = math_max(0, math_min(100, ((health - 100) / (maxHealth - 100)) * 100))
                local armorPercent = math_max(0, math_min(100, armor))

                if health ~= lastHealth or armor ~= lastArmor then
                    lastHealth = health
                    lastArmor = armor
                    SendNUIMessage({
                        action = 'updateHud',
                        health = math_floor(healthPercent),
                        armor = math_floor(armorPercent)
                    })
                end

                local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
                local streetName = GetStreetNameFromHashKey(streetHash)
                local zoneLabel = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z))
                local heading = GetEntityHeading(ped)

                local hasDistanceChanged = config.ShowPostalDistance and math_abs(nearestPostalDist - lastPostalDist) > 2.0
                if streetName ~= lastStreet or zoneLabel ~= lastZone or math_abs(heading - lastHeading) > 2 or nearestPostalCode ~= lastPostal or hasDistanceChanged then
                    lastStreet = streetName
                    lastZone = zoneLabel
                    lastHeading = heading
                    lastPostal = nearestPostalCode
                    lastPostalDist = nearestPostalDist

                    SendNUIMessage({
                        action = 'updateLocation',
                        heading = heading,
                        street = streetName,
                        zone = zoneLabel,
                        postal = nearestPostalCode,
                        postalDist = config.ShowPostalDistance and nearestPostalDist or nil
                    })
                end

                local inVehicle = IsPedInAnyVehicle(ped, false)
                if inVehicle and not vehicleStatus:isActive() then
                    vehicleStatus:start()
                end
            end

            Wait(config.UpdateInterval or 200)
        end
    end)

    RegisterCommand('togglehud', function()
        local currentUserState = getVisibilityReason('user')
        setVisibilityReason('user', not currentUserState)
    end, false)

    CreateThread(function()
        Wait(2000)
        startPolcamDetection(config)
        SendNUIMessage({
            action = 'init',
            visible = isFullyVisible()
        })
    end)

    exports('setHudVisible', function(visible)
        setVisibilityReason('external', visible)
    end)

    exports('toggleHud', function(state)
        if state == nil then
            local current = getVisibilityReason('external')
            setVisibilityReason('external', not current)
            return
        end
        setVisibilityReason('external', state)
    end)

    exports('isHudVisible', function()
        return isFullyVisible()
    end)

    exports('toggleMap', function(state)
        minimapVisible = state == nil and not minimapVisible or state
        updateVisibility()
    end)

    exports('hideHud', function(reason)
        reason = reason or 'external'
        if not visibilityReasons[reason] then
            visibilityReasons[reason] = true
        end
        setVisibilityReason(reason, false)
    end)

    exports('showHud', function(reason)
        reason = reason or 'external'
        setVisibilityReason(reason, true)
    end)

    exports('setHudVisibleReason', function(reason, visible)
        reason = reason or 'external'
        setVisibilityReason(reason, visible)
    end)

    exports('isSeatbeltOn', function()
        return seatbelt and seatbelt:isSeatbeltOn() or false
    end)

    exports('toggleSeatbelt', function(state)
        if seatbelt then
            seatbelt:toggle(state)
        end
    end)

    exports('isEngineStalled', function()
        return stall and stall:isStalled() or false
    end)

    exports('isEngineBroken', function()
        return stall and stall:isBroken() or false
    end)

    exports('getStallCount', function()
        return stall and stall:getStallCount() or 0
    end)

    exports('getEnginePower', function()
        return stall and stall:getPowerMultiplier() or 1.0
    end)

    exports('repairEngine', function(vehicle)
        if stall then
            stall:repair(vehicle)
        end
    end)

    exports('setForceAircraftHud', function(forced)
        setForceAircraftHud(forced)
    end)

    exports('isAircraftHudForced', function()
        return aircraftHudForced
    end)

    AddEventHandler('es_nos:update', function(data)
        if isFullyVisible() then
            SendNUIMessage({
                action = 'nos:update',
                data = data
            })
        end
    end)
end

return hud
