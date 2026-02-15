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
local math_sqrt = math.sqrt

local minimap = lib.require("modules.utility.shared.minimap")
local SeatbeltLogic = lib.require("modules.seatbelt.client")
local StallLogic = lib.require("modules.stall.client")
local HarnessLogic = lib.require("modules.harness.client")
local VehicleStatusThread = lib.require("modules.threads.client.vehicle_status")
local Bridge = lib.require("modules.bridge.client")

local visibilityReasons = {
    user = true,
    polcam = true,
    external = true,
    cinematic = true,
    framework = Bridge.isPlayerLoaded(),
    qbxCharacter = true,
    qbxSpawn = true
}

local aircraftHudForced = false

local minimapVisible = true

local lastVisibleState = nil

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

local function startQbxVisibilityHooks()
    RegisterNetEvent('qbx_core:client:playerLoggedOut', function()
        setVisibilityReason('qbxCharacter', false)
        setVisibilityReason('qbxSpawn', true)
    end)

    RegisterNetEvent('qb-spawn:client:setupSpawns', function()
        setVisibilityReason('qbxSpawn', false)
    end)

    RegisterNetEvent('qb-spawn:client:openUI', function(isOpen)
        if isOpen == nil then
            isOpen = true
        end

        setVisibilityReason('qbxSpawn', not isOpen)
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
        setVisibilityReason('qbxCharacter', true)
        setVisibilityReason('qbxSpawn', true)
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
        setVisibilityReason('qbxCharacter', false)
        setVisibilityReason('qbxSpawn', true)
    end)
end

