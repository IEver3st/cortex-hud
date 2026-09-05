import React from 'react'
import './ScreenEffects.css'

const EFFECT_NAMES = ['damage', 'stamina', 'kill']
const KILL_PAINT = { rim: 0.24, mid: 0.544, far: 0.224, fade: 0.48 }
const EFFECT_PAINT = {
  damage: { rim: 0.176, mid: 0.416, far: 0.192, fade: 0.48 },
  stamina: KILL_PAINT,
  kill: KILL_PAINT,
}

function boundedAlpha(value) {
  return Math.min(1, Math.max(0, value)).toFixed(3)
}

export default function ScreenEffects({ effects, onEffectEnd }) {
  return (
    <div className="screen-effects" aria-hidden="true">
      {EFFECT_NAMES.map((effectName) => {
        const effect = effects?.[effectName]
        if (!effect) return null

        const paint = EFFECT_PAINT[effectName]
        const rimAlpha = effect.strength * paint.rim
        const midAlpha = effect.strength * paint.mid
        const farAlpha = effect.strength * paint.far
        const effectStyle = {
          '--screen-effect-duration': `${effect.duration}ms`,
          '--screen-effect-rim-alpha': boundedAlpha(rimAlpha),
          '--screen-effect-mid-alpha': boundedAlpha(midAlpha),
          '--screen-effect-far-alpha': boundedAlpha(farAlpha),
          '--screen-effect-rim-fade-alpha': boundedAlpha(rimAlpha * paint.fade),
          '--screen-effect-mid-fade-alpha': boundedAlpha(midAlpha * paint.fade),
          '--screen-effect-far-fade-alpha': boundedAlpha(farAlpha * paint.fade),
        }

        return (
          <div
            key={`${effectName}-${effect.nonce}`}
            className={`screen-effect screen-effect--${effectName}`}
            style={effectStyle}
            onAnimationEnd={() => onEffectEnd(effectName, effect.nonce)}
          />
        )
      })}
    </div>
  )
}
