local VehicleAccessInteractions = {}

-- Progress lives in cortex-lib's notify module, so load that module before
-- capturing the progress helper.
local _ = lib.notify
local progress = lib.progress

local SMASH_INTERACTION_ID = 'vehicle-smash-window'
local CLONE_INTERACTION_ID = 'vehicle-clone-key'

local windowDefinitions = {
    { door = 0, window = 0, bone = 'handle_dside_f' },
    { door = 1, window = 1, bone = 'handle_pside_f' },
    { door = 2, window = 2, bone = 'handle_dside_r', rear = true },
    { door = 3, window = 3, bone = 'handle_pside_r', rear = true },
}

local activeConfig = nil
local rootConfig = nil
local ownerResource = nil
local selectedWindow = nil
local published = {}
local started = false
local stopping = false
local actionLocked = false
local pendingCloneNetworkId = nil
local activeCloneNetworkId = nil
local activeCloneQte = nil
local clonePresentation = nil
local clonedNetworkIds = {}

local function distanceSquared(left, right)
    local x = left.x - right.x
    local y = left.y - right.y
    local z = left.z - right.z
    return (x * x) + (y * y) + (z * z)
end

local function notify(kind, description)
    lib.notify({
        title = 'Vehicle Access',
        description = description,
        type = kind,
        duration = 2600,
    })
end

local function isFeatureEnabled()
    if not activeConfig or activeConfig.enabled ~= true then return false end
    if activeConfig.requireGta6Hud ~= false and rootConfig.gta6HudEnabled ~= true then return false end
    return true
end

local function canPlayerInteract(ped)
    return ped ~= 0
        and DoesEntityExist(ped)
        and not IsEntityDead(ped)
        and not IsPedRagdoll(ped)
        and not IsPedInAnyVehicle(ped, false)
        and not IsPedUsingAnyScenario(ped)
end

local function normalizeOffset(value)
    value = type(value) == 'table' and value or {}
    return {
        x = tonumber(value.x) or 0.0,
        y = tonumber(value.y) or 0.0,
        z = tonumber(value.z) or 0.0,
    }
end

local function addOffsets(left, right)
    left = normalizeOffset(left)
    right = normalizeOffset(right)
    return {
        x = left.x + right.x,
        y = left.y + right.y,
        z = left.z + right.z,
    }
end

local function getBoneCoords(vehicle, boneName)
    local boneIndex = GetEntityBoneIndexByName(vehicle, boneName)
    if boneIndex == -1 then return nil end
    return GetEntityBonePosition_2(vehicle, boneIndex)
end

local function isOnScreen(coords)
    local visible, x, y = World3dToScreen2d(coords.x, coords.y, coords.z)
    return visible and x >= 0.0 and x <= 1.0 and y >= 0.0 and y <= 1.0
end

local function isLocked(vehicle)
    return GetVehicleDoorLockStatus(vehicle) > 1
end

local function isAccessPointUsable(vehicle, definition)
    if not DoesEntityExist(vehicle) or GetEntityType(vehicle) ~= 2 then return false end
    if definition.rear and activeConfig.includeRearWindows == false then return false end
    if not GetIsDoorValid(vehicle, definition.door) then return false end
    if GetEntitySpeed(vehicle) > (tonumber(activeConfig.maxVehicleSpeed) or 1.0) then return false end
    if activeConfig.onlyLocked ~= false and not isLocked(vehicle) then return false end
    return true
end

local function buildCandidate(ped, pedCoords, vehicle, definition)
    if not isAccessPointUsable(vehicle, definition) then return nil end
    if not HasEntityClearLosToEntity(ped, vehicle, 17) then return nil end

    local coords = getBoneCoords(vehicle, definition.bone)
    if not coords or not isOnScreen(coords) then return nil end

    local distance = distanceSquared(pedCoords, coords)
    local maximum = tonumber(activeConfig.interactionDistance) or 2.0
    if distance > (maximum * maximum) then return nil end

    return {
        vehicle = vehicle,
        door = definition.door,
        window = definition.window,
        bone = definition.bone,
        rear = definition.rear == true,
        coords = coords,
        distance = distance,
    }
