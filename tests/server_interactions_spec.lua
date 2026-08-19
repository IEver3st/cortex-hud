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
local vehicleSpeed = 0.0
local vehicleLockStatus = 2
local lockMutation = nil

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
            VehicleAccessInteractions = {
                enabled = true,
                onlyLocked = true,
                serverMaxDistance = 8.0,
                maxVehicleSpeed = 1.0,
                requestCooldown = 700,
                actionCooldown = 1200,
                smash = { enabled = true },
                cloneKey = {
                    enabled = true,
                    duration = 1500,
                    qte = {
                        minRounds = 1,
                        maxRounds = 1,
                        roundDuration = 800,
                        targetPhase = 0.70,
                        hitWindow = 0.14,
                        introDuration = 200,
                        interRoundDelay = 100,
                        completionDelay = 100,
                    },
                    provider = 'auto',
                    allowStandalone = true,
                },
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

function GetEntitySpeed()
    return vehicleSpeed
end

function GetVehicleDoorLockStatus()
    return vehicleLockStatus
end

function GetResourceState()
    return 'missing'
end

function GetPlayerRoutingBucket()
    return 0
end

function GetEntityRoutingBucket()
    return 0
end

function SetVehicleDoorsLocked(entity, state)
    lockMutation = { entity = entity, state = state }
    vehicleLockStatus = state
end

function TriggerClientEvent(name, target, networkId, door, shouldOpen, challenge)
    triggered[#triggered + 1] = {
        name = name,
        target = target,
        networkId = networkId,
        door = door,
        shouldOpen = shouldOpen,
        challenge = challenge,
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

entityExists = true
local smashRequest = assert(registeredEvents['cortex-hud:server:smashVehicleWindow'])
local beginClone = assert(registeredEvents['cortex-hud:server:beginVehicleKeyClone'])
local finishClone = assert(registeredEvents['cortex-hud:server:finishVehicleKeyClone'])

smashRequest('41', 0)
smashRequest(41, 0.5)
smashRequest(41, 4)
assert(#triggered == 2, 'malformed smash payload reached an owner client')

vehicleCoords = { x = 20.0, y = 0.0, z = 0.0 }
smashRequest(41, 0)
assert(#triggered == 2, 'distant smash request reached an owner client')

vehicleCoords = { x = 1.0, y = 0.0, z = 0.0 }
vehicleSpeed = 2.0
smashRequest(41, 0)
assert(#triggered == 2, 'moving-vehicle smash request reached an owner client')

vehicleSpeed = 0.0
vehicleLockStatus = 1
smashRequest(41, 0)
assert(#triggered == 2, 'unlocked-vehicle smash request reached an owner client')

vehicleLockStatus = 2
now = now + 800
smashRequest(41, 0)
assert(#triggered == 3, 'valid smash request was not forwarded')
assert(triggered[3].name == 'cortex-hud:client:smashVehicleWindow')
assert(triggered[3].target == 77 and triggered[3].networkId == 41 and triggered[3].door == 0)

now = now + 800
beginClone(41)
assert(#triggered == 4, 'valid clone request did not start a server session')
assert(triggered[4].name == 'cortex-hud:client:vehicleKeyCloneBegin')
local firstToken = triggered[4].door
assert(type(firstToken) == 'string' and firstToken ~= '')
assert(type(triggered[4].challenge) == 'table' and triggered[4].challenge.rounds == 1)

finishClone(firstToken, 41)
assert(#triggered == 5 and triggered[5].name == 'cortex-hud:client:vehicleKeyCloneRejected')
assert(triggered[5].door == 'expired', 'early clone completion was not rejected')
assert(lockMutation == nil, 'early clone completion unlocked the vehicle')

now = now + 800
beginClone(41)
assert(#triggered == 6 and triggered[6].name == 'cortex-hud:client:vehicleKeyCloneBegin')
local secondToken = triggered[6].door

finishClone('forged-token', 41)
assert(#triggered == 7 and triggered[7].name == 'cortex-hud:client:vehicleKeyCloneRejected')
assert(lockMutation == nil, 'forged clone token unlocked the vehicle')

now = now + 1500
finishClone(secondToken, 41)
assert(#triggered == 8 and triggered[8].name == 'cortex-hud:client:vehicleKeyCloned')
assert(triggered[8].door == 'standalone', 'standalone provider was not reported')
assert(lockMutation and lockMutation.entity == 501 and lockMutation.state == 1)

finishClone(secondToken, 41)
assert(#triggered == 9 and triggered[9].name == 'cortex-hud:client:vehicleKeyCloneRejected')
assert(triggered[9].door == 'expired', 'completed clone session was replayable')

print('server interaction boundary tests passed')
