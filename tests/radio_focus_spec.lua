local sourcePath = debug.getinfo(1, 'S').source:sub(2):gsub('\\', '/')
local root = assert(sourcePath:match('^(.*)/tests/[^/]+$'))
local focused, visible, thread = false, false, nil
local timer, writes, reads = 1000, 0, 0
local station, pressed, held = 'STATION_A', {}, {}
local stopped, disabled = nil, {}
local nui = {
    onReady = function() end,
    send = function(message)
        if message.visible ~= nil then visible = message.visible end
    end,
}
lib = { require = function() return nui end }
json = { decode = function() return {} end }
function LoadResourceFile() return '{}' end
function GetCurrentResourceName() return 'cortex-hud' end
function GetResourceKvpString() return nil end
function SetResourceKvp() end
function GetGameTimer() return timer end
function PlayerPedId() return 1 end
function GetVehiclePedIsIn() return 2 end
function DoesEntityExist() return true end
function IsEntityDead() return false end
function IsPauseMenuActive() return false end
function IsScreenFadedIn() return true end
function DoesPlayerVehHaveRadio() return true end
function IsPlayerVehRadioEnable() return true end
function IsNuiFocused() return focused end
function IsInputDisabled() return true end
function GetPlayerRadioStationName() return station end
function GetAudibleMusicTrackTextId() return -1 end
function SetVehRadioStation(_, value) station = value; writes = writes + 1 end
function SetRadioStationMusicOnly() end
function DisableControlAction(_, control) disabled[control] = true end
function IsDisabledControlJustPressed(_, control) reads = reads + 1; return pressed[control] == true end
function IsDisabledControlPressed(_, control) reads = reads + 1; return held[control] == true end
function CreateThread(fn) thread = coroutine.create(fn) end
function Wait(delay) coroutine.yield(delay) end
function exports() end
function AddEventHandler(_, fn) stopped = fn end

local Radio = dofile(root .. '/modules/radio/client.lua')
local config = { Radio = { stations = {
    { name = 'STATION_A', label = 'Station A' },
    { name = 'STATION_B', label = 'Station B' },
} } }
Radio.start(config)
local function frame()
    timer = timer + 100
    disabled = {}
    local ok, result = coroutine.resume(thread)
    assert(ok, result)
    return result
end

-- Studio owns NUI focus with gameplay input retained. Disabled controls still fire.
focused, pressed = true, { [81] = true }
frame()
assert(not visible and writes == 0, 'Studio scroll must neither open the radio nor change its station')
assert(reads == 0, 'Focused NUI must prevent reading disabled radio inputs')

-- Normal quick switching returns when the menu releases focus.
focused = false
frame()
assert(visible and station == 'STATION_B' and writes == 1, 'Radio must resume after focus release')

-- Taking focus while the selector is open closes it and ignores all radio actions.
local before = writes
focused, pressed, held = true, { [14] = true, [80] = true, [73] = true }, { [85] = true }
reads = 0
assert(frame() == 0, 'Focus changes should retain frame cadence in a radio-capable vehicle')
assert(not visible and writes == before and reads == 0, 'Opening studio must hide the existing selector without changing playback')
assert(Radio.getMode() == 'radio' and not Radio.isMuted())
frame()
assert(not visible and writes == before, 'Held radio controls must stay suppressed throughout studio use')

focused, pressed, held = false, {}, {}
frame()
assert(not visible and writes == before, 'Closing studio must not replay its scroll input')
held = { [85] = true }
frame()
assert(visible, 'Hold-to-open must resume after focus release')

-- The native-wheel preference also respects focus, then releases its controls.
config.Radio.replaceDefaultWheel = false
focused = true
frame()
assert(not visible and disabled[85] and disabled[81] and disabled[82], 'Focused NUI must block native radio selection too')
focused, held = false, {}
frame()
assert(not disabled[85] and not disabled[81], 'Native radio controls must be released outside NUI focus')
stopped('cortex-hud')
assert(not visible)
print('radio NUI focus, scroll suppression, existing selector and focus release tests passed')