end

local function findNearestWindow(ped)
    local pedCoords = GetEntityCoords(ped)
    local scanRadius = tonumber(activeConfig.scanRadius) or 6.0
    local scanRadiusSquared = scanRadius * scanRadius
    local vehicles = GetGamePool('CVehicle')
    local nearest = nil
    local previous = nil

    for vehicleIndex = 1, #vehicles do
        local vehicle = vehicles[vehicleIndex]
        if DoesEntityExist(vehicle)
            and distanceSquared(pedCoords, GetEntityCoords(vehicle)) <= scanRadiusSquared
        then
            for windowIndex = 1, #windowDefinitions do
                local candidate = buildCandidate(ped, pedCoords, vehicle, windowDefinitions[windowIndex])
                if candidate then
                    if not nearest or candidate.distance < nearest.distance then nearest = candidate end
                    if selectedWindow
                        and candidate.vehicle == selectedWindow.vehicle
                        and candidate.window == selectedWindow.window
                    then
                        previous = candidate
                    end
                end
            end
        end
    end

    if previous and nearest then
        local switchBias = tonumber(activeConfig.switchBias) or 0.18
        if previous.distance <= nearest.distance + (switchBias * switchBias) then return previous end
    end

    return nearest
end

local function clearPrompt(id)
    published[id] = nil
    lib.hideInteraction(id)
end

local function hidePrompts()
    selectedWindow = nil
    if published[SMASH_INTERACTION_ID] then clearPrompt(SMASH_INTERACTION_ID) end
    if published[CLONE_INTERACTION_ID] then clearPrompt(CLONE_INTERACTION_ID) end
end

local function publishAction(id, actionConfig, candidate, baseOffset)
    if not actionConfig or actionConfig.enabled ~= true then
        if published[id] then clearPrompt(id) end
        return
    end

    local signature = ('%d:%d:%s'):format(candidate.vehicle, candidate.window, actionConfig.label)
    if published[id] == signature then return end

    local interaction = {
        id = id,
        owner = ownerResource,
        label = actionConfig.label,
        key = actionConfig.key,
        priority = actionConfig.priority,
        anchor = {
            type = 'entity-bone',
            entity = candidate.vehicle,
            bone = candidate.bone,
            offset = addOffsets(baseOffset, actionConfig.panelOffset),
            maxDistance = tonumber(activeConfig.interactionDistance) or 2.0,
        },
    }

    local ok = lib.showInteraction(interaction)
    if ok then
        published[id] = signature
    end
end

local function publishPrompts(candidate)
    if not candidate then
        if selectedWindow or next(published) then hidePrompts() end
        return
    end

    selectedWindow = candidate
    local baseOffset = normalizeOffset(activeConfig.panelOffset)
    local networkId = NetworkGetEntityIsNetworked(candidate.vehicle)
        and NetworkGetNetworkIdFromEntity(candidate.vehicle)
        or 0

    local canClone = networkId > 0 and not clonedNetworkIds[networkId]
    local canSmash = IsVehicleWindowIntact(candidate.vehicle, candidate.window)

    if canClone then
        publishAction(CLONE_INTERACTION_ID, activeConfig.cloneKey, candidate, baseOffset)
    elseif published[CLONE_INTERACTION_ID] then
        clearPrompt(CLONE_INTERACTION_ID)
    end

    if canSmash then
        publishAction(SMASH_INTERACTION_ID, activeConfig.smash, candidate, baseOffset)
    elseif published[SMASH_INTERACTION_ID] then
        clearPrompt(SMASH_INTERACTION_ID)
    end
end

local function validateSelectedWindow(ped, requireIntact)
    local target = selectedWindow
    if not target or not canPlayerInteract(ped) then return nil end
    if not isAccessPointUsable(target.vehicle, { door = target.door, rear = target.rear }) then return nil end
    if requireIntact and not IsVehicleWindowIntact(target.vehicle, target.window) then return nil end
    if not HasEntityClearLosToEntity(ped, target.vehicle, 17) then return nil end

    local coords = getBoneCoords(target.vehicle, target.bone)
    if not coords or not isOnScreen(coords) then return nil end
    local maximum = tonumber(activeConfig.interactionDistance) or 2.0
    if distanceSquared(GetEntityCoords(ped), coords) > (maximum * maximum) then return nil end

    target.coords = coords
    return target
