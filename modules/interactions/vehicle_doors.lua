local VehicleDoorInteractions = {}

local INTERACTION_ID = 'vehicle-door'
local DOOR_OPEN_THRESHOLD = 0.1

local doorDefinitions = {
    {
        door = 0,
        bone = 'door_dside_f',
        centerBone = 'handle_dside_f',
        offsetKey = 'frontDoor',
        defaultOffset = { y = 0.18, z = -0.12 },
        fallbackOffset = { y = -0.55 },
    },
    {
        door = 1,
        bone = 'door_pside_f',
        centerBone = 'handle_pside_f',
        offsetKey = 'frontDoor',
        defaultOffset = { y = 0.18, z = -0.12 },
        fallbackOffset = { y = -0.55 },
    },
    {
        door = 2,
        bone = 'door_dside_r',
        centerBone = 'handle_dside_r',
        offsetKey = 'rearDoor',
        defaultOffset = { y = 0.15, z = -0.12 },
        fallbackOffset = { y = -0.48 },
    },
    {
        door = 3,
        bone = 'door_pside_r',
        centerBone = 'handle_pside_r',
        offsetKey = 'rearDoor',
        defaultOffset = { y = 0.15, z = -0.12 },
        fallbackOffset = { y = -0.48 },
    },
    {
        door = 4,
        bone = 'bonnet',
        option = 'includeHood',
        offsetKey = 'hood',
        defaultOffset = { y = 0.68, z = 0.04 },
    },
    {
        door = 5,
        bone = 'boot',
        option = 'includeTrunk',
        offsetKey = 'trunk',
        defaultOffset = { y = -0.72, z = 0.04 },
    },
}

local activeConfig = nil
local rootConfig = nil
local selectedDoor = nil
local publishedTarget = nil
local started = false
local stopping = false
local actionLocked = false
local ownerResource = nil

local function distanceSquared(left, right)
    local x = left.x - right.x
    local y = left.y - right.y
    local z = left.z - right.z
    return (x * x) + (y * y) + (z * z)
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

local function getBoneCoords(vehicle, boneName)
    local boneIndex = GetEntityBoneIndexByName(vehicle, boneName)
    if boneIndex == -1 then return nil end
    return GetEntityBonePosition_2(vehicle, boneIndex), boneIndex
end

local function normalizeOffset(value, fallback)
    value = type(value) == 'table' and value or fallback or {}

    return {
        x = tonumber(value.x) or 0.0,
        y = tonumber(value.y) or 0.0,
        z = tonumber(value.z) or 0.0,
    }
end

local function offsetBoneCoords(vehicle, coords, offset)
    if offset.x == 0.0 and offset.y == 0.0 and offset.z == 0.0 then return coords end

    local entityCoords = GetEntityCoords(vehicle)
    local offsetCoords = GetOffsetFromEntityInWorldCoords(
        vehicle,
        offset.x,
        offset.y,
        offset.z
    )
    if not entityCoords or not offsetCoords then return coords end

    return {
        x = coords.x + offsetCoords.x - entityCoords.x,
        y = coords.y + offsetCoords.y - entityCoords.y,
        z = coords.z + offsetCoords.z - entityCoords.z,
    }
end

local function getPanelAnchor(vehicle, definition)
    local configuredOffsets = type(activeConfig.panelOffsets) == 'table'
        and activeConfig.panelOffsets
        or {}
    local configuredOffset = configuredOffsets[definition.offsetKey]
    local bone = definition.bone
    local offset = normalizeOffset(configuredOffset, definition.defaultOffset)
    local coords = nil

    if definition.centerBone then
        coords = getBoneCoords(vehicle, definition.centerBone)

        if coords then
            bone = definition.centerBone
        else
            coords = getBoneCoords(vehicle, definition.bone)
            offset = normalizeOffset(definition.fallbackOffset)
        end
    else
        coords = getBoneCoords(vehicle, definition.bone)
    end

    if not coords then return nil end

    offset.z = offset.z + (tonumber(activeConfig.anchorOffsetZ) or 0.0)

    return {
        bone = bone,
        offset = offset,
        coords = offsetBoneCoords(vehicle, coords, offset),
    }
end

