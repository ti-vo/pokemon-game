import { useEffect, useRef, useState } from "react";
import { getPokemonName, t } from "../i18n.js";
import BallSelector, { getBallCursor } from "./BallSelector.jsx";

const CATCH_FEEDBACK_DURATION_MS = 2000;

const MAX_CREATURES = 2;
const SPRITE_SIZE = 56;

// Linear mapping from a Pokemon's base speed stat to on-screen px/second.
// The current roster's speed stats range roughly 30-101; these bounds leave
// a little headroom on both ends.
const MIN_STAT_SPEED = 20;
const MAX_STAT_SPEED = 110;
const MIN_SPEED_PX_S = 40;
const MAX_SPEED_PX_S = 160;

// After a slot empties out (Pokemon left the Wildzone), wait a random moment
// before it refills — 0 or 1 active Pokemon at a time is common and fine.
const MIN_RESPAWN_DELAY_MS = 2000;
const MAX_RESPAWN_DELAY_MS = 6000;

// How often the movement direction wobbles away from the straight
// spawn-to-target line, and by how much.
const MIN_ZIGZAG_INTERVAL_MS = 400;
const MAX_ZIGZAG_INTERVAL_MS = 800;
const MAX_ZIGZAG_DEVIATION_RAD = (25 * Math.PI) / 180;

// The sky/grass/water split: sky is the top band, water is a bottom-right
// rectangle, grass fills the rest of the lower area. Must match the
// percentages used in index.css for the .wild-zone__zone--* rules.
const SKY_HEIGHT_RATIO = 0.35;
const WATER_WIDTH_RATIO = 0.35;

let nextInstanceId = 0;

