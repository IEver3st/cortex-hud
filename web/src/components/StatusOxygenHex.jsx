import React, { useMemo } from 'react'

import { BsLungsFill } from 'react-icons/bs'

import './StatusOxygenHex.css'





const OXYGEN_HEX_PATH = 'M15 30 L50 10 L85 30 L85 70 L50 90 L15 70 Z'



function clamp01(n) {

  return Math.max(0, Math.min(1, n))

}





export default function StatusOxygenHex({ value, variant = 'tray', className = '' }) {

  const clipId = React.useId().replace(/:/g, '')

  const pct = useMemo(() => clamp01(Number(value) / 100), [value])

  const clipY = 100 - pct * 100



  return (

    <div className={`status-oxygen-hex status-oxygen-hex--${variant} ${className}`.trim()}>

      <div className="status-oxygen-hex__stack">

        <svg className="status-oxygen-hex__svg status-oxygen-hex__svg--ghost" viewBox="0 0 100 100" aria-hidden>

          <path className="status-oxygen-hex__ghost" d={OXYGEN_HEX_PATH} />

        </svg>

        <svg className="status-oxygen-hex__svg status-oxygen-hex__svg--main" viewBox="0 0 100 100" aria-hidden>

          <defs>

            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">

              <rect x="0" y={clipY} width="100" height="100" />

            </clipPath>

          </defs>

          <path className="status-oxygen-hex__fill" d={OXYGEN_HEX_PATH} clipPath={`url(#${clipId})`} />

        </svg>

      </div>

      <div className="status-oxygen-hex__icon">

        <BsLungsFill />

      </div>

    </div>

  )

}

