import { HUD_LAYOUT_PRESETS } from './hudPresets.js'

const COLOR_KEYS = [
  ['colorHealth', 'health'],
  ['colorArmor', 'armor'],
  ['colorHunger', 'hunger'],
  ['colorThirst', 'thirst'],
  ['colorStress', 'stress'],
  ['colorOxygen', 'oxygen'],
]

const AMMO_POSITION_VALUES = new Set(['preset', 'custom', 'bottom-right', 'top-right', 'top-left', 'bottom-center'])

function pickColor(saved, colorKey, themeKey, colorPreset) {
  const v = saved[colorKey]
  if (v && v !== '' && v !== 'preset') {
    return v
  }
  return colorPreset.theme[themeKey] || colorPreset.theme.health
}


export function applyDevSettingsSave(saved, prev) {
  const layoutName = saved.layoutPreset && HUD_LAYOUT_PRESETS[saved.layoutPreset]
    ? saved.layoutPreset
    : 'classic'
  const colorName = saved.colorPreset && HUD_LAYOUT_PRESETS[saved.colorPreset]
    ? saved.colorPreset
    : layoutName

  const layoutPreset = HUD_LAYOUT_PRESETS[layoutName]
  const colorPreset = HUD_LAYOUT_PRESETS[colorName]
  const ammoPositionPreset = AMMO_POSITION_VALUES.has(saved.ammoPositionPreset)
    ? saved.ammoPositionPreset
    : (prev.ammoPositionPreset || 'preset')
  const resolvedAmmoPositionPreset = ammoPositionPreset === 'preset'
    ? layoutPreset.layout?.ammo?.anchor || 'bottom-right'
    : ammoPositionPreset

  let resolvedShape = saved.statusIconShape
  if (!resolvedShape || resolvedShape === '' || resolvedShape === 'preset') {
    resolvedShape = layoutPreset.defaults?.statusIconShape || 'bar'
  }

  let fuelStyle = saved.fuelDisplayStyle
  if (!fuelStyle || fuelStyle === '' || fuelStyle === 'preset') {
    fuelStyle = layoutPreset.defaults?.fuelDisplayStyle || 'bar'
  }

  const colors = { ...prev.colors }
  for (const [k, tk] of COLOR_KEYS) {
    colors[tk] = pickColor(saved, k, tk, colorPreset)
  }

  const ammoColor = pickColor({ ...saved, colorAmmo: saved.colorAmmo }, 'colorAmmo', 'ammo', colorPreset)
  const theme = {
    ...colorPreset.theme,
    health: colors.health,
    armor: colors.armor,
    hunger: colors.hunger,
    thirst: colors.thirst,
    stress: colors.stress,
    oxygen: colors.oxygen,
    ammo: ammoColor,
    indicatorAccent: colorPreset.theme.indicatorAccent,
    speedometerAccent: colorPreset.theme.speedometerAccent,
    voipAccent: colorPreset.theme.voipAccent,
    backdropBlur: Number.isFinite(Number(saved.backdropBlur)) ? saved.backdropBlur : prev.theme?.backdropBlur ?? 1,
    panelOpacity: Number.isFinite(Number(saved.panelOpacity)) ? saved.panelOpacity : prev.theme?.panelOpacity ?? 1,
  }

  return {
    ...prev,
    layoutPreset: layoutName,
    colorPreset: colorName,
    layout: { ...layoutPreset.layout },
    ammoPositionPreset,
    resolvedAmmoPositionPreset,
    theme,
    colors,
    ammoColor,
    statusIconShape: resolvedShape,
    resolvedStatusIconShape: resolvedShape,
    fuelDisplayStyle: fuelStyle,
    resolvedFuelDisplayStyle: fuelStyle,
    sectionedBars: Boolean(saved.sectionedBars),
    sectionedIndicator: Boolean(saved.sectionedIndicator),
    disableSpeedometer: Boolean(saved.disableSpeedometer),
    showCrosshair: Boolean(saved.showCrosshair),
    gta6HudEnabled: Boolean(saved.gta6HudEnabled),
    gta6AuthenticWeaponHud: Boolean(saved.gta6AuthenticWeaponHud),
    gta6ShowWeaponName: Object.prototype.hasOwnProperty.call(saved, 'gta6ShowWeaponName')
      ? saved.gta6ShowWeaponName !== false
      : prev.gta6ShowWeaponName,
    gta6VehicleIdentification: Object.prototype.hasOwnProperty.call(saved, 'gta6VehicleIdentification')
      ? saved.gta6VehicleIdentification !== false
      : prev.gta6VehicleIdentification,
    showDynamicWeather: Boolean(saved.showDynamicWeather),
    showHurricaneWarning: Object.prototype.hasOwnProperty.call(saved, 'showHurricaneWarning')
      ? Boolean(saved.showHurricaneWarning)
      : prev.showHurricaneWarning,
    oxygenDisplayLocation: saved.oxygenDisplayLocation || prev.oxygenDisplayLocation,
    speedUnit: saved.speedUnit || prev.speedUnit,
    hungerThreshold: saved.hungerThreshold ?? prev.hungerThreshold,
    thirstThreshold: saved.thirstThreshold ?? prev.thirstThreshold,
    stressThreshold: saved.stressThreshold ?? prev.stressThreshold,
    oxygenThreshold: saved.oxygenThreshold ?? prev.oxygenThreshold,
  }
}

export function getDefaultOpenSettingsPayload(hudData = {}) {
  const colors = hudData.colors || {}
  const theme = hudData.theme || {}

  return {
    layoutPreset: hudData.layoutPreset || 'classic',
    colorPreset: hudData.colorPreset || hudData.layoutPreset || 'classic',
    speedUnit: hudData.speedUnit || 'mph',
    disableSpeedometer: hudData.disableSpeedometer === true,
    hungerThreshold: hudData.hungerThreshold ?? 100,
    thirstThreshold: hudData.thirstThreshold ?? 100,
    stressThreshold: hudData.stressThreshold ?? 100,
    oxygenThreshold: hudData.oxygenThreshold ?? 100,
    colorHealth: colors.health || '#10b981',
    colorArmor: colors.armor || '#5eb2ff',
    colorHunger: colors.hunger || '#f59e0b',
    colorThirst: colors.thirst || '#38bdf8',
    colorStress: colors.stress || '#ef4444',
    colorOxygen: colors.oxygen || '#06b6d4',
    colorAmmo: hudData.ammoColor || theme.ammo || '#10b981',
    ammoPositionPreset: hudData.ammoPositionPreset || 'preset',
    showCrosshair: hudData.showCrosshair === true,
    gta6HudEnabled: hudData.gta6HudEnabled === true,
    gta6AuthenticWeaponHud: hudData.gta6AuthenticWeaponHud === true,
    gta6ShowWeaponName: hudData.gta6ShowWeaponName !== false,
    gta6VehicleIdentification: hudData.gta6VehicleIdentification !== false,
    showDynamicWeather: hudData.showDynamicWeather === true,
    showHurricaneWarning: hudData.showHurricaneWarning !== false,
    sectionedBars: hudData.sectionedBars === true,
    sectionedIndicator: hudData.sectionedIndicator === true,
    statusIconShape: hudData.resolvedStatusIconShape || hudData.statusIconShape || 'bar',
    oxygenDisplayLocation: hudData.oxygenDisplayLocation || 'statusCluster',
    backdropBlur: theme.backdropBlur ?? 1,
    panelOpacity: theme.panelOpacity ?? 1,
  }
}
