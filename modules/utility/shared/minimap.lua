local minimap = {}

local GetActiveScreenResolution = GetActiveScreenResolution
local RequestStreamedTextureDict = RequestStreamedTextureDict
local HasStreamedTextureDictLoaded = HasStreamedTextureDictLoaded
local AddReplaceTexture = AddReplaceTexture
local SetMinimapClipType = SetMinimapClipType
local SetMinimapComponentPosition = SetMinimapComponentPosition
local SetBlipAlpha = SetBlipAlpha
local GetNorthRadarBlip = GetNorthRadarBlip
local SetBigmapActive = SetBigmapActive
local DisplayRadar = DisplayRadar
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
local bigmapResetActive = false

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

local function ensureMinimapTextures()
    if minimapReady then return end

    RequestStreamedTextureDict("squaremap", false)
    while not HasStreamedTextureDictLoaded("squaremap") do
        Wait(100)
    end

    SetMinimapClipType(0)
    AddReplaceTexture("platform:/textures/graphics", "radarmasksm", "squaremap", "radarmasksm")
    AddReplaceTexture("platform:/textures/graphics", "radarmask1g", "squaremap", "radarmasksm")

    minimapReady = true
end

local function preventBigmapFromStayingActive()
    if bigmapResetActive then return end
    bigmapResetActive = true

    local timeout = 0
    while true do
        SetBigmapActive(false, false)
        if timeout >= 10000 then
            bigmapResetActive = false
            return
        end
        timeout = timeout + 1000
        Wait(1000)
    end
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
            BeginScaleformMovieMethod(minimapScaleform, "SETUP_HEALTH_ARMOUR")
            ScaleformMovieMethodAddParamInt(3)
            EndScaleformMovieMethod()
            Wait(1500)
        end
    end)
end

function minimap.apply(config)
    local m = (config and config.Minimap) or {}
    local aspectOffset = getAspectOffset()

    local x = 0.0 + aspectOffset

    local minimapY = -0.047
    local maskY = 0.0
    local blurY = 0.025

    local sizeX = m.sizeX or 0.1638
    local sizeY = m.sizeY or 0.183

    local maskSizeX = m.maskSizeX or 0.128
    local maskSizeY = m.maskSizeY or 0.20

    local blurSizeX = m.blurSizeX or 0.262
    local blurSizeY = m.blurSizeY or 0.300

    -- 3D perspective mode uses CSS rotateY which does NOT distort native minimap
    -- No minimap offset needed - the perspective transform preserves layout bounds

    ensureMapZoomData()
    ensureMinimapTextures()
    removeHealthArmorBars()

    SetMinimapClipType(0)

    SetMinimapComponentPosition('minimap', 'L', 'B', x, minimapY, sizeX, sizeY)
    SetMinimapComponentPosition('minimap_mask', 'L', 'B', x, maskY, maskSizeX, maskSizeY)
    SetMinimapComponentPosition('minimap_blur', 'L', 'B', x - 0.01, blurY, blurSizeX, blurSizeY)

    SetBlipAlpha(GetNorthRadarBlip(), 0)
    SetBigmapActive(true, false)
    SetMinimapClipType(0)
    CreateThread(preventBigmapFromStayingActive)

    DisplayRadar(true)

    return {
        left = x,
        bottom = 0.047,
        width = sizeX,
        height = sizeY,
    }
end

return minimap
