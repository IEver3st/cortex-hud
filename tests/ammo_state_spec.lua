local ammoState = dofile('modules/threads/client/ammo_state.lua')

local clip, reserve = ammoState.resolve(250, false, 0, 12, nil)
assert(clip == 12, ('failed in-vehicle clip query should fall back to clip capacity, got %s'):format(clip))
assert(reserve == 238, ('reserve should exclude the fallback clip, got %s'):format(reserve))

clip, reserve = ammoState.resolve(247, false, 0, 12, 9)
assert(clip == 9, ('failed query should preserve the last valid clip count, got %s'):format(clip))
assert(reserve == 238, ('reserve should use the preserved clip count, got %s'):format(reserve))

clip, reserve = ammoState.resolve(244, true, 6, 12, 9)
assert(clip == 6, ('successful query should replace the cached clip, got %s'):format(clip))
assert(reserve == 238, ('reserve should use the successful query, got %s'):format(reserve))

clip, reserve = ammoState.resolve(238, true, 0, 12, 9)
assert(clip == 0, ('a successful empty-clip query must remain zero, got %s'):format(clip))
assert(reserve == 238, ('an empty clip should leave all ammo in reserve, got %s'):format(reserve))

clip, reserve = ammoState.resolve(5, false, 0, 12, nil)
assert(clip == 5 and reserve == 0, 'cold-start fallback must not exceed total ammo')

print('ammo state tests passed')
