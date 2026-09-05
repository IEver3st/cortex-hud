local WeaponWheel = {}

local Nui = lib.require('modules.nui.client')
local AmmoState = lib.require('modules.threads.client.ammo_state')

local CreateThread = CreateThread
local DisableControlAction = DisableControlAction
local DisablePlayerFiring = DisablePlayerFiring
local GetAmmoInClip = GetAmmoInClip
local GetAmmoInPedWeapon = GetAmmoInPedWeapon
local GetCurrentResourceName = GetCurrentResourceName
local GetDisabledControlNormal = GetDisabledControlNormal
local GetGameTimer = GetGameTimer
local GetHashKey = GetHashKey
local GetMaxAmmoInClip = GetMaxAmmoInClip
local GetSelectedPedWeapon = GetSelectedPedWeapon
local GetWeapontypeGroup = GetWeapontypeGroup
local HasPedGotWeapon = HasPedGotWeapon
local HideHudComponentThisFrame = HideHudComponentThisFrame
local IsScreenblurFadeRunning = IsScreenblurFadeRunning
local IsDisabledControlJustPressed = IsDisabledControlJustPressed
local IsDisabledControlPressed = IsDisabledControlPressed
local IsInputDisabled = IsInputDisabled
local IsNuiFocused = IsNuiFocused
local IsPauseMenuActive = IsPauseMenuActive
local IsPedDeadOrDying = IsPedDeadOrDying
local IsPedInAnyVehicle = IsPedInAnyVehicle
local IsPedInParachuteFreeFall = IsPedInParachuteFreeFall
local IsPedSwimming = IsPedSwimming
local LoadResourceFile = LoadResourceFile
local PlayerId = PlayerId
local PlayerPedId = PlayerPedId
local SetCurrentPedWeapon = SetCurrentPedWeapon
local TriggerScreenblurFadeIn = TriggerScreenblurFadeIn
local TriggerScreenblurFadeOut = TriggerScreenblurFadeOut
local Wait = Wait
local math_abs = math.abs
local math_atan = math.atan
local math_floor = math.floor
local math_max = math.max
local math_pi = math.pi
local math_sqrt = math.sqrt

local DEFAULT_OPEN_CONTROL = 37
local DEFAULT_DEADZONE = 0.22
local DEFAULT_MOUSE_SENSITIVITY = 2.2
local MAX_CATALOG_WEAPONS = 256
local UNARMED_HASH = `WEAPON_UNARMED`
local SECTOR_RADIANS = math_pi / 4
local HALF_SECTOR_RADIANS = SECTOR_RADIANS / 2
local SELECTION_HYSTERESIS_RADIANS = 0.07
-- One physical scroll tick surfaces through several control ids depending on
-- context. Every navigation source shares one timer so a single tick can only
-- move a single step: one wheel detent is exactly one gun, never a replayed
-- extra step. Stack cycling uses the shorter cooldown so deliberate flicks
-- still traverse a full stack quickly; category jumps keep a longer cooldown
-- so they stay deliberate and do not overshoot.
local WEAPON_CYCLE_COOLDOWN_MS = 80
local CATEGORY_STEP_COOLDOWN_MS = 110
local SELECTION_COOLDOWN_MS = WEAPON_CYCLE_COOLDOWN_MS
-- A plain TAB tap must only VIEW the wheel, never swap the weapon. Mouse
-- momentum / stick drift from just before the press can otherwise count as
-- navigation on the opening frames, so ignore all navigation briefly after
-- open and never commit a very short hold even if navigation slipped through.
local OPEN_NAVIGATION_GRACE_MS = 120
-- Scroll/arrow ticks are deliberate finger input, so they leave the opening
-- grace much earlier than mouse/stick drift. Otherwise the first fast scroll
-- right after TAB feels swallowed and the whole stack feels slow.
local SCROLL_NAVIGATION_GRACE_MS = 40
local MIN_OPEN_COMMIT_MS = 180
local AMMO_CACHE_TTL_MS = 400
-- Background refresh for the equipped weapon's live clip while the wheel is
-- closed, so holstered entries below never go stale after firing.
local CLIP_POLL_MS = 500
-- The blur fade itself runs 120ms. Starting it on press means a quick TAB tap
-- fires fade-in and fade-out inside the same transition and the engine drops
-- the fade-out, stranding the blur on screen. So the blur only kicks in once
-- the wheel has been held open past this delay; short taps never blur at all.
local BLUR_DELAY_MS = 150

