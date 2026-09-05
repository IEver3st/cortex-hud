local VehiclePool = {}

local GetGamePool = GetGamePool
local GetGameTimer = GetGameTimer
local GetEntityCoords = GetEntityCoords

-- Door and access prompts scan on the same cadence. Reuse the native pool
-- snapshot when both consumers run in the same short scheduling window.
local CACHE_WINDOW_MS = 50
local cachedAt = nil
local cachedVehicles = {}
local cachedCoords = {}

function VehiclePool.get()
    local now = GetGameTimer()
    local expired = cachedAt == nil
        or now < cachedAt
        or (now - cachedAt) >= CACHE_WINDOW_MS

    if expired then
        local vehicles = GetGamePool('CVehicle')
        cachedVehicles = type(vehicles) == 'table' and vehicles or {}
        cachedCoords = {}
        cachedAt = now
    end

    return cachedVehicles
end

function VehiclePool.getCoords(vehicle)
    local coords = cachedCoords[vehicle]
    if coords == nil then
        coords = GetEntityCoords(vehicle)
        cachedCoords[vehicle] = coords
    end

    return coords
end

return VehiclePool
