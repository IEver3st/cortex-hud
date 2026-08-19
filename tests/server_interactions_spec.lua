local registeredEvents = {}
local triggered = {}
local scheduled = {}
local now = 1000
local resolutionCalls = 0
local entityType = 2
local entityExists = true
local pedExists = true
local playerCoords = { x = 0.0, y = 0.0, z = 0.0 }
local vehicleCoords = { x = 1.0, y = 0.0, z = 0.0 }

lib = {
    require = function(path)
        assert(path == 'config.shared')
        return {
            VehicleDoorInteractions = {
                enabled = true,
                requestCooldown = 220,
                panelCooldown = 280,
                serverMaxDistance = 8.0,
            },
        }
    end,
}

function RegisterNetEvent(name, callback)
    registeredEvents[name] = callback
end

function AddEventHandler(name, callback)
    registeredEvents[name] = callback
end

function GetGameTimer()
    return now
end

function NetworkGetEntityFromNetworkId(networkId)
    resolutionCalls = resolutionCalls + 1
    return networkId == 41 and 501 or 0
end

function DoesEntityExist(entity)
    if entity == 501 then return entityExists end
    if entity == 100 then return pedExists end
    return false
end

function GetEntityType()
    return entityType
end

function GetPlayerPed(player)
    return player == 10 and 100 or 0
end

function GetEntityCoords(entity)
    return entity == 501 and vehicleCoords or playerCoords
end

function NetworkGetEntityOwner()
    return 77
end

function TriggerClientEvent(name, target, networkId, door, shouldOpen)
    triggered[#triggered + 1] = {
        name = name,
        target = target,
        networkId = networkId,
        door = door,
        shouldOpen = shouldOpen,
    }
end

function SetTimeout(_, callback)
    scheduled[#scheduled + 1] = callback
end

dofile('modules/interactions/server.lua')

local request = assert(registeredEvents['cortex-hud:server:vehicleDoor'])

source = 10
request('41', 0, true)
request(41, 0.5, true)
request(41, 6, true)
request(41, 0, 'true')
assert(#triggered == 0, 'malformed payload reached the owner client')
assert(resolutionCalls == 0, 'malformed payload resolved a network entity')

vehicleCoords = { x = 20.0, y = 0.0, z = 0.0 }
request(41, 0, true)
assert(#triggered == 0, 'implausibly distant request reached the owner client')

vehicleCoords = { x = 1.0, y = 0.0, z = 0.0 }
entityType = 1
request(41, 0, true)
assert(#triggered == 0, 'non-vehicle entity reached the owner client')

entityType = 2
request(41, 0, true)
assert(#triggered == 1, 'valid request was not forwarded exactly once')
assert(triggered[1].name == 'cortex-hud:client:vehicleDoor')
assert(triggered[1].target == 77)
assert(triggered[1].networkId == 41)
assert(triggered[1].door == 0)
assert(triggered[1].shouldOpen == true)

request(41, 0, false)
assert(#triggered == 1, 'repeated request bypassed cooldown')

now = now + 300
request(41, 0, false)
assert(#triggered == 2, 'request did not recover after cooldown')
assert(triggered[2].shouldOpen == false)

entityExists = false
now = now + 300
request(41, 0, true)
assert(#triggered == 2, 'missing entity reached the owner client')

print('server interaction boundary tests passed')
