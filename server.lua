CreateThread(function()
    local state = GetResourceState('maps')
    if state ~= 'started' then
        ExecuteCommand('ensure maps')
    else
        ExecuteCommand('stop maps')
        Wait(500)
        ExecuteCommand('ensure maps')
    end
end)
