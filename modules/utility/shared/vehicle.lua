local config = lib.require("config.shared")

local utility = {}

function utility.convertRpmToPercentage(value)
    local percentage = math.ceil(value * 10000 - 2001) / 80
    return math.max(0, math.min(percentage, 100))
end

function utility.round(num, numDecimalPlaces)
    local mult = 10 ^ (numDecimalPlaces or 0)
    return math.floor(num + 0.5 * mult)
end

function utility.convertEngineHealthToPercentage(value)
    local clampedValue = math.max(0, math.min(value, 1000))
    local percentage = (clampedValue / 1000) * 100
    percentage = math.floor(percentage + 0.5)
    return percentage
end

return utility
