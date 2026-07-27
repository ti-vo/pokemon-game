# Pokemon Catch Tracker

A small full-stack project for learning agentic coding workflows: a Node/Express
backend with a SQLite database, paired with a React (Vite) frontend. Users see
a grid of Pokemon "cards" and can attempt to catch them — each Pokemon has its own
catch rate, derived from its base experience (rarer/stronger Pokemon are
harder to catch). Later on: More realistic "catching" using Pokéball

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)
![SQLite](https://img.shields.io/badge/database-SQLite-003B57)

## Demo
 
![Demo of the Pokemon Catch Tracker](./docs/demo.gif)


## Features

- Pokemon grid with sprites, names, and type badges
- Catch mechanic: a random roll against a per-Pokemon catch rate
- Persistent progress, stored in SQLite
- English / German language toggle, including localized Pokemon names
  (fetched from the PokeAPI)

## Tech Stack

| Layer    | Technology                        |
| -------- | ---------------------------------- |
| Backend  | Node.js, Express, better-sqlite3   |
| Frontend | React, Vite                        |
| Data     | [PokeAPI](https://pokeapi.co/) (base data, imported once) |

## Project Structure

```
pokemon-fang-tracker/
├── backend/
│   ├── server.js              # Express entry point
│   ├── db.js                  # SQLite connection + schema
│   ├── routes/pokemon.js      # GET /api/pokemon, POST /api/pokemon/:id/catch
│   └── scripts/import-pokemon.js  # one-time import from the PokeAPI
├── frontend/
│   └── src/
│       ├── App.jsx             # top-level state, language toggle
│       ├── api.js              # backend fetch calls
│       ├── i18n.js             # EN/DE translations
│       └── components/PokemonCard.jsx
└── CLAUDE.md                   # project context for Claude Code
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
npm run import   # one-time: fetch Pokemon data from the PokeAPI into SQLite
npm run dev       # starts the API on http://localhost:3001
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open `http://localhost:5173` in your browser. The backend must be running for
the app to load any data.

## API Reference

| Method | Route                     | Description                          |
| ------ | -------------------------- | ------------------------------------- |
| GET    | `/api/pokemon`             | List all Pokemon with catch status    |
| POST   | `/api/pokemon/:id/catch`   | Attempt to catch a Pokemon            |
| GET    | `/api/health`               | Health check                          |

## Roadmap / Ideas

- [ ] Poke Ball selection (different catch-rate multipliers)
- [ ] Timing-based "real" catch mini-game
- [ ] Sorting / filtering the grid
- [ ] Custom Poke Ball cursor on hover

## AI-Assisted Development

This project was built with the help of Claude (Anthropic) — used for
architecture planning, code generation, and debugging. The [`CLAUDE.md`](./CLAUDE.md)
file in this repo documents the project context and conventions given to the
assistant, kept up to date as the project evolves.

## License

Personal learning project — no license specified.
