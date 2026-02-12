local Config = {}

-- Framework to use for player state (loaded/unloaded, player data).
-- 'standalone' = no framework, HUD always active when player is playing
-- 'qbx'        = uses qbx_core PlayerData, hides HUD until player is loaded
Config.framework = 'qbx'

Config.UpdateInterval = 200
Config.PostalUpdateInterval = 400
Config.EnablePostal = true
Config.ShowPostalDistance = false

Config.PostalFile = "ocrp-postals.json"

Config.speedUnit = "mph"
Config.useBuiltInSeatbeltLogic = true
Config.ejectMinSpeed = 20.0

Config.useStallSystem = true
Config.stallImpactThreshold = 20.0
Config.stallDuration = 5000
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

Config.useHarnessSystem = true
Config.harnessKey = 'H'
Config.harnessApplyDuration = 6000
Config.harnessRemoveDuration = 5000
Config.harnessEjectSpeed = 10000.0
Config.harnessProgressStyle = 'bar'
Config.harnessCanCancel = true
Config.harnessDisableControls = {
    move = false,
    car = false,
    combat = true,
}

Config.PolcamForceAircraftHud = false
Config.disableWantedLevel = true

Config.Fuel = {
    debug = false,
    fallbackToNative = true,
    treatZeroAsInvalid = true,
    alerts = {
        enabled = true,
        thresholds = { 20, 10, 5 },
        counts = {
            [20] = 1,
            [10] = 1,
            [5] = 2
        },
        interval = 220,
        sound = {
            name = "Beep_Red",
            set = "DLC_HEIST_HACKING_SNAKE_SOUNDS"
        }
    },
}

Config.StatusUpdateInterval = 500
Config.VoipUpdateInterval = 150

-- Voice resource to use for VOIP status indicator.
-- 'auto'             = auto-detect from running resources
-- 'pma-voice'        = pma-voice (proximity + talking + connected)
-- 'saltychat'        = SaltyChat
-- 'mumble-voip'      = mumble-voip
-- 'tokovoip_script'  = TokoVOIP
Config.voipResource = 'auto'

Config.cinematicKey = 'F7'
Config.mapNotifications = true
Config.lowFuelAlert = true
Config.cinematicNotifications = true
Config.minimapOnlyInVehicle = false

Config.minimapOnlyInVehicle = false
Config.fuelDisplayStyle = 'bar'
Config.showCrosshair = false

-- First-person camera FOV (client profile setting). This is per-player.
-- Value matches GTA/FiveM "First Person Field of View" slider range.
Config.firstPersonFov = 70

Config.StatusIcons = {
    hungerThreshold = 100,
    thirstThreshold = 100,
    stressThreshold = 100,
    oxygenThreshold = 100,
    showVoip = true,
    colors = {
        health = "#10b981",
        armor = "#5eb2ff",
        hunger = "#f59e0b",
        thirst = "#38bdf8",
        stress = "#ef4444",
        oxygen = "#06b6d4",
    }
}

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
