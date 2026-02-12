local Status = {}

local SendNUIMessage = SendNUIMessage
local PlayerPedId = PlayerPedId
local GetEntitySubmergedLevel = GetEntitySubmergedLevel
local GetPedMaxOxygenTime = GetPedMaxOxygenTime
local GetPedOxygenTime = GetPedOxygenTime
local Wait = Wait
local math_floor = math.floor
local math_max = math.max
local math_min = math.min

local Bridge = lib.require("modules.bridge.client")

local lastHunger = -1
local lastThirst = -1
local lastStress = -1
local lastOxygen = -1

local lastVoipTalking = nil
local lastVoipRange = nil
local lastVoipConnected = nil
local lastRadioChannel = nil
local lastRadioTalking = nil

local voipResource = nil

local config = lib.require("config.shared")

local function detectVoipResource()
    local configured = config.voipResource
    if configured and configured ~= 'auto' then
        if GetResourceState(configured) == 'started' then
            return configured
        end
        return nil
    end

    local voipResources = { 'pma-voice', 'saltychat', 'mumble-voip', 'tokovoip_script' }
    for _, res in ipairs(voipResources) do
        if GetResourceState(res) == 'started' then
            return res
        end
    end
    return nil
end

local function getVoipState()
    if not voipResource then
        return false, 'normal', false, 0, false
    end

    local talking = false
    local range = 'normal'
    local connected = false
    local radioChannel = 0
    local radioTalking = false

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

        -- Get proximity/range from statebag
        ok, result = pcall(function()
            return LocalPlayer.state['proximity']
        end)
        if ok and result then
            if type(result) == 'table' then
                local index = result.index
                if index ~= nil then
                    -- pma-voice uses 1-indexed: 1=whisper, 2=normal, 3=shout
                    if index <= 1 then
                        range = 'whisper'
                    elseif index >= 3 then
                        range = 'shout'
                    else
                        range = 'normal'
                    end
                end
            elseif type(result) == 'number' then
                if result <= 5.0 then
                    range = 'whisper'
                elseif result <= 15.0 then
                    range = 'normal'
                else
                    range = 'shout'
                end
            end
        end

        -- Radio state
        ok, result = pcall(function() return LocalPlayer.state.radioChannel end)
        if ok and type(result) == 'number' then
            radioChannel = result
        end

        -- Radio talking check
        -- pma-voice doesn't always sync talkingOnRadio to local player state bag, so we check Mumble
        -- But NetworkIsPlayerTalkingOnRadio() is reliable if pma-voice uses it
        ok, result = pcall(NetworkIsPlayerTalkingOnRadio)
        if ok and result == true then
            radioTalking = true
        else
             -- Fallback to state bag if native fails or returns false (some versions use state only)
             ok, result = pcall(function() return LocalPlayer.state.radioActive end) -- Some pma-voice versions use radioActive event, not state.
             -- Common pma-voice state for talking on radio is actually not easily exposed to self via statebag without editing pma-voice.
             -- However, usually if you are talking on radio, MumbleIsPlayerTalking is true AND you are pressing the radio key.
             -- But we can't detect key presses reliably here.
             -- Let's trust NetworkIsPlayerTalkingOnRadio first.
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

local function getOxygenLevel()
    local ped = PlayerPedId()
    local submerged = GetEntitySubmergedLevel(ped)

    if submerged > 0.5 then
        local currentOxygen = GetPlayerUnderwaterTimeRemaining(PlayerId())
        local percent = (currentOxygen / 10.0) * 100
        return math_floor(math_max(0, math_min(100, percent)))
    end

    return 100
end

function Status.start(config, isFullyVisible)
    voipResource = detectVoipResource()

    -- Status update thread (hunger, thirst, stress, oxygen)
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        while true do
            if isFullyVisible() then
                local hunger, thirst, stress = getPlayerStatus()
                local oxygen = getOxygenLevel()

                if hunger ~= lastHunger or thirst ~= lastThirst or stress ~= lastStress or oxygen ~= lastOxygen then
                    lastHunger = hunger
                    lastThirst = thirst
                    lastStress = stress
                    lastOxygen = oxygen

                    SendNUIMessage({
                        action = 'updateStatus',
                        hunger = hunger,
                        thirst = thirst,
                        stress = stress,
                        oxygen = oxygen
                    })
                end
            end

            Wait(config.StatusUpdateInterval or 500)
        end
    end)

    -- VOIP update thread
    CreateThread(function()
        while not Bridge.isPlayerLoaded() do
            Wait(200)
        end

        if not voipResource then
            return
        end

        while true do
            if isFullyVisible() then
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

        SendNUIMessage({
            action = 'updateStatusConfig',
            hungerThreshold = config.StatusIcons.hungerThreshold,
            thirstThreshold = config.StatusIcons.thirstThreshold,
            stressThreshold = config.StatusIcons.stressThreshold,
            oxygenThreshold = config.StatusIcons.oxygenThreshold,
            showVoip = config.StatusIcons.showVoip,
            colors = config.StatusIcons.colors
        })
    end)
end

return Status
