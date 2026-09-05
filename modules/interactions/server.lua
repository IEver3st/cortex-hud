local config = lib.require('config.shared')
local doorConfig = config.VehicleDoorInteractions or {}
local accessConfig = config.VehicleAccessInteractions or {}
local smashConfig = accessConfig.smash or {}
local cloneConfig = accessConfig.cloneKey or {}

local lastRequestByPlayer = {}
local lastRequestByPanel = {}
local lastAccessRequestByPlayer = {}
local lastSmashByWindow = {}
local cloneSessions = {}
local standaloneKeys = {}

local function isIntegerInRange(value, minimum, maximum)
    return type(value) == 'number'
        and value == value
        and value ~= math.huge
        and value ~= -math.huge
        and value % 1 == 0
        and value >= minimum
        and value <= maximum
end

local function distanceSquared(left, right)
    local x = left.x - right.x
    local y = left.y - right.y
    local z = left.z - right.z
    return (x * x) + (y * y) + (z * z)
end

local function getResourceState(resourceName)
    if type(GetResourceState) ~= 'function' then return 'missing' end
    return GetResourceState(resourceName)
end

local function rejectClone(src, networkId, reason)
    TriggerClientEvent('cortex-hud:client:vehicleKeyCloneRejected', src, networkId, reason)
end

local function isVehicleDestroyed(entity)
    if type(GetVehicleEngineHealth) ~= 'function' then return false end

    local health = tonumber(GetVehicleEngineHealth(entity))
    return health ~= nil and health <= -3999.0
end

local function resolveAccessVehicle(src, networkId)
    if not isIntegerInRange(networkId, 1, 2147483647) then return nil, 'invalid_vehicle' end

    local entity = NetworkGetEntityFromNetworkId(networkId)
    if entity == 0 or not DoesEntityExist(entity) or GetEntityType(entity) ~= 2 then
        return nil, 'invalid_vehicle'
    end
    if isVehicleDestroyed(entity) then return nil, 'invalid_vehicle' end

    local ped = GetPlayerPed(src)
    if ped == 0 or not DoesEntityExist(ped) then return nil, 'invalid_vehicle' end

    if type(GetPlayerRoutingBucket) == 'function' and type(GetEntityRoutingBucket) == 'function'
        and GetPlayerRoutingBucket(src) ~= GetEntityRoutingBucket(entity)
    then
        return nil, 'invalid_vehicle'
    end

    local maximumDistance = tonumber(accessConfig.serverMaxDistance) or 8.0
    if distanceSquared(GetEntityCoords(ped), GetEntityCoords(entity)) > (maximumDistance * maximumDistance) then
        return nil, 'too_far'
    end

    if type(GetEntitySpeed) == 'function'
        and GetEntitySpeed(entity) > (tonumber(accessConfig.maxVehicleSpeed) or 1.0)
    then
        return nil, 'vehicle_moving'
    end

    return entity
end

local function isVehicleLocked(entity)
    if type(GetVehicleDoorLockStatus) ~= 'function' then return true end
    return GetVehicleDoorLockStatus(entity) > 1
end

local function resolveKeyProvider()
    local configured = tostring(cloneConfig.provider or 'auto'):lower()
    if configured == 'auto' then
        if getResourceState('qbx_vehiclekeys') == 'started' then return 'qbx_vehiclekeys' end
        if getResourceState('qb-vehiclekeys') == 'started' then return 'qb-vehiclekeys' end
        return cloneConfig.allowStandalone ~= false and 'standalone' or nil
    end

    if configured == 'standalone' then
        return cloneConfig.allowStandalone ~= false and configured or nil
    end

    if (configured == 'qbx_vehiclekeys' or configured == 'qb-vehiclekeys')
        and getResourceState(configured) == 'started'
    then
        return configured
    end

    return nil
end

local function hasStandaloneKey(src, entity)
    return standaloneKeys[src] and standaloneKeys[src][entity] == true