-- Vanilla weapon-wheel input map (control ids per the official Cfx control
-- reference): 37 (TAB/LB) holds the wheel open, 12/13 carry the mouse /
-- right-stick highlight, 14/15 move the highlight while open, 16/17
-- quick-cycle without the wheel, 157-165 are the 1-9 direct slot hotkeys,
-- 261 PREV_WEAPON mirrors 15 (both SCROLLWHEEL UP) and 262 NEXT_WEAPON
-- mirrors 14 (both SCROLLWHEEL DOWN), 241/242 are the cursor scroll pair
-- bound to the same physical wheel, and the veh/fly variants 99 and 115
-- fire on the same physical wheel-up tick, so they are grouped by physical
-- direction, not by their native next/prev label: everything bound to
-- SCROLLWHEEL DOWN cycles right, everything bound to SCROLLWHEEL UP cycles
-- left. (100/116 are `[`-bound, not wheel inputs, so they stay blocked but
-- out of the scroll lists.)
local SCROLL_NEXT_CONTROLS = { 14, 16, 180, 262, 242 }
local SCROLL_PREV_CONTROLS = { 15, 17, 181, 261, 99, 115, 241 }
local WEAPON_NEXT_CONTROLS = { 175, 81 }
local WEAPON_PREV_CONTROLS = { 174, 82 }
-- Vanilla hotkey slot -> wheel category. Unarmed and melee share one station.
local DIRECT_SLOT_CATEGORY_BY_CONTROL = {
    [157] = 'melee',
    [158] = 'melee',
    [159] = 'sidearm',
    [160] = 'shotgun',
    [161] = 'automatic',
    [162] = 'rifle',
    [163] = 'sniper',
    [164] = 'heavy',
    [165] = 'gear',
}
local DIRECT_SLOT_CONTROLS = { 157, 158, 159, 160, 161, 162, 163, 164, 165 }

-- The order is clockwise from the top station and mirrors GTA's vanilla
-- eight-slot grammar (GTA Wiki: handguns, machine guns, assault rifles,
-- snipers, melee/unarmed, shotguns, heavy, throwables) so vanilla muscle
-- memory lands on the expected slot. Closely related native groups share a
-- station so every owned weapon remains reachable without adding smaller
-- radial wedges.
local CATEGORY_DEFINITIONS = {
    { id = 'sidearm', label = 'Sidearm' },
    { id = 'automatic', label = 'SMGs & MGs' },
    { id = 'rifle', label = 'Rifles' },
    { id = 'sniper', label = 'Snipers' },
    { id = 'melee', label = 'Unarmed & Melee' },
    { id = 'shotgun', label = 'Shotguns' },
    { id = 'heavy', label = 'Heavy' },
    { id = 'gear', label = 'Thrown & Gear' },
}

local VALID_CATEGORY_IDS = {}
for i = 1, #CATEGORY_DEFINITIONS do
    VALID_CATEGORY_IDS[CATEGORY_DEFINITIONS[i].id] = true
end

local GROUP_TO_CATEGORY = {
    [`GROUP_UNARMED`] = 'melee',
    [`GROUP_MELEE`] = 'melee',
    [`GROUP_PISTOL`] = 'sidearm',
    [`GROUP_SMG`] = 'automatic',
    [`GROUP_MG`] = 'automatic',
    [`GROUP_RIFLE`] = 'rifle',
    [`GROUP_SHOTGUN`] = 'shotgun',
    [`GROUP_SNIPER`] = 'sniper',
    [`GROUP_HEAVY`] = 'heavy',
    [`GROUP_THROWN`] = 'gear',
    [`GROUP_PETROLCAN`] = 'gear',
    [`GROUP_FIREEXTINGUISHER`] = 'gear',
    [`GROUP_DIGISCANNER`] = 'gear',
    [`GROUP_NIGHTVISION`] = 'gear',
    [`GROUP_PARACHUTE`] = 'gear',
}

-- Persists across wheel opens for the resource lifetime: a weapon's clip only
-- changes while it is equipped, so the last live reading stays valid for
-- holstered weapons and lets every slot show a real loaded-mag split.
local lastKnownClipByWeapon = {}
local nextClipPollAt = 0

local state = {
    started = false,
    open = false,
    config = nil,
    isHudVisible = nil,
    isSettingsOpen = nil,
    catalog = {},
    categories = {},
    rememberedWeaponByCategory = {},
    selectedCategoryIndex = 1,
    equippedHash = UNARMED_HASH,
    initialHash = UNARMED_HASH,
    hasNavigated = false,
    lastCycleAt = 0,
    lastCycleDirection = 0,
    queuedStackDirection = 0,
    ammoCache = {},
    openAt = 0,
    mouseSelectorX = 0,
    mouseSelectorY = 0,
    ownsScreenBlur = false,
    blurStarted = false,
    revision = 0,
    lastInputMode = 'keyboard',
}

local function boundedString(value, maximumLength)
    if type(value) ~= 'string' then return nil end

    value = value:gsub('[%z\1-\31]', ' '):gsub('%s+', ' ')
    value = value:match('^%s*(.-)%s*$') or ''
    if value == '' then return nil end

    if #value > maximumLength then
        value = value:sub(1, maximumLength)
    end

    return value
end

local function clampNumber(value, minimum, maximum, fallback)
    value = tonumber(value)
    if not value or value ~= value or value == math.huge or value == -math.huge then
        return fallback
    end
    if value < minimum then return minimum end
    if value > maximum then return maximum end
    return value
end