end

local function isInteractionActive(id)
    if type(lib.isInteractionActive) == 'function' then
        return lib.isInteractionActive(id) == true
    end

    local items = exports['cortex-lib']:getInteractions()
    if type(items) ~= 'table' then return false end
    for index = 1, #items do
        local item = items[index]
        if type(item) == 'table' and item.owner == ownerResource and item.id == id then
            return item.active == true
        end
    end
    return false
end

local function networkIdFor(vehicle)
    if not NetworkGetEntityIsNetworked(vehicle) then return nil end
    local networkId = NetworkGetNetworkIdFromEntity(vehicle)
    if type(networkId) ~= 'number' or networkId < 1 then return nil end
    return networkId
end

local function boundedNumber(value, fallback, minimum, maximum)
    value = tonumber(value)
    if not value or value ~= value or value == math.huge or value == -math.huge then value = fallback end
    return math.max(minimum, math.min(maximum, value))
end

local function normalizeCloneChallenge(value)
    value = type(value) == 'table' and value or {}
    return {
        rounds = math.floor(boundedNumber(value.rounds, 1, 1, 4)),
        roundDuration = math.floor(boundedNumber(value.roundDuration, 980, 650, 1800)),
        targetPhase = boundedNumber(value.targetPhase, 0.74, 0.45, 0.88),
        hitWindow = boundedNumber(value.hitWindow, 0.14, 0.06, 0.24),
        introDuration = math.floor(boundedNumber(value.introDuration, 320, 150, 900)),
        interRoundDelay = math.floor(boundedNumber(value.interRoundDelay, 240, 100, 650)),
        completionDelay = math.floor(boundedNumber(value.completionDelay, 150, 50, 450)),
    }
end

local function requestAnimationDictionary(dictionary, timeout)
    if type(dictionary) ~= 'string' or dictionary == '' then return false end
    RequestAnimDict(dictionary)
    local deadline = GetGameTimer() + (timeout or 2200)
    while not HasAnimDictLoaded(dictionary) and GetGameTimer() < deadline do Wait(0) end
    return HasAnimDictLoaded(dictionary)
end

local function requestModel(model, timeout)
    local hash = type(model) == 'number' and model or joaat(model)
    if not IsModelInCdimage(hash) or not IsModelValid(hash) then return nil end
    RequestModel(hash)
    local deadline = GetGameTimer() + (timeout or 2200)
    while not HasModelLoaded(hash) and GetGameTimer() < deadline do Wait(0) end
    return HasModelLoaded(hash) and hash or nil
end

local function stopClonePresentation(hideQte)
    local presentation = clonePresentation
    clonePresentation = nil

    if hideQte and activeCloneQte then
        SendNUIMessage({
            action = 'vehicleCloneQte:cancel',
            data = { nonce = activeCloneQte.nonce },
        })
    end

    if not presentation then return end
    if presentation.ped and DoesEntityExist(presentation.ped)
        and presentation.animation
        and IsEntityPlayingAnim(
            presentation.ped,
            presentation.animation.dict,
            presentation.animation.clip,
            3
        )
    then
        ClearPedSecondaryTask(presentation.ped)
    end

    if presentation.prop and DoesEntityExist(presentation.prop) then
        DeleteEntity(presentation.prop)
    end
end

