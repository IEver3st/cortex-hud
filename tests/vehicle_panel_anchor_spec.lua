local activeDoor = 0
local hasHandle = true
local published = nil
local threads = {}

lib = {
    showInteraction = function(interaction)
        published = interaction
        return true
    end,
    hideInteraction = function()
        return true
    end,
    isInteractionActive = function()
        return true
    end,
}

function RegisterCommand() end
function RegisterKeyMapping() end
function RegisterNetEvent() end
function AddEventHandler() end
function CreateThread(callback)
    threads[#threads + 1] = callback
end
function GetCurrentResourceName()
    return 'cortex-hud'
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
    return entity == 501 and door == activeDoor
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
    if bone:find('handle_', 1, true) and not hasHandle then return -1 end
    return 10
end
function GetEntityBonePosition_2(entity, boneIndex)
    assert(entity == 501 and boneIndex == 10)
    return { x = 0.0, y = 0.0, z = 0.0 }
end
function GetOffsetFromEntityInWorldCoords(entity, x, y, z)
    assert(entity == 501)
    return { x = x, y = y, z = z }
end
function GetEntityMatrix()
    error('GetEntityMatrix must not be used by the OAL-safe scanner path')
end
function World3dToScreen2d()
    return true, 0.5, 0.5
end
function GetVehicleDoorAngleRatio()
    return 0.0
end
function Wait()
    error('__scan_complete__')
end

local config = {
    gta6HudEnabled = true,
    VehicleDoorInteractions = {
        enabled = true,
        requireGta6Hud = true,
        key = 'E',
        command = 'cortexVehicleDoor',
        description = 'Vehicle panel',
        priority = 100,
        openLabel = 'OPEN',
        closeLabel = 'CLOSE',
        interactionDistance = 2.0,
        scanRadius = 6.0,
        includeHood = true,
        includeTrunk = true,
        panelOffsets = {
            frontDoor = { x = 0.0, y = 0.18, z = -0.12 },
            rearDoor = { x = 0.0, y = 0.15, z = -0.12 },
            hood = { x = 0.0, y = 0.68, z = 0.04 },
            trunk = { x = 0.0, y = -0.72, z = 0.04 },
        },
    },
}

local function captureAnchor(door, handleAvailable)
    activeDoor = door
    hasHandle = handleAvailable ~= false
    published = nil
    threads = {}

    local module = dofile('modules/interactions/vehicle_doors.lua')
    module.start(config)
    assert(type(threads[1]) == 'function')

    local ok, err = pcall(threads[1])
    assert(not ok and tostring(err):find('__scan_complete__', 1, true), tostring(err))
    assert(published and published.anchor, ('door %d did not publish an anchor'):format(door))
    return published.anchor
end

local frontDoor = captureAnchor(0, true)
assert(frontDoor.bone == 'handle_dside_f')
assert(frontDoor.offset.y == 0.18 and frontDoor.offset.z == -0.12)

local frontDoorFallback = captureAnchor(0, false)
assert(frontDoorFallback.bone == 'door_dside_f')
assert(frontDoorFallback.offset.y == -0.55)

local hood = captureAnchor(4)
assert(hood.bone == 'bonnet' and hood.offset.y > 0.0)

local trunk = captureAnchor(5)
assert(trunk.bone == 'boot' and trunk.offset.y < 0.0)

print('vehicle panel anchor tests passed')
