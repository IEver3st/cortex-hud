const MAX_CATEGORIES = 8
const MAX_LABEL_LENGTH = 64

const cleanString = (value, maxLength = MAX_LABEL_LENGTH) => {
  if (typeof value !== 'string') return ''
  return Array.from(value, (character) => (character.charCodeAt(0) < 32 ? ' ' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

const cleanInteger = (value, minimum, maximum, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(number)))
}

const normalizeAmmo = (ammo) => ({
  visible: ammo?.visible === true,
  clip: cleanInteger(ammo?.clip, 0, 99999, 0),
  reserve: cleanInteger(ammo?.reserve, 0, 99999, 0),
})

const normalizeWeapon = (weapon) => {
  if (!weapon || typeof weapon !== 'object') return null

  const id = cleanString(weapon.id)
  const name = cleanString(weapon.name, 48)
  if (!id || !name) return null

  const icon = cleanString(weapon.icon)
  return {
    id,
    icon: /^weapon_[a-z0-9_]+$/.test(icon) ? icon : '',
    name,
    equipped: weapon.equipped === true,
    ammo: normalizeAmmo(weapon.ammo),
  }
}

const normalizeCategory = (category, index) => {
  if (!category || typeof category !== 'object') return null

  const id = cleanString(category.id, 24)
  const label = cleanString(category.label, 32)
  if (!id || !label) return null

  const count = cleanInteger(category.count, 0, 256, 0)
  const selectedIndex = count > 0
    ? cleanInteger(category.selectedIndex, 1, count, 1)
    : 0

  return {
    id,
    label,
    count,
    selectedIndex,
    weapon: normalizeWeapon(category.weapon),
    slot: index,
  }
}

export const INITIAL_WEAPON_WHEEL_STATE = Object.freeze({
  visible: false,
  revision: 0,
  selectedCategory: 'melee',
  inputMode: 'keyboard',
  categories: Object.freeze([]),
})

export function normalizeWeaponWheelState(payload, previous = INITIAL_WEAPON_WHEEL_STATE) {
  if (!payload || typeof payload !== 'object') return previous

  const categories = Array.isArray(payload.categories)
    ? payload.categories
      .slice(0, MAX_CATEGORIES)
      .map(normalizeCategory)
      .filter(Boolean)
    : previous.categories
  const selectedCategory = cleanString(payload.selectedCategory, 24)

  return {
    visible: Object.prototype.hasOwnProperty.call(payload, 'visible')
      ? payload.visible === true
      : previous.visible,
    revision: cleanInteger(payload.revision, 0, Number.MAX_SAFE_INTEGER, previous.revision),
    selectedCategory: categories.some((category) => category.id === selectedCategory)
      ? selectedCategory
      : previous.selectedCategory,
    inputMode: payload.inputMode === 'gamepad'
      ? 'gamepad'
      : payload.inputMode === 'keyboard'
        ? 'keyboard'
        : previous.inputMode,
    categories,
  }
}

const devCategories = [
  ['sidearm', 'Sidearm', 'weapon_pistol', 'Pistol', 20, 80, 6, 2, true],
  ['automatic', 'SMGs & MGs', 'weapon_microsmg', 'Micro SMG', 16, 112, 4, 1, false],
  ['melee', 'Unarmed & Melee', 'weapon_unarmed', 'Unarmed', 0, 0, 8, 1, false],
  ['gear', 'Thrown & Gear', 'weapon_grenade', 'Grenade', 4, 0, 5, 2, false],
  ['heavy', 'Heavy', 'weapon_rpg', 'RPG', 1, 4, 3, 1, false],
  ['sniper', 'Snipers', 'weapon_heavysniper', 'Heavy Sniper', 6, 18, 2, 1, false],
  ['shotgun', 'Shotguns', 'weapon_pumpshotgun', 'Pump Shotgun', 8, 32, 3, 1, false],
  ['rifle', 'Rifles', 'weapon_carbinerifle', 'Carbine Rifle', 30, 210, 7, 3, false],
].map(([id, label, icon, name, clip, reserve, count, selectedIndex, equipped], slot) => ({
  id,
  label,
  count,
  selectedIndex,
  slot,
  weapon: {
    id: icon,
    icon,
    name,
    equipped,
    ammo: { visible: id !== 'melee', clip, reserve },
  },
}))

export const DEV_WEAPON_WHEEL_STATE = Object.freeze({
  visible: true,
  revision: 1,
  selectedCategory: 'melee',
  inputMode: 'keyboard',
  categories: Object.freeze(devCategories),
})
