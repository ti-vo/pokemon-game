// i18n.js
// Small, dependency-free translation setup. No i18n library needed for
// just two languages and a handful of strings.

export const LANGUAGES = {
  en: { label: "English", flag: "🇬🇧" },
  de: { label: "Deutsch", flag: "🇩🇪" },
};

const STRINGS = {
  en: {
    title: "My Pokémon",
    progress: (caught, total) => `${caught} / ${total} caught`,
    loading: "Loading Pokemon...",
    backendError: (message) =>
      `Could not reach the backend (${message}). Is it running on port 3001?`,
    catchButton: "Catch",
    caughtStatus: "Caught",
    escaped: "It escaped!",
    caught: "Caught!",
    missedThrow: "Missed throw!",
    attempts: (count) => `Attempts: ${count}`,
    tabGallery: "Gallery",
    tabWildZone: "Wild Zone",
    ball_pokeball: "Pokeball",
    ball_superball: "Superball",
    ball_masterball: "Masterball",
    nextRefillIn: (formatted) => `Next refill in ${formatted}`,
    settings: "Settings",
    close: "Close",
    speedLabel: (multiplier) => `Pokemon speed: ${multiplier}×`,
    refillIntervalLabel: "Ball refill every",
    stats: {
      hp: "HP",
      attack: "Attack",
      defense: "Defense",
      specialAttack: "Special Attack",
      specialDefense: "Special Defense",
      speed: "Speed",
    },
    statDescriptions: {
      hp: "Hit Points: how much damage this Pokemon can take before fainting.",
      attack: "How hard this Pokemon hits with physical moves.",
      defense: "How well this Pokemon resists physical damage.",
      specialAttack: "How hard this Pokemon hits with special moves (e.g. elemental attacks).",
      specialDefense: "How well this Pokemon resists special damage.",
      speed: "How fast this Pokemon is — higher speed usually means it attacks first.",
    },
  },
  de: {
    title: "Meine Pokémons",
    progress: (caught, total) => `${caught} / ${total} gefangen`,
    loading: "Pokémon werden geladen...",
    backendError: (message) =>
      `Backend nicht erreichbar (${message}). Läuft es auf Port 3001?`,
    catchButton: "Fangen",
    caughtStatus: "Gefangen",
    escaped: "Es ist entkommen!",
    caught: "Gefangen!",
    missedThrow: "Wurf daneben!",
    attempts: (count) => `Versuche: ${count}`,
    tabGallery: "Galerie",
    tabWildZone: "Wildzone",
    ball_pokeball: "Pokeball",
    ball_superball: "Superball",
    ball_masterball: "Masterball",
    nextRefillIn: (formatted) => `Nächste Auffüllung in ${formatted}`,
    settings: "Einstellungen",
    close: "Schließen",
    speedLabel: (multiplier) => `Pokémon-Geschwindigkeit: ${multiplier}×`,
    refillIntervalLabel: "Bälle füllen sich auf alle",
    stats: {
      hp: "KP",
      attack: "Angriff",
      defense: "Verteidigung",
      specialAttack: "Spezial-Angriff",
      specialDefense: "Spezial-Verteidigung",
      speed: "Initiative",
    },
    statDescriptions: {
      hp: "Kraftpunkte: wie viel Schaden dieses Pokémon aushält, bevor es kampfunfähig wird.",
      attack: "Wie stark dieses Pokémon mit physischen Attacken zuschlägt.",
      defense: "Wie gut dieses Pokémon physischem Schaden widersteht.",
      specialAttack: "Wie stark dieses Pokémon mit Spezial-Attacken zuschlägt (z. B. Elementarangriffe).",
      specialDefense: "Wie gut dieses Pokémon Spezial-Schaden widersteht.",
      speed: "Wie schnell dieses Pokémon ist — höhere Initiative bedeutet meist, dass es zuerst angreift.",
    },
  },
};

// Type names as shown on the PokeAPI (English) mapped to German. Types are
// a small, fixed set (~18), so a hardcoded map is simpler and more reliable
// here than an extra API call per type.
const TYPE_NAMES_DE = {
  normal: "Normal",
  fire: "Feuer",
  water: "Wasser",
  electric: "Elektro",
  grass: "Pflanze",
  ice: "Eis",
  fighting: "Kampf",
  poison: "Gift",
  ground: "Boden",
  flying: "Flug",
  psychic: "Psycho",
  bug: "Käfer",
  rock: "Gestein",
  ghost: "Geist",
  dragon: "Drache",
  dark: "Unlicht",
  steel: "Stahl",
  fairy: "Fee",
};

export function t(language, key, ...args) {
  const entry = STRINGS[language]?.[key] ?? STRINGS.en[key];
  return typeof entry === "function" ? entry(...args) : entry;
}

export function getStatLabel(language, statKey) {
  return STRINGS[language]?.stats?.[statKey] ?? STRINGS.en.stats[statKey];
}

export function getStatDescription(language, statKey) {
  return (
    STRINGS[language]?.statDescriptions?.[statKey] ??
    STRINGS.en.statDescriptions[statKey]
  );
}

export function translateType(language, type) {
  if (language === "de") {
    return TYPE_NAMES_DE[type] || type;
  }
  return type;
}

export function getPokemonName(language, pokemon) {
  if (language === "de" && pokemon.nameDe) {
    return pokemon.nameDe;
  }
  return pokemon.name;
}
