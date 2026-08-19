local config = lib.require("config.shared")
local libSettings = lib.settings
local Nui = lib.require("modules.nui.client")

local Settings = {}

local SendNUIMessage = Nui.send
local TriggerEvent = TriggerEvent
local Wait = Wait
local math_floor = math.floor

local cinematicMode = false
local cinematicCommandRegistered = false
local cinematicKeyRegisteredKey = nil

local DEFAULT_PRESET_ORDER = { 'classic', 'street', 'dispatch', 'ghost' }

local DEFAULT_STATUS_COLORS = {
    health = '#10b981',
    armor = '#5eb2ff',
    hunger = '#f59e0b',
    thirst = '#38bdf8',
    stress = '#ef4444',
    oxygen = '#06b6d4',
}

local KEY_MAP = {
    hud_layoutPreset = 'layoutPreset',
    hud_colorPreset = 'colorPreset',
    hud_speedUnit = 'speedUnit',
    hud_disableSpeedometer = 'disableSpeedometer',
    hud_showPostal = 'showPostal',
    hud_showPostalDistance = 'showPostalDistance',
    hud_statusIconShape = 'statusIconShape',
    hud_hungerThreshold = 'hungerThreshold',
    hud_thirstThreshold = 'thirstThreshold',
    hud_stressThreshold = 'stressThreshold',
    hud_oxygenThreshold = 'oxygenThreshold',
    hud_mapNotifications = 'mapNotifications',
    hud_lowFuelAlert = 'lowFuelAlert',
    hud_cinematicNotifications = 'cinematicNotifications',
    hud_cinematicKey = 'cinematicKey',
    hud_minimapOnlyInVehicle = 'minimapOnlyInVehicle',
    hud_speedometerPositionMode = 'speedometerPositionMode',
    hud_speedometerPosX = 'speedometerPosX',
    hud_speedometerPosY = 'speedometerPosY',
    hud_color_health = 'colorHealth',
    hud_color_armor = 'colorArmor',
    hud_color_hunger = 'colorHunger',
    hud_color_thirst = 'colorThirst',
    hud_color_stress = 'colorStress',
    hud_color_oxygen = 'colorOxygen',
    hud_fuelDisplayStyle = 'fuelDisplayStyle',
    hud_color_ammo = 'colorAmmo',
    hud_ammoPosX = 'ammoPosX',
    hud_ammoPosY = 'ammoPosY',
    hud_ammoPositionPreset = 'ammoPositionPreset',
    hud_showCrosshair = 'showCrosshair',
    hud_gta6HudEnabled = 'gta6HudEnabled',
    hud_gta6ShowWeaponName = 'gta6ShowWeaponName',
    hud_gta6VehicleIdentification = 'gta6VehicleIdentification',
    hud_sectionedBars = 'sectionedBars',
    hud_sectionedIndicator = 'sectionedIndicator',
    hud_backdropBlur = 'backdropBlur',
    hud_panelOpacity = 'panelOpacity',
    hud_oxygenDisplayLocation = 'oxygenDisplayLocation',
    hud_cruiseAutoThrottle = 'cruiseAutoThrottle',
    hud_showDynamicWeather = 'showDynamicWeather',
    hud_showFlashFloodWarning = 'showFlashFloodWarning',
    hud_showHurricaneWarning = 'showHurricaneWarning',
}

local HUD_TO_LIB_KEY = {}
for libKey, hudKey in pairs(KEY_MAP) do
    HUD_TO_LIB_KEY[hudKey] = libKey
end

local function copyTable(value)
    if type(value) ~= 'table' then
        return value
    end

    local clone = {}
    for key, item in pairs(value) do
        clone[key] = copyTable(item)
    end
    return clone
end

local function mergeTable(base, overrides)
    local merged = copyTable(base or {})

    if type(overrides) ~= 'table' then
        return merged
    end

    for key, value in pairs(overrides) do
        if type(value) == 'table' and type(merged[key]) == 'table' then
            merged[key] = mergeTable(merged[key], value)
        else
            merged[key] = copyTable(value)
        end
    end

    return merged
end

local function toBoolean(value, default)
    if value == nil then
        return default == true
    end

    if type(value) == 'boolean' then
        return value
    end

    if type(value) == 'number' then
        return value ~= 0
    end

    if type(value) == 'string' then
        local normalized = value:lower()
        if normalized == 'true' or normalized == '1' then
            return true
        end

        if normalized == 'false' or normalized == '0' then
            return false
        end
    end

    return default == true
end

local function cruiseModeFullDefault()
    local cc = config.cruiseControl
    if not cc then
        return true
    end
    return cc.autoThrottle ~= false
end

local function getDefaultPresetName()
    if config.HudPresets and config.HudPresets[config.defaultHudPreset] then
        return config.defaultHudPreset
    end

    if config.HudPresets and config.HudPresets.classic then
        return 'classic'
    end

    if config.HudPresets then
        for name in pairs(config.HudPresets) do
            return name
        end
    end

    return 'classic'
end

local function getPresetByName(name, fallbackName)
    local presets = config.HudPresets or {}
    if type(name) == 'string' and presets[name] then
        return name, presets[name]
    end

    if type(fallbackName) == 'string' and presets[fallbackName] then
        return fallbackName, presets[fallbackName]
    end

    local defaultName = getDefaultPresetName()
    return defaultName, presets[defaultName] or {}
end

local function buildPresetOptions()
    local presets = config.HudPresets or {}
    local options = {}
    local seen = {}

    for _, name in ipairs(DEFAULT_PRESET_ORDER) do
        local preset = presets[name]
        if preset then
            options[#options + 1] = {
                value = name,
                label = preset.label or name,
            }
            seen[name] = true
        end
    end

    for name, preset in pairs(presets) do
        if not seen[name] then
            options[#options + 1] = {
                value = name,
                label = preset.label or name,
            }
        end
    end

    return options
end

local BACKDROP_BLUR_MIN = 0.25
local BACKDROP_BLUR_MAX = 3.0

