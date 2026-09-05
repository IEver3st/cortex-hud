import React, { memo, useMemo } from 'react'
import { getRadioStationIconUrl } from '../radioIcons.js'
import { getRadioWindow } from '../radioModel.js'
import './RadioSelector.css'

const modeLabel = (mode) => (mode === 'onDemand' ? 'On Demand' : 'Live Radio')

const handleArtworkError = (event) => {
  const tile = event.currentTarget.closest('.radio-selector__tile')
  event.currentTarget.hidden = true
  tile?.classList.add('is-art-missing')
}

function RadioSelector({ state }) {
  const visibleItems = useMemo(
    () => getRadioWindow(state.items, state.selectedIndex),
    [state.items, state.selectedIndex],
  )

  if (!state.visible) return null

  const inputMode = state.controls?.inputMode === 'gamepad' ? 'gamepad' : 'keyboard'
  const onDemandAvailable = state.onDemandAvailable === true
  const muteKey = state.controls?.muteKey || (inputMode === 'gamepad' ? 'A' : 'X')
  const muteLabel = state.muted ? 'Unmute' : 'Mute'
  const title = state.muted ? 'Muted' : state.track.title
  const artist = state.muted
    ? `Press ${muteKey} to resume`
    : state.track.requested
      ? `Cueing · ${state.track.artist}`
      : state.track.artist

  return (
    <section
      className={`radio-selector${state.mode === 'onDemand' ? ' radio-selector--on-demand' : ''}${state.muted ? ' radio-selector--muted' : ''}${state.track.requested ? ' radio-selector--pending' : ''}`}
      aria-label="Vehicle radio"
      aria-live="polite"
      aria-busy={state.track.requested}
    >
      <div
        className={`radio-selector__mode${onDemandAvailable ? '' : ' is-unavailable'}`}
        aria-label={`Playback mode: ${modeLabel(state.mode)}${onDemandAvailable ? '' : '; On Demand unavailable for this station'}`}
      >
        <span className={`radio-selector__mode-label${state.mode === 'radio' ? ' is-active' : ''}`}>Live Radio</span>
        <span className="radio-selector__mode-switch" aria-hidden="true">
          <span className="radio-selector__mode-knob" />
        </span>
        <span
          className={`radio-selector__mode-label${state.mode === 'onDemand' ? ' is-active' : ''}`}
          aria-disabled={!onDemandAvailable}
        >
          On Demand
        </span>
      </div>

      <div className="radio-selector__content">
        <div className="radio-selector__rail" aria-hidden="true">
          {visibleItems.map(({ item, offset }) => {
            const artworkUrl = getRadioStationIconUrl(item.id)

            return (
              <div
                key={item.id}
                className={`radio-selector__item${offset === 0 ? ' is-selected' : ''}`}
                style={{ '--radio-offset': offset }}
              >
                <span className={`radio-selector__tile${artworkUrl ? ' has-art' : ''}`}>
                  <span className="radio-selector__mark">{item.mark}</span>
                  {artworkUrl && (
                    <img
                      className="radio-selector__art"
                      src={artworkUrl}
                      alt=""
                      draggable="false"
                      onError={handleArtworkError}
                    />
                  )}
                </span>
                <span className="radio-selector__item-label">{item.label}</span>
              </div>
            )
          })}
        </div>

        <div className="radio-selector__now-playing">
          <span className="radio-selector__station">{state.station.label}</span>
          <span className="radio-selector__track">{title}</span>
          <span className="radio-selector__artist">{artist}</span>
        </div>
      </div>

      <div
        className="radio-selector__mute"
        data-input-mode={inputMode}
        aria-label={`${muteLabel} radio with ${muteKey}`}
      >
        <span className="radio-selector__mute-key" aria-hidden="true">{muteKey}</span>
        <span className="radio-selector__mute-label">{muteLabel}</span>
      </div>
    </section>
  )
}

export default memo(RadioSelector)
