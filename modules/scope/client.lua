local scope = {}

local CreateThread = CreateThread
local GetGameTimer = GetGameTimer
local GetGameplayCamCoord = GetGameplayCamCoord
local GetGameplayCamFov = GetGameplayCamFov
local GetCurrentResourceName = GetCurrentResourceName
local GetPlayerSprintStaminaRemaining = GetPlayerSprintStaminaRemaining
local GetSelectedPedWeapon = GetSelectedPedWeapon
local IsEntityDead = IsEntityDead
local IsPlayerFreeAiming = IsPlayerFreeAiming
local IsPlayerPlaying = IsPlayerPlaying
local PlayerId = PlayerId
local PlayerPedId = PlayerPedId
local Raycast = lib.raycast
local SendNUIMessage = lib.require("modules.nui.client").send
local Wait = Wait
local math_floor = math.floor
local math_max = math.max
local math_min = math.min
local math_rad = math.rad
local math_sqrt = math.sqrt
local math_tan = math.tan

local DEFAULT_CAMERA_FOV = 55.0
local MAX_RANGE_METERS = 1200.0
local RANGE_REFRESH_MS = 100
local ACTIVE_REFRESH_MS = 50
local IDLE_REFRESH_MS = 150
local BASE_FOV_REFRESH_MS = 1000

local SNIPER_WEAPONS = {
    [`WEAPON_SNIPERRIFLE`] = 'SNIPER',
    [`WEAPON_HEAVYSNIPER`] = 'HEAVY SNIPER',
    [`WEAPON_HEAVYSNIPER_MK2`] = 'HEAVY SNIPER MK II',
    [`WEAPON_MARKSMANRIFLE`] = 'MARKSMAN',
    [`WEAPON_MARKSMANRIFLE_MK2`] = 'MARKSMAN MK II',
    [`WEAPON_PRECISIONRIFLE`] = 'PRECISION',
}

local function clamp(value, minimum, maximum)
    return math_max(minimum, math_min(maximum, value))
end

local function getZoomLevel(baseFov, currentFov)
    local safeBaseFov = clamp(tonumber(baseFov) or DEFAULT_CAMERA_FOV, 35.0, 100.0)
    local safeCurrentFov = clamp(tonumber(currentFov) or safeBaseFov, 2.0, safeBaseFov)
    local magnification = math_tan(math_rad(safeBaseFov) * 0.5)
        / math_tan(math_rad(safeCurrentFov) * 0.5)

    return math_floor(clamp(magnification, 1.0, 20.0) * 2.0 + 0.5) / 2.0
end

local function getSteadiness(playerId)
    local staminaUsed = tonumber(GetPlayerSprintStaminaRemaining(playerId)) or 0
    return math_floor((100.0 - clamp(staminaUsed, 0.0, 100.0)) + 0.5)
end

local function getRangeMeters()
    local origin = GetGameplayCamCoord()
    local hit, _, hitCoords = Raycast.cam(511, nil, MAX_RANGE_METERS)

    if not hit or not hitCoords then
        return nil
    end

    local deltaX = hitCoords.x - origin.x
    local deltaY = hitCoords.y - origin.y
    local deltaZ = hitCoords.z - origin.z
    local distance = math_sqrt((deltaX * deltaX) + (deltaY * deltaY) + (deltaZ * deltaZ))

    if distance ~= distance or distance < 2.0 or distance > MAX_RANGE_METERS then
        return nil
    end

    return math_floor(distance + 0.5)
end

local function hideScope(lastWeapon)
    SendNUIMessage({
        action = 'setSniperScope',
        visible = false,
        weapon = lastWeapon or 'SNIPER',
        zoom = 1,
        range = -1,
        steadiness = 100,
    })
end

function scope.start(isHudVisible)
    local resourceName = GetCurrentResourceName()
    local canShowHud = type(isHudVisible) == 'function' and isHudVisible or function()
        return true
    end
    local lastWeapon = 'SNIPER'
    local baseFov = DEFAULT_CAMERA_FOV

    CreateThread(function()
        local playerId = PlayerId()
        local lastVisible = false
        local lastZoom = nil
        local lastRange = nil
        local lastSteadiness = nil
        local lastRangeRefreshAt = 0
        local rangeMeters = nil
        local lastBaseFovRefreshAt = -BASE_FOV_REFRESH_MS

        while true do
            local sleep = IDLE_REFRESH_MS
            local visible = false
            local weaponLabel = nil
            local currentFov = baseFov
            local now = GetGameTimer()

            if canShowHud() and IsPlayerPlaying(playerId) then
                local ped = PlayerPedId()
                if ped ~= 0 and not IsEntityDead(ped) then
                    weaponLabel = SNIPER_WEAPONS[GetSelectedPedWeapon(ped)]
                    if weaponLabel then
                        sleep = ACTIVE_REFRESH_MS
                        currentFov = tonumber(GetGameplayCamFov()) or baseFov
                        visible = IsPlayerFreeAiming(playerId) == true
                    elseif (now - lastBaseFovRefreshAt) >= BASE_FOV_REFRESH_MS then
                        currentFov = tonumber(GetGameplayCamFov()) or baseFov
                        lastBaseFovRefreshAt = now
                    end
                end
            end

            if not visible and currentFov >= 35.0 and currentFov <= 100.0 then
                baseFov = currentFov
            end

            local zoomLevel = lastZoom or 1
            local steadiness = lastSteadiness or 100

            if visible then
                zoomLevel = getZoomLevel(baseFov, currentFov)
                steadiness = getSteadiness(playerId)

                if not lastVisible or (now - lastRangeRefreshAt) >= RANGE_REFRESH_MS then
                    rangeMeters = getRangeMeters()
                    lastRangeRefreshAt = now
                end
            else
                rangeMeters = nil
            end

            if visible ~= lastVisible
                or (visible and weaponLabel ~= lastWeapon)
                or (visible and zoomLevel ~= lastZoom)
                or (visible and rangeMeters ~= lastRange)
                or (visible and steadiness ~= lastSteadiness)
            then
                SendNUIMessage({
                    action = 'setSniperScope',
                    visible = visible,
                    weapon = weaponLabel or lastWeapon,
                    zoom = zoomLevel,
                    range = rangeMeters or -1,
                    steadiness = steadiness,
                })
            end

            lastVisible = visible
            lastZoom = zoomLevel
            lastRange = rangeMeters
            lastSteadiness = steadiness
            if weaponLabel then
                lastWeapon = weaponLabel
            end

            Wait(sleep)
        end
    end)

    AddEventHandler('onClientResourceStop', function(stoppedResource)
        if stoppedResource == resourceName then
            hideScope(lastWeapon)
        end
    end)
end

return scope
