// routes/pokemon.js
// GET  /api/pokemon           -> list all pokemon with their current catch status
// POST /api/pokemon/:id/catch -> attempt to catch a pokemon (random roll against catch_rate)

const express = require("express");
const db = require("../db");

const router = express.Router();

// Ball types and how each modifies the base catch_rate. Masterball always
// succeeds; Superball boosts the chance by a fixed multiplier; Pokeball uses
// the chance as-is.
const SUPERBALL_MULTIPLIER = 1.5;

const BALL_TYPES = new Set(["pokeball", "superball", "masterball"]);

function effectiveCatchChance(baseCatchRate, ballType) {
  if (ballType === "masterball") return 1;
  if (ballType === "superball") {
    return Math.min(1, baseCatchRate * SUPERBALL_MULTIPLIER);
  }
  return baseCatchRate;
}

// Ensure every pokemon has a corresponding catches row (attempts=0, caught=0)
// so the join below always returns a status, even before any attempt was made.
function ensureCatchRow(pokemonId) {
  const existing = db
    .prepare("SELECT id FROM catches WHERE pokemon_id = ?")
    .get(pokemonId);

  if (!existing) {
    db.prepare(
      "INSERT INTO catches (pokemon_id, caught, attempts) VALUES (?, 0, 0)"
    ).run(pokemonId);
  }
}

// GET /api/pokemon
router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         p.id,
         p.name,
         p.name_de,
         p.sprite_url,
         p.artwork_url,
         p.home_url,
         p.types,
         p.catch_rate,
         p.stats,
         COALESCE(c.caught, 0) AS caught,
         COALESCE(c.attempts, 0) AS attempts,
         c.caught_at,
         c.ball_type
       FROM pokemon p
       LEFT JOIN catches c ON c.pokemon_id = p.id
       ORDER BY p.id ASC`
    )
    .all();

  const result = rows.map((row) => {
    const parsedStats = row.stats ? JSON.parse(row.stats) : null;

    return {
      id: row.id,
      name: row.name,
      nameDe: row.name_de,
      spriteUrl: row.sprite_url,
      artworkUrl: row.artwork_url,
      homeUrl: row.home_url,
      types: row.types ? row.types.split(",") : [],
      catchRate: row.catch_rate,
      // Speed is exposed even before catching — the Wildzone uses it to
      // drive movement speed, unlike the other stats below.
      baseSpeed: parsedStats?.speed ?? null,
      caught: !!row.caught,
      attempts: row.attempts,
      caughtAt: row.caught_at,
      // The rest of the stats (and which ball caught it) are only revealed
      // once the Pokemon has been caught — matches the "you don't know its
      // stats until you've caught it" flavor.
      stats: row.caught ? parsedStats : null,
      ballType: row.caught ? row.ball_type : null,
    };
  });

  res.json(result);
});

// POST /api/pokemon/:id/catch
router.post("/:id/catch", (req, res) => {
  const pokemonId = Number(req.params.id);
  const ballType = req.body?.ballType ?? "pokeball";

  if (!BALL_TYPES.has(ballType)) {
    return res.status(400).json({ error: `Unknown ball type: ${ballType}` });
  }

  const pokemon = db
    .prepare("SELECT * FROM pokemon WHERE id = ?")
    .get(pokemonId);

  if (!pokemon) {
    return res.status(404).json({ error: "Pokemon not found" });
  }

  ensureCatchRow(pokemonId);

  const catchRow = db
    .prepare("SELECT * FROM catches WHERE pokemon_id = ?")
    .get(pokemonId);

  if (catchRow.caught) {
    return res.status(400).json({ error: "Pokemon is already caught" });
  }

  const catchChance = effectiveCatchChance(pokemon.catch_rate, ballType);
  const roll = Math.random();
  const success = roll < catchChance;

  if (success) {
    db.prepare(
      `UPDATE catches
       SET caught = 1, attempts = attempts + 1, caught_at = CURRENT_TIMESTAMP, ball_type = ?
       WHERE pokemon_id = ?`
    ).run(ballType, pokemonId);
  } else {
    db.prepare(
      `UPDATE catches SET attempts = attempts + 1 WHERE pokemon_id = ?`
    ).run(pokemonId);
  }

  res.json({
    success,
    ballType,
    catchRate: pokemon.catch_rate,
    catchChance,
    roll,
    stats: success && pokemon.stats ? JSON.parse(pokemon.stats) : null,
  });
});

module.exports = router;
