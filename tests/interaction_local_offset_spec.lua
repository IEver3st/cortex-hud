local messages = {}
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
}

exports = {
    ['cortex-lib'] = {
        getInteractions = function()
            return {
                {
                    id = 'vehicle-door',
                    owner = 'cortex-hud',
                    label = 'OPEN',
                    key = 'E',
                    active = true,
                    anchor = {
                        type = 'entity-bone',
                        entity = 501,
                        bone = 'bonnet',
                        offset = { x = 0.2, y = 0.7, z = 0.1 },
                        maxDistance = 5.0,
                    },
                },
            }
        end,
    },
}

function AddEventHandler() end
function CreateThread(callback)
    threads[#threads + 1] = callback
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
function GetEntityCoords(entity)
    assert(entity == 1 or entity == 501)
    return { x = 0.0, y = 0.0, z = 0.0 }
end
function GetEntityBoneIndexByName(entity, bone)
    assert(entity == 501 and bone == 'bonnet')
    return 2
end
function GetEntityBonePosition_2(entity, boneIndex)
    assert(entity == 501 and boneIndex == 2)
    return { x = 1.0, y = 2.0, z = 0.0 }
end
function GetOffsetFromEntityInWorldCoords(entity, x, y, z)
    assert(entity == 501)
    return { x = y, y = -x, z = z }
end
function GetEntityMatrix()
    error('GetEntityMatrix must not be used by the OAL-safe projection path')
end
function World3dToScreen2d(x, y, z)
    assert(math.abs(x - 1.7) < 0.0001, ('unexpected local-forward X: %.4f'):format(x))
    assert(math.abs(y - 1.8) < 0.0001, ('unexpected local-side Y: %.4f'):format(y))
    assert(math.abs(z - 0.1) < 0.0001, ('unexpected local-up Z: %.4f'):format(z))
    return true, 0.55, 0.50
end
function GetCurrentResourceName()
    return 'cortex-hud'
end
function Wait()
    error('__frame_complete__')
end

local module = dofile('modules/interactions/client.lua')
module.start()

assert(type(threads[2]) == 'function', 'the world projection thread was not created')

local ok, err = pcall(threads[2])
assert(not ok and tostring(err):find('__frame_complete__', 1, true), tostring(err))

local frame = nil
for index = #messages, 1, -1 do
    if messages[index].action == 'interaction:world' and #messages[index].items > 0 then
        frame = messages[index]
        break
    end
end

assert(frame, 'the entity-local anchor did not produce a world frame')
assert(frame.items[1].x == 0.55 and frame.items[1].y == 0.50)

print('entity-local interaction offset test passed')
