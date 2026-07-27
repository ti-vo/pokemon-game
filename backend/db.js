// db.js
// Sets up the SQLite connection and creates the schema if it doesn't exist yet.
// See CLAUDE.md for the data model rationale (two tables: static base data
// vs. mutable catch progress).

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "pokemon.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS pokemon (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_de TEXT,
    sprite_url TEXT,
    artwork_url TEXT,
    home_url TEXT,
    types TEXT,
    catch_rate REAL NOT NULL DEFAULT 0.5,
    stats TEXT
  );

  CREATE TABLE IF NOT EXISTS catches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pokemon_id INTEGER NOT NULL,
    caught INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    caught_at DATETIME,
    ball_type TEXT,
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
  );
`);

// Migration for databases created before name_de/stats/artwork_url/home_url
// existed: CREATE TABLE IF NOT EXISTS above only applies to brand-new
// tables, so an already-existing pokemon table needs new columns added
// explicitly (SQLite has no "ADD COLUMN IF NOT EXISTS", so we check first).
const existingColumns = db.prepare("PRAGMA table_info(pokemon)").all();
const columnNames = existingColumns.map((col) => col.name);

if (!columnNames.includes("name_de")) {
  db.exec("ALTER TABLE pokemon ADD COLUMN name_de TEXT");
}
if (!columnNames.includes("stats")) {
  db.exec("ALTER TABLE pokemon ADD COLUMN stats TEXT");
}
if (!columnNames.includes("artwork_url")) {
  db.exec("ALTER TABLE pokemon ADD COLUMN artwork_url TEXT");
}
if (!columnNames.includes("home_url")) {
  db.exec("ALTER TABLE pokemon ADD COLUMN home_url TEXT");
}

// Same idea for catches.ball_type, added once ball-specific catch rates
// existed.
const existingCatchesColumns = db.prepare("PRAGMA table_info(catches)").all();
const catchesColumnNames = existingCatchesColumns.map((col) => col.name);

if (!catchesColumnNames.includes("ball_type")) {
  db.exec("ALTER TABLE catches ADD COLUMN ball_type TEXT");
}

module.exports = db;
