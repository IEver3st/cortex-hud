local config = lib.require("config.shared")
local minimap = lib.require("modules.utility.shared.minimap")

local Settings = {}

local SendNUIMessage = SendNUIMessage
local DisplayRadar = DisplayRadar
local IsPedInAnyVehicle = IsPedInAnyVehicle
local PlayerPedId = PlayerPedId
local ExecuteCommand = ExecuteCommand
local GetConvar = GetConvar

local cinematicMode = false
local cinematicCommandRegistered = false
local cinematicKeyRegisteredKey = nil

-- ============================================================================
-- KEY MAPPING: es_lib setting keys -> HUD config fields
-- ============================================================================

-- Maps es_lib flat keys to the HUD's internal Settings.apply() format
local KEY_MAP = {
    hud_speedUnit           = 'speedUnit',
    hud_disableSpeedometer  = 'disableSpeedometer',
    hud_showPostal          = 'showPostal',
    hud_showPostalDistance   = 'showPostalDistance',
    hud_hungerThreshold     = 'hungerThreshold',
    hud_thirstThreshold     = 'thirstThreshold',
    hud_stressThreshold     = 'stressThreshold',
    hud_oxygenThreshold     = 'oxygenThreshold',
    hud_mapNotifications    = 'mapNotifications',
    hud_lowFuelAlert        = 'lowFuelAlert',
    hud_cinematicNotifications = 'cinematicNotifications',
    hud_cinematicKey        = 'cinematicKey',
    hud_minimapOnlyInVehicle = 'minimapOnlyInVehicle',
    hud_speedometerPosY     = 'speedometerPosY',
    hud_color_health        = 'colorHealth',
    hud_color_armor         = 'colorArmor',
    hud_color_hunger        = 'colorHunger',
    hud_color_thirst        = 'colorThirst',
    hud_color_stress        = 'colorStress',
    hud_color_oxygen        = 'colorOxygen',
    hud_fuelDisplayStyle    = 'fuelDisplayStyle',
    hud_color_ammo          = 'colorAmmo',
    hud_ammoPosX            = 'ammoPosX',
    hud_ammoPosY            = 'ammoPosY',
    hud_ammoPositionPreset   = 'ammoPositionPreset',
    hud_showCrosshair       = 'showCrosshair',
}

local function clampNumber(value, min, max)
    value = tonumber(value)
    if not value then return nil end
    if value < min then return min end
    if value > max then return max end
    return value
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

-- ============================================================================
-- SETTINGS DEFINITION FOR ES_LIB AUTO-DETECTION
-- ============================================================================

