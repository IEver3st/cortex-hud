fx_version 'cerulean'
game 'gta5'

author 'Ever3st'
description 'Minimalist High-Performance HUD'
version '1.0.1'

dependency 'cortex-lib'

files {
    'web/dist/index.html',
    'web/dist/assets/index.js',
    'web/dist/assets/index.css',
    'web/dist/assets/*.woff',
    'web/dist/assets/*.woff2',
    'web/third-party/barlow-condensed-OFL.txt',
    'web/dist/weapons/*.png',
    'web/dist/weapons/manifest.json',
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
    'getSettingsDefinition',
    'setCharacterSelectionActive',
    'setSpawnSelectorActive',
}

lua54 'yes'
use_experimental_fxv2_oal("yes")
nui_callback_strict_mode("true")
