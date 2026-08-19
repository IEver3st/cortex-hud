local Config = {}

-- Framework to use for player state (loaded/unloaded, player data).
-- 'standalone' = no framework, HUD always active when player is playing
-- 'qbx'        = uses qbx_core PlayerData, hides HUD until player is loaded
Config.framework = 'standalone'

Config.UpdateInterval = 200
Config.PostalUpdateInterval = 400
Config.EnablePostal = false
Config.ShowPostalDistance = false

Config.PostalFile = "ocrp-postals.json"

Config.speedUnit = "mph"
Config.disableSpeedometer = false

--- Land vehicles only. Toggle caps vehicle max speed at current speed. Brake, impact, slowdown, handbrake, engine off, or exit cancels.
Config.cruiseControl = {
    enabled = true,
    key = "Y",
    command = "cortex_hud_cruise",
    minSpeed = 15,
    slowdownTolerance = 2,
    -- true = full cruise (auto-throttle to hold set speed). false = speed cap only, no auto throttle
    autoThrottle = true,
}
Config.useBuiltInSeatbeltLogic = false
Config.ejectMinSpeed = 20.0

Config.useStallSystem = false
Config.stallImpactThreshold = 20.0
Config.stallDuration = 5000
Config.stallRecoveryKey = 'E'
Config.stallMaxCount = 6
Config.stallPowerReduction = 0.05
Config.stallBreakdownDisablesEngine = false

Config.stallSound = {
    name = "Engine_fail",
    set = "DLC_PILOT_ENGINE_FAILURE_SOUNDS"
}

Config.restartSound = {
    name = "CONFIRM_BEEP",
    set = "HUD_MINI_GAME_SOUNDSET"
}

Config.useHarnessSystem = false
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

--- Aircraft HUD: column count for fixed-wing. Game gives one engine health value; HUD duplicates per engine.
--- Default 2 matches most jets; override singles / quads below.
Config.AircraftHudDefaultPlaneEngines = 2
Config.AircraftHudPlaneEngineCountByModel = {
    [`alphaz1`] = 1,
    [`besra`] = 1,
    [`cuban800`] = 1,
    [`dodo`] = 1,
    [`duster`] = 1,
    [`howard`] = 1,
    [`mammatus`] = 1,
    [`microlight`] = 1,
    [`molotok`] = 1,
    [`nokota`] = 1,
    [`seabreeze`] = 1,
    [`stunt`] = 1,
    [`strikeforce`] = 1,
    [`tula`] = 1,
    [`velum`] = 1,
    [`velum2`] = 1,
    [`bombushka`] = 4,
    [`cargoplane`] = 4,
    [`jet`] = 4,
    [`titan`] = 4,
}

--- HYD bar (fixed-wing only): body health + wing/control-panel intact checks. Stock natives have no elevator scalar; this proxies flight-control / tail damage.
Config.AircraftHudShowHydraulics = true

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
-- 'zerio-radio'      = Zerio Radio integration (radio indicators + proximity fallback)
-- NOTE: For pma-voice + zerio-radio setups, keep this on 'auto' or 'pma-voice'.
Config.voipResource = 'auto'

