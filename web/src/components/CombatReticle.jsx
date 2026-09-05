import React from 'react'
import {
  getOpenReticleGap,
  getRingReticleDiameter,
  normalizeHitmarkerKind,
  normalizeWeaponReticleType,
} from '../combatFeedback.js'
import './CombatReticle.css'

const HITMARKER_PATHS = [
  'M4 4 L12 12',
  'M28 4 L20 12',
  'M4 28 L12 20',
  'M28 28 L20 20',
]

function HitmarkerPaths({ className }) {
  return (
    <g className={className}>
      {HITMARKER_PATHS.map((path) => <path key={path} d={path} />)}
    </g>
  )
}

const CombatReticle = React.memo(({
  showAuthenticReticle = false,
  showClassicDot = false,
  weaponReticleType = 'none',
  weaponBloom = 0,
  weaponAiming = false,
  hitmarker = null,
}) => {
  const hitmarkerKind = normalizeHitmarkerKind(hitmarker?.kind)
  const reticleType = normalizeWeaponReticleType(weaponReticleType) ?? 'none'
  const usesRing = reticleType === 'automatic' || reticleType === 'shotgun'
  const showRing = showAuthenticReticle && usesRing && weaponAiming
  const showOpenReticle = showAuthenticReticle && reticleType === 'single' && weaponAiming
  const showTazer = showAuthenticReticle && reticleType === 'tazer' && weaponAiming
  const showRpg = showAuthenticReticle && reticleType === 'rpg' && weaponAiming
  // The homing launcher keeps the vanilla lock-on UI (brackets, target box,
  // lock tone) because only the game knows the actual locked entity. Never
  // draw the old static center box for it.
  const isHoming = reticleType === 'homing'
  const showDot = showClassicDot && weaponAiming && !isHoming

  if (isHoming && !hitmarkerKind) {
    return null
  }

  if (!showRing && !showOpenReticle && !showTazer && !showRpg && !showDot && !hitmarkerKind) {
    return null
  }

  return (
    <div className="combat-reticle-layer" aria-hidden="true">
      {showRing && (
        <span
          className={`combat-reticle-ring combat-reticle-ring--${reticleType}`}
          style={{
            '--combat-reticle-diameter': `${getRingReticleDiameter(weaponBloom, reticleType)}px`,
          }}
        />
      )}

      {showOpenReticle && (
        <span
          className="combat-reticle-open"
          style={{ '--combat-reticle-gap': `${getOpenReticleGap(weaponBloom)}px` }}
        >
          <span className="combat-reticle-open__arm combat-reticle-open__arm--left" />
          <span className="combat-reticle-open__arm combat-reticle-open__arm--right" />
          <span className="combat-reticle-open__arm combat-reticle-open__arm--stem" />
        </span>
      )}

      {showTazer && (
        <svg
          className="combat-reticle-tazer"
          viewBox="0 0 32 32"
          style={{
            '--combat-reticle-diameter': `${getRingReticleDiameter(weaponBloom, 'tazer')}px`,
          }}
        >
          <HitmarkerPaths className="combat-reticle-tazer__outline" />
          <HitmarkerPaths className="combat-reticle-tazer__stroke" />
        </svg>
      )}

      {showRpg && (
        <span
          className="combat-reticle-ring combat-reticle-ring--rpg"
          style={{
            '--combat-reticle-diameter': `${getRingReticleDiameter(weaponBloom, 'rpg')}px`,
          }}
        />
      )}

      {showDot && <span className="combat-reticle-dot" />}

      {hitmarkerKind && (
        <svg
          key={hitmarker.nonce}
          className={`combat-hitmarker combat-hitmarker--${hitmarkerKind}`}
          viewBox="0 0 32 32"
        >
          <HitmarkerPaths className="combat-hitmarker__outline" />
          <HitmarkerPaths className="combat-hitmarker__stroke" />
        </svg>
      )}
    </div>
  )
})

export default CombatReticle
