import React, { useMemo, useEffect, useCallback } from "react";
import { IoShieldHalf } from "react-icons/io5";
import { FaBurger, FaDroplet, FaWalkieTalkie, FaLocationDot } from "react-icons/fa6";
import { FaHeart } from "react-icons/fa";
import { BsFuelPumpFill, BsLungsFill } from "react-icons/bs";
import { LuBrain } from "react-icons/lu";
import { PiEngineFill, PiSeatbeltFill } from "react-icons/pi";
import { GiFullMotorcycleHelmet } from "react-icons/gi";
import AmmoIcon from "../assets/machine-gun-magazine.svg";

import "./HUD.css";


// es_lib UI scaling - matches es_lib/ui/app.js
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getUiScale() {
  const h = window.innerHeight || 1080;
  const normalized = h / 1080;
  return clamp(normalized, 1, 2);
}

function applyUiScale(value) {
  document.documentElement.style.setProperty("--es-ui-scale", value);
}

const VoipVisualizer = ({ isTalking, color }) => {
  // 12 bars for a fuller look based on the image
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className={`voip-waveform ${isTalking ? "active" : ""}`}>
      {bars.map((i) => {
        // Determine base height based on position (sin-wave distribution)
        const centerDist = Math.abs(i - 6.5);
        const baseHeight = Math.max(25, 100 - centerDist * 14);

        return (
          <div
            key={i}
            className="voip-waveform-bar"
            style={{
              "--bar-index": i,
              "--base-height": `${baseHeight}%`,
              backgroundColor: isTalking ? color : "rgba(255, 255, 255, 0.15)",
            }}
          />
        );
      })}
    </div>
  );
};

