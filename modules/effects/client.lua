local ScreenEffects = {}

local Nui = lib.require('modules.nui.client')
local SendNUIMessage = Nui.send

local DEFAULTS = {
    damage = {
        enabled = true,
        duration = 480,
        cooldown = 120,
        strength = 0.38,
    },
    stamina = {
        enabled = true,
        duration = 900,
        cooldown = 1200,
        strength = 0.24,
        threshold = 1,
        resetThreshold = 18,
    },
    kill = {
        enabled = true,
        duration = 820,
        cooldown = 180,
        strength = 0.72,
    },
}

local activeConfig = nil
local isHudVisible = function() return true end
local started = false
local staminaExhausted = false
local lastTriggeredAt = {}
local recentKillVictims = {}

local function clamp(value, minimum, maximum, fallback)
    value = tonumber(value)
    if value == nil or value ~= value or value == math.huge or value == -math.huge then
        return fallback
    end

    return math.max(minimum, math.min(maximum, value))
end

local function getEffectConfig(effectName)
    local defaults = DEFAULTS[effectName]
    if not defaults then return nil end

    local configured = activeConfig and activeConfig[effectName] or nil
    if type(configured) ~= 'table' then
        configured = {}
    end

    return {
        enabled = configured.enabled ~= false,
        duration = math.floor(clamp(configured.duration, 120, 5000, defaults.duration) + 0.5),
        cooldown = math.floor(clamp(configured.cooldown, 0, 5000, defaults.cooldown) + 0.5),
        strength = clamp(configured.strength, 0.05, 1.0, defaults.strength),
        threshold = clamp(configured.threshold, 0, 20, defaults.threshold),
        resetThreshold = clamp(configured.resetThreshold, 5, 100, defaults.resetThreshold),
    }
end

local function gameplayCanShowEffects()
    return activeConfig ~= nil
        and activeConfig.enabled ~= false
        and isHudVisible()
        and not IsPauseMenuActive()
        and IsScreenFadedIn()
end

function ScreenEffects.trigger(effectName, overrides)
    local effect = getEffectConfig(effectName)
    if not effect or not effect.enabled or not gameplayCanShowEffects() then
        return false
    end

    overrides = type(overrides) == 'table' and overrides or {}
    local now = GetGameTimer()
    local lastAt = lastTriggeredAt[effectName]
    if lastAt and (now - lastAt) < effect.cooldown then
        return false
    end

    lastTriggeredAt[effectName] = now
    SendNUIMessage({
        action = 'screenEffect:trigger',
        effect = effectName,
        duration = math.floor(clamp(overrides.duration, 120, 5000, effect.duration) + 0.5),
        strength = clamp(overrides.strength, 0.05, 1.0, effect.strength),
    })

    return true
end

function ScreenEffects.updateStamina(stamina)
    if not started then return end

    local effect = getEffectConfig('stamina')
    if not effect or not effect.enabled then
        staminaExhausted = false
        return
    end

    stamina = clamp(stamina, 0, 100, 100)
    local resetThreshold = math.max(effect.threshold + 1, effect.resetThreshold)

    if stamina <= effect.threshold then
        if not staminaExhausted then
            staminaExhausted = true
            ScreenEffects.trigger('stamina')
        end
    elseif stamina >= resetThreshold then
        staminaExhausted = false
    end
end

local function wasCausedByPlayer(culprit, playerPed)
    if culprit == playerPed then
        return true
    end

    return culprit ~= 0
        and DoesEntityExist(culprit)
        and IsEntityAVehicle(culprit)
        and GetPedInVehicleSeat(culprit, -1) == playerPed
end

local function markPedKill(victim)
    local now = GetGameTimer()
    local lastAt = recentKillVictims[victim]
    if lastAt and (now - lastAt) < 5000 then
        return false
    end

    for entity, killedAt in pairs(recentKillVictims) do
        if (now - killedAt) >= 5000 then
            recentKillVictims[entity] = nil
        end
    end

    recentKillVictims[victim] = now
    return true
end

local function handleEntityDamaged(victim, culprit)
    if not gameplayCanShowEffects() then return end

    local playerPed = PlayerPedId()
    if playerPed == 0 then return end

    if victim == playerPed then
        ScreenEffects.trigger('damage')
        return
    end

    if victim == 0
        or not DoesEntityExist(victim)
        or not IsEntityAPed(victim)
        or IsPedAPlayer(victim)
        or not wasCausedByPlayer(culprit, playerPed)
        or (not IsEntityDead(victim) and not IsPedFatallyInjured(victim))
        or not markPedKill(victim)
    then
        return
    end

    ScreenEffects.trigger('kill')
end

function ScreenEffects.start(config, hudVisibility)
    if started then return end

    activeConfig = type(config) == 'table' and type(config.ScreenEffects) == 'table'
        and config.ScreenEffects
        or {}
    isHudVisible = type(hudVisibility) == 'function' and hudVisibility or isHudVisible
    started = true

    AddEventHandler('entityDamaged', handleEntityDamaged)
end

exports('triggerScreenEffect', function(effectName, overrides)
    return ScreenEffects.trigger(effectName, overrides)
end)

return ScreenEffects
