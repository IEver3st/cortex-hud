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

-- Native vehicle-radio replacement. Hold the normal radio-wheel control (Q /
-- controller D-pad Left), then scroll or use left/right to move continuously.
-- While the strip is open, R / controller B changes Live Radio/On Demand mode and
-- is presented through cortex-lib at bottom-right. X / controller A mutes
-- without forgetting the selected station.
Config.Radio = {
    enabled = true,
    replaceDefaultWheel = true,
    onDemandEnabled = true,
    rememberSelection = true,
    rememberMode = true,
    rememberMute = false,
    defaultStation = 'RADIO_01_CLASS_ROCK',
    openControl = 85, -- INPUT_VEH_RADIO_WHEEL
    nextControls = { 14, 81, 175, 180 }, -- wheel down, next radio, right, phone scroll forward
    previousControls = { 15, 82, 174, 181 }, -- wheel up, previous radio, left, phone scroll back
    nextTrackControl = 83,
    previousTrackControl = 84,
    modeControl = 80, -- INPUT_VEH_CIN_CAM (R / controller B while open)
    muteControl = 73, -- INPUT_VEH_DUCK (X / controller A while open)
    modeKeyboardLabel = 'R',
    modeGamepadLabel = 'B',
    muteKeyboardLabel = 'X',
    muteGamepadLabel = 'A',
    modeHintPriority = 40,
    inputModePollInterval = 100,
    selectionCooldown = 90,
    inputRepeatDelay = 300,
    inputRepeatInterval = 115,
    quickSwitchDisplayTime = 1400,
    metadataPollInterval = 250,
    stations = {
        { name = 'RADIO_36_AUDIOPLAYER', label = 'Media Player', mark = 'MP' },
        { name = 'RADIO_37_MOTOMAMI', label = 'MOTOMAMI Los Santos', mark = 'MOTO' },
        { name = 'RADIO_35_DLC_HEI4_MLR', label = 'The Music Locker', mark = 'ML' },
        { name = 'RADIO_12_REGGAE', label = 'Blue Ark', mark = 'BA' },
        { name = 'RADIO_13_JAZZ', label = 'Worldwide FM', mark = 'WW' },
        { name = 'RADIO_14_DANCE_02', label = 'FlyLo FM', mark = 'FLY' },
        { name = 'RADIO_15_MOTOWN', label = 'The Lowdown 91.1', mark = '91.1' },
        { name = 'RADIO_20_THELAB', label = 'The Lab', mark = 'LAB' },
        { name = 'RADIO_16_SILVERLAKE', label = 'Radio Mirror Park', mark = 'RMP' },
        { name = 'RADIO_34_DLC_HEI4_KULT', label = 'Kult FM', mark = 'KULT' },
        { name = 'RADIO_17_FUNK', label = 'Space 103.2', mark = '103.2' },
        { name = 'RADIO_18_90S_ROCK', label = 'Vinewood Boulevard Radio', mark = 'VBR' },
        { name = 'RADIO_21_DLC_XM17', label = 'blonded Los Santos 97.8 FM', mark = 'BLOND' },
        { name = 'RADIO_22_DLC_BATTLE_MIX1_RADIO', label = 'Los Santos Underground Radio', mark = 'LSUR' },
        { name = 'RADIO_23_DLC_XM19_RADIO', label = 'iFruit Radio', mark = 'iF' },
        { name = 'RADIO_01_CLASS_ROCK', label = 'Los Santos Rock Radio', mark = 'LSRR' },
        { name = 'RADIO_02_POP', label = 'Non-Stop-Pop FM', mark = 'NSP' },
        { name = 'RADIO_03_HIPHOP_NEW', label = 'Radio Los Santos', mark = 'RLS' },
        { name = 'RADIO_04_PUNK', label = 'Channel X', mark = 'X' },
        { name = 'RADIO_05_TALK_01', label = 'West Coast Talk Radio', mark = 'WCTR' },
        { name = 'RADIO_06_COUNTRY', label = 'Rebel Radio', mark = 'REBEL' },
        { name = 'RADIO_07_DANCE_01', label = 'Soulwax FM', mark = 'SW' },
        { name = 'RADIO_08_MEXICAN', label = 'East Los FM', mark = 'EL' },
        { name = 'RADIO_09_HIPHOP_OLD', label = 'West Coast Classics', mark = 'WCC' },
        { name = 'RADIO_11_TALK_02', label = 'Blaine County Radio', mark = 'BCR' },
        { name = 'RADIO_27_DLC_PRHEI4', label = 'Still Slipping Los Santos', mark = 'SSLS' },
        { name = 'RADIO_19_USER', label = 'Self Radio', mark = 'SELF' },
    },
}

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
-- Passive screen-edge feedback. Durations and cooldowns are milliseconds.
-- Edge effects use transparent inset shadows and never take NUI focus or pointer input.
Config.ScreenEffects = {
    enabled = true,
    damage = {
        enabled = true,
        duration = 480,
        cooldown = 120,
        strength = 0.38,
    },
    stamina = {
        enabled = true,
        duration = 900,
        cooldown = 1200,
        strength = 0.24,
        threshold = 1,
        resetThreshold = 18,
    },
    kill = {
        enabled = true,
        duration = 820,
        cooldown = 180,
        strength = 0.72,
    },
}
-- Replaces the core status/ammo presentation with the Leonida-inspired
-- top-left vitals and top-right active weapon/ammo cluster.
Config.gta6HudEnabled = false
-- Use the compact Leonida weapon/ammo lockup and its minimal firearm reticle.
-- This only has an effect while Leonida UI is enabled.
Config.gta6AuthenticWeaponHud = false
-- Show the active weapon name beside its icon while Leonida UI is enabled.
Config.gta6ShowWeaponName = true
-- Show the Leonida-style vehicle introduction card when entering a vehicle.
-- This preference is only exposed while Leonida UI is enabled.
Config.gta6VehicleIdentification = true
-- Replaces GTA's on-foot weapon wheel with the eight-station Cortex wheel.
-- The native wheel remains authoritative when disabled, before NUI readiness,
-- and in vehicles unless allowInVehicles is explicitly enabled.
-- While open it mirrors vanilla: HOLD openControl (TAB/LB) to see the wheel,
-- highlight a station with mouse/right-stick, scroll to cycle the weapons
-- stacked in the highlighted station (falls through to the next owned station
-- when it holds a single weapon), or press 1-9 to jump straight to a station.
-- A quick TAB tap only views the wheel and never swaps the weapon; release
-- TAB after navigating to equip the highlighted weapon.
Config.WeaponWheel = {
    enabled = false,
    allowInVehicles = false,
    openControl = 37, -- INPUT_SELECT_WEAPON (TAB / LB)
    deadzone = 0.22,
    mouseSensitivity = 2.2,
    -- Navigation repeat rates while the wheel is open (ms, clamped 15-150).
    -- stackCooldownMs cycles weapons inside the highlighted category;
    -- categoryCooldownMs jumps between stations. Lower is faster, but too
    -- low skips guns: one wheel detent must stay exactly one gun.
    stackCooldownMs = 80,
    categoryCooldownMs = 110,
    screenBlur = true,
    -- Prints fired scroll control ids to the F8 console while the wheel is
    -- open. Enable only to diagnose scroll input, then disable again.
    debug = false,
    -- Add-on example:
    -- { label = 'WEAPON_CUSTOM', name = 'Custom Weapon', icon = 'weapon_custom', category = 'rifle' }
    -- Valid categories: sidearm, automatic, rifle, shotgun, sniper, heavy, gear, melee.
    additionalWeapons = {},
}
-- Grounded world-space vehicle panel prompt. Gameplay remains owned by this
-- resource while cortex-lib only arbitrates and presents the action.
Config.VehicleDoorInteractions = {
    enabled = true,
    requireGta6Hud = true,
    key = 'E',
    command = 'cortexVehicleDoor',
    description = 'Open or close the nearest vehicle door',
    priority = 100,
    holdDuration = 220,
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
    transitionTimeout = 1600,
}
-- Locked-vehicle actions presented together at the nearest intact side window.
-- Key cloning uses qbx_vehiclekeys/qb-vehiclekeys when available and otherwise
-- falls back to runtime-session standalone access owned by this resource.
-- Presentation scale: vehicle-access world prompt rendered at 75% (25% smaller)
-- via cortex-lib ui/style.css .cortex-world-access transform scale(calc(var(--cortex-world-scale,1)*0.75)).
Config.VehicleAccessInteractions = {
    enabled = true,
    requireGta6Hud = true,
    holdDuration = 220,
    interactionDistance = 2.0,
    scanRadius = 6.0,
    activeScanInterval = 100,
    idleScanInterval = 450,
    maxVehicleSpeed = 1.0,
    switchBias = 0.18,
    onlyLocked = true,
    includeRearWindows = true,
    serverMaxDistance = 8.0,
    requestCooldown = 700,
    actionCooldown = 1200,
    smash = {
        enabled = true,
        key = 'G',
        command = 'cortexVehicleSmashWindow',
        description = 'Smash the nearest locked vehicle window',
        label = 'SMASH WINDOW',
        icon = 'smash-window',
        priority = 111,
        duration = 1150,
        panelOffset = { x = 0.0, y = 0.0, z = 0.0 },
    },
    cloneKey = {
        enabled = true,
        key = 'K',
        command = 'cortexVehicleCloneKey',
        description = 'Clone a key for the nearest locked vehicle',
        label = 'CLONE KEY',
        icon = 'clone-key',
        priority = 112,
        duration = 6500,
        qte = {
            minRounds = 1,
            maxRounds = 4,
            roundDuration = 980,
            targetPhase = 0.74,
            hitWindow = 0.14,
            introDuration = 320,
            interRoundDelay = 240,
            completionDelay = 150,
        },
        animation = {
            dict = 'cellphone@',
            clip = 'cellphone_text_read_base',
            flags = 49,
        },
        prop = {
            model = 'prop_phone_ing',
            bone = 28422,
            pos = { x = 0.0, y = 0.0, z = 0.0 },
            rot = { x = 0.0, y = 0.0, z = 0.0 },
        },
        provider = 'auto', -- auto, qbx_vehiclekeys, qb-vehiclekeys, standalone
        allowStandalone = true,
        panelOffset = { x = 0.0, y = 0.0, z = 0.0 },
    },
}
-- Indicator strip: forecast from Dynamic_weather (requires resource + HUD setting).
Config.showDynamicWeather = false
-- Flash flood segment when Dynamic_weather reports active flood (requires HUD setting in cortex-lib Weather).
Config.showFlashFloodWarning = true
-- Hurricane segment when Dynamic_weather reports active hurricane (HUD setting).
Config.showHurricaneWarning = true
Config.sectionedBars = false
-- Location presentation is independent from the broader Leonida UI mode.
-- Supported values: 'off', 'current', 'gta6'.
Config.locationDisplayStyle = 'current'
-- Location strip (compass / street / zone): gapped capsule segments like sectioned health/armor bars.
Config.sectionedIndicator = false
-- NUI glass blur multiplier (0.25–3). 1 = the default 12px blur.
Config.backdropBlur = 1.0
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
