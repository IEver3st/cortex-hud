if IsDuplicityVersion() then
    return
end

if not lib then
    error("es_lib is not loaded! Ensure es_lib is started before es_hud.", 0)
    return
end

local config = lib.require("config.shared")
local hud = lib.require("modules.threads.client.hud")

hud.start(config)
