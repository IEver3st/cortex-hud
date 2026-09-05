if IsDuplicityVersion() then
    return
end

if not lib then
    error("cortex-lib is not loaded! Ensure cortex-lib is started before cortex-hud.", 0)
    return
end

local config = lib.require("config.shared")
local Settings = lib.require("modules.settings.client")
local settingsReady, settingsError = Settings.initialize()
if not settingsReady then
    error(("cortex-hud settings failed to initialize: %s"):format(settingsError or 'unknown error'), 0)
end

local hud = lib.require("modules.threads.client.hud")
local ScreenEffects = lib.require('modules.effects.client')
local Status = lib.require("modules.status.client")
local SniperScope = lib.require("modules.scope.client")
local ScreenLayout = lib.require('modules.layout.client')
local VehicleDoorInteractions = lib.require('modules.interactions.vehicle_doors')
local VehicleAccessInteractions = lib.require('modules.interactions.vehicle_access')
local Radio = lib.require('modules.radio.client')
local WeaponWheel = lib.require('modules.weapons.client')

ScreenEffects.start(config, hud.isVisible)
hud.start(config)
Status.start(config, hud.isVisible)
SniperScope.start(hud.isVisible)
ScreenLayout.start(config)
VehicleDoorInteractions.start(config)
VehicleAccessInteractions.start(config)
Radio.start(config)
WeaponWheel.start(config, hud.isVisible, Settings.isOpen)

local dynamicWeatherHud = lib.require('modules.integrations.client.dynamic_weather')
dynamicWeatherHud.start(config)
