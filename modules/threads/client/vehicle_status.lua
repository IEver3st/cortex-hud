local config = lib.require("config.shared")
local utility = lib.require("modules.utility.shared.vehicle")

local SendNUIMessage = SendNUIMessage
local PlayerPedId = PlayerPedId
local IsPedInAnyVehicle = IsPedInAnyVehicle
local GetVehiclePedIsIn = GetVehiclePedIsIn
local GetVehicleEngineHealth = GetVehicleEngineHealth
local GetIsVehicleEngineRunning = GetIsVehicleEngineRunning
local GetVehicleHighGear = GetVehicleHighGear
local GetVehicleCurrentGear = GetVehicleCurrentGear
local GetEntitySpeed = GetEntitySpeed
local GetVehicleCurrentRpm = GetVehicleCurrentRpm
local GetVehicleLightsState = GetVehicleLightsState
local GetVehicleType = GetVehicleType
local GetEntityCoords = GetEntityCoords
local GetEntityHeading = GetEntityHeading
local GetEntityHeightAboveGround = GetEntityHeightAboveGround
local GetLandingGearState = GetLandingGearState
local IsVehicleSearchlightOn = IsVehicleSearchlightOn
local GetHeliTailRotorHealth = GetHeliTailRotorHealth
local GetHeliMainRotorHealth = GetHeliMainRotorHealth
local Wait = Wait

local VehicleStatusThread = {}
VehicleStatusThread.__index = VehicleStatusThread
local Fuel = lib.require("modules.fuel.client")

function VehicleStatusThread.new(seatbeltLogic, stallLogic)
    local self = setmetatable({}, VehicleStatusThread)
    self.seatbelt = seatbeltLogic
    self.stall = stallLogic
    self.isRunning = false

    SetHudComponentPosition(6, 999999.0, 999999.0)
    SetHudComponentPosition(7, 999999.0, 999999.0)
    SetHudComponentPosition(8, 999999.0, 999999.0)
    SetHudComponentPosition(9, 999999.0, 999999.0)

    return self
end