end

local function hasProviderKey(provider, src, entity)
    if provider == 'standalone' then return hasStandaloneKey(src, entity) end

    if provider == 'qbx_vehiclekeys' then
        local ok, hasKey = pcall(function()
            return exports.qbx_vehiclekeys:HasKeys(src, entity)
        end)
        return ok and hasKey == true
    end

    if provider == 'qb-vehiclekeys' then
        local plate = GetVehicleNumberPlateText(entity)
        local ok, hasKey = pcall(function()
            return exports['qb-vehiclekeys']:HasKeys(src, plate)
        end)
        return ok and hasKey == true
    end

    return false
end

local function giveProviderKey(provider, src, entity)
    if provider == 'standalone' then
        standaloneKeys[src] = standaloneKeys[src] or {}
        standaloneKeys[src][entity] = true
        return true
    end

    if provider == 'qbx_vehiclekeys' then
        local ok = pcall(function()
            exports.qbx_vehiclekeys:GiveKeys(src, entity, true)
        end)
        return ok
    end

    if provider == 'qb-vehiclekeys' then
        local plate = GetVehicleNumberPlateText(entity)
        local ok = pcall(function()
            exports['qb-vehiclekeys']:GiveKeys(src, plate)
        end)
        return ok
    end

    return false
end

local function hasVehicleAccess(src, entity)
    if not isIntegerInRange(src, 1, 2147483647)
        or type(entity) ~= 'number'
        or entity == 0
        or not DoesEntityExist(entity)
        or GetEntityType(entity) ~= 2
    then
        return false
    end

    local ped = GetPlayerPed(src)
    if ped == 0 or not DoesEntityExist(ped) then return false end

    local provider = resolveKeyProvider()
    return provider ~= nil and hasProviderKey(provider, src, entity) == true
end

-- Keep the standalone clone-key table private while allowing trusted server
-- resources to ask the same provider-backed access question.
exports('hasVehicleAccess', hasVehicleAccess)

local function makeCloneToken(src, networkId, now)
    return ('%x:%x:%x:%x'):format(
        src,
        networkId,
        now,
        math.random(0, 0x7fffffff)
    )
end

local function boundedNumber(value, fallback, minimum, maximum)
    value = tonumber(value)
    if not value or value ~= value or value == math.huge or value == -math.huge then value = fallback end
    return math.max(minimum, math.min(maximum, value))
end

local function buildCloneChallenge()
    local qte = type(cloneConfig.qte) == 'table' and cloneConfig.qte or {}
    local minimumRounds = math.floor(boundedNumber(qte.minRounds, 1, 1, 4))
    local maximumRounds = math.floor(boundedNumber(qte.maxRounds, 4, minimumRounds, 4))
    local rounds = math.random(minimumRounds, maximumRounds)
    local roundDuration = math.floor(boundedNumber(qte.roundDuration, 980, 650, 1800))
    local targetPhase = boundedNumber(qte.targetPhase, 0.74, 0.45, 0.88)
    local hitWindow = boundedNumber(qte.hitWindow, 0.14, 0.06, 0.24)
    local introDuration = math.floor(boundedNumber(qte.introDuration, 320, 150, 900))
    local interRoundDelay = math.floor(boundedNumber(qte.interRoundDelay, 240, 100, 650))
    local completionDelay = math.floor(boundedNumber(qte.completionDelay, 150, 50, 450))

    local earliestHitPhase = math.max(0.05, targetPhase - (hitWindow * 0.5))
    local earliestCompletion = introDuration
        + (rounds * roundDuration * earliestHitPhase)
        + ((rounds - 1) * interRoundDelay)
        + completionDelay
    local expectedCompletion = introDuration
        + (rounds * roundDuration * targetPhase)
        + ((rounds - 1) * interRoundDelay)
        + completionDelay

    return {
        rounds = rounds,
        roundDuration = roundDuration,
        targetPhase = targetPhase,
        hitWindow = hitWindow,
        introDuration = introDuration,
        interRoundDelay = interRoundDelay,
        completionDelay = completionDelay,
    }, math.floor(earliestCompletion), math.floor(expectedCompletion)
