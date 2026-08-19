local config = lib.require('config.shared')
local doorConfig = config.VehicleDoorInteractions or {}

local lastRequestByPlayer = {}
local lastRequestByPanel = {}

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

AddEventHandler('playerDropped', function()
    local src = source
    lastRequestByPlayer[src] = nil
end)
