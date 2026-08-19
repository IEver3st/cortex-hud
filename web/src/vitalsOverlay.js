export function isArmorBypassTransition(previous, current) {
  const previousHealth = Number(previous?.health)
  const previousArmor = Number(previous?.armor)
  const currentHealth = Number(current?.health)
  const currentArmor = Number(current?.armor)

  if (![previousHealth, previousArmor, currentHealth, currentArmor].every(Number.isFinite)) {
    return false
  }

  return previousArmor > 0
    && currentArmor > 0
    && currentHealth < previousHealth
    && currentArmor >= previousArmor
}

export function isArmorAppliedTransition(previous, current) {
  const previousArmor = Number(previous?.armor)
  const currentArmor = Number(current?.armor)

  if (![previousArmor, currentArmor].every(Number.isFinite)) {
    return false
  }

  return currentArmor > previousArmor && currentArmor > 0
}
