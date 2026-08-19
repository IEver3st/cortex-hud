local commands = {}

lib = {
    showInteraction = function()
        return true
    end,
    hideInteraction = function()
        return true
    end,
}

exports = {
    ['cortex-lib'] = {
        getInteractions = function()
            return {
                {
                    id = 'vehicle-door',
                    owner = 'cortex-hud',
                    key = 'E',
                    active = true,
                },
            }
        end,
    },
}

function RegisterCommand(name, callback)
    commands[name] = callback
end

function RegisterKeyMapping() end
function RegisterNetEvent() end
function AddEventHandler() end
function CreateThread() end
function GetCurrentResourceName()
    return 'cortex-hud'
end
function PlayerPedId()
    return 1
end

local module = dofile('modules/interactions/vehicle_doors.lua')
module.start({
    gta6HudEnabled = true,
    VehicleDoorInteractions = {
        enabled = true,
        requireGta6Hud = true,
        key = 'E',
        command = 'cortexVehicleDoor',
        description = 'Vehicle door',
    },
})

local action = assert(commands['+cortexVehicleDoor'])
local ok, err = pcall(action)
assert(ok, ('legacy interaction API crashed the E action: %s'):format(tostring(err)))

print('vehicle door compatibility test passed')