end

RegisterNetEvent('cortex-hud:server:vehicleDoor', function(networkId, door, shouldOpen)
    local src = source
    if doorConfig.enabled ~= true then return end
    if not isIntegerInRange(networkId, 1, 2147483647) then return end
    if not isIntegerInRange(door, 0, 5) or type(shouldOpen) ~= 'boolean' then return end

    local now = GetGameTimer()
    local requestCooldown = tonumber(doorConfig.requestCooldown) or 220
    local lastPlayerRequest = lastRequestByPlayer[src]
    if lastPlayerRequest then
        local elapsed = now - lastPlayerRequest
        if elapsed >= 0 and elapsed < requestCooldown then return end
    end

    local entity = NetworkGetEntityFromNetworkId(networkId)
    if entity == 0 or not DoesEntityExist(entity) or GetEntityType(entity) ~= 2 then return end
    if isVehicleDestroyed(entity) then return end

    local ped = GetPlayerPed(src)
    if ped == 0 or not DoesEntityExist(ped) then return end

    local maximumDistance = tonumber(doorConfig.serverMaxDistance) or 8.0
    if distanceSquared(GetEntityCoords(ped), GetEntityCoords(entity)) > (maximumDistance * maximumDistance) then
        return
    end

    local panelKey = ('%d:%d'):format(networkId, door)
    local panelCooldown = tonumber(doorConfig.panelCooldown) or 280
    local lastPanelRequest = lastRequestByPanel[panelKey]
    if lastPanelRequest then
        local elapsed = now - lastPanelRequest
        if elapsed >= 0 and elapsed < panelCooldown then return end
    end

    lastRequestByPlayer[src] = now
    lastRequestByPanel[panelKey] = now

    local owner = NetworkGetEntityOwner(entity)
    if type(owner) ~= 'number' or owner <= 0 then owner = src end

    TriggerClientEvent('cortex-hud:client:vehicleDoor', owner, networkId, door, shouldOpen)

    SetTimeout(panelCooldown + 1000, function()
        if lastRequestByPanel[panelKey] == now then
            lastRequestByPanel[panelKey] = nil
        end
    end)
end)

RegisterNetEvent('cortex-hud:server:smashVehicleWindow', function(networkId, window)
    local src = source
    if accessConfig.enabled ~= true or smashConfig.enabled ~= true then return end
    if not isIntegerInRange(window, 0, 3) then return end

    local entity = resolveAccessVehicle(src, networkId)
    if not entity then return end
    if accessConfig.onlyLocked ~= false and not isVehicleLocked(entity) then return end

    local now = GetGameTimer()
    local requestCooldown = tonumber(accessConfig.requestCooldown) or 700
    local lastRequest = lastAccessRequestByPlayer[src]
    if lastRequest then
        local elapsed = now - lastRequest
        if elapsed >= 0 and elapsed < requestCooldown then return end
    end

    local windowKey = ('%d:%d'):format(networkId, window)
    local actionCooldown = tonumber(accessConfig.actionCooldown) or 1200
    local lastWindowRequest = lastSmashByWindow[windowKey]
    if lastWindowRequest then
        local elapsed = now - lastWindowRequest
        if elapsed >= 0 and elapsed < actionCooldown then return end
    end

    lastAccessRequestByPlayer[src] = now
    lastSmashByWindow[windowKey] = now

    local owner = NetworkGetEntityOwner(entity)
    if type(owner) ~= 'number' or owner <= 0 then owner = src end
    TriggerClientEvent('cortex-hud:client:smashVehicleWindow', owner, networkId, window)

    SetTimeout(actionCooldown + 1000, function()
        if lastSmashByWindow[windowKey] == now then lastSmashByWindow[windowKey] = nil end
    end)
end)