const HUD = React.memo(
  ({
    health,
    armor,
    vehicleVisible,
    speedUnit,
    speed,
    rpm,
    gears,
    currentGear,
    fuel,
    hasFuelProvider,
    engineHealth,
    engineState,
    headlights,
    belt,
    harness,
    useSeatbelt,
    nosVisible,
    nosAmount,
    nosActive,
    hunger,
    thirst,
    stress,
    oxygen,
    voipTalking,
    voipRange,
    voipConnected,
    radioChannel,
    radioTalking,
    hungerThreshold,
    thirstThreshold,
    stressThreshold,
    oxygenThreshold,
    showVoip,
    speedometerPos,
    editMode,
    onDrag,
    colors,
    fuelDisplayStyle,
    waypointDist,
    waypointUnit,
    ammoClip,
    ammoReserve,
    ammoPos,
    ammoColor,
    ammoPositionPreset,
  }) => {
    // Apply es_lib UI scaling on mount and resize
    useEffect(() => {
      applyUiScale(getUiScale());
      const handleResize = () => applyUiScale(getUiScale());
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
      if (colors) {
        const root = document.documentElement;
        if (colors.health)
          root.style.setProperty("--health-color", colors.health);
        if (colors.armor) root.style.setProperty("--armor-color", colors.armor);
        if (colors.hunger)
          root.style.setProperty("--hunger-color", colors.hunger);
        if (colors.thirst)
          root.style.setProperty("--thirst-color", colors.thirst);
        if (colors.stress)
          root.style.setProperty("--stress-color", colors.stress);
        if (colors.oxygen)
          root.style.setProperty("--oxygen-color", colors.oxygen);
      }
    }, [colors]);

    const handleMouseDown = useCallback(
      (e) => {
        if (!editMode) return;
        const startX = e.clientX,
          startY = e.clientY;
        const rect = e.currentTarget.getBoundingClientRect();
        const initialLeft = rect.left,
          initialTop = rect.top;
        const elW = rect.width,
          elH = rect.height;
        e.preventDefault();

        const SNAP_DIST = 30;
        const MARGIN = 10;

        const handleMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX,
            dy = moveEvent.clientY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const vw = window.innerWidth;
          const vh = window.innerHeight;

          // Snap to left edge
          if (newLeft < SNAP_DIST) newLeft = MARGIN;
          // Snap to right edge
          if (newLeft + elW > vw - SNAP_DIST) newLeft = vw - elW - MARGIN;
          // Snap to top edge
          if (newTop < SNAP_DIST) newTop = MARGIN;
          // Snap to bottom edge
          if (newTop + elH > vh - SNAP_DIST) newTop = vh - elH - MARGIN;

          // Snap to horizontal center
          const centerX = (vw - elW) / 2;
          if (Math.abs(newLeft - centerX) < SNAP_DIST) newLeft = centerX;
          // Snap to vertical center
          const centerY = (vh - elH) / 2;
          if (Math.abs(newTop - centerY) < SNAP_DIST) newTop = centerY;

          onDrag({ left: newLeft, top: newTop });
        };
        const handleMouseUp = () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      },
      [editMode, onDrag],
    );


    const speedoStyle = useMemo(() => {
      const style = {};
      if (speedometerPos) {
        style.position = "fixed";
        style.left = `${speedometerPos.left}px`;
        style.top = `${speedometerPos.top}px`;
        style.right = "auto";
        style.bottom = "auto";
      }
      if (editMode) {
        style.cursor = "move";
        style.pointerEvents = "auto";
      }
      return style;
    }, [speedometerPos, editMode]);

    const ammoContainerStyle = useMemo(() => {
      if (ammoPositionPreset === 'custom' && ammoPos) {
        return {
          position: 'fixed',
          left: `${ammoPos.left}px`,
          top: `${ammoPos.top}px`,
          right: 'auto',
          bottom: 'auto',
          transform: 'none'
        };
      }

      switch (ammoPositionPreset) {
        case 'top-right':
          return {
            top: 'calc(4vh * var(--es-ui-scale))',
            right: 'calc(4vw * var(--es-ui-scale))',
            left: 'auto',
            bottom: 'auto',
            transform: 'none'
          };
        case 'top-left':
          return {
            top: 'calc(4vh * var(--es-ui-scale))',
            left: 'calc(4vw * var(--es-ui-scale))',
            right: 'auto',
            bottom: 'auto',
            transform: 'none'
          };
        case 'bottom-center':
          return {
            bottom: 'calc(1vh * var(--es-ui-scale))',
            left: '50%',
            right: 'auto',
            top: 'auto',
            transform: 'translateX(-50%)'
          };
        case 'bottom-right':
        default:
          return {
            bottom: 'calc(1vh * var(--es-ui-scale))',
            right: 'calc(4vw * var(--es-ui-scale))',
            left: 'auto',
            top: 'auto',
            transform: 'none'
          };
      }
    }, [ammoPos, ammoPositionPreset]);

    const healthColorClass = useMemo(() => {
      if (health <= 20) return "critical";
      if (health <= 40) return "low";
      return "";
    }, [health]);

    const rpmPercent = useMemo(() => clamp(rpm / 100, 0, 1), [rpm]);
    const rpmArcStyle = useMemo(
      () => ({
        strokeDasharray: `${rpmPercent * 212} 283`,
        strokeDashoffset: 0,
        opacity: rpmPercent < 0.01 ? 0 : 1,
      }),
      [rpmPercent],
    );

    const rpmColor = useMemo(() => {
      const p = rpmPercent;
      if (p < 0.6) return { color: "#10b981", glow: "rgba(16, 185, 129, 0.5)" };
      else if (p < 0.9)
        return { color: "#ffaa00", glow: "rgba(255, 170, 0, 0.5)" };
      else return { color: "#ff4444", glow: "rgba(255, 68, 68, 0.6)" };
    }, [rpmPercent]);

    const rpmArcDynamicStyle = useMemo(
      () => ({
        ...rpmArcStyle,
        stroke: rpmColor.color,
        filter: `drop-shadow(0 0 calc(6px * var(--es-ui-scale)) ${rpmColor.glow})`,
      }),
      [rpmArcStyle, rpmColor],
    );

    const nosArcStyle = useMemo(
      () => ({
        strokeDasharray: `${clamp(nosAmount / 100, 0, 1) * 191} 255`,
        strokeDashoffset: 0,
        opacity: nosVisible ? 1 : 0,
        stroke: nosActive ? "#a855f7" : "rgba(216, 180, 254, 0.4)",
      }),
      [nosAmount, nosVisible, nosActive],
    );

    const useRadialFuel = fuelDisplayStyle === "radial";

    const fuelPercent = useMemo(() => clamp(fuel / 100, 0, 1), [fuel]);
    const fuelLow = fuelPercent <= 0.15;

    const ticks = useMemo(() => {
      const result = [];
      for (let i = 0; i <= 7; i++) {
        const angleRad = ((135 + (i * 270) / 7) * Math.PI) / 180;
        result.push({
          i,
          x1: 50 + Math.cos(angleRad) * 42,
          y1: 50 + Math.sin(angleRad) * 42,
          x2: 50 + Math.cos(angleRad) * 48,
          y2: 50 + Math.sin(angleRad) * 48,
          numX: 50 + Math.cos(angleRad) * 35,
          numY: 50 + Math.sin(angleRad) * 35,
        });
      }
      return result;
    }, []);

    const renderStatusMeter = (
      value,
      icon,
      type,
      threshold,
      isReversed = false,
    ) => {
      const displayValue = isReversed ? 1 - value / 100 : value / 100;
      let state = "";
      if (isReversed) {
        if (value >= 80) state = "critical";
        else if (value >= 50) state = "low";
      } else {
        if (value <= 10) state = "critical";
        else if (value <= 25) state = "low";
      }
      return (
        <div className={`status-tray-item ${state} status-${type}`}>
          <div className="status-meter-group">
            <div className="status-meter-bar">
              <div
                className="status-meter-bar-fill"
                style={{ height: `${displayValue * 100}%` }}
              />
            </div>
            <div className="status-meter-icon">{icon}</div>
          </div>
        </div>
      );
    };

    return (
      <>
        {/* VOIP Section - Bottom Right */}
        {showVoip && (
          <div
            className={`voip-container-modern ${voipConnected ? "" : "muted"} ${voipTalking ? "talking" : ""} ${radioTalking ? "radio-talking" : ""}`}
          >
            <div className="voip-content-modern">
              <div className="voip-indicator-group">
                <div className="voip-main-stack">
                  <VoipVisualizer
                    isTalking={voipTalking || radioTalking}
                    color={radioTalking ? "#ff4444" : "#10b981"}
                  />

                  <div className="voip-range-modern">
                    <span
                      className={`voip-pip-modern ${voipRange === "whisper" || voipRange === "normal" || voipRange === "shout" ? "on" : ""}`}
                    />
                    <span
                      className={`voip-pip-modern ${voipRange === "normal" || voipRange === "shout" ? "on" : ""}`}
                    />
                    <span
                      className={`voip-pip-modern ${voipRange === "shout" ? "on" : ""}`}
                    />
                  </div>
                </div>

                {voipConnected && radioChannel > 0 && (
                  <div className="voip-radio-icon-modern">
                    <FaWalkieTalkie />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Icon Tray - bottom left area */}
        <div className="status-tray">
          {hunger <= hungerThreshold &&
            renderStatusMeter(
              hunger,
              <FaBurger />,
              "hunger",
              hungerThreshold,
            )}
          {thirst <= thirstThreshold &&
            renderStatusMeter(
              thirst,
              <FaDroplet />,
              "thirst",
              thirstThreshold,
            )}
          {stress > 0 &&
            stressThreshold > 0 &&
            stress >= 100 - stressThreshold &&
            renderStatusMeter(
              stress,
              <LuBrain />,
              "stress",
              stressThreshold,
              true,
            )}
          {oxygen <= oxygenThreshold &&
            oxygen < 100 &&
            renderStatusMeter(
              oxygen,
              <BsLungsFill />,
              "oxygen",
              oxygenThreshold,
            )}
        </div>

        {/* Waypoint Distance */}
        {waypointDist > 0 && (
          <div className="waypoint-distance">
            <FaLocationDot className="waypoint-icon" />
            <span className="waypoint-value">{waypointDist.toFixed(2)}</span>
            <span className="waypoint-unit">{waypointUnit}</span>
          </div>
        )}

        <div className="hud-container">
          {/* Health Bar */}
          <div className={`hud-bar health-bar ${healthColorClass}`}>
            <div className="bar-icon"><FaHeart /></div>
            <div className="bar-value">{health}</div>
            <div className="bar-track">
                <div className="bar-fill health-fill" style={{ width: `${health}%` }}><div className="bar-glow" /></div>
                <div className="bar-segments" />
            </div>
          </div>

          {/* Armor Bar */}
          <div className={`hud-bar armor-bar ${armor > 0 ? '' : 'is-hidden'}`}>
            <div className="bar-icon"><IoShieldHalf /></div>
            <div className="bar-value">{Math.max(armor, 0)}</div>
            <div className="bar-track">
                <div className="bar-fill armor-fill" style={{ width: `${Math.max(armor, 0)}%` }}><div className="bar-glow" /></div>
                <div className="bar-segments" />
            </div>
          </div>
        </div>

        {/* Vehicle Speedometer */}
        {vehicleVisible && (
          <div
            className="speedo-container"
            style={speedoStyle}
            onMouseDown={handleMouseDown}
          >
            <div className="speedo-ring">
              <svg
                className="speedo-svg"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle className="speedo-track" cx="50" cy="50" r="45" />
                <circle
                  className="speedo-arc"
                  cx="50"
                  cy="50"
                  r="45"
                  style={rpmArcDynamicStyle}
                />

                <circle
                  className="speedo-track-nos"
                  cx="50"
                  cy="50"
                  r="40.5"
                  style={{ opacity: nosVisible ? 1 : 0 }}
                />
                <circle
                  className="speedo-arc-nos"
                  cx="50"
                  cy="50"
                  r="40.5"
                  style={nosArcStyle}
                />
                <g className="speedo-ticks">
                  {ticks.map((t) => (
                    <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
                  ))}
                </g>
                <g className="speedo-numbers">
                  {ticks.map((t) => (
                    <text
                      key={t.i}
                      x={t.numX}
                      y={t.numY}
                      dominantBaseline="middle"
                      textAnchor="middle"
                    >
                      {t.i}
                    </text>
                  ))}
                </g>
              </svg>
              {useRadialFuel && hasFuelProvider && (
                <svg
                  className="speedo-fuel-radial"
                  viewBox="0 0 100 100"
                >
                  {/* Track arc — perfectly concentric r=56 arc, longer length (~91 units) */}
                  <path
                    className="speedo-fuel-radial-track"
                    d="M 11 90.2 A 56 56 0 0 1 11 9.8"
                    fill="none"
                  />
                  {/* Fill arc — same path, dasharray driven by fuel % */}
                  <path
                    className={`speedo-fuel-radial-fill${fuelLow ? " low" : ""}`}
                    d="M 11 90.2 A 56 56 0 0 1 11 9.8"
                    fill="none"
                    style={{
                      strokeDasharray: `${fuelPercent * 91} 91`,
                    }}
                  />
                </svg>
              )}
              <div className="speedo-center">
                <div className="speedo-speed">{speed}</div>
                <div className="speedo-unit">{speedUnit.toUpperCase()}</div>
                {currentGear && (
                  <div
                    className="speedo-gear"
                    style={{
                      color: rpmColor.color,
                      textShadow: `0 0 calc(8px * var(--es-ui-scale)) ${rpmColor.glow}`,
                    }}
                  >
                    {currentGear}
                  </div>
                )}
              </div>
              {useRadialFuel && hasFuelProvider && (
                <div className="speedo-fuel-radial-label">
                  <BsFuelPumpFill />
                </div>
              )}
            </div>
            <div className="speedo-status">
              {hasFuelProvider && !useRadialFuel && (
                <div
                  className={`speedo-statusItem speedo-statusItem-fuel ${fuel / 100 <= 0.15 ? "warning" : ""}`}
                >
                  <div className="speedo-statusBar speedo-statusBar-vertical">
                    <div
                      className="speedo-statusFill speedo-statusFill-vertical"
                      style={{ height: `${fuel}%` }}
                    />
                  </div>
                  <div className="speedo-statusIcon-label">
                    <BsFuelPumpFill />
                  </div>
                </div>
              )}
              {engineHealth / 100 <= 0.65 && (
                <div
                  className={`speedo-statusItem speedo-statusIcon ${engineHealth / 100 <= 0.35 ? "critical" : "warning"}`}
                >
                  <div className="speedo-statusIcon-label">
                    <PiEngineFill />
                  </div>
                </div>
              )}
              {(harness || useSeatbelt) && (
                <div className="speedo-statusItem speedo-statusIcon-slot">
                  {harness ? (
                    <div className="speedo-statusIcon harness-on">
                      <div className="speedo-statusIcon-label">
                        <GiFullMotorcycleHelmet />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`speedo-statusIcon ${!belt ? "critical" : ""}`}
                      style={{ opacity: !belt ? 1 : 0 }}
                    >
                      <div className="speedo-statusIcon-label">
                        <PiSeatbeltFill />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ammo Display */}
        {ammoClip >= 0 && (
          <div
            className="ammo-display"
            style={ammoContainerStyle}
          >
            <div className="ammo-icon-box">
              <img src={AmmoIcon} className="ammo-main-icon" alt="ammo" />
            </div>

            <div className="ammo-divider" />
            <div className="ammo-info-stack">
              <div className="ammo-clip" style={{ color: ammoColor || '#10b981' }}>
                {ammoClip}
              </div>
              <div className="ammo-reserve">
                {ammoReserve}
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
);

HUD.displayName = "HUD";
export default HUD;