local function startClonePresentation(ped)
    local actionConfig = activeConfig.cloneKey or {}
    local animation = type(actionConfig.animation) == 'table' and actionConfig.animation or {
        dict = 'cellphone@',
        clip = 'cellphone_text_read_base',
        flags = 49,
    }
    local propConfig = type(actionConfig.prop) == 'table' and actionConfig.prop or {}
    local dictionaryLoaded = requestAnimationDictionary(animation.dict, 2200)
    local model = requestModel(propConfig.model or 'prop_phone_ing', 2200)
    if stopping or not DoesEntityExist(ped) then
        if dictionaryLoaded then RemoveAnimDict(animation.dict) end
        if model then SetModelAsNoLongerNeeded(model) end
        return false
    end

    local prop = nil
    if model then
        local coords = GetEntityCoords(ped)
        prop = CreateObjectNoOffset(model, coords.x, coords.y, coords.z, false, false, false)
        SetModelAsNoLongerNeeded(model)
        if prop ~= 0 and DoesEntityExist(prop) then
            local pos = type(propConfig.pos) == 'table' and propConfig.pos or {}
            local rot = type(propConfig.rot) == 'table' and propConfig.rot or {}
            SetEntityCollision(prop, false, false)
            AttachEntityToEntity(
                prop,
                ped,
                GetPedBoneIndex(ped, math.floor(tonumber(propConfig.bone) or 28422)),
                tonumber(pos.x) or 0.0,
                tonumber(pos.y) or 0.0,
                tonumber(pos.z) or 0.0,
                tonumber(rot.x) or 0.0,
                tonumber(rot.y) or 0.0,
                tonumber(rot.z) or 0.0,
                true,
                true,
                false,
                true,
                1,
                true
            )
        else
            prop = nil
        end
    end

    if dictionaryLoaded then
        TaskPlayAnim(
            ped,
            animation.dict,
            animation.clip,
            4.0,
            -4.0,
            -1,
            math.floor(tonumber(animation.flags) or 49),
            1.0,
            false,
            false,
            false
        )
        RemoveAnimDict(animation.dict)
    end

    clonePresentation = {
        ped = ped,
        prop = prop,
        animation = animation,
    }
    return true
end

local function handleSmashAction()
    if actionLocked or stopping or not isFeatureEnabled() then return end
    if not isInteractionActive(SMASH_INTERACTION_ID) then return end

    local ped = PlayerPedId()
    local target = validateSelectedWindow(ped, true)
    local networkId = target and networkIdFor(target.vehicle) or nil
    if not target or not networkId then
        hidePrompts()
        return
    end

    actionLocked = true
    TaskTurnPedToFaceEntity(ped, target.vehicle, 450)
    Wait(350)

    local completed = progress({
        label = 'Smashing window...',
        duration = tonumber(activeConfig.smash.duration) or 1150,
        position = 'bottom',
        style = 'bar',
        canCancel = true,
        disable = { move = true, car = true, combat = true },
        anim = {
            dict = 'missheist_jewel',
            clip = 'smash_case',
            flag = 0,
        },
        prop = {
            model = 'prop_tool_hammer',
            bone = 28422,
            pos = vector3(0.0, 0.0, 0.0),
            rot = vector3(0.0, 0.0, 0.0),
        },
    })

    target = validateSelectedWindow(ped, true)
    if completed and target and networkIdFor(target.vehicle) == networkId then
        TriggerServerEvent('cortex-hud:server:smashVehicleWindow', networkId, target.window)
    end

    SetTimeout(tonumber(activeConfig.actionCooldown) or 1200, function()
        actionLocked = false
    end)
end

local cloneErrorMessages = {
    busy = 'A vehicle access action is already running.',
    invalid_vehicle = 'That vehicle is no longer available.',
    too_far = 'You moved too far away from the vehicle.',
    vehicle_moving = 'The vehicle is moving too quickly.',
    vehicle_unlocked = 'That vehicle is no longer locked.',
    provider_unavailable = 'No compatible vehicle key provider is available.',
    already_has_key = 'You already have access to this vehicle.',
    expired = 'The key cloning session expired.',
    failed = 'The vehicle key could not be cloned.',
}

