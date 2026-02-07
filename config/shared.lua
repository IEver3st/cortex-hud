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

Config.Fuel = {
    mode = "ask",
    debug = false,
    manual = "legacyfuel",
    rememberSelection = true,
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
    providers = {
        {
            id = "ox_fuel",
            label = "ox_fuel",
            resources = {
                { name = "ox_fuel", getters = { "GetFuel", "GetFuelLevel" } }
            }
        },
        {
            id = "ps-fuel",
            label = "ps-fuel",
            resources = {
                { name = "ps-fuel", getters = { "GetFuel", "GetFuelLevel" } }
            }
        },
        {
            id = "cdn-fuel",
            label = "cdn-fuel",
            resources = {
                { name = "cdn-fuel", getters = { "GetFuel", "GetFuelLevel" } }
            }
        },
        {
            id = "legacyfuel",
            label = "LegacyFuel",
            resources = {
                { name = "LegacyFuel", getters = { "GetFuel", "GetFuelLevel", "getFuel" } },
                { name = "legacyfuel", getters = { "GetFuel", "GetFuelLevel", "getFuel" } }
            }
        },
        {
            id = "fuel",
            label = "fuel",
            resources = {
                { name = "fuel", getters = { "GetFuel", "getFuel" } }
            }
        },
        {
            id = "frfuel",
            label = "frfuel",
            resources = {
                { name = "frfuel", getters = { "getCurrentFuel" } }
            }
        },
        {
            id = "esx_fuel",
            label = "esx_fuel",
            resources = {
                { name = "esx_fuel", getters = { "GetFuel" } }
            }
        },
        {
            id = "qb-fuel",
            label = "qb-fuel",
            resources = {
                { name = "qb-fuel", getters = { "GetFuel" } }
            }
        },
        {
            id = "lj-fuel",
            label = "lj-fuel",
            resources = {
                { name = "lj-fuel", getters = { "GetFuel" } }
            }
        }
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
