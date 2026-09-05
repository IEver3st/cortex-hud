local hud = {}

local CreateThread = CreateThread
local PlayerId = PlayerId
local PlayerPedId = PlayerPedId
local IsPlayerPlaying = IsPlayerPlaying
local GetEntityCoords = GetEntityCoords
local GetEntityHealth = GetEntityHealth
local GetEntityMaxHealth = GetEntityMaxHealth
local GetPedArmour = GetPedArmour
local GetPlayerSprintStaminaRemaining = GetPlayerSprintStaminaRemaining
local GetGameTimer = GetGameTimer
local GetStreetNameAtCoord = GetStreetNameAtCoord
local GetStreetNameFromHashKey = GetStreetNameFromHashKey
local GetNameOfZone = GetNameOfZone
local GetLabelText = GetLabelText
local GetEntityHeading = GetEntityHeading
local GetSafeZoneSize = GetSafeZoneSize
local GetActiveScreenResolution = GetActiveScreenResolution
local Nui = lib.require("modules.nui.client")
local SendNUIMessage = Nui.send
local IsPedInAnyVehicle = IsPedInAnyVehicle
local DisplayRadar = DisplayRadar
local DisplayHud = DisplayHud
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
local CruiseControl = lib.require("modules.cruise.client")
local Bridge = lib.require("modules.bridge.client")
local AmmoState = lib.require("modules.threads.client.ammo_state")
local ScreenEffects = lib.require('modules.effects.client')

local HEALTH_DAMAGE_HOLD_MS = 25000
local ARMOR_APPLIED_HOLD_MS = 6000

local visibilityReasons = {
    user = true,
    polcam = true,
    external = true,
    cinematic = true,
    framework = Bridge.isPlayerLoaded(),
    qbxCharacter = true,
    qbxSpawn = true
}

local fullyVisible = false

local aircraftHudForced = false
local minimapVisible = true
local lastVisibleState = nil
local lastRadarState = nil
local lastNuiRadarState = nil
local activeConfig = nil
local minimapRefreshInProgress = false
local queuedMinimapRefreshReason = nil
local initialMinimapRecoveryStarted = false

local function debugMinimap(message, ...)
    local minimapConfig = activeConfig and activeConfig.Minimap or nil
    if not minimapConfig or minimapConfig.debug ~= true then return end
    print(("[cortex-hud:minimap] " .. message):format(...))
end

local function refreshFullyVisible()
    for _, allowed in pairs(visibilityReasons) do
        if not allowed then
            fullyVisible = false
            return false
        end
    end

    fullyVisible = true
    return true
end

local function isFullyVisible()
    return fullyVisible
end

refreshFullyVisible()

local function shouldRadarBeVisible()
    if not isFullyVisible() or not minimapVisible then
        return false
    end

    if activeConfig and activeConfig.minimapOnlyInVehicle then
        local ped = PlayerPedId()
        if ped == 0 or not IsPedInAnyVehicle(ped, false) then
            return false
        end
    end

    return true
end

local function updateVisibility(reason, forceRadarApply)
    local shouldBeVisible = isFullyVisible()

    if shouldBeVisible ~= lastVisibleState then
        lastVisibleState = shouldBeVisible
        SendNUIMessage({
            action = 'toggleVisibility',
            visible = shouldBeVisible,
            forceAircraftHud = aircraftHudForced
        })
    end

    local radarVisible = shouldRadarBeVisible()
    if forceRadarApply or radarVisible ~= lastRadarState then
        local wasRadarOn = lastRadarState == true
        DisplayRadar(radarVisible)

        if radarVisible and not wasRadarOn then
            minimap.collapseBigmap()
        elseif not radarVisible and wasRadarOn then
            minimap.collapseBigmap()
        end
        if radarVisible ~= lastRadarState or reason ~= 'radar_authority_tick' then
            debugMinimap(
                "Radar visibility=%s reason='%s' hud=%s map=%s onlyVehicle=%s",
                tostring(radarVisible),
                reason or "unspecified",
                tostring(shouldBeVisible),
                tostring(minimapVisible),
                tostring(activeConfig and activeConfig.minimapOnlyInVehicle == true)
            )
        end
    end

    lastRadarState = radarVisible

    if radarVisible ~= lastNuiRadarState then
        lastNuiRadarState = radarVisible
        SendNUIMessage({
            action = 'setRadarVisible',
            visible = radarVisible == true,
        })
    end

    return shouldBeVisible, radarVisible
end

local function setVisibilityReason(reason, visible)
    visibilityReasons[reason] = visible
    refreshFullyVisible()
    return updateVisibility(("reason:%s"):format(reason), true)
end

local function getVisibilityReason(reason)
    return visibilityReasons[reason]
end

local function setForceAircraftHud(forced)
    aircraftHudForced = forced
    SendNUIMessage({
        action = 'setForceAircraftHud',
        forced = forced
    })
end

local function runMinimapRefresh(reason)
    if not activeConfig then return end

    minimap.checkExternalMapResource(activeConfig)
    local result = minimap.refresh(activeConfig, { reason = reason })
    debugMinimap(
        "Refresh reason='%s' texturesReady=%s rendering=%s",
        reason or "unspecified",
        tostring(result and result.texturesReady),
        tostring(result and result.rendering)
    )
    updateVisibility(reason or "refresh", true)