local PANEL_OPACITY_MIN = 0.15
local PANEL_OPACITY_MAX = 1.0

local function normalizePanelOpacity(value)
    local n = tonumber(value)
    if not n then
        return nil
    end

    if n >= 15 and n <= 100 then
        n = n / 100
    end

    if n < PANEL_OPACITY_MIN then
        return PANEL_OPACITY_MIN
    end

    if n > PANEL_OPACITY_MAX then
        return PANEL_OPACITY_MAX
    end

    return n
end

local function normalizeBackdropBlur(value)
    local n = tonumber(value)
    if not n then
        return nil
    end

    if n >= 25 and n <= 300 then
        n = n / 100
    end

    if n < BACKDROP_BLUR_MIN then
        return BACKDROP_BLUR_MIN
    end

    if n > BACKDROP_BLUR_MAX then
        return BACKDROP_BLUR_MAX
    end

    return n
end

local function buildDefaultSettings()
    return {
        layoutPreset = getDefaultPresetName(),
        colorPreset = getDefaultPresetName(),
        speedUnit = config.speedUnit or 'mph',
        disableSpeedometer = config.disableSpeedometer == true,
        showPostal = config.EnablePostal ~= false,
        showPostalDistance = config.ShowPostalDistance == true,
        statusIconShape = 'preset',
        hungerThreshold = config.StatusIcons.hungerThreshold or 100,
        thirstThreshold = config.StatusIcons.thirstThreshold or 100,
        stressThreshold = config.StatusIcons.stressThreshold or 100,
        oxygenThreshold = config.StatusIcons.oxygenThreshold or 100,
        colorHealth = 'preset',
        colorArmor = 'preset',
        colorHunger = 'preset',
        colorThirst = 'preset',
        colorStress = 'preset',
        colorOxygen = 'preset',
        mapNotifications = config.mapNotifications ~= false,
        lowFuelAlert = config.lowFuelAlert ~= false,
        cinematicNotifications = config.cinematicNotifications ~= false,
        cinematicKey = config.cinematicKey or 'F7',
        minimapOnlyInVehicle = config.minimapOnlyInVehicle == true,
        speedometerPositionMode = 'preset',
        speedometerPosX = 0,
        speedometerPosY = 0,
        fuelDisplayStyle = 'preset',
        colorAmmo = 'preset',
        ammoPosX = 0,
        ammoPosY = 0,
        ammoPositionPreset = 'preset',
        showCrosshair = config.showCrosshair == true,
        gta6HudEnabled = config.gta6HudEnabled == true,
        gta6ShowWeaponName = config.gta6ShowWeaponName ~= false,
        gta6VehicleIdentification = config.gta6VehicleIdentification ~= false,
        showDynamicWeather = config.showDynamicWeather == true,
        showFlashFloodWarning = config.showFlashFloodWarning ~= false,
        showHurricaneWarning = config.showHurricaneWarning ~= false,
        sectionedBars = config.sectionedBars == true,
        sectionedIndicator = config.sectionedIndicator == true,
        backdropBlur = normalizeBackdropBlur(config.backdropBlur) or 1.0,
        panelOpacity = normalizePanelOpacity(config.panelOpacity) or 1.0,
        oxygenDisplayLocation = config.oxygenDisplayLocation or 'statusCluster',
        cruiseAutoThrottle = cruiseModeFullDefault(),
    }
end

local COLOR_OPTIONS = {
    { value = '#ffffff', label = 'White' },
    { value = '#10b981', label = 'Green' },
    { value = '#5eb2ff', label = 'Blue' },
    { value = '#38bdf8', label = 'Cyan' },
    { value = '#f59e0b', label = 'Amber' },
    { value = '#ef4444', label = 'Red' },
    { value = '#8b5cf6', label = 'Violet' },
}

local SHAPE_OPTIONS = {
    { value = 'hexagon', label = 'Hexagon' },
    { value = 'circle', label = 'Circle' },
    { value = 'bar', label = 'Bar' },
}

local FUEL_DISPLAY_OPTIONS = {
    { value = 'bar', label = 'Bar' },
    { value = 'radial', label = 'Radial' },
}

local OXYGEN_DISPLAY_OPTIONS = {
    { value = 'statusCluster', label = 'Status Cluster' },
    { value = 'indicator', label = 'Indicator Bar' },
}

local AMMO_POSITION_OPTIONS = {
    { value = 'preset', label = 'HUD Preset' },
    { value = 'custom', label = 'Custom (Drag)' },
    { value = 'bottom-right', label = 'Bottom Right' },
    { value = 'top-right', label = 'Top Right' },
    { value = 'top-left', label = 'Top Left' },
    { value = 'bottom-center', label = 'Bottom Middle' },
}

local function isDynamicWeatherResourceReady()
    for _, resName in ipairs({ 'Dynamic_weather', 'dynamic_weather' }) do
        if GetResourceState(resName) == 'started' then
            local ex = nil
            pcall(function()
                ex = exports[resName]
            end)
            if type(ex) == 'table' then
                if type(ex.getHudWeatherSnapshot) == 'function' then
                    return true
                end
                if type(ex.getPlayerWeather) == 'function' or type(ex.getCurrentWeather) == 'function' then
                    return true
                end
            end
        end
    end
    return false
end

