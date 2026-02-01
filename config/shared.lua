local Config = {}

Config.UpdateInterval = 200
Config.PostalUpdateInterval = 400
Config.EnablePostal = true
Config.ShowPostalDistance = false

Config.PostalFile = "ocrp-postals.json"

Config.speedUnit = "mph"
Config.useBuiltInSeatbeltLogic = true
Config.ejectMinSpeed = 20.0

Config.useStallSystem = true
Config.stallImpactThreshold = 35.0
Config.stallDuration = 2000
Config.stallRecoveryKey = 'E'
Config.stallMaxCount = 6
Config.stallPowerReduction = 0.05
Config.stallBreakdownDisablesEngine = true

Config.stallSound = {
    name = "Engine_fail",
    set = "DLC_PILOT_ENGINE_FAILURE_SOUNDS"
}

Config.restartSound = {
    name = "CONFIRM_BEEP",
    set = "HUD_MINI_GAME_SOUNDSET"
}

Config.PolcamForceAircraftHud = false
Config.disableWantedLevel = true

Config.Minimap = {
    offsetX = 0.0,
    offsetY = 0.05,

    sizeX   = 0.1638,
    sizeY   = 0.183,

    maskOffsetX = 0.0,
    maskOffsetY = 0.0,
    maskSizeX   = 0.128,
    maskSizeY   = 0.20,

    blurOffsetX = -0.01,
    blurOffsetY = 0.025,
    blurSizeX   = 0.262,
    blurSizeY   = 0.300,
}

return Config
