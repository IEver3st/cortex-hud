import React, { useMemo } from 'react'
import { FaCompass, FaLocationArrow, FaMap, FaMapMarkerAlt } from 'react-icons/fa'
import './Indicator.css'

const getHeadingLabel = (heading) => {
    if (heading >= 337.5 || heading < 22.5) return 'N'
    if (heading >= 22.5 && heading < 67.5) return 'NE'
    if (heading >= 67.5 && heading < 112.5) return 'E'
    if (heading >= 112.5 && heading < 157.5) return 'SE'
    if (heading >= 157.5 && heading < 202.5) return 'S'
    if (heading >= 202.5 && heading < 247.5) return 'SW'
    if (heading >= 247.5 && heading < 292.5) return 'W'
    if (heading >= 292.5 && heading < 337.5) return 'NW'
    return 'N'
}

const Indicator = ({ heading, street, zone, postal, postalDist }) => {
    const headingLabel = useMemo(() => getHeadingLabel(heading), [heading])

    return (
        <div className="indicator-container">
            <div className="indicator-box">
                <div className="indicator-icon compass">
                    <FaCompass />
                </div>
                <div className="indicator-text">{headingLabel}</div>
            </div>
            
            <div className="indicator-box">
                <div className="indicator-icon location">
                    <FaLocationArrow />
                </div>
                <div className="indicator-text">{street}</div>
            </div>

            <div className="indicator-box">
                <div className="indicator-icon map">
                    <FaMap />
                </div>
                <div className="indicator-text">{zone}</div>
            </div>

            {postal && (
                <div className="indicator-box">
                    <div className="indicator-icon postal" style={{ color: 'var(--es-warning)', filter: 'drop-shadow(0 0 calc(3px * var(--es-ui-scale)) rgba(255, 170, 0, 0.5))' }}>
                        <FaMapMarkerAlt />
                    </div>
                    <div className="indicator-text">
                        <span style={{ color: 'var(--es-warning)', marginRight: '5px' }}>Postal:</span>
                        {postal} 
                        {(postalDist !== null && postalDist !== undefined) && (
                            <span style={{ color: 'var(--es-success)', marginLeft: '5px', fontSize: '0.9em' }}>({postalDist.toFixed(2)}m)</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Indicator
