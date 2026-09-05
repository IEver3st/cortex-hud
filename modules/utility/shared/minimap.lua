local minimap = {}

local CreateThread = CreateThread
local GetActiveScreenResolution = GetActiveScreenResolution
local GetResourceState = GetResourceState
local IsMinimapRendering = IsMinimapRendering
local RequestStreamedTextureDict = RequestStreamedTextureDict
local HasStreamedTextureDictLoaded = HasStreamedTextureDictLoaded
local AddReplaceTexture = AddReplaceTexture
local SetMinimapClipType = SetMinimapClipType
local SetMinimapComponentPosition = SetMinimapComponentPosition
local SetBlipAlpha = SetBlipAlpha
local GetNorthRadarBlip = GetNorthRadarBlip
local SetBigmapActive = SetBigmapActive
local SetMapZoomDataLevel = SetMapZoomDataLevel
local SetRadarZoom = SetRadarZoom
local RequestScaleformMovie = RequestScaleformMovie
local HasScaleformMovieLoaded = HasScaleformMovieLoaded
local SetRadarBigmapEnabled = SetRadarBigmapEnabled
local BeginScaleformMovieMethod = BeginScaleformMovieMethod
local ScaleformMovieMethodAddParamInt = ScaleformMovieMethodAddParamInt
local EndScaleformMovieMethod = EndScaleformMovieMethod
local Wait = Wait

local minimapReady = false
local zoomDataApplied = false
local healthArmorHidden = false
local lastExternalMapState = nil

local function isDebugEnabled(config)
    local minimapConfig = config and config.Minimap or {}
    return minimapConfig.debug == true
end

local function debugLog(config, message, ...)
    if not isDebugEnabled(config) then return end
    print(("[es_hud:minimap] " .. message):format(...))
end

local function getExternalMapResourceName(config)
    local minimapConfig = config and config.Minimap or {}
    local resourceName = minimapConfig.externalMapResource

    if resourceName == false then
        return nil
    end

    if type(resourceName) ~= "string" or resourceName == "" then
        resourceName = "map-postalmap-streetname"
    end

    return resourceName
end

