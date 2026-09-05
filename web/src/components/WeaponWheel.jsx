import { memo } from 'react'
import './WeaponWheel.css'

const SLOT_POSITIONS = [
  [50, 10],
  [75, 28],
  [84, 50],
  [75, 72],
  [50, 90],
  [25, 72],
  [16, 50],
  [25, 28],
]

const handleWeaponArtError = (event) => {
  event.currentTarget.hidden = true
  event.currentTarget.parentElement?.classList.add('is-missing-art')
}

function areSlotPropsEqual(previous, next) {
  return (
    previous.position === next.position
    && previous.selected === next.selected
    && previous.category.id === next.category.id
    && previous.category.label === next.category.label
    && previous.category.count === next.category.count
    && previous.category.selectedIndex === next.category.selectedIndex
    && previous.category.weapon?.id === next.category.weapon?.id
    && previous.category.weapon?.icon === next.category.weapon?.icon
    && previous.category.weapon?.name === next.category.weapon?.name
    && previous.category.weapon?.equipped === next.category.weapon?.equipped
    && previous.category.weapon?.ammo?.visible === next.category.weapon?.ammo?.visible
    && previous.category.weapon?.ammo?.clip === next.category.weapon?.ammo?.clip
    && previous.category.weapon?.ammo?.reserve === next.category.weapon?.ammo?.reserve
  )
}

const WeaponWheelSlot = memo(function WeaponWheelSlot({ category, position, selected }) {
  const weapon = category.weapon
  const classNames = [
    'weapon-wheel__slot',
    selected && 'is-selected',
    weapon?.equipped && 'is-equipped',
    weapon?.ammo?.visible && 'has-ammo',
    !weapon && 'is-empty',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      style={{ '--wheel-x': `${position[0]}%`, '--wheel-y': `${position[1]}%` }}
      aria-current={selected ? 'true' : undefined}
      aria-label={weapon ? `${category.label}: ${weapon.name}` : `${category.label}: empty`}
    >
      <span className="weapon-wheel__art" aria-hidden="true">
        {weapon?.icon && (
          <img
            src={`./weapons/${weapon.icon}.png`}
            alt=""
            draggable={false}
            decoding="async"
            onError={handleWeaponArtError}
          />
        )}
        <span className="weapon-wheel__fallback-mark">{weapon ? '•' : '+'}</span>
      </span>

      {weapon?.ammo?.visible && (
        <span className="weapon-wheel__ammo" aria-label={`${weapon.ammo.clip} loaded, ${weapon.ammo.reserve} reserve`}>
          <span>{weapon.ammo.clip}</span>
          <span>{weapon.ammo.reserve}</span>
        </span>
      )}
    </div>
  )
}, areSlotPropsEqual)

function WeaponWheel({ state }) {
  if (!state.visible) return null

  const selectedCategory = state.categories.find(
    (category) => category.id === state.selectedCategory,
  )
  const selectedWeapon = selectedCategory?.weapon

  return (
    <section
      className="weapon-wheel"
      aria-label="Weapon wheel"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="weapon-wheel__frame">
        <div className="weapon-wheel__identity">
          <span className="weapon-wheel__weapon-name">
            {selectedWeapon?.name || selectedCategory?.label || 'Empty'}
          </span>
          <span className="weapon-wheel__category-name">
            {selectedCategory?.label || 'Weapon category'}
          </span>
        </div>

        {state.categories.map((category, index) => (
          <WeaponWheelSlot
            key={category.id}
            category={category}
            position={SLOT_POSITIONS[index] || SLOT_POSITIONS[0]}
            selected={category.id === state.selectedCategory}
          />
        ))}
      </div>
    </section>
  )
}

export default memo(WeaponWheel)