local function getSettingsDefinition()
    return {
        label = 'HUD',
        settings = {
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
                description = 'yes i cant aim please help',
                default = config.showCrosshair == true,
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
                key = 'hud_color_health',
                type = 'select',
                label = 'Health Bar Color',
                description = 'Change the color of your health bar',
                default = config.StatusIcons.colors.health,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_armor',
                type = 'select',
                label = 'Armor Bar Color',
                description = 'Change the color of your armor bar',
                default = config.StatusIcons.colors.armor,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_hunger',
                type = 'select',
                label = 'Hunger Bar Color',
                description = 'Change the color of your hunger bar',
                default = config.StatusIcons.colors.hunger,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_thirst',
                type = 'select',
                label = 'Thirst Bar Color',
                description = 'Change the color of your thirst bar',
                default = config.StatusIcons.colors.thirst,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_stress',
                type = 'select',
                label = 'Stress Bar Color',
                description = 'Change the color of your stress bar',
                default = config.StatusIcons.colors.stress,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_color_oxygen',
                type = 'select',
                label = 'Oxygen Bar Color',
                description = 'Change the color of your oxygen bar',
                default = config.StatusIcons.colors.oxygen,
                options = COLOR_OPTIONS,
            },
            {
                key = 'hud_cinematicKey',
                type = 'select',
                label = 'Cinematic Hotkey',
                description = 'Key to toggle cinematic mode',
                default = config.cinematicKey or 'F7',
                options = {
                    { value = '',       label = 'None' },
                    { value = 'F7',     label = 'F7' },
                    { value = 'F8',     label = 'F8' },
                    { value = 'F9',     label = 'F9' },
                    { value = 'F10',    label = 'F10' },
                    { value = 'F11',    label = 'F11' },
                    { value = 'HOME',   label = 'HOME' },
                    { value = 'END',    label = 'END' },
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
            },
            {
                key = 'hud_speedometerPosY',
                type = 'slider',
                label = 'Speedometer Y',
                description = 'internal',
                default = 0,
                min = 0,
                max = 10000,
            },
            {
                key = 'hud_fuelDisplayStyle',
                type = 'select',
                label = 'Fuel Display Style',
                description = 'Show fuel as a bar below the speedo or as a radial arc',
                default = config.fuelDisplayStyle or 'bar',
                options = {
                    { value = 'bar', label = 'Bar' },
                    { value = 'radial', label = 'Radial' },
                },
            },
            {
                key = 'hud_ammoPositionPreset',
                type = 'select',
                label = 'Ammo Position Preset',
                description = 'Quick presets for the ammo display location',
                default = 'bottom-right',
                options = {
                    { value = 'custom',         label = 'Custom (Drag)' },
                    { value = 'bottom-right',  label = 'Bottom Right' },
                    { value = 'top-right',     label = 'Top Right' },
                    { value = 'top-left',      label = 'Top Left' },
                    { value = 'bottom-center', label = 'Bottom Middle' },
                },
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
        },
        sections = {
            { label = 'Speedometer',    keys = { 'hud_speedUnit', 'hud_fuelDisplayStyle', 'hud_disableSpeedometer', 'hud_speedometerActions' } },
            { label = 'Postal',         keys = { 'hud_showPostal', 'hud_showPostalDistance' } },
            { label = 'Status Icons',   keys = { 'hud_hungerThreshold', 'hud_thirstThreshold', 'hud_stressThreshold', 'hud_oxygenThreshold' } },
            { label = 'Colors',         keys = { 'hud_color_health', 'hud_color_armor', 'hud_color_hunger', 'hud_color_thirst', 'hud_color_stress', 'hud_color_oxygen' } },
            { label = 'Minimap',        keys = { 'hud_minimapOnlyInVehicle' } },
            { label = 'Notifications',  keys = { 'hud_mapNotifications', 'hud_lowFuelAlert', 'hud_cinematicNotifications' } },
            { label = 'Cinematic Mode', keys = { 'hud_cinematicKey' } },
            { label = 'Ammo',           keys = { 'hud_ammoPositionPreset' } },
        },
    }
end

exports('getSettingsDefinition', getSettingsDefinition)

-- ============================================================================
-- CORE APPLY LOGIC (unchanged from original)
-- ============================================================================

function Settings.apply(data, options)
    if not data then return end
    options = options or {}
    local refreshMinimap = options.refreshMinimap
    if refreshMinimap == nil then
        refreshMinimap = true
    end

    config.speedUnit = data.speedUnit or config.speedUnit
    config.disableSpeedometer = (data.disableSpeedometer == true) or (data.disableSpeedometer == 1) or (data.disableSpeedometer == '1') or (data.disableSpeedometer == 'true')
    config.EnablePostal = data.showPostal ~= false
    config.ShowPostalDistance = data.showPostalDistance == true
    config.StatusIcons.hungerThreshold = tonumber(data.hungerThreshold) or config.StatusIcons.hungerThreshold
    config.StatusIcons.thirstThreshold = tonumber(data.thirstThreshold) or config.StatusIcons.thirstThreshold
    config.StatusIcons.stressThreshold = tonumber(data.stressThreshold) or config.StatusIcons.stressThreshold
    config.StatusIcons.oxygenThreshold = tonumber(data.oxygenThreshold) or config.StatusIcons.oxygenThreshold
    config.showCrosshair = data.showCrosshair == true

    if not config.StatusIcons.colors then
        config.StatusIcons.colors = {
            health = '#10b981',
            armor = '#5eb2ff',
            hunger = '#f59e0b',
            thirst = '#ffffff',
            stress = '#ef4444',
            oxygen = '#06b6d4',
        }
    end
    
    config.StatusIcons.colors.health = data.colorHealth or config.StatusIcons.colors.health
    config.StatusIcons.colors.armor = data.colorArmor or config.StatusIcons.colors.armor
    config.StatusIcons.colors.hunger = data.colorHunger or config.StatusIcons.colors.hunger
    config.StatusIcons.colors.thirst = data.colorThirst or config.StatusIcons.colors.thirst
    config.StatusIcons.colors.stress = data.colorStress or config.StatusIcons.colors.stress
    config.StatusIcons.colors.oxygen = data.colorOxygen or config.StatusIcons.colors.oxygen

    config.mapNotifications = data.mapNotifications ~= false
    config.lowFuelAlert = data.lowFuelAlert ~= false
    config.cinematicNotifications = data.cinematicNotifications ~= false
    config.cinematicKey = data.cinematicKey or config.cinematicKey
    config.minimapOnlyInVehicle = data.minimapOnlyInVehicle == true
    config.fuelDisplayStyle = data.fuelDisplayStyle or config.fuelDisplayStyle or 'bar'

    local posX = tonumber(data.speedometerPosX)
    local posY = tonumber(data.speedometerPosY)
    local speedometerPos = nil
    if posX and posX > 0 and posY and posY > 0 then
        speedometerPos = { left = posX, top = posY }
    end


    if refreshMinimap then
        minimap.apply(config)
    end

    SendNUIMessage({
        action = 'updateStatusConfig',
        hungerThreshold = config.StatusIcons.hungerThreshold,
        thirstThreshold = config.StatusIcons.thirstThreshold,
        stressThreshold = config.StatusIcons.stressThreshold,
        oxygenThreshold = config.StatusIcons.oxygenThreshold,
        colors = config.StatusIcons.colors,
        speedometerPos = speedometerPos,
        fuelDisplayStyle = config.fuelDisplayStyle or 'bar',
        ammoColor = data.colorAmmo or config.ammoColor or '#10b981',
        ammoPositionPreset = data.ammoPositionPreset or config.ammoPositionPreset or 'bottom-right',
        showCrosshair = config.showCrosshair,
    })

    -- Ammo position
    local ammoPosX = tonumber(data.ammoPosX)
    local ammoPosY = tonumber(data.ammoPosY)
    if ammoPosX and ammoPosX > 0 and ammoPosY and ammoPosY > 0 then
        SendNUIMessage({
            action = 'updateStatusConfig',
            ammoPos = { left = ammoPosX, top = ammoPosY },
        })
    end

    config.ammoColor = data.colorAmmo or config.ammoColor or '#10b981'
    config.ammoPositionPreset = data.ammoPositionPreset or config.ammoPositionPreset or 'bottom-right'

    Settings.registerCinematicKey(config.cinematicKey)
end

-- Helper to read saved speedometer position from es_lib (returns posX, posY)
local function getSavedSpeedometerPos()
    local posX, posY = 0, 0
    pcall(function()
        posX = tonumber(exports['es_lib']:getSetting('hud_speedometerPosX')) or 0
        posY = tonumber(exports['es_lib']:getSetting('hud_speedometerPosY')) or 0
    end)
    return posX, posY
end

local function normalizeSpeedometerPos(left, top)
    local posX = math.floor((tonumber(left) or 0) + 0.5)
    local posY = math.floor((tonumber(top) or 0) + 0.5)

    if posX < 0 then posX = 0 end
    if posY < 0 then posY = 0 end

    if posX == 0 or posY == 0 then
        return 0, 0
    end

    return posX, posY
end

local function applySpeedometerPos(posX, posY)
    local speedometerPos = nil
    if posX > 0 and posY > 0 then
        speedometerPos = { left = posX, top = posY }
    end

    SendNUIMessage({
        action = 'updateStatusConfig',
        speedometerPos = speedometerPos,
    })
end

local function persistSpeedometerPos(posX, posY)
    pcall(function()
        exports['es_lib']:setSetting('hud_speedometerPosX', posX)
        exports['es_lib']:setSetting('hud_speedometerPosY', posY)
    end)
end

-- Ammo position helpers
local function getSavedAmmoPos()
    local posX, posY = 0, 0
    pcall(function()
        posX = tonumber(exports['es_lib']:getSetting('hud_ammoPosX')) or 0
        posY = tonumber(exports['es_lib']:getSetting('hud_ammoPosY')) or 0
    end)
    return posX, posY
end

local function normalizeAmmoPos(left, top)
    local posX = math.floor((tonumber(left) or 0) + 0.5)
    local posY = math.floor((tonumber(top) or 0) + 0.5)
    if posX < 0 then posX = 0 end
    if posY < 0 then posY = 0 end
    if posX == 0 or posY == 0 then return 0, 0 end
    return posX, posY
end

local function applyAmmoPos(posX, posY)
    local ammoPos = nil
    if posX > 0 and posY > 0 then
        ammoPos = { left = posX, top = posY }
    end
    SendNUIMessage({
        action = 'updateStatusConfig',
        ammoPos = ammoPos,
        ammoPositionPreset = config.ammoPositionPreset or 'bottom-right',
    })
end

local function persistAmmoPos(posX, posY)
    pcall(function()
        exports['es_lib']:setSetting('hud_ammoPosX', posX)
        exports['es_lib']:setSetting('hud_ammoPosY', posY)
    end)
end

function Settings.get()
    -- Build the settings table from es_lib stored values (or config defaults)
    local data = {}
    local ok, _ = pcall(function()
        for esKey, hudKey in pairs(KEY_MAP) do
            local val = exports['es_lib']:getSetting(esKey)
            if val ~= nil then
                data[hudKey] = val
            end
        end
    end)
    if not ok or not next(data) then
        -- Fallback to config defaults, but still try to read saved speedo pos
        local posX, posY = getSavedSpeedometerPos()
        return {
            speedUnit = config.speedUnit,
            disableSpeedometer = config.disableSpeedometer == true,
            showPostal = config.EnablePostal,
            showPostalDistance = config.ShowPostalDistance,
            hungerThreshold = config.StatusIcons.hungerThreshold,
            thirstThreshold = config.StatusIcons.thirstThreshold,
            stressThreshold = config.StatusIcons.stressThreshold,
            oxygenThreshold = config.StatusIcons.oxygenThreshold,
            colorHealth = config.StatusIcons.colors.health,
            colorArmor = config.StatusIcons.colors.armor,
            colorHunger = config.StatusIcons.colors.hunger,
            colorThirst = config.StatusIcons.colors.thirst,
            colorStress = config.StatusIcons.colors.stress,
            colorOxygen = config.StatusIcons.colors.oxygen,
            mapNotifications = config.mapNotifications,
            lowFuelAlert = config.lowFuelAlert,
            cinematicNotifications = config.cinematicNotifications,
            cinematicKey = config.cinematicKey,
            minimapOnlyInVehicle = config.minimapOnlyInVehicle,
            speedometerPosX = posX,
            speedometerPosY = posY,
            fuelDisplayStyle = config.fuelDisplayStyle or 'bar',
            colorAmmo = config.ammoColor or '#10b981',
            ammoPositionPreset = config.ammoPositionPreset or 'bottom-right',
            showCrosshair = config.showCrosshair == true,
        }
    end
    return data
end

-- ============================================================================
-- CINEMATIC MODE (unchanged)
-- ============================================================================

function Settings.isCinematicMode()
    return cinematicMode
end

function Settings.toggleCinematic()
    cinematicMode = not cinematicMode

    SendNUIMessage({ action = 'setCinematicMode', enabled = cinematicMode })

    if cinematicMode then
        exports.es_hud:setHudVisibleReason('cinematic', false)
        if config.cinematicNotifications then
            lib.notify({ title = 'HUD', description = 'Cinematic mode enabled', type = 'inform', duration = 2000 })
        end
    else
        exports.es_hud:setHudVisibleReason('cinematic', true)
        if config.cinematicNotifications then
            lib.notify({ title = 'HUD', description = 'Cinematic mode disabled', type = 'inform', duration = 2000 })
        end
    end
end

function Settings.registerCinematicKey(key)
    if not key or key == '' then return end

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

-- ============================================================================
-- NATIVE SETTINGS MODAL DISABLED — redirect to es_lib central settings
-- ============================================================================

function Settings.open()
    pcall(function()
        exports['es_lib']:openSettingsMenu()
    end)
end

function Settings.close()
    -- No-op: es_lib handles its own close
end

function Settings.isOpen()
    return false
end

-- Keep NUI callbacks registered so the built React app doesn't error,
-- but they are effectively no-ops now.
RegisterNUICallback('settings:save', function(data, cb)
    local pos = data and data.speedometerPos
    local posX, posY = normalizeSpeedometerPos(pos and pos.left, pos and pos.top)
    persistSpeedometerPos(posX, posY)
    applySpeedometerPos(posX, posY)

    cb('ok')
end)

RegisterNUICallback('settings:close', function(_, cb)
    cb('ok')
end)

-- Redirect /hudsettings to es_lib settings
RegisterCommand('hudsettings', function()
    Settings.open()
end, false)

RegisterKeyMapping('hudsettings', 'Open HUD Settings', 'keyboard', 'I')

-- ============================================================================
-- ES_LIB SETTING CHANGE LISTENER
-- ============================================================================

AddEventHandler('es_lib:settingChanged', function(key, value)
    local hudKey = KEY_MAP[key]
    if not hudKey then return end

    -- Read the saved speedometer position so we don't reset it
    local posX, posY = getSavedSpeedometerPos()

    -- Build a full settings table from current config + the changed value
    local current = {
        speedUnit = config.speedUnit,
        disableSpeedometer = config.disableSpeedometer == true,
        showPostal = config.EnablePostal,
        showPostalDistance = config.ShowPostalDistance,
        hungerThreshold = config.StatusIcons.hungerThreshold,
        thirstThreshold = config.StatusIcons.thirstThreshold,
        stressThreshold = config.StatusIcons.stressThreshold,
        oxygenThreshold = config.StatusIcons.oxygenThreshold,
        colorHealth = config.StatusIcons.colors.health,
        colorArmor = config.StatusIcons.colors.armor,
        colorHunger = config.StatusIcons.colors.hunger,
        colorThirst = config.StatusIcons.colors.thirst,
        colorStress = config.StatusIcons.colors.stress,
        colorOxygen = config.StatusIcons.colors.oxygen,
        mapNotifications = config.mapNotifications,
        lowFuelAlert = config.lowFuelAlert,
        cinematicNotifications = config.cinematicNotifications,
        cinematicKey = config.cinematicKey,
        minimapOnlyInVehicle = config.minimapOnlyInVehicle,
        useSkewedStyle = config.useSkewedStyle,
        skewAmount = config.skewAmount,
        speedometerPosX = posX,
        speedometerPosY = posY,
        fuelDisplayStyle = config.fuelDisplayStyle or 'bar',
    }
    current[hudKey] = value
    local shouldRefreshMinimap = false
    Settings.apply(current, { refreshMinimap = shouldRefreshMinimap })
end)

-- Handle es_lib settings action buttons
AddEventHandler('es_lib:settingsAction', function(scriptId, action)
    if scriptId ~= 'es_hud' then return end

    if action == 'speedometer_move' then
        SendNUIMessage({ action = 'closeSettings' })
        SendNUIMessage({ action = 'settingsClose' })
        SetNuiFocus(false, false)
        pcall(function()
            exports['es_lib']:closeSettingsMenu()
        end)
        Wait(200)
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(false)
        SendNUIMessage({ action = 'startSpeedometerMove' })
    elseif action == 'speedometer_reset' then
        persistSpeedometerPos(0, 0)
        applySpeedometerPos(0, 0)
    elseif action == 'ammo_move' then
        SendNUIMessage({ action = 'closeSettings' })
        SendNUIMessage({ action = 'settingsClose' })
        SetNuiFocus(false, false)
        pcall(function()
            exports['es_lib']:closeSettingsMenu()
        end)
        Wait(200)
        SetNuiFocus(true, true)
        SetNuiFocusKeepInput(false)
        SendNUIMessage({ action = 'startAmmoMove' })
    elseif action == 'ammo_reset' then
        persistAmmoPos(0, 0)
        pcall(function()
            exports['es_lib']:setSetting('hud_ammoPositionPreset', 'bottom-right')
        end)
        config.ammoPositionPreset = 'bottom-right'
        applyAmmoPos(0, 0)
    end
end)

-- NUI callback to start speedometer editing (repositioning)
RegisterNUICallback('speedometer:startEdit', function(_, cb)
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    cb('ok')
end)

-- NUI callback for when speedometer edit mode ends (save or cancel)
RegisterNUICallback('speedometer:endEdit', function(data, cb)
    SetNuiFocus(false, false)

    if data and data.saved then
        local posX, posY = normalizeSpeedometerPos(data.left, data.top)
        persistSpeedometerPos(posX, posY)
        applySpeedometerPos(posX, posY)
    end

    cb('ok')
end)

-- NUI callback for ammo edit mode
RegisterNUICallback('ammo:endEdit', function(data, cb)
    SetNuiFocus(false, false)

    if data and data.saved then
        local posX, posY = normalizeAmmoPos(data.left, data.top)
        persistAmmoPos(posX, posY)
        
        -- Force switch to custom preset when dragging
        pcall(function()
            exports['es_lib']:setSetting('hud_ammoPositionPreset', 'custom')
        end)
        config.ammoPositionPreset = 'custom'
        
        applyAmmoPos(posX, posY)
    end

    cb('ok')
end)

-- ============================================================================
-- MINIMAP ONLY IN VEHICLE THREAD (unchanged)
-- ============================================================================

CreateThread(function()
    while true do
        if config.minimapOnlyInVehicle then
            local ped = PlayerPedId()
            local inVehicle = IsPedInAnyVehicle(ped, false)
            if not cinematicMode then
                DisplayRadar(inVehicle)
            end
        end
        Wait(200)
    end
end)

-- ============================================================================
-- STARTUP: Load saved es_lib settings and apply
-- ============================================================================

CreateThread(function()
    Wait(2000)
    local data = Settings.get()
    Settings.apply(data)
end)

return Settings
