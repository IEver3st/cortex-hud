if IsDuplicityVersion() then
    return
end

if not lib then
    error("es_lib is not loaded! Ensure es_lib is started before es_hud.", 0)
    return
end

local config = lib.require("config.shared")
lib.require("modules.settings.client")
local hud = lib.require("modules.threads.client.hud")
local Status = lib.require("modules.status.client")

hud.start(config)
Status.start(config, function()
    return exports.es_hud:isHudVisible()
end)