local function getSettingsDefinition()
    local defaultShape = config.StatusIcons.iconShape
    if not defaultShape or defaultShape == '' or defaultShape == 'preset' then
        defaultShape = 'hexagon'
    end

    local defaultHealthColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.health) or DEFAULT_STATUS_COLORS.health
    local defaultArmorColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.armor) or DEFAULT_STATUS_COLORS.armor
    local defaultHungerColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.hunger) or DEFAULT_STATUS_COLORS.hunger
    local defaultThirstColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.thirst) or DEFAULT_STATUS_COLORS.thirst
    local defaultStressColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.stress) or DEFAULT_STATUS_COLORS.stress
    local defaultOxygenColor = (config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors.oxygen) or DEFAULT_STATUS_COLORS.oxygen

    local defaultFuelDisplayStyle = config.fuelDisplayStyle
    if not defaultFuelDisplayStyle or defaultFuelDisplayStyle == '' or defaultFuelDisplayStyle == 'preset' then
        defaultFuelDisplayStyle = 'bar'
    end

    local defaultAmmoColor = config.ammoColor
    if not defaultAmmoColor or defaultAmmoColor == '' or defaultAmmoColor == 'preset' then
        defaultAmmoColor = '#10b981'
    end

    local defaultAmmoPosition = config.ammoPositionPreset
    if not defaultAmmoPosition or defaultAmmoPosition == '' then
        defaultAmmoPosition = 'preset'
    end

    local isDyn = isDynamicWeatherResourceReady()
    local res = {
        label = 'HUD',
        settings = {
            {
                key = 'hud_colorPreset',
                type = 'select',
                label = 'Color Preset',
                description = 'Choose a unified HUD color and accent theme',
                default = getDefaultPresetName(),
                options = buildPresetOptions(),
            },
            {
                key = 'hud_backdropBlur',
                type = 'slider',
                label = 'Glass blur',
                description = 'Frost strength (rim + fill density). Real backdrop-filter blur breaks in FiveM CEF (black rects); this simulates glass with tint.',
                default = math.floor((normalizeBackdropBlur(config.backdropBlur) or 1.0) * 100 + 0.5),
                min = 25,
                max = 300,
                step = 5,
                suffix = '%',
            },
            {
                key = 'hud_panelOpacity',
                type = 'slider',
                label = 'Panel opacity',
                description = 'Multiplies glass fill. Floor at 15% so panels never go fully see-through; combine with Glass blur for readability.',
                default = math.floor((normalizePanelOpacity(config.panelOpacity) or 1.0) * 100 + 0.5),
                min = 15,
                max = 100,
                step = 5,
                suffix = '%',
            },
            {
                key = 'hud_speedUnit',
                type = 'select',
                label = 'Speed Unit',
                description = 'Speedometer display unit',
                default = config.speedUnit or 'mph',
                options = {
                    { value = 'mph', label = 'MPH' },
                    { value = 'kph', label = 'KPH' },
                },
            },
            {
                key = 'hud_disableSpeedometer',
                type = 'toggle',
                label = 'Disable Speedometer',
                description = 'Hide the vehicle speedometer HUD element',
                default = config.disableSpeedometer == true,
            },
            {
                key = 'hud_showPostal',
                type = 'toggle',
                label = 'Show Postal',
                description = 'Display nearest postal code',
                default = config.EnablePostal ~= false,
            },
            {
                key = 'hud_showPostalDistance',
                type = 'toggle',
                label = 'Postal Distance',
                description = 'Show distance to nearest postal',
                default = config.ShowPostalDistance == true,
            },
            {
                key = 'hud_showCrosshair',
                type = 'toggle',
                label = 'Crosshair Dot',
                description = 'Show a small aiming dot while armed',
                default = config.showCrosshair == true,
            },
            {
                key = 'hud_gta6HudEnabled',
                type = 'toggle',
                label = 'GTA 6 HUD',
                description = 'Use contextual vitals, an active weapon display, and brief GTA V place discoveries',
                default = config.gta6HudEnabled == true,
            },
            {
                key = 'hud_gta6ShowWeaponName',
                type = 'toggle',
                label = 'GTA 6 Weapon Name',
                description = 'Show the active weapon name beside its icon in GTA 6 HUD mode',
                default = config.gta6ShowWeaponName ~= false,
            },
            {
                key = 'hud_gta6VehicleIdentification',
                type = 'toggle',
                label = 'GTA 6 Vehicle Introduction',
                description = 'Show brand, model, engine health, and fuel when entering a vehicle',
                default = config.gta6VehicleIdentification ~= false,
                hidden = true,
            },
            {
                key = 'hud_statusIconShape',
                type = 'select',
                label = 'Status Icon Shape',
                description = 'Choose the status icon style',
                default = defaultShape,
                options = SHAPE_OPTIONS,
            },
            {
                key = 'hud_sectionedBars',
                type = 'toggle',
                label = 'Sectioned Bars',
                description = 'Health/armor bar mode: four 25% capsule segments with gaps (bar layout only)',
                default = config.sectionedBars == true,
            },
            {
                key = 'hud_sectionedIndicator',
                type = 'toggle',
                label = 'Segmented top bar',
                description = 'Location strip as separate rounded capsules with gaps (same vibe as sectioned bars)',
                default = config.sectionedIndicator == true,
            },
            {
                key = 'hud_hungerThreshold',
                type = 'slider',
                label = 'Hunger Threshold',
                description = 'Show icon when hunger is below this %',
                default = config.StatusIcons.hungerThreshold or 100,
                min = 0,
                max = 100,
                suffix = '%',
            },
            {
                key = 'hud_thirstThreshold',
                type = 'slider',
                label = 'Thirst Threshold',
                description = 'Show icon when thirst is below this %',
                default = config.StatusIcons.thirstThreshold or 100,
                min = 0,
                max = 100,
                suffix = '%',
            },
            {
                key = 'hud_stressThreshold',
                type = 'slider',
                label = 'Stress Threshold',
                description = 'Show icon when stress is above this %',
                default = config.StatusIcons.stressThreshold or 100,
                min = 0,
                max = 100,
                suffix = '%',
            },
            {
                key = 'hud_oxygenThreshold',
                type = 'slider',
                label = 'Oxygen Threshold',
                description = 'Show icon when oxygen is below this %',
                default = config.StatusIcons.oxygenThreshold or 100,
                min = 0,
                max = 100,
                suffix = '%',
            },
            {
                key = 'hud_oxygenDisplayLocation',
                type = 'select',
                label = 'Oxygen Display',
                description = 'Show oxygen as a full status meter or in the top indicator bar',
                default = config.oxygenDisplayLocation or 'statusCluster',
                options = OXYGEN_DISPLAY_OPTIONS,
            },
            {
                key = 'hud_cruiseAutoThrottle',
                type = 'toggle',
                label = 'Cruise: full control vs speed limiter',
                description = 'On: full cruise control—auto-throttle to hold the set speed. Off: speed limiter only—caps your top speed; you keep pressing the accelerator (no auto throttle).',
                default = cruiseModeFullDefault(),
            },
            {
                key = 'hud_color_health',
                type = 'select',
                label = 'Health Bar Color',
                description = 'Choose the health bar color',
                default = defaultHealthColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_armor',
                type = 'select',
                label = 'Armor Bar Color',
                description = 'Choose the armor bar color',
                default = defaultArmorColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_hunger',
                type = 'select',
                label = 'Hunger Bar Color',
                description = 'Choose the hunger bar color',
                default = defaultHungerColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_thirst',
                type = 'select',
                label = 'Thirst Bar Color',
                description = 'Choose the thirst bar color',
                default = defaultThirstColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_stress',
                type = 'select',
                label = 'Stress Bar Color',
                description = 'Choose the stress bar color',
                default = defaultStressColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_oxygen',
                type = 'select',
                label = 'Oxygen Bar Color',
                description = 'Choose the oxygen bar color',
                default = defaultOxygenColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_ammo',
                type = 'select',
                label = 'Ammo Counter Color',
                description = 'Choose the ammo counter color',
                default = defaultAmmoColor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_cinematicKey',
                type = 'select',
                label = 'Cinematic Hotkey',
                description = 'Key to toggle cinematic mode',
                default = config.cinematicKey or 'F7',
                options = {
                    { value = '', label = 'None' },
                    { value = 'F7', label = 'F7' },
                    { value = 'F8', label = 'F8' },
                    { value = 'F9', label = 'F9' },
                    { value = 'F10', label = 'F10' },
                    { value = 'F11', label = 'F11' },
                    { value = 'HOME', label = 'HOME' },
                    { value = 'END', label = 'END' },
                    { value = 'DELETE', label = 'DEL' },
                    { value = 'INSERT', label = 'INS' },
                },
            },
            {
                key = 'hud_minimapOnlyInVehicle',
                type = 'checkbox',
                label = 'Show Minimap Only In Vehicle',
                description = 'Hide minimap when on foot',
                default = config.minimapOnlyInVehicle == true,
            },
            {
                key = 'hud_mapNotifications',
                type = 'checkbox',
                label = 'Map Notifications Enabled',
                description = 'Show notifications on the map',
                default = config.mapNotifications ~= false,
            },
            {
                key = 'hud_lowFuelAlert',
                type = 'checkbox',
                label = 'Low Fuel Alert Enabled',
                description = 'Show alert when fuel is low',
                default = config.lowFuelAlert ~= false,
            },
            {
                key = 'hud_cinematicNotifications',
                type = 'checkbox',
                label = 'Cinematic Mode Notifications',
                description = 'Show notification when toggling cinematic mode',
                default = config.cinematicNotifications ~= false,
            },
            {
                key = 'hud_speedometerPosX',
                type = 'slider',
                label = 'Speedometer X',
                description = 'internal',
                default = 0,
                min = 0,
                max = 10000,
                hidden = true,
            },
            {
                key = 'hud_speedometerPosY',
                type = 'slider',
                label = 'Speedometer Y',
                description = 'internal',
                default = 0,
                min = 0,
                max = 10000,
                hidden = true,
            },
            {
                key = 'hud_fuelDisplayStyle',
                type = 'select',
                label = 'Fuel Display Style',
                description = 'Show fuel as a bar below the speedo or as a radial arc',
                default = defaultFuelDisplayStyle,
                options = FUEL_DISPLAY_OPTIONS,
            },
            {
                key = 'hud_ammoPositionPreset',
                type = 'select',
                label = 'Ammo Position',
                description = 'Choose an anchor or use manual drag placement',
                default = defaultAmmoPosition,
                options = AMMO_POSITION_OPTIONS,
            },
            {
                key = 'hud_speedometerActions',
                type = 'action',
                label = 'Speedometer Position',
                description = 'Move or reset speedometer placement',
                actions = {
                    { action = 'speedometer_move', label = 'Move' },
                    { action = 'speedometer_reset', label = 'Reset' },
                },
            },
            {
                key = 'hud_ammoActions',
                type = 'action',
                label = 'Ammo Position',
                description = 'Move or reset ammo placement',
                actions = {
                    { action = 'ammo_move', label = 'Move' },
                    { action = 'ammo_reset', label = 'Reset' },
                },
            },
        },
        sections = {
            { label = 'Appearance', keys = { 'hud_backdropBlur', 'hud_panelOpacity' } },
            { label = 'HUD Style', keys = { 'hud_gta6HudEnabled', 'hud_gta6ShowWeaponName' } },
            { label = 'Speedometer', keys = { 'hud_speedUnit', 'hud_fuelDisplayStyle', 'hud_disableSpeedometer', 'hud_cruiseAutoThrottle', 'hud_speedometerActions' } },
            { label = 'Postal', keys = { 'hud_showPostal', 'hud_showPostalDistance' } },
            { label = 'Weather', keys = { 'hud_showDynamicWeather', 'hud_showFlashFloodWarning', 'hud_showHurricaneWarning' } },
            { label = 'Status Icons', keys = { 'hud_statusIconShape', 'hud_sectionedBars', 'hud_sectionedIndicator', 'hud_hungerThreshold', 'hud_thirstThreshold', 'hud_stressThreshold', 'hud_oxygenThreshold', 'hud_oxygenDisplayLocation' } },
            { label = 'Colors', keys = { 'hud_colorPreset', 'hud_color_health', 'hud_color_armor', 'hud_color_hunger', 'hud_color_thirst', 'hud_color_stress', 'hud_color_oxygen', 'hud_color_ammo' } },
            { label = 'Minimap', keys = { 'hud_minimapOnlyInVehicle' } },
            { label = 'Notifications', keys = { 'hud_mapNotifications', 'hud_lowFuelAlert', 'hud_cinematicNotifications' } },
            { label = 'Cinematic Mode', keys = { 'hud_cinematicKey' } },
            { label = 'Ammo', keys = { 'hud_ammoPositionPreset', 'hud_ammoActions' } },
        },
    }

    if isDyn then
        for i, e in ipairs(res.settings) do
            if e.key == 'hud_statusIconShape' then
                table.insert(res.settings, i, {
                    key = 'hud_showDynamicWeather',
                    type = 'toggle',
                    label = 'Dynamic Weather (indicator)',
                    description = 'Forecast icons and rain ETA in the top bar when Dynamic_weather is running',
                    default = config.showDynamicWeather == true,
                })
                table.insert(res.settings, i + 1, {
                    key = 'hud_showFlashFloodWarning',
                    type = 'toggle',
                    label = 'Flash flood warning (indicator)',
                    description = 'Shows the flash flood segment in the location bar when Dynamic_weather reports an active flood',
                    default = config.showFlashFloodWarning ~= false,
                })
                table.insert(res.settings, i + 2, {
                    key = 'hud_showHurricaneWarning',
                    type = 'toggle',
                    label = 'Hurricane warning (indicator)',
                    description = 'Shows the hurricane segment when Dynamic_weather reports an active hurricane',
                    default = config.showHurricaneWarning ~= false,
                })
                break
            end
        end
    else
        for i, sec in ipairs(res.sections) do
            if sec.label == 'Weather' then
                table.remove(res.sections, i)
                break
            end
        end
    end

    return res
