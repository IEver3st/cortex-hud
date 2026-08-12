local Nui = {}

local nativeSendNuiMessage = SendNUIMessage
local MAX_PENDING_MESSAGES = 256
local pendingMessages = {}
local readyCallbacks = {}
local isReady = false

local function queueMessage(message)
    if #pendingMessages >= MAX_PENDING_MESSAGES then
        table.remove(pendingMessages, 1)
    end

    pendingMessages[#pendingMessages + 1] = message
end

local function flushPendingMessages()
    local messages = pendingMessages

    pendingMessages = {}

    for i = 1, #messages do
        nativeSendNuiMessage(messages[i])
    end
end

local function runReadyCallbacks()
    for i = 1, #readyCallbacks do
        local ok, err = pcall(readyCallbacks[i])
        if not ok then
            print(('^1[cortex-hud:nui] Ready callback failed: %s^7'):format(err))
        end
    end
end

function Nui.send(message)
    if type(message) ~= 'table' then
        return false
    end

    if not isReady then
        queueMessage(message)
        return false
    end

    nativeSendNuiMessage(message)
    return true
end

function Nui.onReady(callback)
    if type(callback) ~= 'function' then
        return
    end

    readyCallbacks[#readyCallbacks + 1] = callback

    if isReady then
        callback()
    end
end

function Nui.isReady()
    return isReady
end

RegisterNUICallback('nui:ready', function(_, cb)
    if isReady then
        cb({ ok = true })
        return
    end

    isReady = true
    flushPendingMessages()
    runReadyCallbacks()
    cb({ ok = true })
end)

return Nui
