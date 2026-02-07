local config = lib.require("config.shared")

local PlayerPedId = PlayerPedId
local IsPedInAnyVehicle = IsPedInAnyVehicle
local GetVehiclePedIsIn = GetVehiclePedIsIn
local GetEntitySpeed = GetEntitySpeed
local GetIsVehicleEngineRunning = GetIsVehicleEngineRunning
local SetVehicleEngineOn = SetVehicleEngineOn
local SetVehicleEnginePowerMultiplier = SetVehicleEnginePowerMultiplier
local SetVehicleEngineHealth = SetVehicleEngineHealth
local GetVehicleEngineHealth = GetVehicleEngineHealth
local GetVehicleClass = GetVehicleClass
local HasEntityCollidedWithAnything = HasEntityCollidedWithAnything
local NetworkGetEntityOwner = NetworkGetEntityOwner
local PlayerId = PlayerId
local PlaySoundFrontend = PlaySoundFrontend
local GetSoundId = GetSoundId
local ReleaseSoundId = ReleaseSoundId
local Wait = Wait

local StallLogic = {}
StallLogic.__index = StallLogic

local EXEMPT_CLASSES = {
    [8] = true,
    [13] = true,
    [14] = true,
    [15] = true,
    [16] = true,
    [21] = true,
}

local SMOKE_THRESHOLDS = {
    light = 250,
    medium = 150,
    heavy = 50,
    fire = -50,
}

local function playSound(name, set)
    local soundId = GetSoundId()
    PlaySoundFrontend(soundId, name, set, true)
    ReleaseSoundId(soundId)
end

local function playStartupBeeps()
    CreateThread(function()
        playSound("NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET")
        Wait(150)
        playSound("NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET")
        Wait(150)
        playSound("SELECT", "HUD_FRONTEND_DEFAULT_SOUNDSET")
    end)
end

local function playStallSound()
    if config.stallSound then
        PlaySoundFrontend(-1, config.stallSound.name, config.stallSound.set, true)
    else
        PlaySoundFrontend(-1, "10_SEC_WARNING", "HUD_MINI_GAME_SOUNDSET", true)
    end
end

local function playRestartSound()
    if config.restartSound then
        PlaySoundFrontend(-1, config.restartSound.name, config.restartSound.set, true)
    else
        playStartupBeeps()
    end
end

local function playBreakdownSound()
    playSound("ERROR", "HUD_FRONTEND_DEFAULT_SOUNDSET")
end

local function notify(data)
    if lib and lib.notify then
        lib.notify(data)
    end
end

local function applySmokeDamage(vehicle, stallCount, maxStalls)
    local damageProgress = stallCount / maxStalls
    damageProgress = math.min(damageProgress, 1.5)

    local targetHealth
    if stallCount >= maxStalls then
        targetHealth = SMOKE_THRESHOLDS.fire
    else
        local startHealth = 500
        local healthRange = startHealth - SMOKE_THRESHOLDS.heavy
        targetHealth = startHealth - (healthRange * damageProgress)
    end

    SetVehicleEngineHealth(vehicle, targetHealth)
end

function StallLogic.new()
    if not config.useStallSystem then
        return nil
    end

    local self = setmetatable({}, StallLogic)

    self.speedConversion = string.lower(config.speedUnit) == "mph" and 2.236936 or 3.6
    self.impactThreshold = config.stallImpactThreshold / self.speedConversion
    self.stallDuration = config.stallDuration or 2000
    self.maxStalls = config.stallMaxCount or 3
    self.powerReduction = config.stallPowerReduction or 0.15
    self.breakdownDisables = config.stallBreakdownDisablesEngine

    self.vehicleStates = {}
    self.isMonitoring = false
    self.currentVehicle = nil


    return self
end

function StallLogic:getVehicleState(vehicle)
    if not self.vehicleStates[vehicle] then
        self.vehicleStates[vehicle] = {
            stallCount = 0,
            isStalled = false,
            isBroken = false,
            lastSpeed = 0,
            powerMultiplier = 1.0,
        }
    end
    return self.vehicleStates[vehicle]
end

function StallLogic:isExempt(vehicle)
    local class = GetVehicleClass(vehicle)
    return EXEMPT_CLASSES[class] == true
end