end

exports('getSettingsDefinition', getSettingsDefinition)

local function getColorFallback(key)
    if config.StatusIcons and config.StatusIcons.colors and config.StatusIcons.colors[key] then
        return config.StatusIcons.colors[key]
    end

    return DEFAULT_STATUS_COLORS[key]
end

local function resolveColor(rawValue, presetTheme, key)
    if rawValue and rawValue ~= '' and rawValue ~= 'preset' then
        return rawValue
    end

    if presetTheme and presetTheme[key] then
        return presetTheme[key]
    end

    return getColorFallback(key)
end

local function buildResolvedSpeedometerPos(data)
    local posX = tonumber(data.speedometerPosX) or 0
    local posY = tonumber(data.speedometerPosY) or 0
    if data.speedometerPositionMode == 'custom' and posX > 0 and posY > 0 then
        return { left = posX, top = posY }
    end

    return false
end

local function buildResolvedAmmoPos(data, resolvedAmmoPositionPreset)
    local posX = tonumber(data.ammoPosX) or 0
    local posY = tonumber(data.ammoPosY) or 0
    if resolvedAmmoPositionPreset == 'custom' and posX >= 0 and posY >= 0 then
        return { left = posX, top = posY }
    end

    return false
end

local function resolveHudPresentation(data)
    local layoutPresetName, layoutPreset = getPresetByName(data.layoutPreset)
    local colorPresetName, colorPreset = getPresetByName(data.colorPreset, layoutPresetName)
    local presetLayout = copyTable(layoutPreset.layout or {})
    local presetDefaults = layoutPreset.defaults or {}
    local presetTheme = mergeTable(layoutPreset.theme or {}, colorPreset.theme or {})

    local resolvedStatusIconShape = data.statusIconShape
    if not resolvedStatusIconShape or resolvedStatusIconShape == '' or resolvedStatusIconShape == 'preset' then
        resolvedStatusIconShape = presetDefaults.statusIconShape or config.StatusIcons.iconShape or 'hexagon'
    end

    local resolvedFuelDisplayStyle = data.fuelDisplayStyle
    if not resolvedFuelDisplayStyle or resolvedFuelDisplayStyle == '' or resolvedFuelDisplayStyle == 'preset' then
        resolvedFuelDisplayStyle = presetDefaults.fuelDisplayStyle or config.fuelDisplayStyle or 'bar'
    end

    local resolvedAmmoPositionPreset = data.ammoPositionPreset
    if not resolvedAmmoPositionPreset or resolvedAmmoPositionPreset == '' or resolvedAmmoPositionPreset == 'preset' then
        local presetAmmoPosition = presetDefaults.ammoPositionPreset
        local presetAmmoLayout = presetLayout.ammo
        if not presetAmmoPosition or presetAmmoPosition == '' or presetAmmoPosition == 'preset' then
            presetAmmoPosition = type(presetAmmoLayout) == 'table' and presetAmmoLayout.anchor
                or config.ammoPositionPreset
                or 'bottom-right'
        end
        resolvedAmmoPositionPreset = presetAmmoPosition
    end

    if not resolvedAmmoPositionPreset or resolvedAmmoPositionPreset == '' or resolvedAmmoPositionPreset == 'preset' then
        resolvedAmmoPositionPreset = 'bottom-right'
    end

    local colors = {
        health = resolveColor(data.colorHealth, presetTheme, 'health'),
        armor = resolveColor(data.colorArmor, presetTheme, 'armor'),
        hunger = resolveColor(data.colorHunger, presetTheme, 'hunger'),
        thirst = resolveColor(data.colorThirst, presetTheme, 'thirst'),
        stress = resolveColor(data.colorStress, presetTheme, 'stress'),
        oxygen = resolveColor(data.colorOxygen, presetTheme, 'oxygen'),
    }

    local resolvedAmmoColor = data.colorAmmo
    if not resolvedAmmoColor or resolvedAmmoColor == '' or resolvedAmmoColor == 'preset' then
        resolvedAmmoColor = presetTheme.ammo or config.ammoColor or '#10b981'
    end

    local theme = copyTable(presetTheme)
    theme.surface = theme.surface or 'rgba(10, 14, 20, 0.48)'
    theme.surfaceBorder = theme.surfaceBorder or 'rgba(255, 255, 255, 0.12)'
    theme.text = theme.text or '#f8fafc'
    theme.mutedText = theme.mutedText or 'rgba(226, 232, 240, 0.68)'
    theme.indicatorAccent = theme.indicatorAccent or colors.health
    theme.speedometerAccent = theme.speedometerAccent or colors.health
    theme.voipAccent = theme.voipAccent or '#10b981'
    theme.ammo = resolvedAmmoColor
    theme.health = colors.health
    theme.armor = colors.armor
    theme.hunger = colors.hunger
    theme.thirst = colors.thirst
    theme.stress = colors.stress
    theme.oxygen = colors.oxygen
    theme.backdropBlur = normalizeBackdropBlur(data.backdropBlur) or normalizeBackdropBlur(config.backdropBlur) or 1.0
    theme.panelOpacity = normalizePanelOpacity(data.panelOpacity) or normalizePanelOpacity(config.panelOpacity) or 1.0

    return {
        layoutPreset = layoutPresetName,
        colorPreset = colorPresetName,
        layout = presetLayout,
        theme = theme,
        colors = colors,
        resolvedStatusIconShape = resolvedStatusIconShape,
        resolvedFuelDisplayStyle = resolvedFuelDisplayStyle,
        resolvedAmmoPositionPreset = resolvedAmmoPositionPreset,
        speedometerPos = buildResolvedSpeedometerPos(data),
        ammoPos = buildResolvedAmmoPos(data, resolvedAmmoPositionPreset),
        ammoColor = resolvedAmmoColor,
    }
