local Status = {}

local SendNUIMessage = SendNUIMessage
local PlayerPedId = PlayerPedId
local PlayerId = PlayerId
local IsPedSwimmingUnderWater = IsPedSwimmingUnderWater
local GetPlayerUnderwaterTimeRemaining = GetPlayerUnderwaterTimeRemaining
local Wait = Wait
local math_floor = math.floor
local math_max = math.max
local math_min = math.min

local Bridge = lib.require("modules.bridge.client")

local lastHunger = -1
local lastThirst = -1
local lastStress = -1
local lastOxygen = 100
local lastUnderwater = false
--- Full-lung capacity from native at surface (base ~10s; scales with lung stat / SetPedMaxTimeUnderwater).
local breathMaxReference = 10.0

local lastVoipTalking = nil
local lastVoipRange = nil
local lastVoipConnected = nil
local lastRadioChannel = nil
local lastRadioTalking = nil
local lastStandaloneVoipHudEnabled = nil

local voipResource = nil
local cachedRadioChannel = 0
local cachedRadioTalking = false
local radioActiveEventState = false

local config = lib.require("config.shared")

local function getRangeFromProximityState()
    local ok, result = pcall(function()
        return LocalPlayer.state['proximity']
    end)
    if not ok or result == nil then
        return nil
    end

    if type(result) == 'table' then
        local index = result.index
        if index ~= nil then
            -- pma-voice uses 1-indexed: 1=whisper, 2=normal, 3=shout
            if index <= 1 then
                return 'whisper'
            elseif index >= 3 then
                return 'shout'
            end

            return 'normal'
        end

        local distance = result.distance
        if type(distance) == 'number' then
            if distance <= 5.0 then
                return 'whisper'
            elseif distance <= 15.0 then
                return 'normal'
            else
                return 'shout'
            end
        end

        return nil
    end

    if type(result) == 'number' then
        if result <= 5.0 then
            return 'whisper'
        elseif result <= 15.0 then
            return 'normal'
        else
            return 'shout'
        end
    end

    return nil
end

local function getRadioChannelFromState()
    local ok, result = pcall(function()
        return LocalPlayer.state.radioChannel
    end)
    if not ok or result == nil then
        return nil
    end

    if type(result) == 'number' then
        return result
    end

    if type(result) == 'string' then
        local parsed = tonumber(result)
        if parsed then
            return parsed
        end
    end

    return nil
end

local function getRadioTalkingFromState()
    local stateKeys = {
        'radioActive',
        'radioTalking',
        'talkingOnRadio',
    }

    for i = 1, #stateKeys do
        local ok, value = pcall(function()
            return LocalPlayer.state[stateKeys[i]]
        end)

        if ok and value == true then
            return true
        end
    end

    return false
end

RegisterNetEvent('zerio-radio:client:removedradio', function()
    cachedRadioChannel = 0
    cachedRadioTalking = false
    radioActiveEventState = false
end)

RegisterNetEvent('pma-voice:radioActive', function(active)
    if type(active) ~= 'boolean' then
        return
    end

    radioActiveEventState = active
    cachedRadioTalking = active
end)

local function detectVoipResource()
    local configured = config.voipResource
    if configured and configured ~= 'auto' then
        if GetResourceState(configured) == 'started' then
            return configured
        end
        return nil
    end

    local voipResources = { 'pma-voice', 'saltychat', 'mumble-voip', 'tokovoip_script', 'zerio-radio' }
    for _, res in ipairs(voipResources) do
        if GetResourceState(res) == 'started' then
            return res
        end
    end
    return nil
end

local function isStandalonePmaVoiceHudEnabled()
    return (config.framework or 'standalone') == 'standalone'
        and voipResource == 'pma-voice'
        and GetResourceState('pma-voice') == 'started'
end