function StallLogic:triggerStall(vehicle)
    local state = self:getVehicleState(vehicle)

    if state.isStalled or state.isBroken then
        return
    end

    state.stallCount = state.stallCount + 1
    state.isStalled = true

    state.powerMultiplier = math.max(0.1, 1.0 - (state.stallCount * self.powerReduction))

    SetVehicleEngineOn(vehicle, false, true, true)

    applySmokeDamage(vehicle, state.stallCount, self.maxStalls)

    if state.stallCount >= self.maxStalls then
        state.isBroken = true
        if self.breakdownDisables then
            SetVehicleEngineOn(vehicle, false, true, true)
        end
        playBreakdownSound()
        notify({
            title = "Engine Failure",
            description = "Your engine has broken down from too many stalls!",
            type = "error",
            duration = 5000,
            sound = false
        })
    else
        playStallSound()
        notify({
            title = "Engine Stalled",
            description = string.format("Stall %d/%d - Engine power reduced to %d%%", 
                state.stallCount, self.maxStalls, math.floor(state.powerMultiplier * 100)),
            type = "warning",
            duration = 3000,
            sound = false
        })

        SetTimeout(self.stallDuration, function()
            self:autoRestart(vehicle)
        end)
    end
end

function StallLogic:attemptRestart()
    local ped = PlayerPedId()
    if not IsPedInAnyVehicle(ped, false) then return end

    local vehicle = GetVehiclePedIsIn(ped, false)
    local state = self:getVehicleState(vehicle)

    if not state.isStalled then return end
    if state.isBroken and self.breakdownDisables then
        playBreakdownSound()
        notify({
            title = "Engine Broken",
            description = "The engine is too damaged to restart. You need repairs.",
            type = "error",
            duration = 3000,
            sound = false
        })
        return
    end

    self:restartEngine(vehicle)
end

function StallLogic:autoRestart(vehicle)
    local state = self:getVehicleState(vehicle)
    if state.isStalled and not state.isBroken then
        self:restartEngine(vehicle)
    end
end

function StallLogic:restartEngine(vehicle)
    local state = self:getVehicleState(vehicle)
    
    state.isStalled = false
    SetVehicleEngineOn(vehicle, true, false, true)
    SetVehicleEnginePowerMultiplier(vehicle, state.powerMultiplier)

    playRestartSound()
    notify({
        title = "Engine Started",
        description = string.format("Engine running at %d%% power", math.floor(state.powerMultiplier * 100)),
        type = "success",
        duration = 2000,
        sound = false
    })
end

function StallLogic:startMonitoring(vehicle)
    if self.isMonitoring then return end
    if self:isExempt(vehicle) then return end
    
    if NetworkGetEntityOwner(vehicle) ~= PlayerId() then return end

    self.isMonitoring = true
    self.currentVehicle = vehicle

    local state = self:getVehicleState(vehicle)
    
    if state.powerMultiplier < 1.0 then
        SetVehicleEnginePowerMultiplier(vehicle, state.powerMultiplier)
    end

    CreateThread(function()
        local lastSpeed = GetEntitySpeed(vehicle)
        local hadCollision = false

        while self.isMonitoring and IsPedInAnyVehicle(PlayerPedId(), false) do
            local currentSpeed = GetEntitySpeed(vehicle)
            local hasCollision = HasEntityCollidedWithAnything(vehicle)

            if hasCollision and not hadCollision then
                local speedDrop = lastSpeed - currentSpeed

                if speedDrop >= self.impactThreshold and GetIsVehicleEngineRunning(vehicle) then
                    self:triggerStall(vehicle)
                end
            end

            hadCollision = hasCollision
            lastSpeed = currentSpeed

            Wait(50)
        end

        self.isMonitoring = false
        self.currentVehicle = nil
    end)
end

function StallLogic:stopMonitoring()
    self.isMonitoring = false
    if self.currentVehicle then
        self.vehicleStates[self.currentVehicle] = nil
    end
    self.currentVehicle = nil
end

function StallLogic:isStalled()
    if not self.currentVehicle then return false end
    local state = self:getVehicleState(self.currentVehicle)
    return state.isStalled
end

function StallLogic:isBroken()
    if not self.currentVehicle then return false end
    local state = self:getVehicleState(self.currentVehicle)
    return state.isBroken
end

function StallLogic:getStallCount()
    if not self.currentVehicle then return 0 end
    local state = self:getVehicleState(self.currentVehicle)
    return state.stallCount
end

function StallLogic:getPowerMultiplier()
    if not self.currentVehicle then return 1.0 end
    local state = self:getVehicleState(self.currentVehicle)
    return state.powerMultiplier
end

function StallLogic:repair(vehicle)
    vehicle = vehicle or self.currentVehicle
    if not vehicle then return end

    self.vehicleStates[vehicle] = nil
    SetVehicleEnginePowerMultiplier(vehicle, 1.0)
    SetVehicleEngineHealth(vehicle, 1000.0)
    SetVehicleEngineOn(vehicle, true, false, true)

    playRestartSound()
    notify({
        title = "Engine Repaired",
        description = "Engine restored to full power",
        type = "success",
        duration = 2000,
        sound = false
    })
end

return StallLogic