end

local function pushResolvedHud(data)
    local presentation = resolveHudPresentation(data)

    SendNUIMessage({
        action = 'updateStatusConfig',
        layoutPreset = presentation.layoutPreset,
        colorPreset = presentation.colorPreset,
        layout = presentation.layout,
        theme = presentation.theme,
        statusIconShape = presentation.resolvedStatusIconShape,
        resolvedStatusIconShape = presentation.resolvedStatusIconShape,
        hungerThreshold = config.StatusIcons.hungerThreshold,
        thirstThreshold = config.StatusIcons.thirstThreshold,
        stressThreshold = config.StatusIcons.stressThreshold,
        oxygenThreshold = config.StatusIcons.oxygenThreshold,
        statusRingWidth = config.StatusIcons.ringWidth or 42,
        statusRingHeight = config.StatusIcons.ringHeight or 48,
        showVoip = config.StatusIcons.showVoip ~= false,
        standaloneVoipHudEnabled = config.standaloneVoipHudEnabled == true,
        framework = config.framework or 'standalone',
        colors = presentation.colors,
        speedometerPos = presentation.speedometerPos,
        fuelDisplayStyle = presentation.resolvedFuelDisplayStyle,
        resolvedFuelDisplayStyle = presentation.resolvedFuelDisplayStyle,
        ammoColor = presentation.ammoColor,
        ammoPositionPreset = data.ammoPositionPreset or 'preset',
        resolvedAmmoPositionPreset = presentation.resolvedAmmoPositionPreset,
        ammoPos = presentation.ammoPos,
        showCrosshair = config.showCrosshair,
        gta6HudEnabled = config.gta6HudEnabled == true,
        gta6ShowWeaponName = config.gta6ShowWeaponName ~= false,
        gta6VehicleIdentification = config.gta6VehicleIdentification ~= false,
        sectionedBars = data.sectionedBars == true,
        sectionedIndicator = data.sectionedIndicator == true,
        oxygenDisplayLocation = data.oxygenDisplayLocation or config.oxygenDisplayLocation or 'statusCluster',
        showDynamicWeather = config.showDynamicWeather == true,
        showFlashFloodWarning = config.showFlashFloodWarning ~= false,
        showHurricaneWarning = config.showHurricaneWarning ~= false,
    })