Config.cinematicKey = 'F7'
Config.mapNotifications = true
Config.lowFuelAlert = true
Config.cinematicNotifications = true
Config.minimapOnlyInVehicle = false
Config.fuelDisplayStyle = 'bar'
Config.showCrosshair = false
-- Replaces the core status/ammo presentation with the GTA 6-inspired
-- top-left vitals and top-right active weapon/ammo cluster.
Config.gta6HudEnabled = false
-- Show the active weapon name beside its icon in GTA 6 HUD mode.
Config.gta6ShowWeaponName = true
-- Show the GTA 6-style vehicle introduction card when entering a vehicle.
-- This preference is only exposed while GTA 6 HUD mode is enabled.
Config.gta6VehicleIdentification = true
-- Grounded world-space vehicle panel prompt. Gameplay remains owned by this
-- resource while cortex-lib only arbitrates and presents the action.
Config.VehicleDoorInteractions = {
    enabled = true,
    requireGta6Hud = true,
    key = 'E',
    command = 'cortexVehicleDoor',
    description = 'Open or close the nearest vehicle door',
    priority = 100,
    openLabel = 'OPEN',
    closeLabel = 'CLOSE',
    interactionDistance = 2.0,
    scanRadius = 6.0,
    activeScanInterval = 100,
    idleScanInterval = 450,
    maxVehicleSpeed = 1.0,
    switchBias = 0.18,
    -- Fine tuning in vehicle-local metres. Positive Y moves toward the hood;
    -- negative Y moves toward the trunk. Door offsets start from handle bones.
    panelOffsets = {
        frontDoor = { x = 0.0, y = 0.18, z = -0.12 },
        rearDoor = { x = 0.0, y = 0.15, z = -0.12 },
        hood = { x = 0.0, y = 0.68, z = 0.04 },
        trunk = { x = 0.0, y = -0.72, z = 0.04 },
    },
    anchorOffsetZ = 0.0,
    includeHood = true,
    includeTrunk = true,
    serverMaxDistance = 8.0,
    requestCooldown = 220,
    panelCooldown = 280,
}
-- Indicator strip: forecast from Dynamic_weather (requires resource + HUD setting).
Config.showDynamicWeather = false
-- Flash flood segment when Dynamic_weather reports active flood (requires HUD setting in cortex-lib Weather).
Config.showFlashFloodWarning = true
-- Hurricane segment when Dynamic_weather reports active hurricane (HUD setting).
Config.showHurricaneWarning = true
Config.sectionedBars = false
-- Location strip (compass / street / zone): gapped capsule segments like sectioned health/armor bars.
Config.sectionedIndicator = false
-- NUI glass: frost strength multiplier (0.25–3). 1 = default. CEF-safe faux glass.
Config.backdropBlur = 1.0
-- Panel fill multiplier (0.15–1). Stored in cortex-lib as 15–100. Prevents fully invisible panels.
Config.panelOpacity = 1.0
Config.defaultHudPreset = 'classic'
Config.oxygenDisplayLocation = 'statusCluster'

Config.StatusIcons = {
    hungerThreshold = 100,
    thirstThreshold = 100,
    stressThreshold = 100,
    oxygenThreshold = 100,
    showVoip = true,
    iconShape = "hexagon",
    ringWidth = 42,
    ringHeight = 48,
    colors = {
        health = "#10b981",
        armor = "#5eb2ff",
        hunger = "#f59e0b",
        thirst = "#38bdf8",
        stress = "#ef4444",
        oxygen = "#06b6d4",
    }
}

