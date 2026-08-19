local ScreenLayout = {}

local Nui = lib.require('modules.nui.client')

local started = false
local lastSafezone = -1.0
local lastWidth = -1
local lastHeight = -1

local function sendLayout(force)
    local safezone = tonumber(GetSafeZoneSize()) or 1.0
    local width, height = GetActiveScreenResolution()

    width = math.max(1, tonumber(width) or 1920)
    height = math.max(1, tonumber(height) or 1080)
    safezone = math.max(0.0, math.min(1.0, safezone))

    if not force
        and math.abs(safezone - lastSafezone) < 0.0005
        and width == lastWidth
        and height == lastHeight
    then
        return
    end

    lastSafezone = safezone
    lastWidth = width
    lastHeight = height

    local normalizedInset = (1.0 - safezone) * 0.5

    Nui.send({
        action = 'interaction:layout',
        safezone = safezone,
        insetRight = math.floor((width * normalizedInset) + 0.5),
        insetBottom = math.floor((height * normalizedInset) + 0.5),
        screenWidth = width,
        screenHeight = height,
    })
end

function ScreenLayout.start()
    if started then return end
    started = true

    Nui.onReady(function()
        sendLayout(true)
    end)

    CreateThread(function()
        while started do
            sendLayout(false)
            Wait(1000)
        end
    end)

    AddEventHandler('onClientResourceStop', function(resourceName)
        if resourceName == GetCurrentResourceName() then started = false end
    end)
end

return ScreenLayout