end

function Settings.apply(data, options)
    if not data then
        return
    end

    options = options or {}
    local refreshMinimap = options.refreshMinimap
    if refreshMinimap == nil then
        refreshMinimap = true
    end

    local presentation = resolveHudPresentation(data)

    config.layoutPreset = presentation.layoutPreset
    config.colorPreset = presentation.colorPreset
    config.speedUnit = data.speedUnit or config.speedUnit
    config.disableSpeedometer = toBoolean(data.disableSpeedometer, config.disableSpeedometer == true)
    config.EnablePostal = toBoolean(data.showPostal, config.EnablePostal ~= false)
    config.ShowPostalDistance = toBoolean(data.showPostalDistance, config.ShowPostalDistance == true)
    config.StatusIcons.iconShape = presentation.resolvedStatusIconShape
    config.StatusIcons.hungerThreshold = tonumber(data.hungerThreshold) or config.StatusIcons.hungerThreshold
    config.StatusIcons.thirstThreshold = tonumber(data.thirstThreshold) or config.StatusIcons.thirstThreshold
    config.StatusIcons.stressThreshold = tonumber(data.stressThreshold) or config.StatusIcons.stressThreshold
    config.StatusIcons.oxygenThreshold = tonumber(data.oxygenThreshold) or config.StatusIcons.oxygenThreshold
    config.StatusIcons.colors = copyTable(presentation.colors)
    config.showCrosshair = toBoolean(data.showCrosshair, config.showCrosshair == true)
    config.gta6HudEnabled = toBoolean(data.gta6HudEnabled, config.gta6HudEnabled == true)
    config.gta6ShowWeaponName = toBoolean(data.gta6ShowWeaponName, config.gta6ShowWeaponName ~= false)
    config.gta6VehicleIdentification = toBoolean(data.gta6VehicleIdentification, config.gta6VehicleIdentification ~= false)
    config.showDynamicWeather = toBoolean(data.showDynamicWeather, config.showDynamicWeather == true)
    if not config.showDynamicWeather then
        SendNUIMessage({
            action = 'updateDynamicWeather',
            show = false,
        })
    end
    config.showFlashFloodWarning = toBoolean(data.showFlashFloodWarning, config.showFlashFloodWarning ~= false)
    if not config.showFlashFloodWarning then
        SendNUIMessage({
            action = 'updateFloodWarning',
            active = false,
            detail = nil,
        })
    end
    config.showHurricaneWarning = toBoolean(data.showHurricaneWarning, config.showHurricaneWarning ~= false)
    if not config.showHurricaneWarning then
        SendNUIMessage({
            action = 'updateHurricaneWarning',
            active = false,
            detail = nil,
        })
    end
    config.sectionedBars = toBoolean(data.sectionedBars, config.sectionedBars == true)
    config.sectionedIndicator = toBoolean(data.sectionedIndicator, config.sectionedIndicator == true)
    config.oxygenDisplayLocation = data.oxygenDisplayLocation or config.oxygenDisplayLocation or 'statusCluster'
    config.cruiseControl = config.cruiseControl or {}
    config.cruiseControl.autoThrottle = toBoolean(data.cruiseAutoThrottle, cruiseModeFullDefault())
    config.mapNotifications = toBoolean(data.mapNotifications, config.mapNotifications ~= false)
    config.lowFuelAlert = toBoolean(data.lowFuelAlert, config.lowFuelAlert ~= false)
    config.cinematicNotifications = toBoolean(data.cinematicNotifications, config.cinematicNotifications ~= false)
    config.cinematicKey = data.cinematicKey or config.cinematicKey
    config.minimapOnlyInVehicle = toBoolean(data.minimapOnlyInVehicle, config.minimapOnlyInVehicle == true)
    config.backdropBlur = normalizeBackdropBlur(data.backdropBlur) or normalizeBackdropBlur(config.backdropBlur) or 1.0
    config.panelOpacity = normalizePanelOpacity(data.panelOpacity) or normalizePanelOpacity(config.panelOpacity) or 1.0
    config.fuelDisplayStyle = presentation.resolvedFuelDisplayStyle
    config.ammoColor = presentation.ammoColor
    config.ammoPositionPreset = data.ammoPositionPreset or config.ammoPositionPreset or 'preset'
    config.speedometerPositionMode = data.speedometerPositionMode or config.speedometerPositionMode or 'preset'

    pushResolvedHud(data)
    Settings.registerCinematicKey(config.cinematicKey)
    TriggerEvent('cortex-hud:client:syncMinimap', 'settings_apply', refreshMinimap == true)
