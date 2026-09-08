fx_version 'cerulean'
game 'gta5'

author 'Ever3st'
description 'Minimalist High-Performance HUD'
version '1.0.2'

dependency 'cortex-lib'

files {
    'web/dist/index.html',
    'web/dist/assets/*',
    'web/third-party/barlow-condensed-OFL.txt',
    'web/third-party/pricedown-NOTICE.txt',
    'web/dist/weapons/*.png',
    'web/dist/weapons/manifest.json',
    'web/dist/radio-icons/*',
    'data/radio_catalog.json',
    'web/third-party/gta-radio-icons-NOTICE.txt',
    'config/shared.lua',
    'modules/**/*.lua',
}

ui_page 'web/dist/index.html'

shared_scripts {
    '@cortex-lib/init.lua'
}

client_scripts {
    'init.lua'
}

server_scripts {
    'modules/interactions/server.lua'
}

exports {
    'toggleHud',
    'toggleMap',
    'refreshMinimap',
    'isHarnessOn',
    'toggleHarness',
    'isCruiseControlActive',
    'triggerScreenEffect',
    'getSettingsDefinition',
    'setCharacterSelectionActive',
    'setSpawnSelectorActive',
}

use_experimental_fxv2_oal("yes")
nui_callback_strict_mode("true")
