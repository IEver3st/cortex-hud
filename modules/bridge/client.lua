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
    local function syncQbxLoadedState(isLoaded)
        if isLoaded then
            fireLoaded()
            return
        end

        fireUnloaded()
    end

    AddStateBagChangeHandler('isLoggedIn', nil, function(bagName, _, value)
        if bagName ~= ('player:%s'):format(GetPlayerServerId(PlayerId())) then
            return
        end

        syncQbxLoadedState(value == true)
    end)

    CreateThread(function()
        while GetResourceState('qbx_core') ~= 'started' do
            Wait(500)
        end

        local isLoggedIn = LocalPlayer and LocalPlayer.state and LocalPlayer.state.isLoggedIn
        if isLoggedIn ~= nil then
            syncQbxLoadedState(isLoggedIn == true)
            return
        end

        local playerData = exports.qbx_core:GetPlayerData()
        syncQbxLoadedState(playerData and playerData.citizenid ~= nil)
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
        syncQbxLoadedState(true)
    end)

    RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
        syncQbxLoadedState(false)
    end)
else

    CreateThread(function()
        while not IsPlayerPlaying(PlayerId()) do
            Wait(200)
        end
        fireLoaded()
    end)
end

return Bridge
