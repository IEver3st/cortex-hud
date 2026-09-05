import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const readResourceFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('screen effects client contract', () => {
  test('starts the effect module and exposes the local trigger export', () => {
    const init = readResourceFile('init.lua')
    const manifest = readResourceFile('fxmanifest.lua')

    expect(init).toContain('ScreenEffects.start(config, hud.isVisible)')
    expect(manifest).toContain("'triggerScreenEffect'")
  })

  test('uses local damage events and filters kills to non-player peds', () => {
    const client = readResourceFile('modules/effects/client.lua')

    expect(client).toContain("AddEventHandler('entityDamaged', handleEntityDamaged)")
    expect(client).toContain('victim == playerPed')
    expect(client).toContain('IsEntityAPed(victim)')
    expect(client).toContain('IsPedAPlayer(victim)')
    expect(client).toContain("ScreenEffects.trigger('kill')")
  })

  test('reuses the HUD stamina sample instead of adding a second poller', () => {
    const client = readResourceFile('modules/effects/client.lua')
    const hud = readResourceFile('modules/threads/client/hud.lua')

    expect(client).not.toContain('CreateThread')
    expect(hud).toContain('ScreenEffects.updateStamina(staminaRounded)')
  })

  test('content-addresses NUI bundles so CEF cannot reuse a stale effect build', () => {
    const viteConfig = readResourceFile('web/vite.config.js')
    const manifest = readResourceFile('fxmanifest.lua')

    expect(viteConfig).toContain("entryFileNames: 'assets/[name]-[hash].js'")
    expect(viteConfig).toContain("assetFileNames: 'assets/[name]-[hash].[ext]'")
    expect(manifest).toContain("'web/dist/assets/*'")
    expect(manifest).not.toContain("'web/dist/assets/index.js'")
    expect(manifest).not.toContain("'web/dist/assets/index.css'")
  })
})
