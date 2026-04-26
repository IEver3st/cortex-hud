local config = lib.require("config.shared")

local cc = config.cruiseControl
local enabled = type(cc) == "table" and cc.enabled == true

local PlayerPedId = PlayerPedId
local GetVehiclePedIsIn = GetVehiclePedIsIn
local GetPedInVehicleSeat = GetPedInVehicleSeat
local GetVehicleType = GetVehicleType
local GetIsVehicleEngineRunning = GetIsVehicleEngineRunning
local GetEntitySpeed = GetEntitySpeed
local HasEntityCollidedWithAnything = HasEntityCollidedWithAnything
local IsControlPressed = IsControlPressed
local SetControlNormal = SetControlNormal
local Wait = Wait

local VEH_ACCELERATE_CONTROL = 71

local function SetVehicleSpeedLimiter(vehicle, speed)
    Citizen.InvokeNative(0xBAA045B4E42F3C06, vehicle, speed)
end

local Cruise = {}
Cruise.__index = Cruise

local DISALLOWED_TYPES = {
    heli = true,
    plane = true,
    boat = true,
    train = true,
    submarine = true,
    blimp = true,
    trailer = true,
}

--- @return number min speed in m/s
function Cruise:minSpeedMs()
    local minDisp = (cc and type(cc.minSpeed) == "number" and cc.minSpeed) or 15
    local unit = string.lower(config.speedUnit or "mph")
    if unit == "kph" then
        return minDisp / 3.6
    end
    return minDisp / 2.236936
end

--- @return number display speed (int) from m/s
function Cruise:speedToDisplay(ms)
    local unit = string.lower(config.speedUnit or "mph")
    if unit == "kph" then
        return math.floor(ms * 3.6 + 0.5)
    end
    return math.floor(ms * 2.236936 + 0.5)
end

--- @return number slowdown tolerance in m/s before cruise cancels
function Cruise:slowdownToleranceMs()
    local toleranceDisp = (cc and type(cc.slowdownTolerance) == "number" and cc.slowdownTolerance) or 2
    local unit = string.lower(config.speedUnit or "mph")
    if unit == "kph" then
        return toleranceDisp / 3.6
    end
    return toleranceDisp / 2.236936
end

function Cruise:canUseVehicle(ped, vehicle)
    if vehicle == 0 or not ped or ped == 0 then
        return false
    end
    if GetPedInVehicleSeat(vehicle, -1) ~= ped then
        return false
    end
    local vtype = GetVehicleType(vehicle)
    if DISALLOWED_TYPES[vtype] then
        return false
    end
    return GetIsVehicleEngineRunning(vehicle) == true
end

function Cruise:getNuiState()
    if not enabled then
        return false, 0
    end
    if not self.active then
        return false, 0
    end
    return true, self:speedToDisplay(self.targetMs)
end

function Cruise:clear()
    self:resetSpeedLimit()
    if not self.active then
        return
    end
    self.active = false
    self.targetMs = 0.0
end

function Cruise:resetSpeedLimit()
    if self.limitedVehicle and self.limitedVehicle ~= 0 then
        SetVehicleSpeedLimiter(self.limitedVehicle, 0.0)
        self.limitedVehicle = 0
    end
end

function Cruise:applySpeedLimit(vehicle)
    if vehicle == 0 then
        self:resetSpeedLimit()
        return
    end

    if self.limitedVehicle and self.limitedVehicle ~= 0 and self.limitedVehicle ~= vehicle then
        SetVehicleSpeedLimiter(self.limitedVehicle, 0.0)
    end

    SetVehicleSpeedLimiter(vehicle, self.targetMs)
    self.limitedVehicle = vehicle
end

function Cruise:shouldAutoThrottle()
    if not cc then
        return true
    end
    return cc.autoThrottle ~= false
end

function Cruise:tryToggle()
    if not enabled then
        return
    end

    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    if self.active then
        self:clear()
        if lib and lib.notify then
            lib.notify({
                title = "Cruise",
                description = "Cruise off",
                type = "inform",
                duration = 1500,
            })
        end
        return
    end

    if not self:canUseVehicle(ped, vehicle) then
        return
    end

    local spd = GetEntitySpeed(vehicle)
    if spd < self:minSpeedMs() then
        if lib and lib.notify then
            lib.notify({
                title = "Cruise",
                description = "Speed too low for cruise",
                type = "error",
                duration = 2000,
            })
        end
        return
    end

    self.active = true
    self.targetMs = spd
    self:applySpeedLimit(vehicle)
    if lib and lib.notify then
        lib.notify({
            title = "Cruise",
            description = ("Set to %d %s"):format(self:speedToDisplay(self.targetMs), string.upper(config.speedUnit or "mph")),
            type = "success",
            duration = 2000,
        })
    end
end

function Cruise:startApplyLoop()
    if self.applyRunning then
        return
    end
    self.applyRunning = true

    CreateThread(function()
        while enabled do
            Wait(0)
            if not self.active then
                goto continue
            end

            local ped = PlayerPedId()
            local vehicle = GetVehiclePedIsIn(ped, false)
            if not self:canUseVehicle(ped, vehicle) then
                self:clear()
                goto continue
            end

            -- brake / handbrake cancel
            if IsControlPressed(0, 72) or IsControlPressed(0, 76) then
                self:clear()
                goto continue
            end

            local spd = GetEntitySpeed(vehicle)
            if spd < self:minSpeedMs() - 0.5 then
                self:clear()
                goto continue
            end

            if HasEntityCollidedWithAnything(vehicle) then
                self:clear()
                goto continue
            end

            if spd < self.targetMs - self:slowdownToleranceMs() then
                self:clear()
                goto continue
            end

            if self:shouldAutoThrottle() and spd < self.targetMs then
                SetControlNormal(0, VEH_ACCELERATE_CONTROL, 1.0)
            end

            self:applySpeedLimit(vehicle)

            ::continue::
        end
        self:resetSpeedLimit()
        self.applyRunning = false
    end)
end

function Cruise.new()
    if not enabled then
        return setmetatable({
            active = false,
            targetMs = 0.0,
            limitedVehicle = 0,
            applyRunning = false,
        }, Cruise)
    end

    local self = setmetatable({
        active = false,
        targetMs = 0.0,
        limitedVehicle = 0,
        applyRunning = false,
    }, Cruise)

    local cmd = (cc and cc.command) or "es_hud_cruise"
    RegisterCommand(cmd, function()
        self:tryToggle()
    end, false)

    local key = (cc and cc.key) or "Y"
    RegisterKeyMapping(cmd, "Toggle cruise control", "keyboard", key)

    self:startApplyLoop()
    return self
end

function Cruise:isCruiseOn()
    return enabled and self.active == true
end

return Cruise
