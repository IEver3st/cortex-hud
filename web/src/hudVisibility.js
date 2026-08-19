export function shouldShowSpeedometer({
  vehicleVisible,
  editMode,
  disableSpeedometer,
  gta6HudEnabled,
}) {
  if (disableSpeedometer || gta6HudEnabled) {
    return false
  }

  return Boolean(vehicleVisible || editMode)
}

export function shouldShowWeaponOverlay({
  gta6HudEnabled,
  isArmed,
  ammoEditMode,
  playerInVehicle,
}) {
  return Boolean(gta6HudEnabled && isArmed && !ammoEditMode && !playerInVehicle)
}
