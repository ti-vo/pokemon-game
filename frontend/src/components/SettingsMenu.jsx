import { useState } from "react";
import { t } from "../i18n.js";

export const DEFAULT_SPEED_MULTIPLIER = 1;
export const MIN_SPEED_MULTIPLIER = 0.5;
export const MAX_SPEED_MULTIPLIER = 2.5;
const SPEED_MULTIPLIER_STEP = 0.25;

export const DEFAULT_BALL_REFILL_INTERVAL_MS = 10 * 60 * 1000;

// Selectable refill intervals, in minutes — 1 minute to 24 hours as requested.
const REFILL_OPTIONS_MINUTES = [1, 5, 10, 30, 60, 180, 360, 720, 1440];

function formatRefillOption(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${minutes / 60} h`;
}

// A classic gear/cog icon: a ring (drawn via an evenodd path so the center
// is an actual hole) plus 8 teeth rotated around it.
function GearIcon() {
  const toothAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        {toothAngles.map((deg) => (
          <rect
            key={deg}
            x="10.5"
            y="0.5"
            width="3"
            height="4"
            rx="1"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
        <path
          fillRule="evenodd"
          d="M12 5a7 7 0 100 14 7 7 0 000-14zm0 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"
        />
      </g>
    </svg>
  );
}

export default function SettingsMenu({
  language,
  speedMultiplier,
  onSpeedMultiplierChange,
  ballRefillIntervalMs,
  onBallRefillIntervalChange,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="settings-menu">
      <button
        type="button"
        className="settings-menu__toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={t(language, "settings")}
        aria-expanded={isOpen}
        title={t(language, "settings")}
      >
        <GearIcon />
      </button>

      {isOpen && (
        <>
          <div
            className="settings-menu__overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="settings-menu__panel">
            <h2 className="settings-menu__title">{t(language, "settings")}</h2>

            <label className="settings-menu__field">
              <span>{t(language, "speedLabel", speedMultiplier)}</span>
              <input
                type="range"
                min={MIN_SPEED_MULTIPLIER}
                max={MAX_SPEED_MULTIPLIER}
                step={SPEED_MULTIPLIER_STEP}
                value={speedMultiplier}
                onChange={(event) =>
                  onSpeedMultiplierChange(Number(event.target.value))
                }
              />
            </label>

            <label className="settings-menu__field">
              <span>{t(language, "refillIntervalLabel")}</span>
              <select
                value={ballRefillIntervalMs}
                onChange={(event) =>
                  onBallRefillIntervalChange(Number(event.target.value))
                }
              >
                {REFILL_OPTIONS_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes * 60 * 1000}>
                    {formatRefillOption(minutes)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
