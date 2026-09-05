local published = {}
local commands = {}
local events = {}
local threads = {}
local callbacks = {}
local messages = {}
local smashed = nil
local timeouts = {}
local serverEvents = {}
local holdsStarted = {}
local holdsCancelled = {}
local vehicleDriveable = true

lib = {
    showInteraction = function(interaction)
        published[interaction.id] = interaction
        return true
    end,
    hideInteraction = function(id)
        published[id] = nil
        return true
    end,
    isInteractionActive = function(id)
        return published[id] ~= nil
    end,
    notify = function() end,
    progress = function()
        return true
    end,
    startInteractionHold = function(id)
        holdsStarted[#holdsStarted + 1] = id
        return true
    end,
    cancelInteractionHold = function(id)
        holdsCancelled[#holdsCancelled + 1] = id
        return true
    end,
}

function GetCurrentResourceName() return 'cortex-hud' end
function RegisterCommand(name, callback) commands[name] = callback end
function RegisterKeyMapping() end
function RegisterNetEvent(name, callback) events[name] = callback end
function RegisterNUICallback(name, callback) callbacks[name] = callback end
function AddEventHandler() end
function SendNUIMessage(message) messages[#messages + 1] = message end
function CreateThread(callback) threads[#threads + 1] = callback end
function SetTimeout(_, callback) timeouts[#timeouts + 1] = callback end
function TriggerServerEvent(name, ...)
    serverEvents[#serverEvents + 1] = { name = name, args = { ... } }
end
function PlayerPedId() return 100 end
function DoesEntityExist(entity) return entity == 100 or entity == 501 end
function IsEntityDead() return false end
function IsPedRagdoll() return false end
function IsPedInAnyVehicle() return false end
function IsPedUsingAnyScenario() return false end
function GetEntityType(entity) return entity == 501 and 2 or 1 end
function IsVehicleDriveable() return vehicleDriveable end
function GetIsDoorValid() return true end
function GetEntitySpeed() return 0.0 end
function GetVehicleDoorLockStatus() return 2 end
function HasEntityClearLosToEntity() return true end
function GetGamePool() return { 501 } end
function GetEntityCoords(entity)
    return entity == 501 and { x = 1.0, y = 0.0, z = 0.0 } or { x = 0.0, y = 0.0, z = 0.0 }
end
function GetEntityBoneIndexByName() return 10 end
function GetEntityBonePosition_2() return { x = 1.0, y = 0.0, z = 1.0 } end
function GetOffsetFromEntityInWorldCoords(_, x, y, z)
    return { x = 1.0 + x, y = y, z = z }
end
function World3dToScreen2d() return true, 0.5, 0.5 end
function NetworkGetEntityIsNetworked() return true end
function NetworkGetNetworkIdFromEntity() return 41 end
function NetworkGetEntityFromNetworkId(networkId) return networkId == 41 and 501 or 0 end
function IsVehicleWindowIntact() return true end
function SmashVehicleWindow(vehicle, window) smashed = { vehicle = vehicle, window = window } end
function Wait() error('__scan_complete__') end

local module = dofile('modules/interactions/vehicle_access.lua')
module.start({
    gta6HudEnabled = true,
    VehicleAccessInteractions = {
        enabled = true,
        requireGta6Hud = true,
        holdDuration = 220,
        interactionDistance = 2.0,
        scanRadius = 6.0,
        activeScanInterval = 100,
        idleScanInterval = 450,
        maxVehicleSpeed = 1.0,
        onlyLocked = true,
        includeRearWindows = true,
        smash = {
            enabled = true,
            key = 'G',
            command = 'smashTest',
            description = 'Smash',
            label = 'SMASH WINDOW',
            icon = 'smash-window',
            priority = 111,
            panelOffset = { z = 0.0 },
        },
        cloneKey = {
            enabled = true,
            key = 'K',
            command = 'cloneTest',
            description = 'Clone',
            label = 'CLONE KEY',
            icon = 'clone-key',
            priority = 112,
            panelOffset = { z = 0.0 },
        },
    },
})

assert(type(commands['+smashTest']) == 'function', 'smash command was not registered')
assert(type(commands['+cloneTest']) == 'function', 'clone command was not registered')
assert(type(callbacks['vehicleCloneQte:complete']) == 'function', 'clone QTE callback was not registered')
assert(type(threads[1]) == 'function', 'vehicle access scan was not started')

local ok, err = pcall(threads[1])
assert(not ok and tostring(err):find('__scan_complete__', 1, true), tostring(err))

local clone = assert(published['vehicle-clone-key'], 'clone interaction was not published')
local smash = assert(published['vehicle-smash-window'], 'smash interaction was not published')
assert(clone.key == 'K' and clone.label == 'CLONE KEY')
assert(smash.key == 'G' and smash.label == 'SMASH WINDOW')
assert(clone.holdDuration == 220 and smash.holdDuration == 220)
assert(clone.anchor.entity == 501 and clone.anchor.bone == 'handle_dside_f')
assert(clone.anchor.offset.z == 0.0 and smash.anchor.offset.z == 0.0, 'access actions did not share one anchor')

local smashEvent = assert(events['cortex-hud:client:smashVehicleWindow'])
smashEvent('41', 0)
smashEvent(41, 4)
assert(smashed == nil, 'malformed owner payload smashed a window')
smashEvent(41, 0)
assert(smashed and smashed.vehicle == 501 and smashed.window == 0)

vehicleDriveable = false
smashed = nil
smashEvent(41, 0)
assert(smashed == nil, 'destroyed vehicle accepted a remote smash mutation')

local scanOk, scanError = pcall(threads[1])
assert(not scanOk and tostring(scanError):find('__scan_complete__', 1, true), tostring(scanError))
assert(published['vehicle-clone-key'] == nil and published['vehicle-smash-window'] == nil,
    'destroyed vehicle still published access interactions')

vehicleDriveable = true
scanOk, scanError = pcall(threads[1])
assert(not scanOk and tostring(scanError):find('__scan_complete__', 1, true), tostring(scanError))

commands['+cloneTest']()
assert(holdsStarted[1] == 'vehicle-clone-key' and #serverEvents == 0,
    'clone action ran before its quick hold completed')
commands['-cloneTest']()
assert(holdsCancelled[1] == 'vehicle-clone-key')
timeouts[1]()
assert(#serverEvents == 0, 'cancelled clone hold still reached the server')

commands['+cloneTest']()
timeouts[2]()
assert(type(threads[2]) == 'function', 'completed clone hold did not schedule the action')
threads[2]()
assert(serverEvents[1] and serverEvents[1].name == 'cortex-hud:server:beginVehicleKeyClone',
    'completed clone hold did not start the clone action')

print('vehicle access interaction tests passed')