local function displayNameFromLabel(label)
    local displayName = label:gsub('^weapon_', ''):gsub('_+', ' ')
    displayName = displayName:gsub('(%a)([%w]*)', function(initial, remainder)
        return initial:upper() .. remainder:lower()
    end)
    return boundedString(displayName, 48) or 'Weapon'
end

local function resolveCategory(weaponHash, explicitCategory)
    if VALID_CATEGORY_IDS[explicitCategory] then
        return explicitCategory
    end

    if weaponHash == UNARMED_HASH then
        return 'melee'
    end

    return GROUP_TO_CATEGORY[GetWeapontypeGroup(weaponHash)] or 'gear'
end

local function addCatalogWeapon(catalog, seenHashes, rawLabel, rawName, rawIcon, rawCategory)
    local label = boundedString(rawLabel, 64)
    if not label then return end

    label = label:lower()
    if not label:match('^weapon_[%w_]+$') then return end

    local weaponHash = GetHashKey(label:upper())
    if seenHashes[weaponHash] then return end

    local icon = boundedString(rawIcon, 64)
    if not icon or not icon:lower():match('^weapon_[%w_]+$') then
        icon = label
    else
        icon = icon:lower()
    end

    seenHashes[weaponHash] = true
    catalog[#catalog + 1] = {
        hash = weaponHash,
        id = label,
        icon = icon,
        name = boundedString(rawName, 48) or displayNameFromLabel(label),
        category = resolveCategory(weaponHash, rawCategory),
    }
end

