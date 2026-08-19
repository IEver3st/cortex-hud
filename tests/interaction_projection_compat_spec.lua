local handlers = {}
local messages = {}
local registryItems = {}
local threads = {}

local Nui = {
    isReady = function()
        return true
    end,
    onReady = function(callback)
        callback()
    end,
    send = function(message)
        messages[#messages + 1] = message
    end,
}

lib = {
    require = function(name)
        assert(name == 'modules.nui.client')
        return Nui
    end,
    showInteraction = function(interaction)
        -- Model the running legacy cortex-lib: gameplay fields survive, but
        -- the newer world anchor is absent from the normalized snapshot.
        registryItems = {
            {
                id = interaction.id,
                owner = 'cortex-hud',
                label = interaction.label,
                key = interaction.key,
                priority = interaction.priority,
            },
        }

        local callbacks = handlers['cortex-lib:interaction:changed'] or {}
        for index = 1, #callbacks do callbacks[index]() end
        return true
    end,
    hideInteraction = function()
        registryItems = {}
        return true
    end,
}

exports = {
    ['cortex-lib'] = {
        getInteractions = function()
            return registryItems
        end,
    },
}

function AddEventHandler(name, callback)
    handlers[name] = handlers[name] or {}
    handlers[name][#handlers[name] + 1] = callback
end
function CreateThread(callback)
    threads[#threads + 1] = callback
end
function RegisterCommand() end
function RegisterKeyMapping() end
function RegisterNetEvent() end
function GetCurrentResourceName()
    return 'cortex-hud'
end
function GetSafeZoneSize()
    return 1.0
end
function GetActiveScreenResolution()
    return 1920, 1080
end
function PlayerPedId()
    return 1
end
function DoesEntityExist(entity)
    return entity == 1 or entity == 501
end
function IsEntityDead()
    return false
end
function IsPedRagdoll()
    return false
end
function IsPedInAnyVehicle()
    return false
end
function IsPedUsingAnyScenario()
    return false
end
function GetEntityCoords()
    return { x = 0.0, y = 0.0, z = 0.0 }
end
function GetGamePool(pool)
    assert(pool == 'CVehicle')
    return { 501 }
end
function GetEntityType(entity)
    return entity == 501 and 2 or 1
end
function GetIsDoorValid(entity, door)
    return entity == 501 and door == 0
end
function IsVehicleDoorDamaged()
    return false
end
function GetVehicleDoorLockStatus()
    return 1
end
function GetEntitySpeed()
    return 0.0
end
function HasEntityClearLosToEntity()
    return true
end
function GetEntityBoneIndexByName(entity, bone)
    assert(entity == 501)
    assert(bone == 'handle_dside_f')
    return 10
end
function GetEntityBonePosition_2(entity, boneIndex)
    assert(entity == 501 and boneIndex == 10)
    return { x = 0.5, y = 0.0, z = 0.5 }
end
function GetOffsetFromEntityInWorldCoords(entity, x, y, z)
    assert(entity == 501)
    return { x = x, y = y, z = z }
end
function World3dToScreen2d()
    return true, 0.55, 0.50
end
function GetVehicleDoorAngleRatio()
    return 0.0
end
function Wait()
    error('__frame_complete__')
end

local InteractionHud = dofile('modules/interactions/client.lua')
local VehicleDoorInteractions = dofile('modules/interactions/vehicle_doors.lua')

InteractionHud.start()
VehicleDoorInteractions.start({
    gta6HudEnabled = true,
    VehicleDoorInteractions = {
        enabled = true,
        requireGta6Hud = true,
        key = 'E',
        command = 'cortexVehicleDoor',
        description = 'Vehicle door',
        priority = 100,
        openLabel = 'OPEN',
        closeLabel = 'CLOSE',
        interactionDistance = 2.0,
        scanRadius = 6.0,
        includeHood = false,
        includeTrunk = false,
        panelOffsets = {
            frontDoor = { x = 0.0, y = 0.18, z = -0.12 },
        },
    },
}, InteractionHud)

assert(type(threads[3]) == 'function', 'the vehicle scanner thread was not created')
local scanOk, scanError = pcall(threads[3])
assert(not scanOk and tostring(scanError):find('__frame_complete__', 1, true), tostring(scanError))

local latestScreenUpdate = nil
for index = #messages, 1, -1 do
    if messages[index].action == 'interaction:update' then
        latestScreenUpdate = messages[index]
        break
    end
end

assert(latestScreenUpdate, 'the HUD did not publish an interaction update')
assert(
    #latestScreenUpdate.items == 0,
    'legacy vehicle interaction leaked into the bottom-right screen prompt'
)

assert(type(threads[2]) == 'function', 'the world projection thread was not created')
local frameOk, frameError = pcall(threads[2])
assert(not frameOk and tostring(frameError):find('__frame_complete__', 1, true), tostring(frameError))

local worldFrame = nil
for index = #messages, 1, -1 do
    if messages[index].action == 'interaction:world' and #messages[index].items > 0 then
        worldFrame = messages[index]
        break
    end
end

assert(worldFrame, 'the legacy vehicle interaction did not produce a 3D world frame')
assert(worldFrame.items[1].x == 0.55 and worldFrame.items[1].y == 0.50)

print('legacy interaction projection test passed')
