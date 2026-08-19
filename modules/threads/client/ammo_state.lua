local ammoState = {}

local function normalizeCount(value)
    local count = tonumber(value)
    if not count or count ~= count or count <= 0 then
        return 0
    end

    return math.floor(count)
end

function ammoState.resolve(totalAmmo, clipReadSucceeded, currentClipAmmo, maxClipAmmo, lastKnownClipAmmo)
    local total = normalizeCount(totalAmmo)
    local clipAmmo

    if clipReadSucceeded == true or clipReadSucceeded == 1 then
        clipAmmo = normalizeCount(currentClipAmmo)
    else
        local lastKnownClip = tonumber(lastKnownClipAmmo)
        if lastKnownClip and lastKnownClip >= 0 then
            clipAmmo = normalizeCount(lastKnownClip)
        else
            local clipCapacity = normalizeCount(maxClipAmmo)
            clipAmmo = clipCapacity > 0 and clipCapacity or total
        end
    end

    clipAmmo = math.min(clipAmmo, total)

    return clipAmmo, total - clipAmmo
end

return ammoState