local function loadCatalog()
    local catalog = {}
    local seenHashes = {}
    local rawManifest = LoadResourceFile(GetCurrentResourceName(), 'web/dist/weapons/manifest.json')
    local manifestValid = false

    if type(rawManifest) == 'string' and rawManifest ~= '' then
        local ok, labels = pcall(json.decode, rawManifest)
        if ok and type(labels) == 'table' then
            manifestValid = true
            for i = 1, math.min(#labels, MAX_CATALOG_WEAPONS) do
                addCatalogWeapon(catalog, seenHashes, labels[i])
            end
        else
            print('^3[cortex-hud:weapons] Weapon icon manifest is invalid; the custom wheel will remain disabled.^7')
        end
    else
        print('^3[cortex-hud:weapons] Weapon icon manifest is missing; the custom wheel will remain disabled.^7')
    end

    local additionalWeapons = state.config and state.config.additionalWeapons
    if type(additionalWeapons) == 'table' then
        for i = 1, math.min(#additionalWeapons, MAX_CATALOG_WEAPONS - #catalog) do
            local entry = additionalWeapons[i]
            if type(entry) == 'table' then
                addCatalogWeapon(
                    catalog,
                    seenHashes,
                    entry.label or entry.id,
                    entry.name,
                    entry.icon,
                    entry.category
                )
            end
        end
    end

    -- Unarmed is always a valid choice once at least one trustworthy catalog
    -- source exists, even when that source omits the explicit icon entry.
    if manifestValid or #catalog > 0 then
        addCatalogWeapon(catalog, seenHashes, 'weapon_unarmed', 'Unarmed', 'weapon_unarmed', 'melee')
    end

    state.catalog = catalog
end

local function createEmptyCategories()
    local categories = {}
    for i = 1, #CATEGORY_DEFINITIONS do
        categories[i] = {
            id = CATEGORY_DEFINITIONS[i].id,
            label = CATEGORY_DEFINITIONS[i].label,
            weapons = {},
            selectedIndex = 1,
        }
    end
    return categories
end

local function findCategoryIndex(categoryId)
    for i = 1, #CATEGORY_DEFINITIONS do
        if CATEGORY_DEFINITIONS[i].id == categoryId then return i end
    end
    return 1
end

local function rebuildOwnedWeapons(ped)
    local categories = createEmptyCategories()
    local currentHash = GetSelectedPedWeapon(ped)
    local currentCategoryIndex = nil
    state.equippedHash = currentHash

    for i = 1, #state.catalog do
        local weapon = state.catalog[i]
        if weapon.hash == UNARMED_HASH or HasPedGotWeapon(ped, weapon.hash, false) then
            local categoryIndex = findCategoryIndex(weapon.category)
            local category = categories[categoryIndex]
            category.weapons[#category.weapons + 1] = weapon

            if weapon.hash == currentHash then
                category.selectedIndex = #category.weapons
                currentCategoryIndex = categoryIndex
            end
        end
    end

    for i = 1, #categories do
        local category = categories[i]
        if currentCategoryIndex ~= i then
            local rememberedHash = state.rememberedWeaponByCategory[category.id]
            if rememberedHash then
                for weaponIndex = 1, #category.weapons do
                    if category.weapons[weaponIndex].hash == rememberedHash then
                        category.selectedIndex = weaponIndex
                        break
                    end
                end
            end
        end

        local selectedWeapon = category.weapons[category.selectedIndex]
        if selectedWeapon then
            state.rememberedWeaponByCategory[category.id] = selectedWeapon.hash
        end
    end

    -- The melee station opens on fists as the safe default, except when the
    -- equipped weapon is itself a melee weapon: forcing fists in that case
    -- highlights unarmed while hasNavigated is still false, so releasing TAB
    -- keeps the bat and the player can only reach fists by leaving the
    -- station and coming back in the same open. Keeping the equipped melee
    -- highlighted means one stack cycle reaches fists, while a plain view
    -- still commits nothing because highlight equals the initial weapon.
    local meleeIndex = findCategoryIndex('melee')
    local meleeCategory = categories[meleeIndex]
    if meleeCategory and currentCategoryIndex ~= meleeIndex then
        for weaponIndex = 1, #meleeCategory.weapons do
            if meleeCategory.weapons[weaponIndex].hash == UNARMED_HASH then
                meleeCategory.selectedIndex = weaponIndex
                state.rememberedWeaponByCategory['melee'] = UNARMED_HASH
                break
            end
        end
    end

    state.categories = categories
    state.selectedCategoryIndex = currentCategoryIndex or findCategoryIndex('melee')
end

local function resolveCooldown(configValue, fallback)
    return clampNumber(configValue, 15, 150, fallback)
end

local function weaponCycleCooldown()
    return resolveCooldown(
        state.config and state.config.stackCooldownMs,
        WEAPON_CYCLE_COOLDOWN_MS
    )
end

local function categoryStepCooldown()
    return resolveCooldown(
        state.config and state.config.categoryCooldownMs,
        CATEGORY_STEP_COOLDOWN_MS
    )
end

-- GetAmmoInClip only reports live data for the equipped weapon. For holstered
-- weapons it fails, and falling back to clip = total showed e.g. "250 0".
-- Resolve exactly like the main HUD: live read first, then the last known
-- clip, then mag capacity, always clamped to total.
local function readAmmo(ped, weapon)
    if not weapon or weapon.hash == UNARMED_HASH or weapon.category == 'melee' then
        return { visible = false, clip = 0, reserve = 0 }
    end

    -- Ammo natives are the most expensive part of a wheel update and ammo
    -- cannot change meaningfully between two fast scroll ticks, so cache each
    -- weapon briefly. This keeps rapid stack cycling to one cheap table
    -- lookup per untouched slot instead of 16 natives per tick.
    local now = GetGameTimer()
    local cached = state.ammoCache[weapon.hash]
    if cached and (now - cached.at) < AMMO_CACHE_TTL_MS then
        return { visible = true, clip = cached.clip, reserve = cached.reserve }
    end

    local total = math_max(0, tonumber(GetAmmoInPedWeapon(ped, weapon.hash)) or 0)
    local succeeded, currentClip = GetAmmoInClip(ped, weapon.hash)
    local clipReadSucceeded = succeeded == true or succeeded == 1
    local maxClipAmmo = 0
    if not clipReadSucceeded and lastKnownClipByWeapon[weapon.hash] == nil then
        maxClipAmmo = tonumber(GetMaxAmmoInClip(ped, weapon.hash, true)) or 0
    end
    local clip, reserve = AmmoState.resolve(
        total,
        clipReadSucceeded,
        currentClip,
        maxClipAmmo,
        lastKnownClipByWeapon[weapon.hash]
    )
    if clipReadSucceeded then
        lastKnownClipByWeapon[weapon.hash] = clip
    end
    state.ammoCache[weapon.hash] = { clip = clip, reserve = reserve, at = now }

    return {
        visible = true,
        clip = clip,
        reserve = reserve,
    }
end

-- Clip only changes while a weapon is equipped (firing/reloading), so refresh
-- the memory on a slow tick while the wheel is closed. Pickups only grow the
-- live total, and reserve is always recomputed as total minus clip.
local function pollEquippedClip(ped)
    if ped == 0 or IsPedDeadOrDying(ped, true) then return end
    local equippedHash = GetSelectedPedWeapon(ped)
    if not equippedHash or equippedHash == UNARMED_HASH then return end
    local succeeded, currentClip = GetAmmoInClip(ped, equippedHash)
    if succeeded == true or succeeded == 1 then
        lastKnownClipByWeapon[equippedHash] = math_floor(math_max(0, tonumber(currentClip) or 0))
    end
end

local function serializeCategory(ped, category)
    local weapon = category.weapons[category.selectedIndex]
    local serializedWeapon = nil

    if weapon then
        serializedWeapon = {
            id = weapon.id,
            icon = weapon.icon,
            name = weapon.name,
            equipped = weapon.hash == state.equippedHash,
            ammo = readAmmo(ped, weapon),
        }
    end

    return {
        id = category.id,
        label = category.label,
        count = #category.weapons,
        selectedIndex = #category.weapons > 0 and category.selectedIndex or 0,
        weapon = serializedWeapon,
    }
end

local function currentInputMode()
    return IsInputDisabled(0) and 'keyboard' or 'gamepad'
end

local function sendState(ped, action)
    if not state.open then return end

    state.revision = state.revision + 1
    state.lastInputMode = currentInputMode()

    local categories = {}
    for i = 1, #state.categories do
        categories[i] = serializeCategory(ped, state.categories[i])
    end

    Nui.send({
        action = action or 'weaponWheel:update',
        visible = true,
        revision = state.revision,
        selectedCategory = state.categories[state.selectedCategoryIndex]
            and state.categories[state.selectedCategoryIndex].id
            or 'melee',
        inputMode = state.lastInputMode,
        categories = categories,
    })
end

local function selectedWeapon()
    local category = state.categories[state.selectedCategoryIndex]
    return category and category.weapons[category.selectedIndex] or nil
end

local function startScreenBlur()
    state.ownsScreenBlur = false
    if state.config.screenBlur == false then return end

    -- Always claim ownership when we fade in. The old IsScreenblurFadeRunning
    -- guard stranded the blur on screen: reopening inside the 120ms fade
    -- window skipped the fade but left ownsScreenBlur false, so the matching
    -- close never faded out. A fade-in here is once per open, never per frame.
    state.ownsScreenBlur = true
    TriggerScreenblurFadeIn(120.0)
end

local function stopScreenBlur()
    if not state.ownsScreenBlur then return end

    state.ownsScreenBlur = false
    if IsScreenblurFadeRunning() then
        -- Our fade-in is still in flight; firing fade-out now would be
        -- dropped and strand the blur on. Defer it until the transition
        -- lands, unless the wheel reopened and reclaimed the blur meanwhile.
        CreateThread(function()
            while IsScreenblurFadeRunning() do Wait(0) end
            if not state.open and not state.ownsScreenBlur then
                TriggerScreenblurFadeOut(120.0)
            end
        end)
    else
        TriggerScreenblurFadeOut(120.0)
    end
end

local function debugNavigation(source)
    if state.config.debug ~= true then return end
    local category = state.categories[state.selectedCategoryIndex]
    local weapon = selectedWeapon()
    print(('[cortex-hud:weapons] nav %s -> slot=%s weapon=%s'):format(
        source,
        category and category.id or 'none',
        weapon and weapon.id or 'none'
    ))
end

local function inNavigationGrace()
    return (GetGameTimer() - (state.openAt or 0)) < OPEN_NAVIGATION_GRACE_MS
end

local function inScrollGrace()
    return (GetGameTimer() - (state.openAt or 0)) < SCROLL_NAVIGATION_GRACE_MS
end

local function closeWheel(commitSelection)
    if not state.open then
        -- Watchdog: never leave the blur running while the wheel is closed,
        -- no matter which path flipped the state.
        stopScreenBlur()
        return
    end

    local ped = PlayerPedId()
    local weapon = selectedWeapon()
    -- Only equip when the user explicitly navigated while the wheel was open
    -- AND held TAB long enough to mean "select", not "view". A plain TAB tap
    -- (or an open where the native weapon is not in the catalog) must never
    -- switch away to a remembered slot that was never highlighted. Hold TAB
    -- to see the wheel; move/scroll/1-9 to pick; release to equip.
    local heldLongEnough = (GetGameTimer() - (state.openAt or 0)) >= MIN_OPEN_COMMIT_MS
    if commitSelection
        and state.hasNavigated
        and heldLongEnough
        and ped ~= 0
        and weapon
        and weapon.hash ~= state.initialHash
        and not IsPedDeadOrDying(ped, true)
        and (weapon.hash == UNARMED_HASH or HasPedGotWeapon(ped, weapon.hash, false))
    then
        -- false = animated draw/holster like the native wheel. true would
        -- teleport the weapon into the hand with no draw animation.
        SetCurrentPedWeapon(ped, weapon.hash, false)
        state.rememberedWeaponByCategory[weapon.category] = weapon.hash
        if state.config.debug == true then
            print(('[cortex-hud:weapons] close COMMIT %s'):format(weapon.id))
        end
    elseif state.config.debug == true then
        print(('[cortex-hud:weapons] close keep (navigated=%s selected=%s)'):format(
            tostring(state.hasNavigated),
            weapon and weapon.id or 'none'
        ))
    end

    state.open = false
    state.categories = {}
    state.hasNavigated = false
    state.queuedStackDirection = 0
    state.ammoCache = {}
    state.mouseSelectorX = 0
    state.mouseSelectorY = 0
    state.blurStarted = false
    stopScreenBlur()
    Nui.send({ action = 'weaponWheel:close', visible = false })
end

local function openWheel(ped)
    rebuildOwnedWeapons(ped)
    if #state.categories == 0 then return false end

    state.initialHash = state.equippedHash
    state.hasNavigated = false
    state.lastCycleAt = GetGameTimer() - SELECTION_COOLDOWN_MS
    state.lastCycleDirection = 0
    state.queuedStackDirection = 0
    state.ammoCache = {}
    state.openAt = GetGameTimer()
    state.mouseSelectorX = 0
    state.mouseSelectorY = 0
    state.open = true
    -- Blur starts on a delay from the per-frame loop, never here: a quick tap
    -- must never issue a fade at all (see BLUR_DELAY_MS).
    state.blurStarted = false
    sendState(ped, 'weaponWheel:open')
    if state.config.debug == true then
        local highlight = selectedWeapon()
        print(('[cortex-hud:weapons] open equipped=%s highlight=%s'):format(
            tostring(state.equippedHash),
            highlight and highlight.id or 'none'
        ))
    end
    return true
end

local function normalizeRadians(value)
    while value > math_pi do value = value - (math_pi * 2) end
    while value < -math_pi do value = value + (math_pi * 2) end
    return value
end

local function currentCategoryCenterAngle()
    return (-math_pi / 2) + ((state.selectedCategoryIndex - 1) * SECTOR_RADIANS)
end

local function readSelectionVector()
    if currentInputMode() ~= 'keyboard' then
        return tonumber(GetDisabledControlNormal(0, 13)) or 0,
            tonumber(GetDisabledControlNormal(0, 12)) or 0
    end

    local deltaX = tonumber(GetDisabledControlNormal(0, 1)) or 0
    local deltaY = tonumber(GetDisabledControlNormal(0, 2)) or 0
    local sensitivity = clampNumber(
        state.config.mouseSensitivity,
        0.5,
        4.0,
        DEFAULT_MOUSE_SENSITIVITY
    )

    if math_abs(deltaX) > 0.0005 or math_abs(deltaY) > 0.0005 then
        state.mouseSelectorX = clampNumber(
            state.mouseSelectorX + (deltaX * sensitivity),
            -1.0,
            1.0,
            0
        )
        state.mouseSelectorY = clampNumber(
            state.mouseSelectorY + (deltaY * sensitivity),
            -1.0,
            1.0,
            0
        )

        local magnitude = math_sqrt(
            (state.mouseSelectorX * state.mouseSelectorX)
                + (state.mouseSelectorY * state.mouseSelectorY)
        )
        if magnitude > 1.0 then
            state.mouseSelectorX = state.mouseSelectorX / magnitude
            state.mouseSelectorY = state.mouseSelectorY / magnitude
        end
    end

    return state.mouseSelectorX, state.mouseSelectorY
end

local function categoryHasWeapons(categoryIndex)
    local category = state.categories[categoryIndex]
    return category ~= nil and #category.weapons > 0
end

local function consumeNavigationStep(direction, cooldownMs)
    local now = GetGameTimer()
    local cooldown = cooldownMs or SELECTION_COOLDOWN_MS
    -- A direction reversal is always a new physical tick, never a repeat of
    -- the previous one, so it bypasses the repeat debounce. Without this,
    -- alternating down/up while testing reads as "one direction does
    -- nothing" because the reversal lands inside the cooldown window.
    if direction ~= nil and direction ~= state.lastCycleDirection then
        state.lastCycleDirection = direction
        state.lastCycleAt = now
        state.hasNavigated = true
        return now
    end
    if now - state.lastCycleAt < cooldown then return nil end
    state.lastCycleAt = now
    state.hasNavigated = true
    return now
end

local function selectCategoryFromAxes(ped)
    if inNavigationGrace() then return end
    local x, y = readSelectionVector()
    local magnitude = math_sqrt((x * x) + (y * y))
    local deadzone = clampNumber(state.config.deadzone, 0.15, 0.8, DEFAULT_DEADZONE)
    if magnitude < deadzone then return end

    local angle = math_atan(y, x)
    local sector = math_floor((angle + HALF_SECTOR_RADIANS) / SECTOR_RADIANS)
    local categoryIndex = ((sector + 2) % #CATEGORY_DEFINITIONS) + 1
    if categoryIndex == state.selectedCategoryIndex then return end

    local distanceFromCurrent = math_abs(normalizeRadians(angle - currentCategoryCenterAngle()))
    if distanceFromCurrent <= HALF_SECTOR_RADIANS + SELECTION_HYSTERESIS_RADIANS then return end

    -- Never land the highlight on an empty station. Committing an empty
    -- station equips nothing, which reads as the wheel ignoring the scroll.
    if not categoryHasWeapons(categoryIndex) then return end
    if not consumeNavigationStep(nil, categoryStepCooldown()) then return end

    state.selectedCategoryIndex = categoryIndex
    state.queuedStackDirection = 0
    debugNavigation('axes')
    sendState(ped)
end

local function anyDisabledControlJustPressed(controls)
    for i = 1, #controls do
        if IsDisabledControlJustPressed(0, controls[i]) then return true end
    end
    return false
end

local function stepCategory(ped, direction)
    local total = #CATEGORY_DEFINITIONS
    if total < 2 then return end

    -- Skip empty stations so one scroll tick always lands on an owned
    -- weapon instead of an empty wedge that commits to nothing.
    local candidate = state.selectedCategoryIndex
    for _ = 1, total do
        candidate = ((candidate - 1 + direction) % total) + 1
        if categoryHasWeapons(candidate) then break end
    end
    if candidate == state.selectedCategoryIndex or not categoryHasWeapons(candidate) then return end
    if not consumeNavigationStep(direction, categoryStepCooldown()) then return end

    state.selectedCategoryIndex = candidate
    state.queuedStackDirection = 0
    debugNavigation('scroll-slot')
    sendState(ped)
end

local function applyStackStep(ped, direction, source)
    local category = state.categories[state.selectedCategoryIndex]
    local count = category and #category.weapons or 0
    if count < 2 then return false end

    category.selectedIndex = ((category.selectedIndex - 1 + direction) % count) + 1
    local weapon = category.weapons[category.selectedIndex]
    state.rememberedWeaponByCategory[category.id] = weapon.hash
    debugNavigation(source or 'scroll-stack')
    sendState(ped)
    return true
end

-- Vanilla stacked-slot behavior: the highlight picks the slot while the
-- scroll cycles the weapons stacked inside it. Returns true when the scroll
-- tick belonged to the hovered stack (2+ owned weapons), even on cooldown,
-- so the shared timer can swallow it instead of double-stepping elsewhere.
-- Ticks inside the cooldown are intentionally dropped, never queued: queuing
-- turns one detent into two steps and reads as skipping guns.
local function cycleWeaponInHoveredCategory(ped, direction)
    local category = state.categories[state.selectedCategoryIndex]
    local count = category and #category.weapons or 0
    if count < 2 then return false end
    if not consumeNavigationStep(direction, weaponCycleCooldown()) then
        return true
    end

    applyStackStep(ped, direction, 'scroll-stack')
    return true
end

-- One physical tick can surface through ids in both families (overlapping
-- bindings, context variants). Dropping the tick when both fire makes one
-- scroll direction feel dead. Cursor scroll ids are the unambiguous physical
-- wheel, so they break the tie instead of losing the input.
local function resolveScrollDirection(nextPressed, previousPressed)
    if nextPressed ~= previousPressed then
        return nextPressed and 1 or -1
    end
    if not nextPressed then return nil end

    local upPressed = IsDisabledControlJustPressed(0, 241)
    local downPressed = IsDisabledControlJustPressed(0, 242)
    if upPressed ~= downPressed then
        return downPressed and 1 or -1
    end
    return nil
end

local function handleScrollInput(ped)
    if inScrollGrace() then return end
    local nextPressed = anyDisabledControlJustPressed(SCROLL_NEXT_CONTROLS)
    local previousPressed = anyDisabledControlJustPressed(SCROLL_PREV_CONTROLS)
    if state.config.debug == true and (nextPressed or previousPressed) then
        local fired = {}
        for _, control in ipairs(SCROLL_NEXT_CONTROLS) do
            if IsDisabledControlJustPressed(0, control) then fired[#fired + 1] = control .. ':right' end
        end
        for _, control in ipairs(SCROLL_PREV_CONTROLS) do
            if IsDisabledControlJustPressed(0, control) then fired[#fired + 1] = control .. ':left' end
        end
        print(('[cortex-hud:weapons] scroll tick: %s'):format(table.concat(fired, ' ')))
    end
    local direction = resolveScrollDirection(nextPressed, previousPressed)
    if direction == nil then return end

    -- Hovered stack first (vanilla: scroll cycles the melees while melee is
    -- hovered, and so on); fall through to the next owned slot when the
    -- hovered stack holds a single weapon so the scroll never feels dead.
    -- Max one step per frame: cooldown ticks are swallowed, never replayed.
    if cycleWeaponInHoveredCategory(ped, direction) then return end
    stepCategory(ped, direction)
end

-- Vanilla 1-9 hotkeys jump straight to a slot while the wheel is open.
local function selectDirectSlot(ped)
    if inNavigationGrace() then return end
    for i = 1, #DIRECT_SLOT_CONTROLS do
        local control = DIRECT_SLOT_CONTROLS[i]
        if IsDisabledControlJustPressed(0, control) then
            local categoryIndex = findCategoryIndex(DIRECT_SLOT_CATEGORY_BY_CONTROL[control])
            if categoryIndex ~= state.selectedCategoryIndex and categoryHasWeapons(categoryIndex) then
                if consumeNavigationStep(nil, categoryStepCooldown()) then
                    state.selectedCategoryIndex = categoryIndex
                    state.queuedStackDirection = 0
                    debugNavigation('digit')
                    sendState(ped)
                end
            end
            return
        end
    end
end

local function cycleWeaponInSelectedCategory(ped)
    if inScrollGrace() then return end
    local nextPressed = anyDisabledControlJustPressed(WEAPON_NEXT_CONTROLS)
    local previousPressed = anyDisabledControlJustPressed(WEAPON_PREV_CONTROLS)
    if nextPressed == previousPressed then return end

    local category = state.categories[state.selectedCategoryIndex]
    local count = category and #category.weapons or 0
    if count < 2 then return end
    -- Share the selection cooldown with scroll cycling so a single
    -- physical tick that fires ids in both families cannot move twice.
    -- Reversals still bypass, same as scroll.
    local direction = nextPressed and 1 or -1
    if not consumeNavigationStep(direction, weaponCycleCooldown()) then return end

    category.selectedIndex = ((category.selectedIndex - 1 + direction) % count) + 1
    local weapon = category.weapons[category.selectedIndex]
    state.rememberedWeaponByCategory[category.id] = weapon.hash
    debugNavigation('arrows')
    sendState(ped)
end

local function shouldOwnWeaponControl(ped)
    if not state.config or state.config.enabled ~= true or not Nui.isReady() then
        return false
    end
    if ped == 0 or IsPauseMenuActive() or IsNuiFocused() or IsPedDeadOrDying(ped, true) then
        return false
    end
    if state.isHudVisible and not state.isHudVisible() then
        return false
    end
    if state.isSettingsOpen and state.isSettingsOpen() then
        return false
    end
    if state.config.allowInVehicles ~= true and IsPedInAnyVehicle(ped, false) then
        return false
    end
    if IsPedInParachuteFreeFall(ped) or IsPedSwimming(ped) then
        return false
    end
    return true
end

local function disableWheelControls(openControl)
    DisableControlAction(0, openControl, true)
    DisableControlAction(0, 1, true)
    DisableControlAction(0, 2, true)
    DisableControlAction(0, 12, true)
    DisableControlAction(0, 13, true)
    DisableControlAction(0, 14, true)
    DisableControlAction(0, 15, true)
    DisableControlAction(0, 16, true)
    DisableControlAction(0, 17, true)
    DisableControlAction(0, 24, true)
    DisableControlAction(0, 25, true)
    DisableControlAction(0, 81, true)
    DisableControlAction(0, 82, true)
    -- A single wheel tick also surfaces as veh/fly select-next/prev and as
    -- the legacy next/prev weapon pair. Block the whole scroll family plus
    -- the 1-9 direct slot hotkeys while the custom wheel owns input so GTA
    -- cannot cycle or jump the native weapon behind the highlighted slot.
    DisableControlAction(0, 99, true)
    DisableControlAction(0, 100, true)
    DisableControlAction(0, 115, true)
    DisableControlAction(0, 116, true)
    DisableControlAction(0, 261, true)
    DisableControlAction(0, 262, true)
    DisableControlAction(0, 241, true)
    DisableControlAction(0, 242, true)
    for i = 1, #DIRECT_SLOT_CONTROLS do
        DisableControlAction(0, DIRECT_SLOT_CONTROLS[i], true)
    end
    DisableControlAction(0, 174, true)
    DisableControlAction(0, 175, true)
    DisableControlAction(0, 180, true)
    DisableControlAction(0, 181, true)
    DisablePlayerFiring(PlayerId(), true)
    HideHudComponentThisFrame(19)
    HideHudComponentThisFrame(20)
end

function WeaponWheel.start(config, isHudVisible, isSettingsOpen)
    if state.started then return end

    config.WeaponWheel = type(config.WeaponWheel) == 'table' and config.WeaponWheel or {}
    state.started = true
    state.config = config.WeaponWheel
    state.isHudVisible = type(isHudVisible) == 'function' and isHudVisible or nil
    state.isSettingsOpen = type(isSettingsOpen) == 'function' and isSettingsOpen or nil
    loadCatalog()

    if #state.catalog == 0 then
        print('^3[cortex-hud:weapons] No weapon catalog is available; the custom wheel will fall back to GTA.^7')
    end

    Nui.onReady(function()
        if state.open then sendState(PlayerPedId(), 'weaponWheel:open') end
    end)

    CreateThread(function()
        while state.started do
            local sleep = 250
            local ped = PlayerPedId()
            if state.config and state.config.enabled == true and ped ~= 0 then
                local now = GetGameTimer()
                if now >= nextClipPollAt then
                    nextClipPollAt = now + CLIP_POLL_MS
                    pollEquippedClip(ped)
                end
            end
            local openControl = math_floor(clampNumber(
                state.config.openControl,
                0,
                360,
                DEFAULT_OPEN_CONTROL
            ))

            if #state.catalog > 0 and shouldOwnWeaponControl(ped) then
                sleep = 0
                DisableControlAction(0, openControl, true)
                local openHeld = IsDisabledControlPressed(0, openControl)

                if openHeld and not state.open then
                    openWheel(ped)
                end

                if state.open then
                    disableWheelControls(openControl)

                    local inputMode = currentInputMode()
                    if inputMode ~= state.lastInputMode then
                        sendState(ped)
                    end

                    selectCategoryFromAxes(ped)
                    selectDirectSlot(ped)
                    handleScrollInput(ped)
                    cycleWeaponInSelectedCategory(ped)

                    if not state.blurStarted
                        and openHeld
                        and (GetGameTimer() - (state.openAt or 0)) >= BLUR_DELAY_MS
                    then
                        state.blurStarted = true
                        startScreenBlur()
                    end

                    if not openHeld then
                        closeWheel(true)
                    end
                end
            elseif state.open then
                closeWheel(false)
            end

            Wait(sleep)
        end
    end)
end

function WeaponWheel.isOpen()
    return state.open
end

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    state.started = false
    closeWheel(false)
end)

return WeaponWheel
