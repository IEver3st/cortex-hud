local commands = {}
local threads = {}
local labels = {}
local doorRatio = 0.0
local now = 1000
local timeouts = {}
local holdsStarted = 0
local holdsCancelled = 0
local vehicleDriveable = true
local published = nil
local gestures = {}
function GetResourceState() return 'started' end
exports = { ['cortex-subtleadditions'] = {
    playVehicleDoorAnimation = function(_, vehicle, door, opening)
        gestures[#gestures + 1] = { vehicle, door, opening }
    end,
} }

lib = {
    require = function(path) return dofile(path:gsub('%.', '/') .. '.lua') end,
    showInteraction = function(interaction)
        published = interaction
        labels[#labels + 1] = interaction.label
        return true
    end,
    hideInteraction = function()
        return true
    end,
    isInteractionActive = function()
        return true
    end,
    startInteractionHold = function()
        holdsStarted = holdsStarted + 1
        return true
    end,
    cancelInteractionHold = function()
        holdsCancelled = holdsCancelled + 1
        return true
    end,
}

function RegisterCommand(name, callback)
    commands[name] = callback
end
function RegisterKeyMapping() end
function RegisterNetEvent() end
function AddEventHandler() end
function CreateThread(callback)
    threads[#threads + 1] = callback
end
function SetTimeout(_, callback)
    timeouts[#timeouts + 1] = callback
end
function GetGameTimer()
    return now
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
function IsVehicleDriveable()
    return vehicleDriveable
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
    assert(entity == 501 and type(bone) == 'string')
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
function World3dToScreen2d()
    return true, 0.5, 0.5
end
function GetVehicleDoorAngleRatio()
    return doorRatio
end
function NetworkGetEntityIsNetworked()
    return false
end
function SetVehicleDoorOpen() end
function SetVehicleDoorShut() end
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
        holdDuration = 220,
        openLabel = 'OPEN',
        closeLabel = 'CLOSE',
        interactionDistance = 2.0,
        scanRadius = 6.0,
        includeHood = true,
        includeTrunk = true,
        panelCooldown = 280,
    },
}

local module = dofile('modules/interactions/vehicle_doors.lua')
module.start(config)

local function scanOnce()
    local ok, err = pcall(threads[1])
    assert(not ok and tostring(err):find('__scan_complete__', 1, true), tostring(err))
end

scanOnce()
assert(labels[1] == 'OPEN', 'closed door did not initially publish OPEN')
assert(published.holdDuration == 220, 'door prompt did not publish its quick hold duration')

commands['+cortexVehicleDoor']()
assert(holdsStarted == 1 and #labels == 1, 'door action ran before its hold completed')
commands['-cortexVehicleDoor']()
assert(holdsCancelled == 1, 'early key release did not cancel the door hold')
timeouts[1]()
assert(#labels == 1, 'cancelled door hold still opened the panel')

commands['+cortexVehicleDoor']()
timeouts[2]()
assert(labels[2] == 'CLOSE', 'opening action did not run after the quick hold')

-- The GTA door angle remains near zero during the first animation frames.
scanOnce()
doorRatio = 0.6
scanOnce()

local sequence = table.concat(labels, '>')
if sequence ~= 'OPEN>CLOSE' then
    io.stderr:write(('door label flickered during opening: %s\n'):format(sequence))
    os.exit(1)
end

timeouts[3]()
commands['+cortexVehicleDoor']()
timeouts[4]()
assert(labels[3] == 'OPEN', 'closing action did not immediately publish OPEN')
assert(#gestures == 2 and gestures[1][3] == true and gestures[2][3] == false,
    'accepted door actions did not dispatch opening and closing gestures')

-- The angle also remains high during the first closing frames.
scanOnce()
doorRatio = 0.0
scanOnce()

sequence = table.concat(labels, '>')
if sequence ~= 'OPEN>CLOSE>OPEN' then
    io.stderr:write(('door label flickered during closing: %s\n'):format(sequence))
    os.exit(1)
end

-- If the native never moves the door, the latch must eventually recover to
-- the measured state instead of leaving a stale label indefinitely.
timeouts[5]()
commands['+cortexVehicleDoor']()
timeouts[6]()
scanOnce()
now = now + 1601
scanOnce()
assert(table.concat(labels, '>') == 'OPEN>CLOSE>OPEN>CLOSE>OPEN')

timeouts[7]()
vehicleDriveable = false
scanOnce()
local startedBeforeDestroyedPress = holdsStarted
commands['+cortexVehicleDoor']()
assert(holdsStarted == startedBeforeDestroyedPress, 'destroyed vehicle started an interaction hold')

print('vehicle door label transition tests passed')
