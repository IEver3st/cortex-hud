local config = lib.require("config.shared")

local Bridge = {}

local framework = config.framework or 'standalone'
local playerLoaded = false
local onLoadedCallbacks = {}
local onUnloadedCallbacks = {}

function Bridge.isPlayerLoaded()
    return playerLoaded
end

function Bridge.onPlayerLoaded(cb)
    onLoadedCallbacks[#onLoadedCallbacks + 1] = cb
end

function Bridge.onPlayerUnloaded(cb)
    onUnloadedCallbacks[#onUnloadedCallbacks + 1] = cb
end

local function fireLoaded()
    if playerLoaded then return end
    playerLoaded = true
    for i = 1, #onLoadedCallbacks do
        onLoadedCallbacks[i]()
    end
end

local function fireUnloaded()
    if not playerLoaded then return end
    playerLoaded = false
    for i = 1, #onUnloadedCallbacks do
        onUnloadedCallbacks[i]()
    end
end

if framework == 'qbx' then
    -- Wait for qbx_core to be available, then check initial state
    CreateThread(function()
        while GetResourceState('qbx_core') ~= 'started' do
            Wait(500)
        end

        local playerData = exports.qbx_core:GetPlayerData()
        if playerData and playerData.citizenid then
            fireLoaded()
        end
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
        fireLoaded()
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
        fireUnloaded()
    end)
else
    -- Standalone: player is considered loaded as soon as they are playing
    CreateThread(function()
        while not IsPlayerPlaying(PlayerId()) do
            Wait(200)
        end
        fireLoaded()
    end)
end

return Bridge