function VehicleStatusThread:start()
    if self.isRunning then return end
    self.isRunning = true

    CreateThread(function()
        local ped = PlayerPedId()
        local convertRpmToPercentage = utility.convertRpmToPercentage
        local convertEngineHealthToPercentage = utility.convertEngineHealthToPercentage
        local vehicle = GetVehiclePedIsIn(ped, false)

        if self.stall then
            self.stall:startMonitoring(vehicle)
        end

        while IsPedInAnyVehicle(ped, false) do
            vehicle = GetVehiclePedIsIn(ped, false)
            local vehicleType = GetVehicleType(vehicle)
            local engineHealth = convertEngineHealthToPercentage(GetVehicleEngineHealth(vehicle))
            local rawFuelValue = Fuel.get(vehicle)
            local fuelValue = math.max(0, math.min(rawFuelValue or 0, 100))
            local engineState = GetIsVehicleEngineRunning(vehicle)
            local fuel = math.floor(fuelValue)
            Fuel.handleAlerts(vehicle, fuelValue)
            local retval, lightsOn, highbeamsOn = GetVehicleLightsState(vehicle)

            local isAircraft = vehicleType == "heli" or vehicleType == "plane"

            if isAircraft then
                local coords = GetEntityCoords(vehicle)
                local heading = GetEntityHeading(vehicle)
                local altitudeFeet = math.floor(coords.z * 3.28084)
                local altitudeAgl = math.floor(GetEntityHeightAboveGround(vehicle) * 3.28084)
                local speedMs = GetEntitySpeed(vehicle)
                local airspeedKnots = math.floor(speedMs * 1.94384)
                local lightsActive = IsVehicleSearchlightOn(vehicle) or lightsOn

                local isHelicopter = vehicleType == "heli"
                local tailRotorHealth = 100
                local mainRotorHealth = 100
                local hasFixedGear = false
                local gearDown = true

                if isHelicopter then
                    tailRotorHealth = GetHeliTailRotorHealth(vehicle)
                    mainRotorHealth = GetHeliMainRotorHealth(vehicle)
                    
                    local landingGearState = GetLandingGearState(vehicle)
                    if landingGearState == -1 then
                        hasFixedGear = true
                        gearDown = true
                    else
                        gearDown = landingGearState == 0 or landingGearState == 1
                    end
                else
                    local landingGearState = GetLandingGearState(vehicle)
                    gearDown = landingGearState == 0 or landingGearState == 1
                end

                SendNUIMessage({
                    action = "updateAircraft",
                    visible = true,
                    altitude = altitudeFeet,
                    altitudeAgl = altitudeAgl,
                    airspeed = airspeedKnots,
                    heading = math.floor(heading),
                    fuel = fuel,
                    engineHealth = engineHealth,
                    engines = { engineHealth },
                    lightsOn = lightsActive,
                    gearDown = gearDown,
                    hasFixedGear = hasFixedGear,
                    tailRotorHealth = tailRotorHealth,
                    mainRotorHealth = mainRotorHealth,
                    isHelicopter = isHelicopter,
                    isStalled = false
                })
            else
                local highGear = GetVehicleHighGear(vehicle)
                local currentGear = GetVehicleCurrentGear(vehicle)
                local newGears = highGear

                if highGear == 1 then
                    newGears = 0
                end

                local gearString = "N"
                if not engineState then
                    gearString = ""
                elseif currentGear == 0 then
                    gearString = "R"
                elseif currentGear == 1 and GetEntitySpeed(vehicle) < 0.1 and engineState then
                    gearString = "N"
                else
                    gearString = tostring(currentGear)
                end
                if highGear == 1 then
                    gearString = ""
                end

                local speed
                local normalizedSpeedUnit = string.lower(config.speedUnit)
                if normalizedSpeedUnit == "kph" then
                    speed = math.floor(GetEntitySpeed(vehicle) * 3.6)
                else
                    speed = math.floor(GetEntitySpeed(vehicle) * 2.236936)
                end

                local rpm
                if vehicleType == "bike" then
                    rpm = math.min(speed / 150, 1) * 100
                else
                    rpm = convertRpmToPercentage(GetVehicleCurrentRpm(vehicle))
                end

                local headlights = (lightsOn and highbeamsOn) and 100 or (lightsOn or highbeamsOn) and 50 or 0

                local isSeatbeltOn = self.seatbelt and self.seatbelt:isSeatbeltOn() or false

                local isStalled = self.stall and self.stall:isStalled() or false
                local isBroken = self.stall and self.stall:isBroken() or false
                local stallCount = self.stall and self.stall:getStallCount() or 0
                local enginePower = self.stall and self.stall:getPowerMultiplier() or 1.0

                SendNUIMessage({
                    action = "updateVehicle",
                    visible = true,
                    speedUnit = config.speedUnit,
                    speed = speed,
                    rpm = rpm,
                    engineHealth = engineHealth,
                    engineState = engineState,
                    gears = newGears,
                    currentGear = gearString,
                    fuel = fuel,
                    headlights = headlights,
                    belt = isSeatbeltOn,
                    stalled = isStalled,
                    broken = isBroken,
                    stallCount = stallCount,
                    enginePower = math.floor(enginePower * 100)
                })
            end

            Wait(100)
        end

        if self.seatbelt then
            self.seatbelt:toggle(false)
        end

        if self.stall then
            self.stall:stopMonitoring()
        end

        SendNUIMessage({
            action = "updateVehicle",
            visible = false
        })

        SendNUIMessage({
            action = "updateAircraft",
            visible = false
        })

        self.isRunning = false
    end)
end

function VehicleStatusThread:isActive()
    return self.isRunning
end

return VehicleStatusThread
