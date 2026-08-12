local scope = {}

local CreateThread = CreateThread
local GetCurrentResourceName = GetCurrentResourceName
local GetSelectedPedWeapon = GetSelectedPedWeapon
local IsEntityDead = IsEntityDead
local IsPlayerFreeAiming = IsPlayerFreeAiming
local IsPlayerPlaying = IsPlayerPlaying
local PlayerId = PlayerId
local PlayerPedId = PlayerPedId
local SendNUIMessage = lib.require("modules.nui.client").send
local Wait = Wait

local SNIPER_WEAPONS = {
    [`WEAPON_SNIPERRIFLE`] = 'SNIPER',
    [`WEAPON_HEAVYSNIPER`] = 'HEAVY SNIPER',
    [`WEAPON_HEAVYSNIPER_MK2`] = 'HEAVY SNIPER MK II',
    [`WEAPON_MARKSMANRIFLE`] = 'MARKSMAN',
    [`WEAPON_MARKSMANRIFLE_MK2`] = 'MARKSMAN MK II',
    [`WEAPON_PRECISIONRIFLE`] = 'PRECISION',
}

local function hideScope(lastWeapon)
    SendNUIMessage({
        action = 'setSniperScope',
        visible = false,
        weapon = lastWeapon or 'SNIPER',
    })
end

function scope.start(isHudVisible)
    local resourceName = GetCurrentResourceName()
    local canShowHud = type(isHudVisible) == 'function' and isHudVisible or function()
        return true
    end
    local lastWeapon = 'SNIPER'

    CreateThread(function()
        local playerId = PlayerId()
        local lastVisible = false

        while true do
            local visible = false
            local weaponLabel = lastWeapon

            if canShowHud() and IsPlayerPlaying(playerId) then
                local ped = PlayerPedId()
                if ped ~= 0 and not IsEntityDead(ped) then
                    weaponLabel = SNIPER_WEAPONS[GetSelectedPedWeapon(ped)]
                    visible = weaponLabel ~= nil and IsPlayerFreeAiming(playerId) == true
                end
            end

            if visible ~= lastVisible or (visible and weaponLabel ~= lastWeapon) then
                SendNUIMessage({
                    action = 'setSniperScope',
                    visible = visible,
                    weapon = weaponLabel or lastWeapon,
                })
            end

            lastVisible = visible
            if weaponLabel then
                lastWeapon = weaponLabel
            end

            Wait(50)
        end
    end)

    AddEventHandler('onClientResourceStop', function(stoppedResource)
        if stoppedResource == resourceName then
            hideScope(lastWeapon)
        end
    end)
end

return scope
