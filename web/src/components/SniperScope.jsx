import React from 'react'
import './SniperScope.css'

const tickMarks = Array.from({ length: 11 }, (_, index) => index)

function SniperScope({ visible }) {
  return (
    <div
      className={`sniper-scope${visible ? ' sniper-scope--visible' : ''}`}
      aria-hidden="true"
    >
      <div className="sniper-scope__lens">
        <div className="sniper-scope__axis sniper-scope__axis--horizontal" />
        <div className="sniper-scope__axis sniper-scope__axis--vertical" />

        <div className="sniper-scope__arm sniper-scope__arm--top" />
        <div className="sniper-scope__arm sniper-scope__arm--right" />
        <div className="sniper-scope__arm sniper-scope__arm--bottom" />
        <div className="sniper-scope__arm sniper-scope__arm--left" />

        <div className="sniper-scope__ticks sniper-scope__ticks--horizontal">
          {tickMarks.map((tick) => (
            <span
              key={`horizontal-${tick}`}
              className="sniper-scope__tick"
              style={{ left: `${tick * 10}%` }}
            />
          ))}
        </div>

        <div className="sniper-scope__ticks sniper-scope__ticks--vertical">
          {tickMarks.map((tick) => (
            <span
              key={`vertical-${tick}`}
              className="sniper-scope__tick"
              style={{ top: `${tick * 10}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default React.memo(SniperScope)
