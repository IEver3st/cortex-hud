import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function source(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

test('clone-key completion remains behind the authoritative server session', async () => {
  const server = await source('modules/interactions/server.lua')

  assert.match(server, /rounds = math\.random\(minimumRounds, maximumRounds\)/)
  assert.match(server, /notBefore = now \+ math\.max\(500, earliestCompletion - 225\)/)
  assert.match(server, /session\.token ~= token/)
  assert.match(server, /session\.networkId ~= networkId/)
  assert.match(server, /resolveAccessVehicle\(src, networkId\)/)
  assert.match(server, /giveProviderKey\(session\.provider, src, entity\)/)
})

test('clone-key client uses the remappable interaction command without taking NUI focus', async () => {
  const access = await source('modules/interactions/vehicle_access.lua')

  assert.match(access, /action = ['"]vehicleCloneQte:press['"]/)
  assert.match(access, /RegisterNUICallback\(['"]vehicleCloneQte:complete['"]/)
  assert.match(access, /TaskPlayAnim\(/)
  assert.match(access, /ClearPedSecondaryTask\(presentation\.ped\)/)
  assert.doesNotMatch(access, /SetNuiFocus|SetNuiFocusKeepInput/)
})

test('GTA 6 HUD renders the white-ring and pink-sweep challenge from bounded data', async () => {
  const app = await source('web/src/App.jsx')
  const component = await source('web/src/components/VehicleCloneQte.jsx')
  const css = await source('web/src/components/VehicleCloneQte.css')

  assert.match(app, /vehicleCloneQte:start/)
  assert.match(app, /<VehicleCloneQte/)
  assert.match(component, /normalizeVehicleCloneChallenge/)
  assert.match(component, /isVehicleCloneHit/)
  assert.match(css, /--clone-qte-accent:\s*#ff789d/)
  assert.match(css, /vehicle-clone-qte__track/)
  assert.match(css, /vehicle-clone-qte__sweep/)
})