local function isPanelUsable(vehicle, definition)
    return DoesEntityExist(vehicle)
        and GetEntityType(vehicle) == 2
        and GetIsDoorValid(vehicle, definition.door)
        and not IsVehicleDoorDamaged(vehicle, definition.door)
        and GetVehicleDoorLockStatus(vehicle) <= 1
        and GetEntitySpeed(vehicle) <= (tonumber(activeConfig.maxVehicleSpeed) or 1.0)
end

local function isOnScreen(coords)
    local visible, x, y = World3dToScreen2d(coords.x, coords.y, coords.z)
    return visible and x >= 0.0 and x <= 1.0 and y >= 0.0 and y <= 1.0
end

local function buildCandidate(ped, pedCoords, vehicle, definition)
    if definition.option and activeConfig[definition.option] ~= true then return nil end
    if not isPanelUsable(vehicle, definition) then return nil end
    if not HasEntityClearLosToEntity(ped, vehicle, 17) then return nil end

    local anchor = getPanelAnchor(vehicle, definition)
    if not anchor or not isOnScreen(anchor.coords) then return nil end

    local distance = distanceSquared(pedCoords, anchor.coords)
    local maximum = tonumber(activeConfig.interactionDistance) or 2.0
    if distance > (maximum * maximum) then return nil end

    return {
        vehicle = vehicle,
        door = definition.door,
        bone = anchor.bone,
        offset = anchor.offset,
        coords = anchor.coords,
        distance = distance,
    }
end

local function findNearestDoor(ped)
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
            for doorIndex = 1, #doorDefinitions do
                local candidate = buildCandidate(ped, pedCoords, vehicle, doorDefinitions[doorIndex])

                if candidate then
                    if not nearest or candidate.distance < nearest.distance then
                        nearest = candidate
                    end

                    if selectedDoor
                        and candidate.vehicle == selectedDoor.vehicle
                        and candidate.door == selectedDoor.door
                    then
                        previous = candidate
                    end
                end
            end
        end
    end

    if previous and nearest then
        local switchBias = tonumber(activeConfig.switchBias) or 0.18
        if previous.distance <= nearest.distance + (switchBias * switchBias) then
            return previous
        end
    end

    return nearest
end

local function hidePrompt()
    selectedDoor = nil
    publishedTarget = nil
    lib.hideInteraction(INTERACTION_ID)
end

local function publishPrompt(candidate, forcedOpenState)
    if not candidate then
        if selectedDoor or publishedTarget then hidePrompt() end
        return
    end

    selectedDoor = candidate
    local isOpen = forcedOpenState
    if isOpen == nil then
        isOpen = GetVehicleDoorAngleRatio(candidate.vehicle, candidate.door) > DOOR_OPEN_THRESHOLD
    end

    local label = isOpen and activeConfig.closeLabel or activeConfig.openLabel
    local targetSignature = ('%d:%d:%s'):format(candidate.vehicle, candidate.door, label)
    if targetSignature == publishedTarget then return end

    local interaction = {
        id = INTERACTION_ID,
        owner = ownerResource,
        label = label,
        key = activeConfig.key,
        priority = activeConfig.priority,
        anchor = {
            type = 'entity-bone',
            entity = candidate.vehicle,
            bone = candidate.bone,
            -- Entity-local axes: X is side-to-side, Y is forward/back, Z is up.
            offset = candidate.offset,
            maxDistance = tonumber(activeConfig.interactionDistance) or 2.0,
        },
    }

    local ok = lib.showInteraction(interaction)

    if ok then
        publishedTarget = targetSignature
    else
        selectedDoor = nil
        publishedTarget = nil
    end
end

local function validateSelectedDoor(ped)
    local target = selectedDoor
    if not target or not canPlayerInteract(ped) then return nil end
    if not isPanelUsable(target.vehicle, { door = target.door }) then return nil end
    if not HasEntityClearLosToEntity(ped, target.vehicle, 17) then return nil end

    local coords = getBoneCoords(target.vehicle, target.bone)
    if coords then
        coords = offsetBoneCoords(target.vehicle, coords, target.offset)
    end
    if not coords or not isOnScreen(coords) then return nil end

    local maximum = tonumber(activeConfig.interactionDistance) or 2.0
    if distanceSquared(GetEntityCoords(ped), coords) > (maximum * maximum) then return nil end

    target.coords = coords
    return target
end