RegisterNetEvent('cortex-hud:server:beginVehicleKeyClone', function(networkId)
    local src = source
    if accessConfig.enabled ~= true or cloneConfig.enabled ~= true then return end

    local entity, reason = resolveAccessVehicle(src, networkId)
    if not entity then
        rejectClone(src, networkId, reason)
        return
    end

    if cloneSessions[src] then
        rejectClone(src, networkId, 'busy')
        return
    end

    if accessConfig.onlyLocked ~= false and not isVehicleLocked(entity) then
        rejectClone(src, networkId, 'vehicle_unlocked')
        return
    end

    local provider = resolveKeyProvider()
    if not provider then
        rejectClone(src, networkId, 'provider_unavailable')
        return
    end

    if hasProviderKey(provider, src, entity) then
        rejectClone(src, networkId, 'already_has_key')
        return
    end

    local now = GetGameTimer()
    local requestCooldown = tonumber(accessConfig.requestCooldown) or 700
    local lastRequest = lastAccessRequestByPlayer[src]
    if lastRequest then
        local elapsed = now - lastRequest
        if elapsed >= 0 and elapsed < requestCooldown then
            rejectClone(src, networkId, 'busy')
            return
        end
    end

    local challenge, earliestCompletion, expectedCompletion = buildCloneChallenge()
    local duration = math.max(1500, math.min(30000, expectedCompletion + 900))
    local token = makeCloneToken(src, networkId, now)
    cloneSessions[src] = {
        token = token,
        networkId = networkId,
        entity = entity,
        provider = provider,
        notBefore = now + math.max(500, earliestCompletion - 225),
        expiresAt = now + duration + 6000,
    }
    lastAccessRequestByPlayer[src] = now

    TriggerClientEvent('cortex-hud:client:vehicleKeyCloneBegin', src, networkId, token, duration, challenge)

    SetTimeout(duration + 7000, function()
        local session = cloneSessions[src]
        if session and session.token == token then cloneSessions[src] = nil end
    end)
end)

RegisterNetEvent('cortex-hud:server:cancelVehicleKeyClone', function(token)
    local src = source
    local session = cloneSessions[src]
    if not session or type(token) ~= 'string' or session.token ~= token then return end
    cloneSessions[src] = nil
end)

RegisterNetEvent('cortex-hud:server:finishVehicleKeyClone', function(token, networkId)
    local src = source
    local session = cloneSessions[src]
    if not session
        or type(token) ~= 'string'
        or session.token ~= token
        or not isIntegerInRange(networkId, 1, 2147483647)
        or session.networkId ~= networkId
    then
        rejectClone(src, networkId, 'expired')
        return
    end

    cloneSessions[src] = nil
    local now = GetGameTimer()
    if now < session.notBefore or now > session.expiresAt then
        rejectClone(src, networkId, 'expired')
        return
    end

    local entity, reason = resolveAccessVehicle(src, networkId)
    if not entity or entity ~= session.entity then
        rejectClone(src, networkId, reason or 'invalid_vehicle')
        return
    end

    if accessConfig.onlyLocked ~= false and not isVehicleLocked(entity) then
        rejectClone(src, networkId, 'vehicle_unlocked')
        return
    end

    if not giveProviderKey(session.provider, src, entity) then
        rejectClone(src, networkId, 'failed')
        return
    end

    SetVehicleDoorsLocked(entity, 1)
    TriggerClientEvent('cortex-hud:client:vehicleKeyCloned', src, networkId, session.provider)
end)

AddEventHandler('playerDropped', function()
    local src = source
    lastRequestByPlayer[src] = nil
    lastAccessRequestByPlayer[src] = nil
    cloneSessions[src] = nil
    standaloneKeys[src] = nil
end)