end

local function setLibSetting(key, value)
    pcall(function()
        libSettings.setSetting(key, value)
    end)
end

local function persistSettingsData(data)
    if type(data) ~= 'table' then
        return
    end

    for hudKey, libKey in pairs(HUD_TO_LIB_KEY) do
        local v = data[hudKey]
        if v == nil then
            v = data[libKey]
        end
        if v ~= nil then
            if libKey == 'hud_backdropBlur' and type(v) == 'number' and v <= 3 then
                v = math_floor(v * 100 + 0.5)
            end
            if libKey == 'hud_panelOpacity' and type(v) == 'number' and v <= 1 then
                v = math_floor(v * 100 + 0.5)
            end
            if libKey == 'hud_gta6HudEnabled' then
                v = toBoolean(v, false)
            end
            if libKey == 'hud_gta6ShowWeaponName' then
                v = toBoolean(v, true)
            end
            if libKey == 'hud_gta6VehicleIdentification' then
                v = toBoolean(v, true)
            end
            setLibSetting(libKey, v)
        end
    end
end

local function normalizePosition(left, top)
    local posX = math_floor((tonumber(left) or 0) + 0.5)
    local posY = math_floor((tonumber(top) or 0) + 0.5)

    if posX < 0 then
        posX = 0
    end

    if posY < 0 then
        posY = 0
    end

    if posX == 0 or posY == 0 then
        return 0, 0
    end

    return posX, posY
end

local function normalizeAmmoPosition(left, top)
    local posX = math_floor((tonumber(left) or 0) + 0.5)
    local posY = math_floor((tonumber(top) or 0) + 0.5)

    if posX < 0 then
        posX = 0
    end

    if posY < 0 then
        posY = 0
    end

    return posX, posY
end

local function persistSpeedometerState(posX, posY)
    setLibSetting('hud_speedometerPosX', posX)
    setLibSetting('hud_speedometerPosY', posY)
    if posX > 0 and posY > 0 then
        setLibSetting('hud_speedometerPositionMode', 'custom')
    else
        setLibSetting('hud_speedometerPositionMode', 'preset')
    end
end

local function persistAmmoState(posX, posY, positionPreset)
    setLibSetting('hud_ammoPosX', posX)
    setLibSetting('hud_ammoPosY', posY)
    setLibSetting('hud_ammoPositionPreset', positionPreset)
end

function Settings.get()
    local data = buildDefaultSettings()

    pcall(function()
        for libKey, hudKey in pairs(KEY_MAP) do
            local value = libSettings.getSetting(libKey)
            if value ~= nil then
                data[hudKey] = value
            end
        end
    end)

    data.backdropBlur = normalizeBackdropBlur(data.backdropBlur) or 1.0
    data.panelOpacity = normalizePanelOpacity(data.panelOpacity) or 1.0
    data.gta6HudEnabled = toBoolean(data.gta6HudEnabled, false)
    data.gta6ShowWeaponName = toBoolean(data.gta6ShowWeaponName, true)
    data.gta6VehicleIdentification = toBoolean(data.gta6VehicleIdentification, true)

    local speedometerPosX = tonumber(data.speedometerPosX) or 0
    local speedometerPosY = tonumber(data.speedometerPosY) or 0
    if not data.layoutPreset or data.layoutPreset == '' then
        data.layoutPreset = getDefaultPresetName()
    end

    if not data.colorPreset or data.colorPreset == '' then
        data.colorPreset = data.layoutPreset
    end

    if not data.speedometerPositionMode or data.speedometerPositionMode == '' then
        data.speedometerPositionMode = (speedometerPosX > 0 and speedometerPosY > 0) and 'custom' or 'preset'
    end

    local ammoPosX = tonumber(data.ammoPosX) or 0
    local ammoPosY = tonumber(data.ammoPosY) or 0
    if not data.ammoPositionPreset or data.ammoPositionPreset == '' then
        data.ammoPositionPreset = (ammoPosX > 0 and ammoPosY > 0) and 'custom' or 'preset'
    end

    local presentation = resolveHudPresentation(data)
    data.statusIconShape = presentation.resolvedStatusIconShape
    data.colorHealth = presentation.colors.health
    data.colorArmor = presentation.colors.armor
    data.colorHunger = presentation.colors.hunger
    data.colorThirst = presentation.colors.thirst
    data.colorStress = presentation.colors.stress
    data.colorOxygen = presentation.colors.oxygen
    data.fuelDisplayStyle = presentation.resolvedFuelDisplayStyle
    data.colorAmmo = presentation.ammoColor
    data.resolvedAmmoPositionPreset = presentation.resolvedAmmoPositionPreset

    return data
