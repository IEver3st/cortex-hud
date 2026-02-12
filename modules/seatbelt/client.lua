local config = lib.require("config.shared")

local SeatbeltLogic = {}
SeatbeltLogic.__index = SeatbeltLogic

function SeatbeltLogic.new()
    if not config.useBuiltInSeatbeltLogic then
        return nil
    end

    local self = setmetatable({}, SeatbeltLogic)

    self.seatbeltState = false
    self.speedConversion = string.lower(config.speedUnit) == "mph" and 2.236936 or 3.6
    self.ejectVelocity = config.ejectMinSpeed / self.speedConversion
    self.unknownEjectVelocity = 1.0
    self.unknownModifier = 17.0
    self.minDamage = 10.0

    RegisterCommand("-toggle_seatbelt", function()
        local ped = PlayerPedId()

        if not IsPedInAnyVehicle(ped, false) or IsPedOnAnyBike(ped) then
            return
        end

        self:toggle(not self.seatbeltState)
    end, false)

    SetPedConfigFlag(PlayerPedId(), 32, true)
    SetFlyThroughWindscreenParams(self.ejectVelocity, self.unknownEjectVelocity, self.unknownModifier, self.minDamage)
    RegisterKeyMapping("-toggle_seatbelt", "Toggle Seatbelt", "keyboard", "B")

    return self
end

function SeatbeltLogic:toggle(state)
    if self.seatbeltState == state then
        return
    end

    self.seatbeltState = state

    if state then
        SetFlyThroughWindscreenParams(10000.0, 10000.0, 17.0, 500.0)
        self:disableVehicleExitControlThread()

        lib.notify({
            title = 'Seatbelt',
            description = 'Seatbelt fastened',
            type = 'success',
            duration = 2000,
        })
        return
    end

    SetFlyThroughWindscreenParams(self.ejectVelocity, self.unknownEjectVelocity, self.unknownModifier, self.minDamage)

    lib.notify({
        title = 'Seatbelt',
        description = 'Seatbelt removed',
        type = 'info',
        duration = 2000,
    })
end

function SeatbeltLogic:disableVehicleExitControlThread()
    CreateThread(function()
        while self.seatbeltState do
            DisableControlAction(0, 75, true)
            Wait(0)
        end
    end)
end

function SeatbeltLogic:isSeatbeltOn()
    return self.seatbeltState
end

return SeatbeltLogic
