// scripts/import-pokemon.js
// One-time import: fetches the first 20 Pokemon from the PokeAPI and writes
// their base data into the local `pokemon` table, including a computed
// catch_rate derived from base_experience (rarer/stronger -> harder to catch).
//
// Run with: npm run import   (or: node scripts/import-pokemon.js)
// Safe to re-run: existing rows are updated (upsert), no duplicates created.

const db = require("../db");

const POKEAPI_BASE = "https://pokeapi.co/api/v2/pokemon";
const POKEAPI_SPECIES_BASE = "https://pokeapi.co/api/v2/pokemon-species";
const START_ID = 1;
const END_ID = 100;

// Maps base_experience to a catch_rate between MIN_RATE (hard) and
// MAX_RATE (easy). Values are clamped so every Pokemon stays catchable.
const MIN_RATE = 0.2;
const MAX_RATE = 0.85;
// Rough upper bound of base_experience among early-game Pokemon, used to
// normalize the scale. Anything at or above this gets the minimum rate.
const EXPERIENCE_CEILING = 250;

function calculateCatchRate(baseExperience) {
  const clampedExperience = Math.min(baseExperience, EXPERIENCE_CEILING);
  const normalized = clampedExperience / EXPERIENCE_CEILING; // 0 (weak) .. 1 (strong)
  const rate = MAX_RATE - normalized * (MAX_RATE - MIN_RATE);
  return Math.round(rate * 100) / 100; // round to 2 decimals
}

async function fetchPokemon(id) {
  const response = await fetch(`${POKEAPI_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pokemon ${id}: ${response.status}`);
  }
  return response.json();
}

// The species endpoint holds localized names (among other flavor data).
// We only need the German entry from its `names` array here.
async function fetchGermanName(id) {
  const response = await fetch(`${POKEAPI_SPECIES_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch species ${id}: ${response.status}`);
  }
  const data = await response.json();
  const germanEntry = data.names.find((n) => n.language.name === "de");
  return germanEntry ? germanEntry.name : null;
}

// PokeAPI returns stats as an array of {base_stat, stat: {name}}. We pick
// out the six standard stats and store them as a compact JSON object.
function extractStats(statsArray) {
  const findStat = (statName) =>
    statsArray.find((s) => s.stat.name === statName)?.base_stat ?? 0;

  return {
    hp: findStat("hp"),
    attack: findStat("attack"),
    defense: findStat("defense"),
    specialAttack: findStat("special-attack"),
    specialDefense: findStat("special-defense"),
    speed: findStat("speed"),
  };
}

const upsertStatement = db.prepare(`
  INSERT INTO pokemon (id, name, name_de, sprite_url, artwork_url, home_url, types, catch_rate, stats)
  VALUES (@id, @name, @name_de, @sprite_url, @artwork_url, @home_url, @types, @catch_rate, @stats)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    name_de = excluded.name_de,
    sprite_url = excluded.sprite_url,
    artwork_url = excluded.artwork_url,
    home_url = excluded.home_url,
    types = excluded.types,
    catch_rate = excluded.catch_rate,
    stats = excluded.stats
`);

async function run() {
  console.log(`Importing Pokemon ${START_ID}-${END_ID} from the PokeAPI...`);

  for (let id = START_ID; id <= END_ID; id++) {
    const data = await fetchPokemon(id);
    const nameDe = await fetchGermanName(id);

    const name = data.name;
    const spriteUrl = data.sprites?.front_default || null;
    const artworkUrl = data.sprites?.other?.["official-artwork"]?.front_default || null;
    const homeUrl = data.sprites?.other?.home?.front_default || null;
    const types = data.types.map((t) => t.type.name).join(",");
    const catchRate = calculateCatchRate(data.base_experience || 0);
    const stats = JSON.stringify(extractStats(data.stats));

    upsertStatement.run({
      id,
      name,
      name_de: nameDe,
      sprite_url: spriteUrl,
      artwork_url: artworkUrl,
      home_url: homeUrl,
      types,
      catch_rate: catchRate,
      stats,
    });

    console.log(
      `  #${id} ${name} (${nameDe}) — base_experience=${data.base_experience}, catch_rate=${catchRate}`
    );
  }

  console.log("Import complete.");
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
