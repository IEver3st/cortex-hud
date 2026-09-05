import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(testDirectory, '..')
const source = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n')

test('idle client schedulers stay off the frame boundary', () => {
  const cruise = source('modules/cruise/client.lua')
  const scope = source('modules/scope/client.lua')
  const status = source('modules/status/client.lua')
  const radio = source('modules/radio/client.lua')
  const init = source('init.lua')
  const hud = source('modules/threads/client/hud.lua')

  assert.match(cruise, /if not self\.active then\s+Wait\(250\)\s+goto continue/)
  assert.doesNotMatch(cruise, /while enabled do\s+Wait\(0\)\s+if not self\.active/)
  assert.match(scope, /IDLE_REFRESH_MS\s*=\s*150/)
  assert.match(scope, /weaponLabel then\s+sleep = ACTIVE_REFRESH_MS/)
  assert.match(scope, /Wait\(sleep\)/)
  assert.match(init, /Status\.start\(config, hud\.isVisible\)/)
  assert.match(init, /SniperScope\.start\(hud\.isVisible\)/)
  assert.doesNotMatch(init, /exports\['cortex-hud'\]:isHudVisible\(\)/)
  assert.match(hud, /function hud\.isVisible\(\)/)
  assert.match(status, /local function readVoiceStateBag\(\)/)
  assert.doesNotMatch(status, /local stateKeys\s*=/)
  assert.match(status, /GetResourceState\('qbx_core'\) == 'started'/)
  assert.match(radio, /ELIGIBILITY_RECHECK_MS\s*=\s*250/)
  assert.match(radio, /if eligibilityFresh then\s+return state\.eligibilityAllowed and vehicle or 0/)
})

test('vehicle telemetry avoids duplicate high-frequency provider and pool work', () => {
  const vehicleStatus = source('modules/threads/client/vehicle_status.lua')
  const fuel = source('modules/fuel/client.lua')
  const vehiclePool = source('modules/interactions/vehicle_pool.lua')
  const vehicleDoors = source('modules/interactions/vehicle_doors.lua')
  const vehicleAccess = source('modules/interactions/vehicle_access.lua')

  assert.match(vehicleStatus, /FUEL_REFRESH_MS\s*=\s*500/)
  assert.match(vehicleStatus, /now >= nextFuelRefreshAt[\s\S]*Fuel\.get\(vehicle\)/)
  assert.match(vehicleStatus, /PASSIVE_GROUND_REFRESH_MS\s*=\s*250/)
  assert.equal((vehicleStatus.match(/GetEntitySpeed\(vehicle\)/g) || []).length, 2)
  assert.match(fuel, /PROVIDER_RECHECK_MS\s*=\s*3000/)
  assert.match(fuel, /cacheChecked and now >= 0 and now < nextDetectionAt/)
  assert.match(fuel, /if resName ~= checkedResource then/)
  assert.match(vehiclePool, /CACHE_WINDOW_MS\s*=\s*50/)
  assert.equal((vehiclePool.match(/GetGamePool\('CVehicle'\)/g) || []).length, 1)
  assert.match(vehicleDoors, /VehiclePool\.get\(\)/)
  assert.match(vehicleAccess, /VehiclePool\.get\(\)/)
  assert.match(vehicleDoors, /VehiclePool\.getCoords\(vehicle\)/)
  assert.match(vehicleAccess, /VehiclePool\.getCoords\(vehicle\)/)
  assert.doesNotMatch(vehicleDoors, /GetGamePool\('CVehicle'\)/)
  assert.doesNotMatch(vehicleAccess, /GetGamePool\('CVehicle'\)/)
})

test('stable NUI subtrees do not rerender for unrelated telemetry', () => {
  const app = source('web/src/App.jsx')
  const hud = source('web/src/components/HUD.jsx')
  const indicator = source('web/src/components/Indicator.jsx')
  const cloneQte = source('web/src/components/VehicleCloneQte.jsx')
  const oxygen = source('web/src/components/StatusOxygenHex.jsx')
  const settings = source('web/src/components/SettingsModal.jsx')

  assert.match(app, /useMemo\(\(\) => JSON\.stringify\(settingsData\), \[settingsData\]\)/)
  assert.match(app, /key=\{settingsRenderKey\}/)
  assert.match(hud, /const VoipVisualizer = React\.memo/)
  assert.match(hud, /const Gta6WeaponIcon = React\.memo/)
  assert.match(indicator, /export default React\.memo\(Indicator\)/)
  assert.match(cloneQte, /export default memo\(VehicleCloneQte\)/)
  assert.match(oxygen, /export default React\.memo\(StatusOxygenHex\)/)
  assert.match(settings, /export default React\.memo\(SettingsModal\)/)
})