function hud.start(config)
    Bridge.onPlayerLoaded(function()
        setVisibilityReason('framework', true)
    end)

    Bridge.onPlayerUnloaded(function()
        setVisibilityReason('framework', false)
    end)

    if config.framework == 'qbx' then
        startQbxVisibilityHooks()
    end

    updateVisibility()

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

    local harness = HarnessLogic and HarnessLogic.new() or nil

    local vehicleStatus = VehicleStatusThread.new(seatbelt, stall, harness)

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
        local HideHudComponentThisFrame = HideHudComponentThisFrame
        while true do
            HideHudComponentThisFrame(6) -- Vehicle Name
            HideHudComponentThisFrame(7) -- Area Name
            HideHudComponentThisFrame(8) -- Street Name / Waypoint Distance
            HideHudComponentThisFrame(9) -- Help Text
            Wait(0)
        end
    end)

    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            SendNUIMessage({
                action = 'init',
                visible = isFullyVisible()
            })
            Wait(1000)
        end
    end)

    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
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
                    postals[i] = {
                        x = p.x,
                        y = p.y,
                        code = p.code,
                    }
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
                local playerX = coords.x
                local playerY = coords.y

                local minD2 = nil
                local minCode = ""

                for i = 1, #postals do
                    local postal = postals[i]
                    local dx = playerX - postal.x
                    local dy = playerY - postal.y
                    local d2 = (dx * dx) + (dy * dy)
                    if not minD2 or d2 < minD2 then
                        minD2 = d2
                        minCode = postal.code
                    end
                end

                nearestPostalCode = minCode
                if config.ShowPostalDistance then
                    nearestPostalDist = minD2 and math_sqrt(minD2) or -1
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

                local healthBase = math_max(1, maxHealth - 100)
                local healthPercent = math_max(0, math_min(100, ((health - 100) / healthBase) * 100))
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

    -- Waypoint distance tracker
    local GetFirstBlipInfoId = GetFirstBlipInfoId
    local DoesBlipExist = DoesBlipExist
    local GetBlipInfoIdCoord = GetBlipInfoIdCoord
    local lastWpDist = -1
    local useMiles = (config.speedUnit == "mph")

    CreateThread(function()
        local IsPedInAnyVehicle = IsPedInAnyVehicle
        local PlayerPedId = PlayerPedId
        while true do
            if isFullyVisible() and IsPedInAnyVehicle(PlayerPedId(), false) then
                local wpBlip = GetFirstBlipInfoId(8)
                if DoesBlipExist(wpBlip) then
                    local wpCoords = GetBlipInfoIdCoord(wpBlip)
                    local ped = PlayerPedId()
                    local pCoords = GetEntityCoords(ped)
                    local distM = #(pCoords - wpCoords)

                    local distDisplay
                    local distUnit
                    if useMiles then
                        local distMi = distM / 1609.34
                        distDisplay = distMi
                        distUnit = "mi"
                    else
                        local distKm = distM / 1000.0
                        distDisplay = distKm
                        distUnit = "km"
                    end

                    if math_abs(distDisplay - lastWpDist) > 0.01 then
                        lastWpDist = distDisplay
                        SendNUIMessage({
                            action = 'updateWaypoint',
                            waypointDist = math_floor(distDisplay * 100 + 0.5) / 100,
                            waypointUnit = distUnit
                        })
                    end
                else
                    if lastWpDist ~= -1 then
                        lastWpDist = -1
                        SendNUIMessage({
                            action = 'updateWaypoint',
                            waypointDist = -1,
                            waypointUnit = ""
                        })
                    end
                end
            else
                if lastWpDist ~= -1 then
                    lastWpDist = -1
                    SendNUIMessage({
                        action = 'updateWaypoint',
                        waypointDist = -1,
                        waypointUnit = ""
                    })
                end
            end

            Wait(500)
        end
    end)

    -- Weapon ammo tracker
    local GetSelectedPedWeapon = GetSelectedPedWeapon
    local GetAmmoInClip = GetAmmoInClip
    local GetAmmoInPedWeapon = GetAmmoInPedWeapon
    local UNARMED_HASH = `WEAPON_UNARMED`
    local lastAmmoClip = -1
    local lastAmmoReserve = -1
    local lastIsArmed = false

    CreateThread(function()
        while true do
            if isFullyVisible() then
                local ped = PlayerPedId()
                local weaponHash = GetSelectedPedWeapon(ped)
                local isArmed = weaponHash ~= UNARMED_HASH

                if isArmed then
                    local _, clipAmmo = GetAmmoInClip(ped, weaponHash)
                    local totalAmmo = GetAmmoInPedWeapon(ped, weaponHash)
                    local reserveAmmo = totalAmmo - clipAmmo

                    if clipAmmo ~= lastAmmoClip or reserveAmmo ~= lastAmmoReserve or isArmed ~= lastIsArmed then
                        lastAmmoClip = clipAmmo
                        lastAmmoReserve = reserveAmmo
                        lastIsArmed = isArmed
                        SendNUIMessage({
                            action = 'updateAmmo',
                            ammoClip = clipAmmo,
                            ammoReserve = reserveAmmo,
                            isArmed = isArmed
                        })
                    end
                else
                    if lastIsArmed then
                        lastAmmoClip = -1
                        lastAmmoReserve = -1
                        lastIsArmed = false
                        SendNUIMessage({
                            action = 'updateAmmo',
                            ammoClip = -1,
                            ammoReserve = -1,
                            isArmed = false
                        })
                    end
                end
            end
            Wait(100)
        end
    end)

    RegisterCommand('togglehud', function()
        local currentUserState = getVisibilityReason('user')
        setVisibilityReason('user', not currentUserState)
    end, false)

    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end
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

    exports('setCharacterSelectionActive', function(active)
        setVisibilityReason('qbxCharacter', not (active == true))
    end)

    exports('setSpawnSelectorActive', function(active)
        setVisibilityReason('qbxSpawn', not (active == true))
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

    exports('isHarnessOn', function()
        return harness and harness:isHarnessOn() or false
    end)

    exports('toggleHarness', function(state)
        if harness then
            if state == nil then
                harness:toggle()
            elseif state then
                harness:apply()
            else
                harness:remove()
            end
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
