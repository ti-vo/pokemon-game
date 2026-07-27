import { t } from "../i18n.js";

export const BALL_ORDER = ["pokeball", "superball", "masterball"];

export const INITIAL_BALL_COUNTS = {
  pokeball: 5,
  superball: 2,
  masterball: 1,
};

const BALL_TOP_COLORS = {
  pokeball: "#EE1515",
  superball: "#4A90D9",
  masterball: "#8B5CA8",
};

function formatCountdown(totalSeconds) {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// A simplified version of the same ball design (no per-type decorations —
// too fine-grained to read at cursor size), encoded as a cursor image.
const CURSOR_SIZE = 32;
const CURSOR_HOTSPOT = CURSOR_SIZE / 2;

function buildBallCursorDataUri(ballId) {
  const topColor = encodeURIComponent(BALL_TOP_COLORS[ballId]);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${CURSOR_SIZE}' height='${CURSOR_SIZE}' viewBox='0 0 100 100'>` +
    `<circle cx='50' cy='50' r='46' fill='%23ffffff' stroke='%231a1a1a' stroke-width='6'/>` +
    `<path d='M 4 50 A 46 46 0 0 1 96 50 Z' fill='${topColor}' stroke='%231a1a1a' stroke-width='6' stroke-linejoin='round'/>` +
    `<rect x='4' y='44' width='92' height='12' fill='%231a1a1a'/>` +
    `<circle cx='50' cy='50' r='11' fill='%23ffffff' stroke='%231a1a1a' stroke-width='6'/>` +
    `</svg>`;
  return `data:image/svg+xml,${svg}`;
}

// CSS `cursor` value showing the selected ball as the pointer, with a plain
// crosshair fallback for browsers that reject the custom cursor image.
export function getBallCursor(ballId) {
  if (!BALL_TOP_COLORS[ballId]) return "crosshair";
  const dataUri = buildBallCursorDataUri(ballId);
  return `url("${dataUri}") ${CURSOR_HOTSPOT} ${CURSOR_HOTSPOT}, crosshair`;
}

// A ball icon: a circle split by a black band, colored top half / white
// bottom half, plus a white-and-black "button" centered on the band.
function BallIcon({ ballId }) {
  return (
    <svg
      className="ball-selector__icon"
      viewBox="0 0 100 100"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#1a1a1a" strokeWidth="4" />
      <path
        d="M 4 50 A 46 46 0 0 1 96 50 Z"
        fill={BALL_TOP_COLORS[ballId]}
        stroke="#1a1a1a"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {ballId === "superball" && (
        <>
          <line x1="46" y1="46" x2="20" y2="28" stroke="#EE1515" strokeWidth="7" strokeLinecap="round" />
          <line x1="54" y1="46" x2="80" y2="28" stroke="#EE1515" strokeWidth="7" strokeLinecap="round" />
        </>
      )}

      {ballId === "masterball" && (
        <>
          <circle cx="34" cy="20" r="8" fill="#F49AC1" />
          <circle cx="66" cy="20" r="8" fill="#F49AC1" />
        </>
      )}

      <rect x="4" y="44" width="92" height="12" fill="#1a1a1a" />
      <circle cx="50" cy="50" r="11" fill="#ffffff" stroke="#1a1a1a" strokeWidth="4" />
    </svg>
  );
}

export default function BallSelector({
  language,
  ballCounts,
  selectedBall,
  onSelectBall,
  secondsUntilRefill,
}) {
  return (
    <div className="ball-selector">
      <div className="ball-selector__buttons">
        {BALL_ORDER.map((ballId) => {
          const count = ballCounts[ballId];
          const isDisabled = count <= 0;
          const isSelected = selectedBall === ballId;

          return (
            <button
              key={ballId}
              type="button"
              className={`ball-selector__button ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelectBall(ballId)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              title={t(language, `ball_${ballId}`)}
            >
              <BallIcon ballId={ballId} />
              <span className="ball-selector__count">×{count}</span>
            </button>
          );
        })}
      </div>

      <p className="ball-selector__countdown">
        {t(language, "nextRefillIn", formatCountdown(secondsUntilRefill))}
      </p>
    </div>
  );
}