local function handleCloneAction()
    if activeCloneQte then
        SendNUIMessage({
            action = 'vehicleCloneQte:press',
            data = { nonce = activeCloneQte.nonce },
        })
        return
    end

    if actionLocked or pendingCloneNetworkId or stopping or not isFeatureEnabled() then return end
    if not isInteractionActive(CLONE_INTERACTION_ID) then return end

    local ped = PlayerPedId()
    local target = validateSelectedWindow(ped, false)
    local networkId = target and networkIdFor(target.vehicle) or nil
    if not target or not networkId then
        hidePrompts()
        return
    end

    actionLocked = true
    pendingCloneNetworkId = networkId
    TriggerServerEvent('cortex-hud:server:beginVehicleKeyClone', networkId)

    SetTimeout(4000, function()
        if pendingCloneNetworkId ~= networkId then return end
        pendingCloneNetworkId = nil
        actionLocked = false
        notify('error', 'The key cloning request timed out.')
    end)
end

function VehicleAccessInteractions.start(config)
    if started then return end

    rootConfig = config
    activeConfig = config and config.VehicleAccessInteractions or nil
    if not activeConfig or activeConfig.enabled ~= true then return end

    ownerResource = GetCurrentResourceName()
    started = true

    if activeConfig.smash and activeConfig.smash.enabled == true then
        RegisterCommand('+' .. activeConfig.smash.command, handleSmashAction, false)
        RegisterCommand('-' .. activeConfig.smash.command, function() end, false)
        RegisterKeyMapping(
            '+' .. activeConfig.smash.command,
            activeConfig.smash.description,
            'keyboard',
            activeConfig.smash.key
        )
    end

    if activeConfig.cloneKey and activeConfig.cloneKey.enabled == true then
        RegisterCommand('+' .. activeConfig.cloneKey.command, handleCloneAction, false)
        RegisterCommand('-' .. activeConfig.cloneKey.command, function() end, false)
        RegisterKeyMapping(
            '+' .. activeConfig.cloneKey.command,
            activeConfig.cloneKey.description,
            'keyboard',
            activeConfig.cloneKey.key
        )
    end

    RegisterNUICallback('vehicleCloneQte:complete', function(data, callback)
        data = type(data) == 'table' and data or {}
        local nonce = data.nonce
        local session = activeCloneQte

        if type(nonce) ~= 'string' or nonce == '' or #nonce > 96
            or type(data.success) ~= 'boolean'
            or not session
            or session.nonce ~= nonce
        then
            callback({ ok = false, error = 'stale-challenge' })
            return
        end

        activeCloneQte = nil
        stopClonePresentation(false)

        if data.success ~= true then
            activeCloneNetworkId = nil
            actionLocked = false
            TriggerServerEvent('cortex-hud:server:cancelVehicleKeyClone', session.token)
            callback({ ok = true })
            return
        end

        local ped = PlayerPedId()
        local target = validateSelectedWindow(ped, false)
        if not target or networkIdFor(target.vehicle) ~= session.networkId then
            activeCloneNetworkId = nil
            actionLocked = false
            TriggerServerEvent('cortex-hud:server:cancelVehicleKeyClone', session.token)
            notify('error', cloneErrorMessages.too_far)
            callback({ ok = true })
            return
        end

        callback({ ok = true })
        TriggerServerEvent(
            'cortex-hud:server:finishVehicleKeyClone',
            session.token,
            session.networkId
        )
    end)

    RegisterNetEvent('cortex-hud:client:smashVehicleWindow', function(networkId, window)
        if type(networkId) ~= 'number' or networkId < 1 or networkId % 1 ~= 0 then return end
        if type(window) ~= 'number' or window < 0 or window > 3 or window % 1 ~= 0 then return end

        local vehicle = NetworkGetEntityFromNetworkId(networkId)
        if vehicle ~= 0 and DoesEntityExist(vehicle) and GetEntityType(vehicle) == 2 then
            SmashVehicleWindow(vehicle, window)
        end
    end)

    RegisterNetEvent('cortex-hud:client:vehicleKeyCloneRejected', function(networkId, reason)
        if networkId ~= pendingCloneNetworkId and networkId ~= activeCloneNetworkId then return end
        stopClonePresentation(true)
        activeCloneQte = nil
        pendingCloneNetworkId = nil
        activeCloneNetworkId = nil
        actionLocked = false
        notify('error', cloneErrorMessages[reason] or cloneErrorMessages.failed)
    end)

    RegisterNetEvent('cortex-hud:client:vehicleKeyCloneBegin', function(networkId, token, duration, challenge)
        if networkId ~= pendingCloneNetworkId
            or type(token) ~= 'string'
            or token == ''
            or #token > 128
        then
            return
        end
        pendingCloneNetworkId = nil
        activeCloneNetworkId = networkId

        local ped = PlayerPedId()
        local target = validateSelectedWindow(ped, false)
        if not target or networkIdFor(target.vehicle) ~= networkId then
            activeCloneNetworkId = nil
            actionLocked = false
            TriggerServerEvent('cortex-hud:server:cancelVehicleKeyClone', token)
            return
        end

        local normalized = normalizeCloneChallenge(challenge)
        local nonce = ('%x:%x:%x'):format(networkId, GetGameTimer(), math.random(0, 0x7fffffff))
        local timeout = math.floor(boundedNumber(duration, 6500, 1500, 30000))
        activeCloneQte = {
            nonce = nonce,
            networkId = networkId,
            token = token,
        }

        startClonePresentation(ped)
        target = validateSelectedWindow(ped, false)
        if stopping or not target or networkIdFor(target.vehicle) ~= networkId then
            stopClonePresentation(true)
            activeCloneQte = nil
            activeCloneNetworkId = nil
            actionLocked = false
            TriggerServerEvent('cortex-hud:server:cancelVehicleKeyClone', token)
            return
        end

        SendNUIMessage({
            action = 'vehicleCloneQte:start',
            data = {
                nonce = nonce,
                key = tostring(activeConfig.cloneKey.key or 'K'):sub(1, 12),
                rounds = normalized.rounds,
                roundDuration = normalized.roundDuration,
                targetPhase = normalized.targetPhase,
                hitWindow = normalized.hitWindow,
                introDuration = normalized.introDuration,
                interRoundDelay = normalized.interRoundDelay,
                completionDelay = normalized.completionDelay,
            },
        })

        local session = activeCloneQte
        SetTimeout(timeout + 2500, function()
            if activeCloneQte ~= session then return end
            stopClonePresentation(true)
            activeCloneQte = nil
            activeCloneNetworkId = nil
            actionLocked = false
            TriggerServerEvent('cortex-hud:server:cancelVehicleKeyClone', token)
            notify('error', 'The key-cloning sequence timed out.')
        end)
    end)

    RegisterNetEvent('cortex-hud:client:vehicleKeyCloned', function(networkId, provider)
        if type(networkId) ~= 'number' or networkId < 1 then return end
        stopClonePresentation(true)
        activeCloneQte = nil
        clonedNetworkIds[networkId] = true
        activeCloneNetworkId = nil
        actionLocked = false
        hidePrompts()
        notify('success', provider == 'standalone'
            and 'Vehicle access cloned for this vehicle.'
            or 'Vehicle key cloned successfully.')
    end)

    CreateThread(function()
        while not stopping do
            if not isFeatureEnabled() or actionLocked then
                if (not isFeatureEnabled()) and (selectedWindow or next(published)) then hidePrompts() end
                Wait(actionLocked and 100 or 500)
            else
                local ped = PlayerPedId()
                local candidate = canPlayerInteract(ped) and findNearestWindow(ped) or nil
                publishPrompts(candidate)
                Wait(candidate
                    and (tonumber(activeConfig.activeScanInterval) or 100)
                    or (tonumber(activeConfig.idleScanInterval) or 450))
            end
        end
    end)

    AddEventHandler('onClientResourceStart', function(resourceName)
        if resourceName ~= 'cortex-lib' or not selectedWindow then return end
        published = {}
        publishPrompts(selectedWindow)
    end)

    AddEventHandler('onClientResourceStop', function(resourceName)
        if resourceName ~= GetCurrentResourceName() then return end
        stopping = true
        stopClonePresentation(true)
        activeCloneQte = nil
        lib.hideInteraction(SMASH_INTERACTION_ID)
        lib.hideInteraction(CLONE_INTERACTION_ID)
    end)
end

return VehicleAccessInteractions
