import { useEffect, useRef, useState } from "react";
import { fetchPokemonList, attemptCatch } from "./api.js";
import PokemonCard from "./components/PokemonCard.jsx";
import PokemonDetailModal from "./components/PokemonDetailModal.jsx";
import WildZone from "./components/WildZone.jsx";
import { INITIAL_BALL_COUNTS } from "./components/BallSelector.jsx";
import SettingsMenu, {
  DEFAULT_SPEED_MULTIPLIER,
  DEFAULT_BALL_REFILL_INTERVAL_MS,
} from "./components/SettingsMenu.jsx";
import { LANGUAGES, t } from "./i18n.js";

export default function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [language, setLanguage] = useState("en");
  const [view, setView] = useState("gallery"); // "gallery" | "wildzone"
  const [detailPokemonId, setDetailPokemonId] = useState(null);

  // Ball counts and the refill countdown live here (not in WildZone) so they
  // keep running whether or not the Wildzone tab is currently mounted.
  const [ballCounts, setBallCounts] = useState(INITIAL_BALL_COUNTS);
  const [selectedBall, setSelectedBall] = useState("pokeball");
  const [ballRefillIntervalMs, setBallRefillIntervalMs] = useState(
    DEFAULT_BALL_REFILL_INTERVAL_MS
  );
  const [secondsUntilRefill, setSecondsUntilRefill] = useState(
    DEFAULT_BALL_REFILL_INTERVAL_MS / 1000
  );
  const nextRefillAtRef = useRef(Date.now() + DEFAULT_BALL_REFILL_INTERVAL_MS);
  const ballRefillIntervalMsRef = useRef(DEFAULT_BALL_REFILL_INTERVAL_MS);
  ballRefillIntervalMsRef.current = ballRefillIntervalMs;

  const [speedMultiplier, setSpeedMultiplier] = useState(
    DEFAULT_SPEED_MULTIPLIER
  );

  useEffect(() => {
    fetchPokemonList()
      .then((data) => setPokemonList(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const tick = () => {
      const remainingMs = nextRefillAtRef.current - Date.now();
      if (remainingMs <= 0) {
        setBallCounts({ ...INITIAL_BALL_COUNTS });
        nextRefillAtRef.current = Date.now() + ballRefillIntervalMsRef.current;
        setSecondsUntilRefill(ballRefillIntervalMsRef.current / 1000);
      } else {
        setSecondsUntilRefill(Math.ceil(remainingMs / 1000));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleCatchButtonClick() {
    setView("wildzone");
  }

  function consumeBall(ballType) {
    setBallCounts((current) => ({
      ...current,
      [ballType]: Math.max(0, current[ballType] - 1),
    }));
  }

  async function handleThrowBall(pokemon, ballType) {
    // The ball is used up immediately, win or lose.
    consumeBall(ballType);

    const result = await attemptCatch(pokemon.id, ballType);

    setPokemonList((current) =>
      current.map((p) =>
        p.id === pokemon.id
          ? {
              ...p,
              caught: result.success ? true : p.caught,
              stats: result.success ? result.stats : p.stats,
              ballType: result.success ? result.ballType : p.ballType,
              attempts: p.attempts + 1,
            }
          : p
      )
    );

    return result;
  }

  function handleMissBall(ballType) {
    // Clicked in the Wildzone without hitting any Pokemon — the ball is
    // still spent, there's just no catch attempt to record.
    consumeBall(ballType);
  }

  function handleBallRefillIntervalChange(newIntervalMs) {
    // Applies starting now, rather than leaving a countdown from the old
    // interval running — much less confusing than a stale leftover timer.
    setBallRefillIntervalMs(newIntervalMs);
    nextRefillAtRef.current = Date.now() + newIntervalMs;
    setSecondsUntilRefill(newIntervalMs / 1000);
  }

  const caughtCount = pokemonList.filter((p) => p.caught).length;
  const detailPokemon = pokemonList.find((p) => p.id === detailPokemonId) ?? null;

  return (
    <div className="app">
      <header className="app__header">
        <nav className="view-tabs" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={view === "gallery"}
            className={`view-tabs__button ${
              view === "gallery" ? "is-active" : ""
            }`}
            onClick={() => setView("gallery")}
          >
            {t(language, "tabGallery")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "wildzone"}
            className={`view-tabs__button ${
              view === "wildzone" ? "is-active" : ""
            }`}
            onClick={() => setView("wildzone")}
          >
            {t(language, "tabWildZone")}
          </button>
        </nav>

        <div className="app__header-main">
          <h1>{t(language, "title")}</h1>

          <div className="app__header-right">
            {view === "gallery" && (
              <p className="app__progress">
                {t(language, "progress", caughtCount, pokemonList.length)}
              </p>
            )}

            <div className="lang-switch" role="group" aria-label="Language">
              {Object.entries(LANGUAGES).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  className={`lang-switch__button ${
                    language === code ? "is-active" : ""
                  }`}
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  title={info.label}
                >
                  <span aria-hidden="true">{info.flag}</span>
                  <span className="lang-switch__code">{code.toUpperCase()}</span>
                </button>
              ))}
            </div>

            <SettingsMenu
              language={language}
              speedMultiplier={speedMultiplier}
              onSpeedMultiplierChange={setSpeedMultiplier}
              ballRefillIntervalMs={ballRefillIntervalMs}
              onBallRefillIntervalChange={handleBallRefillIntervalChange}
            />
          </div>
        </div>
      </header>

      {view === "wildzone" && (
        <WildZone
          language={language}
          pokemonList={pokemonList}
          ballCounts={ballCounts}
          selectedBall={selectedBall}
          onSelectBall={setSelectedBall}
          secondsUntilRefill={secondsUntilRefill}
          onThrowBall={handleThrowBall}
          onMissBall={handleMissBall}
          speedMultiplier={speedMultiplier}
        />
      )}

      {view === "gallery" && (
        <>
          {isLoading && <p className="app__status">{t(language, "loading")}</p>}

          {loadError && (
            <p className="app__status app__status--error">
              {t(language, "backendError", loadError)}
            </p>
          )}

          {!isLoading && !loadError && (
            <div className="pokemon-grid">
              {pokemonList.map((pokemon) => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  language={language}
                  onCatchClick={handleCatchButtonClick}
                  onOpenDetail={(p) => setDetailPokemonId(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <PokemonDetailModal
        language={language}
        pokemon={detailPokemon}
        onClose={() => setDetailPokemonId(null)}
      />
    </div>
  );
}