local function applyVehicleDoor(vehicle, door, shouldOpen)
    if type(vehicle) ~= 'number' or type(door) ~= 'number' or type(shouldOpen) ~= 'boolean' then return end
    if not DoesEntityExist(vehicle) or GetEntityType(vehicle) ~= 2 then return end
    if door < 0 or door > 5 or door % 1 ~= 0 then return end
    if not GetIsDoorValid(vehicle, door) then return end
    if IsVehicleDoorDamaged(vehicle, door) or GetVehicleDoorLockStatus(vehicle) > 1 then return end

    if shouldOpen then
        SetVehicleDoorOpen(vehicle, door, false, false)
    else
        SetVehicleDoorShut(vehicle, door, false)
    end
end

local function isDoorInteractionActive()
    if type(lib.isInteractionActive) == 'function' then
        return lib.isInteractionActive(INTERACTION_ID) == true
    end

    -- Compatibility with cortex-lib instances started before the convenience
    -- wrapper existed. The snapshot export is already required by the HUD.
    local items = exports['cortex-lib']:getInteractions()
    if type(items) ~= 'table' then return false end

    local owner = GetCurrentResourceName()
    local expectedKey = tostring(activeConfig.key or ''):upper()

    for index = 1, #items do
        local item = items[index]

        if type(item) == 'table'
            and type(item.key) == 'string'
            and item.key:upper() == expectedKey
            and item.active ~= false
        then
            return item.owner == owner and item.id == INTERACTION_ID
        end
    end

    return false
end

local function handleAction()
    if actionLocked or stopping or not isFeatureEnabled() then return end
    if not isDoorInteractionActive() then return end

    local ped = PlayerPedId()
    local target = validateSelectedDoor(ped)
    if not target then
        hidePrompt()
        return
    end

    actionLocked = true
    local shouldOpen = GetVehicleDoorAngleRatio(target.vehicle, target.door) <= DOOR_OPEN_THRESHOLD

    if NetworkGetEntityIsNetworked(target.vehicle) then
        local networkId = NetworkGetNetworkIdFromEntity(target.vehicle)
        if type(networkId) == 'number' and networkId > 0 then
            TriggerServerEvent('cortex-hud:server:vehicleDoor', networkId, target.door, shouldOpen)
        end
    else
        applyVehicleDoor(target.vehicle, target.door, shouldOpen)
    end

    publishPrompt(target, shouldOpen)

    SetTimeout(tonumber(activeConfig.panelCooldown) or 280, function()
        actionLocked = false
    end)
end

function VehicleDoorInteractions.start(config)
    if started then return end

    rootConfig = config
    activeConfig = config and config.VehicleDoorInteractions or nil
    if not activeConfig or activeConfig.enabled ~= true then return end

    ownerResource = GetCurrentResourceName()
    started = true

    RegisterCommand('+' .. activeConfig.command, handleAction, false)
    RegisterCommand('-' .. activeConfig.command, function() end, false)
    RegisterKeyMapping(
        '+' .. activeConfig.command,
        activeConfig.description,
        'keyboard',
        activeConfig.key
    )

    RegisterNetEvent('cortex-hud:client:vehicleDoor', function(networkId, door, shouldOpen)
        if type(networkId) ~= 'number' or type(door) ~= 'number' or type(shouldOpen) ~= 'boolean' then return end
        if networkId < 1 or networkId % 1 ~= 0 then return end
        if door < 0 or door > 5 or door % 1 ~= 0 then return end

        local vehicle = NetworkGetEntityFromNetworkId(networkId)
        applyVehicleDoor(vehicle, door, shouldOpen)
    end)

    CreateThread(function()
        while not stopping do
            if not isFeatureEnabled() then
                if selectedDoor or publishedTarget then hidePrompt() end
                Wait(500)
            else
                local ped = PlayerPedId()
                local candidate = canPlayerInteract(ped) and findNearestDoor(ped) or nil
                publishPrompt(candidate)
                Wait(candidate
                    and (tonumber(activeConfig.activeScanInterval) or 100)
                    or (tonumber(activeConfig.idleScanInterval) or 450))
            end
        end
    end)

    AddEventHandler('onClientResourceStart', function(resourceName)
        if resourceName ~= 'cortex-lib' or not selectedDoor then return end

        publishedTarget = nil
        publishPrompt(selectedDoor)
    end)

    AddEventHandler('onClientResourceStop', function(resourceName)
        if resourceName ~= GetCurrentResourceName() then return end
        stopping = true
        lib.hideInteraction(INTERACTION_ID)
    end)
end

return VehicleDoorInteractions
