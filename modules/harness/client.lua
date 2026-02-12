local config = lib.require("config.shared")

local PlayerPedId = PlayerPedId
local IsPedInAnyVehicle = IsPedInAnyVehicle
local IsPedOnAnyBike = IsPedOnAnyBike
local SetFlyThroughWindscreenParams = SetFlyThroughWindscreenParams
local DisableControlAction = DisableControlAction
local Wait = Wait

local HarnessLogic = {}
HarnessLogic.__index = HarnessLogic

function HarnessLogic.new()
    if not config.useHarnessSystem then
        return nil
    end

    local self = setmetatable({}, HarnessLogic)

    self.harnessState = false
    self.isBusy = false
    self.applyDuration = config.harnessApplyDuration or 6000
    self.removeDuration = config.harnessRemoveDuration or 5000
    self.ejectSpeed = config.harnessEjectSpeed or 10000.0
    self.progressStyle = config.harnessProgressStyle or 'bar'
    self.canCancel = config.harnessCanCancel ~= false
    self.disableControls = config.harnessDisableControls or {}

    RegisterCommand("+toggle_harness", function()
        local ped = PlayerPedId()

        if not IsPedInAnyVehicle(ped, false) or IsPedOnAnyBike(ped) then
            return
        end

        if self.isBusy then
            return
        end

        self:toggle()
    end, false)

    RegisterKeyMapping("+toggle_harness", "Toggle Harness", "keyboard", config.harnessKey or "H")

    return self
end

function HarnessLogic:toggle()
    if self.isBusy then return end

    if self.harnessState then
        self:remove()
    else
        self:apply()
    end
end

function HarnessLogic:apply()
    if self.harnessState or self.isBusy then return end
    self.isBusy = true

    self:disableVehicleExitControlThread()

    local completed = exports.es_lib:progress({
        label = 'Fastening harness...',
        duration = self.applyDuration,
        position = 'bottom',
        style = self.progressStyle,
        canCancel = self.canCancel,
        disable = self.disableControls
    })

    if not completed then
        self.isBusy = false
        lib.notify({
            title = 'Harness',
            description = 'Cancelled',
            type = 'warning',
            duration = 2000
        })
        return
    end

    self.isBusy = false
    self.harnessState = true
    SetFlyThroughWindscreenParams(self.ejectSpeed, self.ejectSpeed, 17.0, 500.0)

    lib.notify({
        title = 'Harness',
        description = 'Harness fastened',
        type = 'success',
        duration = 2000
    })
end

function HarnessLogic:remove()
    if not self.harnessState or self.isBusy then return end
    self.isBusy = true

    self:disableVehicleExitControlThread()

    local completed = exports.es_lib:progress({
        label = 'Removing harness...',
        duration = self.removeDuration,
        position = 'bottom',
        style = self.progressStyle,
        canCancel = self.canCancel,
        disable = self.disableControls
    })

    if not completed then
        self.isBusy = false
        lib.notify({
            title = 'Harness',
            description = 'Cancelled',
            type = 'warning',
            duration = 2000
        })
        return
    end

    self.isBusy = false
    self.harnessState = false

    local seatbeltOn = false
    local ok, result = pcall(function()
        return exports.es_hud:isSeatbeltOn()
    end)
    if ok and result then
        seatbeltOn = true
    end

    if not seatbeltOn then
        local speedConversion = string.lower(config.speedUnit) == "mph" and 2.236936 or 3.6
        local ejectVelocity = config.ejectMinSpeed / speedConversion
        SetFlyThroughWindscreenParams(ejectVelocity, 1.0, 17.0, 10.0)
    end

    lib.notify({
        title = 'Harness',
        description = 'Harness removed',
        type = 'info',
        duration = 2000
    })
end

function HarnessLogic:disableVehicleExitControlThread()
    CreateThread(function()
        while (self.harnessState or self.isBusy) and IsPedInAnyVehicle(PlayerPedId(), false) do
            DisableControlAction(0, 75, true)
            Wait(0)
        end

        if self.harnessState then
            self.harnessState = false
        end
    end)
end

function HarnessLogic:isHarnessOn()
    return self.harnessState
end

function HarnessLogic:forceRemove()
    self.harnessState = false
    self.isBusy = false
end

return HarnessLogic