// Weighted pick: a higher catch_rate (more common Pokemon) makes a Pokemon
// proportionally more likely to be the one that spawns next.
function pickWeightedPokemon(pool) {
  const weights = pool.map((p) => Math.max(p.catchRate ?? 0.5, 0.01));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function speedStatToPxPerSecond(baseSpeed) {
  const clamped = Math.min(
    MAX_STAT_SPEED,
    Math.max(MIN_STAT_SPEED, baseSpeed ?? (MIN_STAT_SPEED + MAX_STAT_SPEED) / 2)
  );
  const ratio = (clamped - MIN_STAT_SPEED) / (MAX_STAT_SPEED - MIN_STAT_SPEED);
  return MIN_SPEED_PX_S + ratio * (MAX_SPEED_PX_S - MIN_SPEED_PX_S);
}

function randomRespawnDelay() {
  return (
    MIN_RESPAWN_DELAY_MS +
    Math.random() * (MAX_RESPAWN_DELAY_MS - MIN_RESPAWN_DELAY_MS)
  );
}

function randomZigzagInterval() {
  return (
    MIN_ZIGZAG_INTERVAL_MS +
    Math.random() * (MAX_ZIGZAG_INTERVAL_MS - MIN_ZIGZAG_INTERVAL_MS)
  );
}

function randomZigzagDeviation() {
  return (Math.random() * 2 - 1) * MAX_ZIGZAG_DEVIATION_RAD;
}

// Mirror a direction across a vertical wall (flips the x-component) or a
// horizontal wall (flips the y-component), used when bouncing off an
// internal zone boundary.
function reflectAngleX(angle) {
  return Math.atan2(Math.sin(angle), -Math.cos(angle));
}

function reflectAngleY(angle) {
  return Math.atan2(-Math.sin(angle), Math.cos(angle));
}

// Which of a zone rect's four edges coincide with the outer boundary of the
// whole Wildzone, vs. bordering a neighboring zone. Pokemon bounce off the
// latter and only despawn at the former.
function classifyEdges(rect, zoneSize, epsilon = 0.5) {
  return {
    top: rect.y <= epsilon,
    left: rect.x <= epsilon,
    right: rect.x + rect.width >= zoneSize.width - epsilon,
    bottom: rect.y + rect.height >= zoneSize.height - epsilon,
  };
}

function computeZoneRects(zoneSize) {
  const skyHeight = zoneSize.height * SKY_HEIGHT_RATIO;
  const waterWidth = zoneSize.width * WATER_WIDTH_RATIO;
  const lowerHeight = zoneSize.height - skyHeight;

  const rects = {
    sky: { x: 0, y: 0, width: zoneSize.width, height: skyHeight },
    grass: {
      x: 0,
      y: skyHeight,
      width: zoneSize.width - waterWidth,
      height: lowerHeight,
    },
    water: {
      x: zoneSize.width - waterWidth,
      y: skyHeight,
      width: waterWidth,
      height: lowerHeight,
    },
  };

  for (const rect of Object.values(rects)) {
    rect.edges = classifyEdges(rect, zoneSize);
  }

  return rects;
}

// water -> water zone, flying -> sky zone, everything else -> grass zone.
// Dual-type Pokemon are allowed in every zone either of their types maps to.
function zonesForPokemon(pokemon) {
  const zones = new Set();
  for (const type of pokemon.types) {
    if (type === "water") zones.add("water");
    else if (type === "flying") zones.add("sky");
    else zones.add("grass");
  }
  return [...zones];
}

function toEffectiveRect(rect) {
  return {
    minX: rect.x,
    minY: rect.y,
    maxX: rect.x + Math.max(0, rect.width - SPRITE_SIZE),
    maxY: rect.y + Math.max(0, rect.height - SPRITE_SIZE),
  };
}

function lerpRandom(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function randomEdgePoint(effRect) {
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  if (edge === 0) {
    return { x: lerpRandom(effRect.minX, effRect.maxX), y: effRect.minY, edge: "top" };
  }
  if (edge === 1) {
    return { x: effRect.maxX, y: lerpRandom(effRect.minY, effRect.maxY), edge: "right" };
  }
  if (edge === 2) {
    return { x: lerpRandom(effRect.minX, effRect.maxX), y: effRect.maxY, edge: "bottom" };
  }
  return { x: effRect.minX, y: lerpRandom(effRect.minY, effRect.maxY), edge: "left" };
}

function oppositeEdgePoint(effRect, edge) {
  if (edge === "top") {
    return { x: lerpRandom(effRect.minX, effRect.maxX), y: effRect.maxY };
  }
  if (edge === "bottom") {
    return { x: lerpRandom(effRect.minX, effRect.maxX), y: effRect.minY };
  }
  if (edge === "left") {
    return { x: effRect.maxX, y: lerpRandom(effRect.minY, effRect.maxY) };
  }
  return { x: effRect.minX, y: lerpRandom(effRect.minY, effRect.maxY) };
}

function spawnCreature(pool, zoneRects, now) {
  const pokemon = pickWeightedPokemon(pool);
  const allowedZones = zonesForPokemon(pokemon);
  const zoneName = allowedZones[Math.floor(Math.random() * allowedZones.length)];
  const zoneRect = zoneRects[zoneName];
  const effRect = toEffectiveRect(zoneRect);

  const spawnPoint = randomEdgePoint(effRect);
  const targetPoint = oppositeEdgePoint(effRect, spawnPoint.edge);
  const baseAngle = Math.atan2(
    targetPoint.y - spawnPoint.y,
    targetPoint.x - spawnPoint.x
  );
  const speed = speedStatToPxPerSecond(pokemon.baseSpeed);

  return {
    instanceId: nextInstanceId++,
    pokemon,
    zoneName,
    effRect,
    edges: zoneRect.edges,
    x: spawnPoint.x,
    y: spawnPoint.y,
    baseAngle,
    speed,
    vx: Math.cos(baseAngle) * speed,
    vy: Math.sin(baseAngle) * speed,
    nextZigzagAt: now + randomZigzagInterval(),
  };
}

export default function WildZone({
  language,
  pokemonList,
  ballCounts,
  selectedBall,
  onSelectBall,
  secondsUntilRefill,
  onThrowBall,
  onMissBall,
}) {
  const zoneRef = useRef(null);
  const [zoneSize, setZoneSize] = useState({ width: 0, height: 0 });
  const [creatures, setCreatures] = useState(
    new Array(MAX_CREATURES).fill(null)
  );
  const [lastResult, setLastResult] = useState(null); // { message, success } | null

  const uncaughtRef = useRef([]);
  uncaughtRef.current = pokemonList.filter((p) => !p.caught);

  // The authoritative, mutable simulation state — updated in place every
  // frame. `creatures` (React state) is just a snapshot pushed once per
  // frame for rendering, so the render path never has to be an updater
  // function with side effects in it.
  const slotsRef = useRef(new Array(MAX_CREATURES).fill(null));

  // Set by the simulation effect below so the click handler (which lives
  // outside that effect) can trigger the same respawn scheduling.
  const scheduleRespawnRef = useRef(() => {});
  const feedbackTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const canThrow = Boolean(selectedBall) && (ballCounts[selectedBall] ?? 0) > 0;

  function showFeedback(message, success) {
    setLastResult({ message, success });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(
      () => setLastResult(null),
      CATCH_FEEDBACK_DURATION_MS
    );
  }

  function handleSpriteClick(event, creature) {
    // Stop this from also bubbling up to the zone's own click handler,
    // which would otherwise count a hit as a miss too.
    event.stopPropagation();
    if (!canThrow) return;

    const slotIndex = slotsRef.current.findIndex(
      (c) => c && c.instanceId === creature.instanceId
    );
    if (slotIndex === -1) return;

    // The Pokemon leaves the Wildzone the instant it's thrown at, win or
    // lose — the ball's own count is decremented in App.jsx regardless too.
    slotsRef.current[slotIndex] = null;
    setCreatures([...slotsRef.current]);
    scheduleRespawnRef.current(slotIndex, creature.pokemon.id);

    const pokemonName = getPokemonName(language, creature.pokemon);
    onThrowBall(creature.pokemon, selectedBall).then((result) => {
      showFeedback(
        `${pokemonName}: ${t(language, result.success ? "caught" : "escaped")}`,
        result.success
      );
    });
  }

  function handleZoneClick() {
    // A click that reaches here (rather than being stopped by a sprite's
    // own handler) missed every Pokemon currently in the zone.
    if (!canThrow) return;
    onMissBall(selectedBall);
    showFeedback(t(language, "missedThrow"), false);
  }

  useEffect(() => {
    const element = zoneRef.current;
    if (!element) return undefined;

    const updateSize = () =>
      setZoneSize({ width: element.clientWidth, height: element.clientHeight });

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (zoneSize.width === 0 || zoneSize.height === 0) return undefined;

    const zoneRects = computeZoneRects(zoneSize);

    let frameId;
    let lastTime = performance.now();
    const respawnTimeouts = new Array(MAX_CREATURES).fill(null);

    function scheduleRespawn(slotIndex, excludePokemonId) {
      respawnTimeouts[slotIndex] = setTimeout(() => {
        const pool = uncaughtRef.current;
        if (pool.length === 0) {
          scheduleRespawn(slotIndex, excludePokemonId);
          return;
        }
        const candidates =
          excludePokemonId != null && pool.length > 1
            ? pool.filter((p) => p.id !== excludePokemonId)
            : pool;
        slotsRef.current[slotIndex] = spawnCreature(
          candidates,
          zoneRects,
          performance.now()
        );
      }, randomRespawnDelay());
    }

    scheduleRespawnRef.current = scheduleRespawn;

    slotsRef.current = new Array(MAX_CREATURES).fill(null);
    for (let slot = 0; slot < MAX_CREATURES; slot++) {
      scheduleRespawn(slot, null);
    }

    const step = (time) => {
      const deltaSeconds = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      for (let i = 0; i < slotsRef.current.length; i++) {
        const creature = slotsRef.current[i];
        if (!creature) continue;

        let { vx, vy, nextZigzagAt, baseAngle } = creature;
        if (time >= nextZigzagAt) {
          const angle = baseAngle + randomZigzagDeviation();
          vx = Math.cos(angle) * creature.speed;
          vy = Math.sin(angle) * creature.speed;
          nextZigzagAt = time + randomZigzagInterval();
        }

        let x = creature.x + vx * deltaSeconds;
        let y = creature.y + vy * deltaSeconds;
        const { effRect, edges } = creature;
        let leavesWildzone = false;

        if (x < effRect.minX) {
          if (edges.left) {
            leavesWildzone = true;
          } else {
            x = effRect.minX;
            vx = -vx;
            baseAngle = reflectAngleX(baseAngle);
          }
        } else if (x > effRect.maxX) {
          if (edges.right) {
            leavesWildzone = true;
          } else {
            x = effRect.maxX;
            vx = -vx;
            baseAngle = reflectAngleX(baseAngle);
          }
        }

        if (!leavesWildzone) {
          if (y < effRect.minY) {
            if (edges.top) {
              leavesWildzone = true;
            } else {
              y = effRect.minY;
              vy = -vy;
              baseAngle = reflectAngleY(baseAngle);
            }
          } else if (y > effRect.maxY) {
            if (edges.bottom) {
              leavesWildzone = true;
            } else {
              y = effRect.maxY;
              vy = -vy;
              baseAngle = reflectAngleY(baseAngle);
            }
          }
        }

        if (leavesWildzone) {
          // Reached the outer boundary of the whole Wildzone: leave instead
          // of bouncing back in.
          slotsRef.current[i] = null;
          scheduleRespawn(i, creature.pokemon.id);
        } else {
          slotsRef.current[i] = { ...creature, x, y, vx, vy, nextZigzagAt, baseAngle };
        }
      }

      setCreatures([...slotsRef.current]);
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frameId);
      respawnTimeouts.forEach((id) => id && clearTimeout(id));
      scheduleRespawnRef.current = () => {};
    };
  }, [zoneSize]);

  return (
    <div className="wild-zone-container">
      <BallSelector
        language={language}
        ballCounts={ballCounts}
        selectedBall={selectedBall}
        onSelectBall={onSelectBall}
        secondsUntilRefill={secondsUntilRefill}
      />

      <div
        className="wild-zone"
        ref={zoneRef}
        onClick={handleZoneClick}
        style={canThrow ? { cursor: getBallCursor(selectedBall) } : undefined}
      >
        <div className="wild-zone__zone wild-zone__zone--sky" />
        <div className="wild-zone__zone wild-zone__zone--grass" />
        <div className="wild-zone__zone wild-zone__zone--water" />

        {creatures.map(
          (creature) =>
            creature && (
              <img
                key={creature.instanceId}
                className={`wild-zone__sprite ${
                  canThrow ? "wild-zone__sprite--catchable" : ""
                }`}
                src={creature.pokemon.spriteUrl}
                alt={getPokemonName(language, creature.pokemon)}
                onClick={
                  canThrow ? (event) => handleSpriteClick(event, creature) : undefined
                }
                style={{
                  transform: `translate(${creature.x}px, ${creature.y}px)`,
                }}
              />
            )
        )}

        {lastResult && (
          <p
            className={`wild-zone__feedback ${
              lastResult.success
                ? "wild-zone__feedback--success"
                : "wild-zone__feedback--fail"
            }`}
          >
            {lastResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