local function normalizeReplacementTargets(value)
    if type(value) == "table" then
        local result = {}
        for i = 1, #value do
            local target = value[i]
            if type(target) == "string" and target ~= "" then
                result[#result + 1] = target
            end
        end

        if #result > 0 then
            return result
        end
    elseif type(value) == "string" and value ~= "" then
        return { value }
    end

    return { "radarmasksm", "radarmask1g" }
end

local function getAspectOffset()
    local defaultAspectRatio = 1920 / 1080
    local resX, resY = GetActiveScreenResolution()
    local aspectRatio = resX / resY
    local offset = 0.0

    if aspectRatio > defaultAspectRatio then
        offset = ((defaultAspectRatio - aspectRatio) / 3.6) - 0.008
    end

    return offset
end

local function ensureMapZoomData()
    if zoomDataApplied then return end
    zoomDataApplied = true

    SetMapZoomDataLevel(0, 2.75, 0.9, 0.08, 0.0, 0.0)
    SetMapZoomDataLevel(1, 2.8, 0.9, 0.08, 0.0, 0.0)
    SetMapZoomDataLevel(2, 8.0, 0.9, 0.08, 0.0, 0.0)
    SetMapZoomDataLevel(3, 20.0, 0.9, 0.08, 0.0, 0.0)
    SetMapZoomDataLevel(4, 35.0, 0.9, 0.08, 0.0, 0.0)
    SetMapZoomDataLevel(5, 55.0, 0.0, 0.1, 2.0, 1.0)
    SetMapZoomDataLevel(6, 450.0, 0.0, 0.1, 1.0, 1.0)
    SetMapZoomDataLevel(7, 4.5, 0.0, 0.0, 0.0, 0.0)
    SetMapZoomDataLevel(8, 11.0, 0.0, 0.0, 2.0, 3.0)
    SetRadarZoom(1200)
end

function minimap.checkExternalMapResource(config, forceLog)
    local resourceName = getExternalMapResourceName(config)
    if not resourceName then
        debugLog(config, "External minimap resource check is disabled.")
        return nil, nil
    end

    local state = GetResourceState(resourceName)

    if forceLog or state ~= lastExternalMapState then
        lastExternalMapState = state

        if state ~= "started" then
            print(("[es_hud] WARN: external minimap resource '%s' is '%s'. That resource should own minimap.gfx and tile streaming."):format(resourceName, state))
        else
            debugLog(config, "External minimap resource '%s' is started.", resourceName)
        end
    end

    return resourceName, state
end

local function ensureMinimapTextures(config)
    if minimapReady then
        return true
    end

    local minimapConfig = config and config.Minimap or {}
    local replacementConfig = minimapConfig.textureReplacement or {}
    if replacementConfig.enabled == false then
        minimapReady = true
        debugLog(config, "Texture replacement disabled.")
        return true
    end

    local dictName = replacementConfig.dict or "squaremap"
    local textureName = replacementConfig.texture or "radarmasksm"
    local targetTextures = normalizeReplacementTargets(replacementConfig.targets)
    local loadTimeoutMs = replacementConfig.loadTimeoutMs or 5000

    if loadTimeoutMs < 500 then
        loadTimeoutMs = 500
    end

    debugLog(config, "Requesting texture dict '%s'.", dictName)
    RequestStreamedTextureDict(dictName, false)

    local waitedMs = 0
    while not HasStreamedTextureDictLoaded(dictName) and waitedMs < loadTimeoutMs do
        Wait(100)
        waitedMs = waitedMs + 100
    end

    if not HasStreamedTextureDictLoaded(dictName) then
        print(("[es_hud] WARN: minimap texture dict '%s' failed to load after %dms. Using default radar mask."):format(dictName, loadTimeoutMs))
        return false
    end

    for i = 1, #targetTextures do
        AddReplaceTexture("platform:/textures/graphics", targetTextures[i], dictName, textureName)
    end

    minimapReady = true
    debugLog(config, "Applied texture replacement from '%s/%s' to %d target(s).", dictName, textureName, #targetTextures)
    return true
end

local function removeHealthArmorBars()
    if healthArmorHidden then return end
    healthArmorHidden = true

    CreateThread(function()
        local minimapScaleform = RequestScaleformMovie("minimap")
        while not HasScaleformMovieLoaded(minimapScaleform) do
            Wait(100)
        end

        SetRadarBigmapEnabled(false, false)
        
        while true do
            if not HasScaleformMovieLoaded(minimapScaleform) then
                minimapScaleform = RequestScaleformMovie("minimap")
            else
                BeginScaleformMovieMethod(minimapScaleform, "SETUP_HEALTH_ARMOUR")
                ScaleformMovieMethodAddParamInt(3)
                EndScaleformMovieMethod()
            end
            Wait(0)
        end
    end)
end

local function applyMinimapLayout(config)
    local minimapConfig = (config and config.Minimap) or {}
    local aspectOffset = getAspectOffset()
    local clipType = minimapConfig.clipType or 0

    local x = 0.0 + aspectOffset
    local minimapY = -0.047
    local maskY = 0.0
    local blurY = 0.025

    local sizeX = minimapConfig.sizeX or 0.1638
    local sizeY = minimapConfig.sizeY or 0.183
    local maskSizeX = minimapConfig.maskSizeX or 0.128
    local maskSizeY = minimapConfig.maskSizeY or 0.20
    local blurSizeX = minimapConfig.blurSizeX or 0.262
    local blurSizeY = minimapConfig.blurSizeY or 0.300

    SetMinimapClipType(clipType)
    SetMinimapComponentPosition('minimap', 'L', 'B', x, minimapY, sizeX, sizeY)
    SetMinimapComponentPosition('minimap_mask', 'L', 'B', x, maskY, maskSizeX, maskSizeY)
    SetMinimapComponentPosition('minimap_blur', 'L', 'B', x - 0.01, blurY, blurSizeX, blurSizeY)

    debugLog(config, "Applied layout x=%.4f width=%.4f height=%.4f clipType=%d.", x, sizeX, sizeY, clipType)

    return {
        clipType = clipType,
        left = x,
        bottom = 0.047,
        width = sizeX,
        height = sizeY,
    }
end

local function refreshMinimapRender(config, layout, options)
    local reason = options and options.reason or "unspecified"

    SetBlipAlpha(GetNorthRadarBlip(), 0)
    SetBigmapActive(true, false)
    Wait(0)
    SetRadarBigmapEnabled(false, false)
    SetBigmapActive(false, false)
    Wait(0)
    SetRadarBigmapEnabled(false, false)
    SetMinimapClipType(layout.clipType)

    if type(IsMinimapRendering) == "function" then
        debugLog(config, "Refresh reason='%s' completed. IsMinimapRendering=%s.", reason, tostring(IsMinimapRendering()))
    else
        debugLog(config, "Refresh reason='%s' completed. IsMinimapRendering native unavailable.", reason)
    end
end

function minimap.isRendering()
    if type(IsMinimapRendering) ~= "function" then
        return nil
    end

    return IsMinimapRendering()
end


function minimap.collapseBigmap()
    SetRadarBigmapEnabled(false, false)
    SetBigmapActive(false, false)
end

function minimap.refresh(config, options)
    ensureMapZoomData()
    minimap.checkExternalMapResource(config)
    local texturesReady = ensureMinimapTextures(config)
    removeHealthArmorBars()

    local layout = applyMinimapLayout(config)
    refreshMinimapRender(config, layout, options)

    return {
        left = layout.left,
        bottom = layout.bottom,
        width = layout.width,
        height = layout.height,
        texturesReady = texturesReady,
        rendering = minimap.isRendering(),
    }
end

function minimap.apply(config, options)
    return minimap.refresh(config, options)
end

return minimap