local function pushVoipDisplayConfig()
    local standaloneVoipHudEnabled = isStandalonePmaVoiceHudEnabled()
    if standaloneVoipHudEnabled == lastStandaloneVoipHudEnabled then
        return
    end

    lastStandaloneVoipHudEnabled = standaloneVoipHudEnabled

    SendNUIMessage({
        action = 'updateStatusConfig',
        framework = config.framework or 'standalone',
        showVoip = config.StatusIcons.showVoip,
        standaloneVoipHudEnabled = standaloneVoipHudEnabled,
    })
end

local function getVoipState()
    if not voipResource then
        return false, 'normal', false, cachedRadioChannel, cachedRadioTalking
    end

    local talking = false
    local range = 'normal'
    local connected = false
    local radioChannel = cachedRadioChannel
    local radioTalking = cachedRadioTalking

    if voipResource == 'pma-voice' then
        local ok, result

        -- Check connection: try native first, then export, then assume connected
        ok, result = pcall(MumbleIsConnected)
        if ok and result then
            connected = true
        else
            ok, result = pcall(function()
                return exports['pma-voice']:isConnected()
            end)
            if ok and result == true then
                connected = true
            else
                -- If pma-voice resource is running, assume connected
                connected = GetResourceState('pma-voice') == 'started'
            end
        end

        ok, result = pcall(function()
            return MumbleIsPlayerTalking(PlayerId())
        end)
        talking = ok and result == true

        local proximityRange = getRangeFromProximityState()
        if proximityRange then
            range = proximityRange
        end
    elseif voipResource == 'zerio-radio' then
        connected = GetResourceState('zerio-radio') == 'started'
        local ok, result = pcall(function()
            return MumbleIsPlayerTalking(PlayerId())
        end)
        talking = ok and result == true

        local proximityRange = getRangeFromProximityState()
        if proximityRange then
            range = proximityRange
        end
    elseif voipResource == 'saltychat' then
        connected = true
        local ok, result = pcall(function()
            return MumbleIsPlayerTalking(PlayerId())
        end)
        talking = ok and result == true
        range = 'normal'
    else
        connected = true
        local ok, result = pcall(function()
            return MumbleIsPlayerTalking(PlayerId())
        end)
        talking = ok and result == true
        range = 'normal'
    end

    local stateRadioChannel = getRadioChannelFromState()
    if stateRadioChannel ~= nil then
        radioChannel = stateRadioChannel
    end

    local ok, result = pcall(NetworkIsPlayerTalkingOnRadio)
    if ok and result == true then
        radioTalking = true
    elseif radioActiveEventState then
        radioTalking = true
    else
        radioTalking = getRadioTalkingFromState()
    end

    cachedRadioChannel = radioChannel
    cachedRadioTalking = radioTalking

    return talking, range, connected, radioChannel, radioTalking
end

local function getPlayerStatus()
    local hunger = 100
    local thirst = 100
    local stress = 0

    local sbHunger = LocalPlayer.state.hunger
    local sbThirst = LocalPlayer.state.thirst
    local sbStress = LocalPlayer.state.stress
    if sbHunger ~= nil then hunger = sbHunger end
    if sbThirst ~= nil then thirst = sbThirst end
    if sbStress ~= nil then stress = sbStress end

    if sbHunger == nil or sbThirst == nil then
        local ok, playerData = pcall(function() return exports.qbx_core:GetPlayerData() end)
        if ok and playerData and playerData.metadata then
            hunger = playerData.metadata.hunger or hunger
            thirst = playerData.metadata.thirst or thirst
            stress = playerData.metadata.stress or stress
        end
    end

    return math_floor(math_max(0, math_min(100, hunger))),
           math_floor(math_max(0, math_min(100, thirst))),
           math_floor(math_max(0, math_min(100, stress)))
end

local function getOxygenState()
    local ped = PlayerPedId()
    local playerId = PlayerId()
    local currentOxygen = GetPlayerUnderwaterTimeRemaining(playerId)
    local underwater = IsPedSwimmingUnderWater(ped) or currentOxygen <= 9.99

    -- Submerged level > 0.5 trips during surface swim. Underwater-swim flag matches breath HUD.
    -- If lungs aren't full while flag is false (e.g. seabed), still report remaining air.
    if not underwater and currentOxygen > 9.99 then
        -- Remaining time at full breath equals max capacity; do not assume 10.0 (lung upgrades go higher).
        breathMaxReference = math_max(breathMaxReference, currentOxygen)
        return 100, false
    end

    local denom = math_max(0.25, breathMaxReference)
    local percent = (currentOxygen / denom) * 100
    return math_floor(math_max(0, math_min(100, percent))), underwater
