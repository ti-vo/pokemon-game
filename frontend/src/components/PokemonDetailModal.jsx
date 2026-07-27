import { useEffect } from "react";
import {
  t,
  translateType,
  getPokemonName,
  getStatLabel,
  getStatDescription,
} from "../i18n.js";
import { TYPE_COLORS } from "../typeColors.js";
import { BallIcon } from "./BallSelector.jsx";

// Rough cap used to size the stat bars (base stats among early Pokemon
// rarely exceed this). Values above it just fill the bar completely.
const STAT_BAR_CAP = 120;

export default function PokemonDetailModal({ language, pokemon, onClose }) {
  useEffect(() => {
    if (!pokemon) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pokemon, onClose]);

  if (!pokemon) return null;

  const artworkSrc = pokemon.artworkUrl || pokemon.homeUrl || pokemon.spriteUrl;

  return (
    <div className="pokemon-modal__overlay" onClick={onClose}>
      <div
        className="pokemon-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pokemon-modal__close"
          onClick={onClose}
          aria-label={t(language, "close")}
        >
          ×
        </button>

        <img
          className="pokemon-modal__artwork"
          src={artworkSrc}
          alt={getPokemonName(language, pokemon)}
        />

        <p className="pokemon-card__id">#{String(pokemon.id).padStart(3, "0")}</p>
        <h2 className="pokemon-modal__name">{getPokemonName(language, pokemon)}</h2>

        <div className="pokemon-card__types">
          {pokemon.types.map((type) => (
            <span
              key={type}
              className="pokemon-card__type-badge"
              style={{ backgroundColor: TYPE_COLORS[type] || "#888" }}
            >
              {translateType(language, type)}
            </span>
          ))}
        </div>

        {pokemon.ballType && (
          <p className="pokemon-modal__ball">
            <BallIcon ballId={pokemon.ballType} size={22} />
            {t(language, `ball_${pokemon.ballType}`)}
          </p>
        )}

        {pokemon.stats && (
          <div className="pokemon-card__stats">
            {Object.entries(pokemon.stats).map(([statKey, value]) => (
              <div key={statKey} className="pokemon-card__stat-row">
                <span
                  className="pokemon-card__stat-label"
                  title={getStatDescription(language, statKey)}
                >
                  {getStatLabel(language, statKey)}
                </span>
                <span className="pokemon-card__stat-bar-track">
                  <span
                    className="pokemon-card__stat-bar-fill"
                    style={{
                      width: `${Math.min(100, (value / STAT_BAR_CAP) * 100)}%`,
                    }}
                  />
                </span>
                <span className="pokemon-card__stat-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