end

local function requestMinimapRefresh(reason)
    if not activeConfig then return end

    if minimapRefreshInProgress then
        queuedMinimapRefreshReason = reason or queuedMinimapRefreshReason or "queued_refresh"
        return
    end

    minimapRefreshInProgress = true

    CreateThread(function()
        runMinimapRefresh(reason or "refresh")
        minimapRefreshInProgress = false

        if queuedMinimapRefreshReason then
            local queuedReason = queuedMinimapRefreshReason
            queuedMinimapRefreshReason = nil
            requestMinimapRefresh(queuedReason)
        end
    end)
end

local function syncMinimapState(reason, refreshLayout)
    if refreshLayout then
        requestMinimapRefresh(reason or "sync_refresh")
        return
    end

    updateVisibility(reason or "sync", true)
end

local function startInitialMinimapRecovery()
    if initialMinimapRecoveryStarted then return end
    initialMinimapRecoveryStarted = true

    CreateThread(function()
        local retryDelays = { 500, 1500, 3000 }

        for i = 1, #retryDelays do
            Wait(retryDelays[i])

            if not activeConfig then
                return
            end

            local ped = PlayerPedId()
            if ped ~= 0 and not IsPedInAnyVehicle(ped, false) then
                local rendering = minimap.isRendering()
                if rendering ~= true then
                    requestMinimapRefresh(("initial_on_foot_retry_%d"):format(retryDelays[i]))
                else
                    debugMinimap("Skipping on-foot retry after %dms; minimap is already rendering.", retryDelays[i])
                end
            end
        end
    end)
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
    activeConfig = config
    local playerId = PlayerId()

    Bridge.onPlayerLoaded(function()
        setVisibilityReason('framework', true)
        requestMinimapRefresh('player_loaded')
    end)

    Bridge.onPlayerUnloaded(function()
        setVisibilityReason('framework', false)
    end)

    if config.framework == 'qbx' then
        startQbxVisibilityHooks()
    end

    minimap.checkExternalMapResource(config, true)
    updateVisibility('hud_start', true)

    AddEventHandler('cortex-hud:client:syncMinimap', function(reason, refreshLayout)
        syncMinimapState(reason, refreshLayout == true)
    end)

    AddEventHandler('onClientResourceStart', function(resourceName)
        if not activeConfig then return end

        local externalMapResource = activeConfig.Minimap.externalMapResource
        if externalMapResource == false then return end
        if resourceName ~= (externalMapResource or 'map-postalmap-streetname') then
            return
        end

        CreateThread(function()
            Wait(500)
            requestMinimapRefresh(("resource_start:%s"):format(resourceName))
        end)
    end)

    AddEventHandler('onClientResourceStop', function(resourceName)
        if not activeConfig then return end

        local externalMapResource = activeConfig.Minimap.externalMapResource
        if externalMapResource == false then return end
        if resourceName ~= (externalMapResource or 'map-postalmap-streetname') then
            return
        end

        minimap.checkExternalMapResource(activeConfig, true)
        CreateThread(function()
            Wait(250)
            requestMinimapRefresh(("resource_stop:%s"):format(resourceName))
        end)
    end)

    local currentResource = GetCurrentResourceName()
    AddEventHandler('onClientResourceStop', function(resourceName)
        if resourceName ~= currentResource then return end
        DisplayHud(true)
        DisplayRadar(true)
    end)

    local lastHealth = -1
    local lastArmor = -1
    local lastStamina = -1
    local lastStaminaPercent = -1
    local lastStaminaRegenerating = false
    local lastHealthRecentlyDamaged = false
    local lastDamageAt = nil
    local lastArmorAppliedAt = nil
    local lastStreet = ""
    local lastZone = ""
    local lastZoneCode = ""
    local lastHeading = -1
    local lastPostal = ""
    local lastPostalDist = -1

    local postals = nil
    local nearestPostalCode = ""
    local nearestPostalDist = 0

    local seatbelt = (type(SeatbeltLogic) == 'table') and SeatbeltLogic.new() or nil

    local stall = (type(StallLogic) == 'table') and StallLogic.new() or nil

    local harness = (type(HarnessLogic) == 'table') and HarnessLogic.new() or nil

    local cruise = (type(CruiseControl) == 'table') and CruiseControl.new() or nil

    local vehicleStatus = VehicleStatusThread.new(seatbelt, stall, harness, cruise)

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
        local HOMING_LAUNCHER_HASH = `WEAPON_HOMINGLAUNCHER`
        while true do
            HideHudComponentThisFrame(1)
            HideHudComponentThisFrame(2)
            HideHudComponentThisFrame(3)
            HideHudComponentThisFrame(4)
            HideHudComponentThisFrame(5)
            HideHudComponentThisFrame(13)
            -- The homing launcher's lock-on brackets, target box, and tone
            -- are all part of native component 14. Keep 14 hidden for every
            -- other weapon so the custom reticle never stacks, but leave it
            -- visible while the homing launcher is equipped so vanilla can
            -- show what is actually being locked onto.
            local homingEquipped = GetSelectedPedWeapon(PlayerPedId()) == HOMING_LAUNCHER_HASH
            if not homingEquipped then
                HideHudComponentThisFrame(14)
            end
            HideHudComponentThisFrame(17)
            HideHudComponentThisFrame(20)
            Wait(0)
        end
    end)

    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            SendNUIMessage({
                action = 'init',
                visible = isFullyVisible(),
                radarVisible = lastRadarState == true,
            })
            Wait(1000)
        end
    end)

    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        requestMinimapRefresh('initial_player_loaded')
        startInitialMinimapRecovery()

        local lastSafezone = GetSafeZoneSize()
        local lastResX, lastResY = GetActiveScreenResolution()
        while true do
            Wait(1000)
            local safezone = GetSafeZoneSize()
            local resX, resY = GetActiveScreenResolution()
            if safezone ~= lastSafezone or resX ~= lastResX or resY ~= lastResY then
                lastSafezone = safezone
                lastResX, lastResY = resX, resY
                requestMinimapRefresh('layout_changed')
            end
        end
    end)

    CreateThread(function()
        while true do
            updateVisibility('radar_authority_tick', true)
            Wait(500)
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

    if config.EnablePostal then
        CreateThread(function()
            while true do
                if postals then
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
    end

    CreateThread(function()
        Wait(1000)

        local lastLocationX = nil
        local lastLocationY = nil

        while true do
            local sleep = config.UpdateInterval or 200

            if isFullyVisible() then
                local ped = PlayerPedId()
                local coords = GetEntityCoords(ped)

                local health = GetEntityHealth(ped)
                local maxHealth = GetEntityMaxHealth(ped)
                local armor = GetPedArmour(ped)
                local staminaUsed = tonumber(GetPlayerSprintStaminaRemaining(playerId)) or 0

                local healthBase = math_max(1, maxHealth - 100)
                local healthPercent = math_max(0, math_min(100, ((health - 100) / healthBase) * 100))
                local armorPercent = math_max(0, math_min(100, armor))
                -- This native rises as sprint stamina is consumed, so invert it
                -- for a conventional full-to-empty stamina meter.
                local staminaPercent = 100 - math_max(0, math_min(100, staminaUsed))
                local meleeStamina = LocalPlayer and LocalPlayer.state
                    and tonumber(LocalPlayer.state.cortexMeleeStamina)
                    or nil
                if meleeStamina and meleeStamina == meleeStamina
                    and meleeStamina ~= math.huge and meleeStamina ~= -math.huge
                then
                    -- cortex-subtleadditions publishes a local-only melee pool.
                    -- The HUD displays the more constrained of sprint and melee
                    -- stamina without making either resource a hard dependency.
                    staminaPercent = math_min(staminaPercent, math_max(0, math_min(100, meleeStamina)))
                end
                local staminaRounded = math_floor(staminaPercent + 0.5)
                ScreenEffects.updateStamina(staminaRounded)
                local staminaRegenerating = lastStaminaPercent >= 0
                    and staminaPercent > lastStaminaPercent + 0.05
                    and staminaPercent < 99.95
                local now = GetGameTimer()

                if lastHealth >= 0 and (health < lastHealth or armor < lastArmor) then
                    lastDamageAt = now
                end

                if lastArmor >= 0 and armor > lastArmor then
                    lastArmorAppliedAt = now
                end

                if lastDamageAt ~= nil and (now - lastDamageAt) >= HEALTH_DAMAGE_HOLD_MS then
                    lastDamageAt = nil
                end

                if lastArmorAppliedAt ~= nil and (now - lastArmorAppliedAt) >= ARMOR_APPLIED_HOLD_MS then
                    lastArmorAppliedAt = nil
                end

                local healthRecentlyDamaged = lastDamageAt ~= nil or lastArmorAppliedAt ~= nil

                if health ~= lastHealth
                    or armor ~= lastArmor
                    or staminaRounded ~= lastStamina
                    or staminaRegenerating ~= lastStaminaRegenerating
                    or healthRecentlyDamaged ~= lastHealthRecentlyDamaged
                then
                    lastHealth = health
                    lastArmor = armor
                    lastStamina = staminaRounded
                    lastStaminaRegenerating = staminaRegenerating
                    lastHealthRecentlyDamaged = healthRecentlyDamaged
                    SendNUIMessage({
                        action = 'updateHud',
                        health = math_floor(healthPercent),
                        armor = math_floor(armorPercent),
                        stamina = staminaRounded,
                        staminaRegenerating = staminaRegenerating,
                        healthRecentlyDamaged = healthRecentlyDamaged,
                    })
                end
                lastStaminaPercent = staminaPercent

                local streetName = lastStreet
                local zoneLabel = lastZone
                local zoneCode = lastZoneCode
                local dx = lastLocationX and (coords.x - lastLocationX) or 0.0
                local dy = lastLocationY and (coords.y - lastLocationY) or 0.0
                local locationChanged = not lastLocationX or ((dx * dx) + (dy * dy)) >= 4.0

                if locationChanged then
                    local streetHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
                    streetName = GetStreetNameFromHashKey(streetHash)
                    zoneCode = GetNameOfZone(coords.x, coords.y, coords.z)
                    zoneLabel = GetLabelText(zoneCode)
                    lastLocationX = coords.x
                    lastLocationY = coords.y
                end

                local heading = GetEntityHeading(ped)

                local hasDistanceChanged = config.ShowPostalDistance and math_abs(nearestPostalDist - lastPostalDist) > 2.0
                if streetName ~= lastStreet or zoneLabel ~= lastZone or zoneCode ~= lastZoneCode or math_abs(heading - lastHeading) > 2 or nearestPostalCode ~= lastPostal or hasDistanceChanged then
                    lastStreet = streetName
                    lastZone = zoneLabel
                    lastZoneCode = zoneCode
                    lastHeading = heading
                    lastPostal = nearestPostalCode
                    lastPostalDist = nearestPostalDist

                    SendNUIMessage({
                        action = 'updateLocation',
                        heading = heading,
                        street = streetName,
                        zone = zoneLabel,
                        zoneCode = zoneCode,
                        postal = nearestPostalCode,
                        postalDist = config.ShowPostalDistance and nearestPostalDist or nil
                    })
                end

                local inVehicle = IsPedInAnyVehicle(ped, false)
                if inVehicle and not vehicleStatus:isActive() then
                    vehicleStatus:start()
                end
            else
                sleep = 500
            end

            Wait(sleep)
        end
    end)


    local GetFirstBlipInfoId = GetFirstBlipInfoId
    local DoesBlipExist = DoesBlipExist
    local GetBlipInfoIdCoord = GetBlipInfoIdCoord
    local GetGpsBlipRouteLength = GetGpsBlipRouteLength
    local CalculateTravelDistanceBetweenPoints = CalculateTravelDistanceBetweenPoints
    local lastWpDist = -1
    local lastWpX = nil
    local lastWpY = nil
    local lastWpZ = nil

    local function isValidRouteDistance(value)
        return type(value) == "number"
            and value == value
            and value > 0.0
            and value < 100000.0
    end

    local function clearWaypointDisplay()
        if lastWpDist == -1 then return end

        lastWpDist = -1
        SendNUIMessage({
            action = 'updateWaypoint',
            waypointDist = -1,
            waypointUnit = ""
        })
    end

    local function resetWaypointTracking()
        lastWpX = nil
        lastWpY = nil
        lastWpZ = nil
        clearWaypointDisplay()
    end

    CreateThread(function()
        local IsPedInAnyVehicle = IsPedInAnyVehicle
        local PlayerPedId = PlayerPedId
        while true do
            local sleep = 1000

            if isFullyVisible() and IsPedInAnyVehicle(PlayerPedId(), false) then
                sleep = 500
                local wpBlip = GetFirstBlipInfoId(8)
                if DoesBlipExist(wpBlip) then
                    local wpCoords = GetBlipInfoIdCoord(wpBlip)
                    local destinationChanged = not lastWpX
                        or math_abs(wpCoords.x - lastWpX) > 1.0
                        or math_abs(wpCoords.y - lastWpY) > 1.0
                        or math_abs(wpCoords.z - lastWpZ) > 1.0

                    if destinationChanged then
                        lastWpX = wpCoords.x
                        lastWpY = wpCoords.y
                        lastWpZ = wpCoords.z
                        clearWaypointDisplay()
                    end

                    local routeDistanceM = GetGpsBlipRouteLength()
                    if not isValidRouteDistance(routeDistanceM) then
                        local pCoords = GetEntityCoords(PlayerPedId())
                        routeDistanceM = CalculateTravelDistanceBetweenPoints(
                            pCoords.x,
                            pCoords.y,
                            pCoords.z,
                            wpCoords.x,
                            wpCoords.y,
                            wpCoords.z
                        )
                    end

                    if isValidRouteDistance(routeDistanceM) then
                        local useMiles = config.speedUnit == "mph"
                        local distDisplay
                        local distUnit
                        if useMiles then
                            distDisplay = routeDistanceM / 1609.34
                            distUnit = "mi"
                        else
                            distDisplay = routeDistanceM / 1000.0
                            distUnit = "km"
                        end

                        local roundedDist = math_floor(distDisplay * 100 + 0.5) / 100
                        if roundedDist ~= lastWpDist then
                            lastWpDist = roundedDist
                            SendNUIMessage({
                                action = 'updateWaypoint',
                                waypointDist = roundedDist,
                                waypointUnit = distUnit
                            })
                        end
                    end
                else
                    resetWaypointTracking()
                end
            else
                resetWaypointTracking()
            end

            Wait(sleep)
        end
    end)


    local GetSelectedPedWeapon = GetSelectedPedWeapon
    local GetWeapontypeGroup = GetWeapontypeGroup
    local GetPedAccuracy = GetPedAccuracy
    local GetEntitySpeed = GetEntitySpeed
    local GetWeaponTimeBetweenShots = GetWeaponTimeBetweenShots
    local GetAmmoInClip = GetAmmoInClip
    local GetAmmoInPedWeapon = GetAmmoInPedWeapon
    local GetMaxAmmoInClip = GetMaxAmmoInClip
    local IsPedWeaponReadyToShoot = IsPedWeaponReadyToShoot
    local IsPedShooting = IsPedShooting
    local IsEntityInAir = IsEntityInAir
    local IsAimCamActive = IsAimCamActive
    local UNARMED_HASH = `WEAPON_UNARMED`
    local lastAmmoClip = -1
    local lastAmmoReserve = -1
    local lastIsArmed = false
    local lastWeaponType = 'none'
    local lastWeaponReticleType = 'none'
    local lastWeaponIcon = nil
    local lastWeaponName = nil
    local lastWeaponUsesCharge = false
    local lastWeaponChargeReady = true
    local lastWeaponChargeProgress = 100
    local lastWeaponBloom = 0
    local lastWeaponAiming = false
    local VEHICLE_HITMARKER_COOLDOWN_MS = 350
    local lastVehicleHitmarkerAt = -VEHICLE_HITMARKER_COOLDOWN_MS
    local chargeStateByHash = {}
    local lastKnownClipByWeapon = {}
    local reticleBloomState = {
        weaponHash = nil,
        value = 0,
        recoil = 0,
        updatedAt = GetGameTimer(),
    }

    local chargeWeaponHashes = {
        [`WEAPON_RAYPISTOL`] = true,
        [`WEAPON_STUNGUN`] = true,
        [`WEAPON_STUNGUN_MP`] = true,
    }

    local weaponGroupTypes = {
        [`GROUP_PISTOL`] = 'pistol',
        [`GROUP_SMG`] = 'smg',
        [`GROUP_MG`] = 'smg',
        [`GROUP_RIFLE`] = 'rifle',
        [`GROUP_SHOTGUN`] = 'shotgun',
        [`GROUP_SNIPER`] = 'sniper',
        [`GROUP_HEAVY`] = 'heavy',
        [`GROUP_THROWN`] = 'thrown',
        [`GROUP_MELEE`] = 'melee',
        [`GROUP_STUNGUN`] = 'stun',
        [`GROUP_PETROLCAN`] = 'utility',
        [`GROUP_FIREEXTINGUISHER`] = 'utility',
    }

    local firearmGroups = {
        [`GROUP_PISTOL`] = true,
        [`GROUP_SMG`] = true,
        [`GROUP_MG`] = true,
        [`GROUP_RIFLE`] = true,
        [`GROUP_SHOTGUN`] = true,
        [`GROUP_SNIPER`] = true,
        [`GROUP_HEAVY`] = true,
    }

    local automaticWeaponGroups = {
        [`GROUP_SMG`] = true,
        [`GROUP_MG`] = true,
        [`GROUP_RIFLE`] = true,
    }

    -- GTA's weapon group does not expose firing mode. These automatic weapons
    -- live in mixed pistol/heavy groups, so keep the small vanilla/known-alias
    -- exception set explicit instead of guessing from rate of fire.
    local automaticWeaponHashes = {
        [`WEAPON_APPISTOL`] = true,
        [`WEAPON_PISTOL_AP`] = true,
        [`WEAPON_MACHINEPISTOL`] = true,
        [`WEAPON_TECPISTOL`] = true,
        [`WEAPON_MINIGUN`] = true,
        [`WEAPON_HEAVY_MINIGUN`] = true,
        [`WEAPON_RAYMINIGUN`] = true,
    }

    -- Dedicated heavy reticles. Stunguns sit outside the firearm groups, so
    -- they need an explicit hash match. Launchers share GROUP_HEAVY with the
    -- minigun, so match them by hash before the generic single-fire fallback.
    local tazerWeaponHashes = {
        [`WEAPON_STUNGUN`] = true,
        [`WEAPON_STUNGUN_MP`] = true,
    }

    local homingWeaponHashes = {
        [`WEAPON_HOMINGLAUNCHER`] = true,
    }

    local rpgWeaponHashes = {
        [`WEAPON_RPG`] = true,
        [`WEAPON_HEAVY_RPG`] = true,
        [`WEAPON_GRENADELAUNCHER`] = true,
        [`WEAPON_HEAVY_GRENADE_LAUNCHER`] = true,
        [`WEAPON_COMPACTLAUNCHER`] = true,
        [`WEAPON_FIREWORK`] = true,
        [`WEAPON_RAILGUN`] = true,
        [`WEAPON_RAILGUNXM3`] = true,
        [`WEAPON_EMPLAUNCHER`] = true,
        [`WEAPON_SNOWLAUNCHER`] = true,
    }

    local criticalHitBones = {
        [31086] = true, -- SKEL_Head
    }

    local function getWeaponType(weaponGroup)
        return weaponGroupTypes[weaponGroup] or 'weapon'
    end

    local function getWeaponReticleType(weaponHash, weaponGroup)
        if tazerWeaponHashes[weaponHash] then
            return 'tazer'
        end

        -- Kept as a signal so the NUI layer can stand down: the homing
        -- launcher uses the vanilla lock-on UI and never draws a custom
        -- center reticle.
        if homingWeaponHashes[weaponHash] then
            return 'homing'
        end

        if rpgWeaponHashes[weaponHash] then
            return 'rpg'
        end

        if weaponGroup == `GROUP_SHOTGUN` then
            return 'shotgun'
        end

        if automaticWeaponGroups[weaponGroup] or automaticWeaponHashes[weaponHash] then
            return 'automatic'
        end

        if firearmGroups[weaponGroup] or weaponGroup == `GROUP_STUNGUN` then
            return 'single'
        end

        return 'none'
    end

    local function isHitmarkerWeapon(weaponHash)
        if type(weaponHash) ~= 'number' then
            return false
        end

        if tazerWeaponHashes[weaponHash] then
            return true
        end

        return firearmGroups[GetWeapontypeGroup(weaponHash)] == true
    end

    AddEventHandler('entityDamaged', function(victim, culprit, weaponHash, _baseDamage)
        if not isFullyVisible()
            or culprit ~= PlayerPedId()
            or victim == culprit
            or not DoesEntityExist(victim)
            or not isHitmarkerWeapon(weaponHash)
        then
            return
        end

        local kind
        if IsEntityAPed(victim) then
            kind = 'regular'
            local foundBone, bone = GetPedLastDamageBone(victim)
            local hasCriticalBone = (foundBone == true or foundBone == 1) and criticalHitBones[bone] == true

            if hasCriticalBone then
                kind = 'critical'
            elseif IsPedDeadOrDying(victim, true) then
                kind = 'knockout'
            end
        elseif IsEntityAVehicle(victim) then
            local now = GetGameTimer()
            local elapsedMs = now - lastVehicleHitmarkerAt
            if elapsedMs >= 0 and elapsedMs < VEHICLE_HITMARKER_COOLDOWN_MS then
                return
            end

            lastVehicleHitmarkerAt = now
            kind = 'vehicle'
        else
            return
        end

        SendNUIMessage({
            action = 'combat:hitmarker',
            kind = kind,
        })
    end)

    local function getWeaponName(weaponIcon, fallback)
        if type(weaponIcon) ~= 'string' then
            return fallback
        end

        local displayName = weaponIcon:gsub('^weapon_', ''):gsub('_+', ' ')
        if displayName == '' then
            return fallback
        end

        return displayName:gsub('(%a)([%w]*)', function(initial, remainder)
            return initial:upper() .. remainder:lower()
        end):sub(1, 48)
    end

    local function isChargeWeapon(weaponHash, weaponIcon, weaponName)
        if chargeWeaponHashes[weaponHash] then
            return true
        end

        local identity = ((weaponIcon or '') .. ' ' .. (weaponName or '')):lower()
        return identity:find('atomizer', 1, true) ~= nil
            or identity:find('stungun', 1, true) ~= nil
            or identity:find('stun gun', 1, true) ~= nil
            or identity:find('taser', 1, true) ~= nil
            or identity:find('tazer', 1, true) ~= nil
    end

    local function getWeaponChargeState(ped, weaponHash)
        local readyValue = IsPedWeaponReadyToShoot(ped)
        local ready = readyValue == true or readyValue == 1
        local state = chargeStateByHash[weaponHash]

        if state == nil then
            local durationSeconds = tonumber(GetWeaponTimeBetweenShots(weaponHash)) or 0
            state = {
                durationMs = durationSeconds > 0 and math_floor((durationSeconds * 1000) + 0.5) or 0,
                ready = true,
                startedAt = nil,
            }
            chargeStateByHash[weaponHash] = state
        end

        if ready then
            state.ready = true
            state.startedAt = nil
            return true, 100
        end

        local now = GetGameTimer()
        if state.ready ~= false or state.startedAt == nil then
            state.startedAt = now
        end
        state.ready = false

        if state.durationMs <= 0 then
            return false, 0
        end

        local elapsedMs = now - state.startedAt
        if elapsedMs < 0 then
            state.startedAt = now
            elapsedMs = 0
        end

        local progress = math_floor(((elapsedMs / state.durationMs) * 100) + 0.5)
        return false, math_max(0, math_min(99, progress))
    end

    local function resetReticleBloom()
        reticleBloomState.weaponHash = nil
        reticleBloomState.value = 0
        reticleBloomState.recoil = 0
        reticleBloomState.updatedAt = GetGameTimer()
    end

    local function approach(current, target, maxDelta)
        if current < target then
            return math_min(target, current + maxDelta)
        end

        return math_max(target, current - maxDelta)
    end

    local function getReticleBloom(ped, weaponHash, isAiming)
        local now = GetGameTimer()
        if reticleBloomState.weaponHash ~= weaponHash then
            resetReticleBloom()
            reticleBloomState.weaponHash = weaponHash
            reticleBloomState.updatedAt = now
        end

        local elapsedMs = now - reticleBloomState.updatedAt
        if elapsedMs < 1 or elapsedMs > 100 then
            elapsedMs = 50
        end
        reticleBloomState.updatedAt = now

        local playerAccuracy = math_max(0, math_min(100, tonumber(GetPedAccuracy(ped)) or 50))
        local accuracyBloom = (100 - playerAccuracy) * 0.12
        local movementBloom = math_min(42, math_max(0, tonumber(GetEntitySpeed(ped)) or 0) * 12)
        local airBloom = IsEntityInAir(ped) and 26 or 0
        local hipFireBloom = isAiming and 0 or 10

        if IsPedShooting(ped) then
            reticleBloomState.recoil = math_min(55, reticleBloomState.recoil + 18)
        else
            local recoilRecovery = isAiming and 0.10 or 0.07
            reticleBloomState.recoil = math_max(0, reticleBloomState.recoil - elapsedMs * recoilRecovery)
        end

        local targetBloom = math_min(100,
            accuracyBloom + movementBloom + airBloom + hipFireBloom + reticleBloomState.recoil)
        local changeRate = targetBloom > reticleBloomState.value and 0.55 or (isAiming and 0.16 or 0.11)
        reticleBloomState.value = approach(reticleBloomState.value, targetBloom, elapsedMs * changeRate)

        return math_floor(math_max(0, math_min(100, reticleBloomState.value)) + 0.5)
    end

    local weaponIconByHash = {}
    do
        local rawManifest = LoadResourceFile(GetCurrentResourceName(), 'web/dist/weapons/manifest.json')
        if rawManifest then
            local decoded, labels = pcall(json.decode, rawManifest)
            if decoded and type(labels) == 'table' then
                for index = 1, #labels do
                    local label = labels[index]
                    if type(label) == 'string' and label:match('^weapon_[%w_]+$') then
                        local normalizedLabel = label:lower()
                        weaponIconByHash[GetHashKey(normalizedLabel:upper())] = normalizedLabel
                    end
                end
            end
        end
    end

    local function getCurrentWeaponState()
        local ped = PlayerPedId()
        local weaponHash = GetSelectedPedWeapon(ped)
        local isArmed = weaponHash ~= UNARMED_HASH
        local clipAmmo = -1
        local reserveAmmo = -1
        local weaponType = 'none'
        local weaponReticleType = 'none'
        local weaponIcon = nil
        local weaponName = nil
        local weaponUsesCharge = false
        local weaponChargeReady = true
        local weaponChargeProgress = 100
        local weaponBloom = 0
        local weaponAiming = false

        if isArmed then
            local weaponGroup = GetWeapontypeGroup(weaponHash)
            weaponType = getWeaponType(weaponGroup)
            weaponReticleType = getWeaponReticleType(weaponHash, weaponGroup)
            weaponIcon = weaponIconByHash[weaponHash]
            weaponName = getWeaponName(weaponIcon, weaponType)
            -- The homing launcher keeps the vanilla lock-on UI, so it never
            -- needs custom bloom tracking even while Leonida reticles are on.
            if weaponReticleType ~= 'none'
                and weaponReticleType ~= 'homing'
                and config.gta6HudEnabled == true
                and config.gta6AuthenticWeaponHud == true
            then
                weaponAiming = IsAimCamActive()
                weaponBloom = getReticleBloom(ped, weaponHash, weaponAiming)
            else
                resetReticleBloom()
            end
            weaponUsesCharge = isChargeWeapon(weaponHash, weaponIcon, weaponName)
            if weaponUsesCharge then
                weaponChargeReady, weaponChargeProgress = getWeaponChargeState(ped, weaponHash)
            end
            local clipReadSucceeded, currentClipAmmo = GetAmmoInClip(ped, weaponHash)
            local totalAmmo = tonumber(GetAmmoInPedWeapon(ped, weaponHash)) or 0
            local clipReadWasSuccessful = clipReadSucceeded == true or clipReadSucceeded == 1
            local lastKnownClipAmmo = lastKnownClipByWeapon[weaponHash]
            local maxClipAmmo = 0
            if not clipReadWasSuccessful and lastKnownClipAmmo == nil then
                maxClipAmmo = tonumber(GetMaxAmmoInClip(ped, weaponHash, true)) or 0
            end
            clipAmmo, reserveAmmo = AmmoState.resolve(
                totalAmmo,
                clipReadWasSuccessful,
                currentClipAmmo,
                maxClipAmmo,
                lastKnownClipAmmo
            )
            if clipReadWasSuccessful then
                lastKnownClipByWeapon[weaponHash] = clipAmmo
            end
        else
            resetReticleBloom()
        end

        return isArmed, clipAmmo, reserveAmmo, weaponType, weaponReticleType, weaponIcon, weaponName,
            weaponUsesCharge, weaponChargeReady, weaponChargeProgress, weaponBloom, weaponAiming
    end

    local function sendCurrentWeaponState()
        local isArmed, clipAmmo, reserveAmmo, weaponType, weaponReticleType, weaponIcon, weaponName,
            weaponUsesCharge, weaponChargeReady, weaponChargeProgress, weaponBloom, weaponAiming = getCurrentWeaponState()

        lastAmmoClip = clipAmmo
        lastAmmoReserve = reserveAmmo
        lastIsArmed = isArmed
        lastWeaponType = weaponType
        lastWeaponReticleType = weaponReticleType
        lastWeaponIcon = weaponIcon
        lastWeaponName = weaponName
        lastWeaponUsesCharge = weaponUsesCharge
        lastWeaponChargeReady = weaponChargeReady
        lastWeaponChargeProgress = weaponChargeProgress
        lastWeaponBloom = weaponBloom
        lastWeaponAiming = weaponAiming

        SendNUIMessage({
            action = 'updateAmmo',
            ammoClip = clipAmmo,
            ammoReserve = reserveAmmo,
            isArmed = isArmed,
            weaponType = weaponType,
            weaponReticleType = weaponReticleType,
            weaponIcon = weaponIcon,
            weaponName = weaponName,
            weaponUsesCharge = weaponUsesCharge,
            weaponChargeReady = weaponChargeReady,
            weaponChargeProgress = weaponChargeProgress,
            weaponBloom = weaponBloom,
            weaponAiming = weaponAiming,
        })
    end

    Nui.onReady(function()
        SendNUIMessage({
            action = 'init',
            visible = isFullyVisible(),
            radarVisible = lastRadarState == true,
        })
        SendNUIMessage({
            action = 'setForceAircraftHud',
            forced = aircraftHudForced,
        })
        sendCurrentWeaponState()
    end)

    CreateThread(function()
        while true do
            local sleep = 750

            if isFullyVisible() then
                local isArmed, clipAmmo, reserveAmmo, weaponType, weaponReticleType, weaponIcon, weaponName,
                    weaponUsesCharge, weaponChargeReady, weaponChargeProgress, weaponBloom, weaponAiming = getCurrentWeaponState()

                if isArmed then
                    local reticleIsActive = weaponReticleType ~= 'none'
                        and weaponReticleType ~= 'homing'
                        and config.gta6HudEnabled == true
                        and config.gta6AuthenticWeaponHud == true
                    sleep = (reticleIsActive or (weaponUsesCharge and not weaponChargeReady)) and 50 or 100

                    if clipAmmo ~= lastAmmoClip
                        or reserveAmmo ~= lastAmmoReserve
                        or isArmed ~= lastIsArmed
                        or weaponType ~= lastWeaponType
                        or weaponReticleType ~= lastWeaponReticleType
                        or weaponIcon ~= lastWeaponIcon
                        or weaponName ~= lastWeaponName
                        or weaponUsesCharge ~= lastWeaponUsesCharge
                        or weaponChargeReady ~= lastWeaponChargeReady
                        or weaponChargeProgress ~= lastWeaponChargeProgress
                        or weaponBloom ~= lastWeaponBloom
                        or weaponAiming ~= lastWeaponAiming
                    then
                        lastAmmoClip = clipAmmo
                        lastAmmoReserve = reserveAmmo
                        lastIsArmed = isArmed
                        lastWeaponType = weaponType
                        lastWeaponReticleType = weaponReticleType
                        lastWeaponIcon = weaponIcon
                        lastWeaponName = weaponName
                        lastWeaponUsesCharge = weaponUsesCharge
                        lastWeaponChargeReady = weaponChargeReady
                        lastWeaponChargeProgress = weaponChargeProgress
                        lastWeaponBloom = weaponBloom
                        lastWeaponAiming = weaponAiming
                        SendNUIMessage({
                            action = 'updateAmmo',
                            ammoClip = clipAmmo,
                            ammoReserve = reserveAmmo,
                            isArmed = isArmed,
                            weaponType = weaponType,
                            weaponReticleType = weaponReticleType,
                            weaponIcon = weaponIcon,
                            weaponName = weaponName,
                            weaponUsesCharge = weaponUsesCharge,
                            weaponChargeReady = weaponChargeReady,
                            weaponChargeProgress = weaponChargeProgress,
                            weaponBloom = weaponBloom,
                            weaponAiming = weaponAiming,
                        })
                    end
                else
                    sleep = 400
                    if lastIsArmed then
                        lastAmmoClip = -1
                        lastAmmoReserve = -1
                        lastIsArmed = false
                        lastWeaponType = 'none'
                        lastWeaponReticleType = 'none'
                        lastWeaponIcon = nil
                        lastWeaponName = nil
                        lastWeaponUsesCharge = false
                        lastWeaponChargeReady = true
                        lastWeaponChargeProgress = 100
                        lastWeaponBloom = 0
                        lastWeaponAiming = false
                        SendNUIMessage({
                            action = 'updateAmmo',
                            ammoClip = -1,
                            ammoReserve = -1,
                            isArmed = false,
                            weaponType = 'none',
                            weaponReticleType = 'none',
                            weaponUsesCharge = false,
                            weaponChargeReady = true,
                            weaponChargeProgress = 100,
                            weaponBloom = 0,
                            weaponAiming = false,
                        })
                    end
                end
            end

            Wait(sleep)
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
            visible = isFullyVisible(),
            radarVisible = lastRadarState == true,
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
        syncMinimapState('export:toggleMap', true)
    end)

    exports('refreshMinimap', function(reason)
        requestMinimapRefresh(reason or 'export:refreshMinimap')
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
        return (type(seatbelt) == 'table') and seatbelt:isSeatbeltOn() or false
    end)

    exports('toggleSeatbelt', function(state)
        if (type(seatbelt) == 'table') then
            seatbelt:toggle(state)
        end
    end)

    exports('isEngineStalled', function()
        return (type(stall) == 'table') and stall:isStalled() or false
    end)

    exports('isEngineBroken', function()
        return (type(stall) == 'table') and stall:isBroken() or false
    end)

    exports('getStallCount', function()
        return (type(stall) == 'table') and stall:getStallCount() or 0
    end)

    exports('getEnginePower', function()
        return (type(stall) == 'table') and stall:getPowerMultiplier() or 1.0
    end)

    exports('repairEngine', function(vehicle)
        if (type(stall) == 'table') then
            stall:repair(vehicle)
        end
    end)

    exports('isHarnessOn', function()
        return (type(harness) == 'table') and harness:isHarnessOn() or false
    end)

    exports('toggleHarness', function(state)
        if (type(harness) == 'table') then
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

    exports('isCruiseControlActive', function()
        return (type(cruise) == 'table') and cruise:isCruiseOn() or false
    end)

    local function handleNosUpdate(data)
        if isFullyVisible() then
            SendNUIMessage({
                action = 'nos:update',
                data = data
            })
        end
    end

    AddEventHandler('es_nos:update', handleNosUpdate)
    AddEventHandler('cortex_nos:update', handleNosUpdate)
end

function hud.isVisible()
    return isFullyVisible()
end

return hud
