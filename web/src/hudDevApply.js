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
    showCrosshair: Boolean(saved.showCrosshair),
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

export function getDefaultOpenSettingsPayload() {
  return {}
}