end

function Status.start(config, isFullyVisible)
    voipResource = detectVoipResource()

    -- Status update thread (hunger, thirst, stress — slow)
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        while true do
            if isFullyVisible() then
                local hunger, thirst, stress = getPlayerStatus()

                if hunger ~= lastHunger or thirst ~= lastThirst or stress ~= lastStress then
                    lastHunger = hunger
                    lastThirst = thirst
                    lastStress = stress

                    SendNUIMessage({
                        action = 'updateStatus',
                        hunger = hunger,
                        thirst = thirst,
                        stress = stress,
                        oxygen = lastOxygen,
                        underwater = lastUnderwater,
                    })
                end
            end

            Wait(config.StatusUpdateInterval or 500)
        end
    end)

    -- Oxygen update thread (per-frame — native depletes in ~10s, 500ms is too choppy)
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        while true do
            if isFullyVisible() then
                local oxygen, underwater = getOxygenState()

                if oxygen ~= lastOxygen or underwater ~= lastUnderwater then
                    lastOxygen = oxygen
                    lastUnderwater = underwater

                    SendNUIMessage({
                        action = 'updateStatus',
                        oxygen = oxygen,
                        underwater = underwater,
                    })
                end
            end

            Wait(0)
        end
    end)

    -- VOIP update thread
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        while true do
            local detectedVoipResource = detectVoipResource()
            if detectedVoipResource ~= voipResource then
                voipResource = detectedVoipResource
                pushVoipDisplayConfig()
                lastVoipTalking = nil
                lastVoipRange = nil
                lastVoipConnected = nil
                lastRadioChannel = nil
                lastRadioTalking = nil
            end

            if voipResource and isFullyVisible() then
                local talking, range, connected, radioChannel, radioTalking = getVoipState()

                if talking ~= lastVoipTalking or range ~= lastVoipRange or connected ~= lastVoipConnected or radioChannel ~= lastRadioChannel or radioTalking ~= lastRadioTalking then
                    lastVoipTalking = talking
                    lastVoipRange = range
                    lastVoipConnected = connected
                    lastRadioChannel = radioChannel
                    lastRadioTalking = radioTalking

                    SendNUIMessage({
                        action = 'updateVoip',
                        talking = talking,
                        range = range,
                        connected = connected,
                        radioChannel = radioChannel,
                        radioTalking = radioTalking
                    })
                end
            end

            Wait(config.VoipUpdateInterval or 150)
        end
    end)

    -- Send initial config to NUI
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end
        Wait(1000)
        local standaloneVoipHudEnabled = isStandalonePmaVoiceHudEnabled()
        lastStandaloneVoipHudEnabled = standaloneVoipHudEnabled

        SendNUIMessage({
            action = 'updateStatusConfig',
            hungerThreshold = config.StatusIcons.hungerThreshold,
            thirstThreshold = config.StatusIcons.thirstThreshold,
            stressThreshold = config.StatusIcons.stressThreshold,
            oxygenThreshold = config.StatusIcons.oxygenThreshold,
            framework = config.framework or 'standalone',
            showVoip = config.StatusIcons.showVoip,
            standaloneVoipHudEnabled = standaloneVoipHudEnabled,
            colors = config.StatusIcons.colors,
            statusIconShape = config.StatusIcons.iconShape or 'hexagon',
            statusRingWidth = config.StatusIcons.ringWidth or 42,
            statusRingHeight = config.StatusIcons.ringHeight or 48,
            oxygenDisplayLocation = config.oxygenDisplayLocation or 'statusCluster',
        })
    end)
end

return Status
