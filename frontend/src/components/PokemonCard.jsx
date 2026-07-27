import { t, translateType, getPokemonName } from "../i18n.js";
import { TYPE_COLORS } from "../typeColors.js";
import { BallIcon } from "./BallSelector.jsx";

export default function PokemonCard({ pokemon, language, onCatchClick, onOpenDetail }) {
  const isClickableForDetail = pokemon.caught && Boolean(onOpenDetail);

  function handleCardClick() {
    if (isClickableForDetail) onOpenDetail(pokemon);
  }

  function handleCardKeyDown(event) {
    if (!isClickableForDetail) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetail(pokemon);
    }
  }

  return (
    <div
      className={`pokemon-card ${pokemon.caught ? "is-caught" : ""} ${
        isClickableForDetail ? "is-clickable" : ""
      }`}
      onClick={isClickableForDetail ? handleCardClick : undefined}
      onKeyDown={isClickableForDetail ? handleCardKeyDown : undefined}
      role={isClickableForDetail ? "button" : undefined}
      tabIndex={isClickableForDetail ? 0 : undefined}
    >
      <div className="pokemon-card__sprite-wrap">
        <img
          className="pokemon-card__sprite"
          src={pokemon.spriteUrl}
          alt={pokemon.name}
          loading="lazy"
        />
      </div>

      <p className="pokemon-card__id">#{String(pokemon.id).padStart(3, "0")}</p>
      <h3 className="pokemon-card__name">{getPokemonName(language, pokemon)}</h3>

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

      {pokemon.caught ? (
        <p className="pokemon-card__status">
          {pokemon.ballType && <BallIcon ballId={pokemon.ballType} size={18} />}
          {t(language, "caughtStatus")}
        </p>
      ) : (
        <button
          className="pokemon-card__catch-button"
          onClick={onCatchClick}
        >
          {t(language, "catchButton")}
        </button>
      )}

      <p className="pokemon-card__attempts">
        {t(language, "attempts", pokemon.attempts)}
      </p>
    </div>
  );
}
