if IsDuplicityVersion() then
    return
end

if not lib then
    error("cortex-lib is not loaded! Ensure cortex-lib is started before cortex-hud.", 0)
    return
end

local config = lib.require("config.shared")
lib.require("modules.settings.client")
local hud = lib.require("modules.threads.client.hud")
local Status = lib.require("modules.status.client")
local SniperScope = lib.require("modules.scope.client")
local ScreenLayout = lib.require('modules.layout.client')
local VehicleDoorInteractions = lib.require('modules.interactions.vehicle_doors')

hud.start(config)
Status.start(config, function()
    return exports['cortex-hud']:isHudVisible()
end)
SniperScope.start(function()
    return exports['cortex-hud']:isHudVisible()
end)
ScreenLayout.start()
VehicleDoorInteractions.start(config)

local dynamicWeatherHud = lib.require('modules.integrations.client.dynamic_weather')
dynamicWeatherHud.start(config)
