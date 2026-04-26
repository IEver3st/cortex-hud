fx_version 'cerulean'
game 'gta5'

author 'Ever3st'
description 'Minimalist High-Performance HUD'
version '1.0.0'

dependency 'es_lib'

files {
    'web/dist/index.html',
    'web/dist/assets/index.js',
    'web/dist/assets/index.css',
    'config/shared.lua',
    'modules/**/*.lua',
}

ui_page 'web/dist/index.html'

shared_scripts {
    '@es_lib/init.lua'
}

client_scripts {
    'init.lua'
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