end

function Settings.isCinematicMode()
    return cinematicMode
end

function Settings.toggleCinematic()
    cinematicMode = not cinematicMode

    SendNUIMessage({ action = 'setCinematicMode', enabled = cinematicMode })

    if cinematicMode then
        exports['cortex-hud']:setHudVisibleReason('cinematic', false)
        if config.cinematicNotifications then
            lib.notify({ title = 'HUD', description = 'Cinematic mode enabled', type = 'inform', duration = 2000 })
        end
    else
        exports['cortex-hud']:setHudVisibleReason('cinematic', true)
        if config.cinematicNotifications then
            lib.notify({ title = 'HUD', description = 'Cinematic mode disabled', type = 'inform', duration = 2000 })
        end
    end
end

function Settings.registerCinematicKey(key)
    if not key or key == '' then
        return
    end

    if not cinematicCommandRegistered then
        RegisterCommand('cinematicmode', function()
            Settings.toggleCinematic()
        end, false)
        cinematicCommandRegistered = true
    end

    if cinematicKeyRegisteredKey ~= key then
        RegisterKeyMapping('cinematicmode', 'Toggle Cinematic Mode', 'keyboard', key)
        cinematicKeyRegisteredKey = key
    end
end

local settingsMenuOpen = false

function Settings.open()
    if settingsMenuOpen then
        return
    end
    settingsMenuOpen = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({
        action = 'openSettings',
        settings = Settings.get(),
    })
end

function Settings.close()
    if not settingsMenuOpen then
        return
    end
    settingsMenuOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'settingsClose' })
end

function Settings.isOpen()
    return settingsMenuOpen
end

RegisterNUICallback('settings:save', function(data, cb)
    persistSettingsData(data)


    local merged = Settings.get()
    if type(data) == 'table' then
        for k, v in pairs(data) do
            merged[k] = v
        end
    end

    if data and type(data.speedometerPos) == 'table' then
        local speedometerPosX, speedometerPosY = normalizePosition(data.speedometerPos.left, data.speedometerPos.top)
        persistSpeedometerState(speedometerPosX, speedometerPosY)
    end

    if data and type(data.ammoPos) == 'table' then
        local ammoPosX, ammoPosY = normalizePosition(data.ammoPos.left, data.ammoPos.top)
        local ammoPreset = (ammoPosX > 0 and ammoPosY > 0) and 'custom' or 'preset'
        persistAmmoState(ammoPosX, ammoPosY, ammoPreset)
    end

    Settings.apply(merged, { refreshMinimap = false })
    Settings.close()
    cb('ok')
end)

RegisterNUICallback('settings:close', function(_, cb)
    Settings.close()
    cb('ok')
end)

RegisterCommand('hudsettings', function()
    Settings.open()
end, false)

RegisterKeyMapping('hudsettings', 'Open HUD Settings', 'keyboard', 'I')

AddEventHandler('cortex-lib:settingChanged', function(key, value)
    local hudKey = KEY_MAP[key]
    if not hudKey then
        return
    end

    local current = Settings.get()
    current[hudKey] = value
    Settings.apply(current, { refreshMinimap = false })
end)

AddEventHandler('cortex-lib:settingsAction', function(scriptId, action)
    if scriptId ~= 'cortex-hud' then
        return
    end

    if action == 'speedometer_move' or action == 'ammo_move' then
        SendNUIMessage({ action = 'closeSettings' })
        SendNUIMessage({ action = 'settingsClose' })
        SetNuiFocus(false, false)
        pcall(function()
            exports['cortex-lib']:closeSettingsMenu()
        end)
        Wait(200)
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(false)
        if action == 'speedometer_move' then
            SendNUIMessage({ action = 'startSpeedometerMove' })
        else
            SendNUIMessage({ action = 'startAmmoMove' })
        end
        return
    end

    if action == 'speedometer_reset' then
        persistSpeedometerState(0, 0)
        Settings.apply(Settings.get(), { refreshMinimap = false })
        return
    end

    if action == 'ammo_reset' then
        persistAmmoState(0, 0, 'preset')
        Settings.apply(Settings.get(), { refreshMinimap = false })
    end
end)

Nui.onReady(function()
    Settings.apply(Settings.get(), { refreshMinimap = false })
end)

RegisterNUICallback('speedometer:startEdit', function(_, cb)
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    cb('ok')
end)

RegisterNUICallback('ammo:startEdit', function(_, cb)
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    cb('ok')
end)

RegisterNUICallback('speedometer:endEdit', function(data, cb)
    SetNuiFocus(false, false)

    if data and data.saved then
        local posX, posY = normalizePosition(data.left, data.top)
        persistSpeedometerState(posX, posY)
        Settings.apply(Settings.get(), { refreshMinimap = false })
    end

    cb('ok')
end)

RegisterNUICallback('ammo:endEdit', function(data, cb)
    SetNuiFocus(false, false)

    if data and data.saved and data.hasPosition == true then
        local posX, posY = normalizeAmmoPosition(data.left, data.top)
        local preset = 'custom'
        persistAmmoState(posX, posY, preset)
        Settings.apply(Settings.get(), { refreshMinimap = false })
    end

    cb('ok')
end)

CreateThread(function()
    Wait(2000)
    Settings.apply(Settings.get())
end)

return Settings