Config.HudPresets = {
    classic = {
        label = 'Classic',
        description = 'Bar status stack, top-center location, bottom-right speedometer',
        theme = {
            surface = 'rgba(10, 14, 20, 0.48)',
            surfaceBorder = 'rgba(255, 255, 255, 0.12)',
            text = '#f8fafc',
            mutedText = 'rgba(226, 232, 240, 0.68)',
            indicatorAccent = '#60a5fa',
            speedometerAccent = '#22c55e',
            voipAccent = '#22c55e',
            ammo = '#a3e635',
            health = '#22c55e',
            armor = '#60a5fa',
            hunger = '#f59e0b',
            thirst = '#38bdf8',
            stress = '#ef4444',
            oxygen = '#06b6d4',
        },
        layout = {
            indicator = { anchor = 'top-center', offsetX = 0, offsetY = 10, variant = 'segmented' },
            statusCluster = { anchor = 'bottom-left', offsetX = 18, offsetY = 20, variant = 'stacked' },
            speedometer = { anchor = 'bottom-right', offsetX = 24, offsetY = 22 },
            ammo = { anchor = 'bottom-right', offsetX = 62, offsetY = 132, variant = 'stacked' },
            voip = { anchor = 'bottom-right', offsetX = 16, offsetY = 18, variant = 'minimal' },
            waypoint = { anchor = 'above-minimap', offsetX = 0, offsetY = 54, variant = 'pill' },
        },
        defaults = {
            statusIconShape = 'bar',
            fuelDisplayStyle = 'bar',
            ammoPositionPreset = 'preset',
        },
    },
    street = {
        label = 'Street Racer',
        description = 'Top-left location, center-bottom speedometer, neon accent palette',
        theme = {
            surface = 'rgba(8, 10, 14, 0.42)',
            surfaceBorder = 'rgba(34, 211, 238, 0.18)',
            text = '#e2e8f0',
            mutedText = 'rgba(203, 213, 225, 0.64)',
            indicatorAccent = '#f97316',
            speedometerAccent = '#22d3ee',
            voipAccent = '#fb7185',
            ammo = '#fb7185',
            health = '#34d399',
            armor = '#38bdf8',
            hunger = '#f97316',
            thirst = '#22d3ee',
            stress = '#fb7185',
            oxygen = '#818cf8',
        },
        layout = {
            indicator = { anchor = 'top-left', offsetX = 22, offsetY = 12, variant = 'glass' },
            statusCluster = { anchor = 'left-above-minimap', offsetX = 18, offsetY = 180, variant = 'rail' },
            speedometer = { anchor = 'bottom-center', offsetX = 0, offsetY = 18 },
            ammo = { anchor = 'top-right', offsetX = 32, offsetY = 28, variant = 'inline' },
            voip = { anchor = 'bottom-left', offsetX = 18, offsetY = 138, variant = 'minimal' },
            waypoint = { anchor = 'top-right', offsetX = 34, offsetY = 84, variant = 'pill' },
        },
        defaults = {
            statusIconShape = 'hexagon',
            fuelDisplayStyle = 'radial',
            ammoPositionPreset = 'preset',
        },
    },
    dispatch = {
        label = 'Dispatch',
        description = 'Utility-heavy layout with crisp square indicators and amber accents',
        theme = {
            surface = 'rgba(12, 16, 22, 0.56)',
            surfaceBorder = 'rgba(148, 163, 184, 0.18)',
            text = '#f8fafc',
            mutedText = 'rgba(203, 213, 225, 0.66)',
            indicatorAccent = '#f59e0b',
            speedometerAccent = '#38bdf8',
            voipAccent = '#f59e0b',
            ammo = '#f59e0b',
            health = '#10b981',
            armor = '#60a5fa',
            hunger = '#fbbf24',
            thirst = '#38bdf8',
            stress = '#ef4444',
            oxygen = '#06b6d4',
        },
        layout = {
            indicator = { anchor = 'top-right', offsetX = 22, offsetY = 12, variant = 'segmented' },
            statusCluster = { anchor = 'bottom-left', offsetX = 18, offsetY = 20, variant = 'stacked' },
            speedometer = { anchor = 'bottom-right', offsetX = 36, offsetY = 46 },
            ammo = { anchor = 'bottom-center', offsetX = 0, offsetY = 14, variant = 'inline' },
            voip = { anchor = 'bottom-right', offsetX = 16, offsetY = 16, variant = 'boxed' },
            waypoint = { anchor = 'top-center', offsetX = 0, offsetY = 68, variant = 'pill' },
        },
        defaults = {
            statusIconShape = 'square',
            fuelDisplayStyle = 'bar',
            ammoPositionPreset = 'preset',
        },
    },
    ghost = {
        label = 'Ghost',
        description = 'Minimal top-center readouts, soft monochrome surfaces, compact right-side driving HUD',
        theme = {
            surface = 'rgba(15, 23, 42, 0.32)',
            surfaceBorder = 'rgba(255, 255, 255, 0.10)',
            text = '#f8fafc',
            mutedText = 'rgba(226, 232, 240, 0.56)',
            indicatorAccent = '#cbd5e1',
            speedometerAccent = '#a7f3d0',
            voipAccent = '#cbd5e1',
            ammo = '#e2e8f0',
            health = '#4ade80',
            armor = '#93c5fd',
            hunger = '#fbbf24',
            thirst = '#67e8f9',
            stress = '#fb7185',
            oxygen = '#7dd3fc',
        },
        layout = {
            indicator = { anchor = 'top-center', offsetX = 0, offsetY = 10, variant = 'slim' },
            statusCluster = { anchor = 'bottom-center-left', offsetX = -220, offsetY = 18, variant = 'compact' },
            speedometer = { anchor = 'bottom-right', offsetX = 24, offsetY = 20 },
            ammo = { anchor = 'top-left', offsetX = 26, offsetY = 24, variant = 'inline' },
            voip = { anchor = 'top-right', offsetX = 24, offsetY = 22, variant = 'minimal' },
            waypoint = { anchor = 'top-center', offsetX = 0, offsetY = 54, variant = 'pill' },
        },
        defaults = {
            statusIconShape = 'circle',
            fuelDisplayStyle = 'radial',
            ammoPositionPreset = 'preset',
        },
    },
}

Config.Minimap = {
    offsetX = 0.0,
    offsetY = 0.05,
    clipType = 0,
    debug = false,
    -- Set to a resource name (e.g. 'map-postalmap-streetname') if you use an external minimap mod.
    -- Set to false if you do not use one (disables the missing-resource warning).
    externalMapResource = false,

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

    textureReplacement = {
        enabled = true,
        dict = "squaremap",
        texture = "radarmasksm",
        targets = { "radarmasksm", "radarmask1g" },
        loadTimeoutMs = 5000
    },
}

return Config
