import { useEffect, useRef, useState } from "react";
import { fetchPokemonList, attemptCatch } from "./api.js";
import PokemonCard from "./components/PokemonCard.jsx";
import WildZone from "./components/WildZone.jsx";
import { INITIAL_BALL_COUNTS } from "./components/BallSelector.jsx";
import { LANGUAGES, t } from "./i18n.js";

const BALL_REFILL_INTERVAL_MS = 10 * 60 * 1000;

export default function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [language, setLanguage] = useState("en");
  const [view, setView] = useState("gallery"); // "gallery" | "wildzone"

  // Ball counts and the refill countdown live here (not in WildZone) so they
  // keep running whether or not the Wildzone tab is currently mounted.
  const [ballCounts, setBallCounts] = useState(INITIAL_BALL_COUNTS);
  const [selectedBall, setSelectedBall] = useState("pokeball");
  const [secondsUntilRefill, setSecondsUntilRefill] = useState(
    BALL_REFILL_INTERVAL_MS / 1000
  );
  const nextRefillAtRef = useRef(Date.now() + BALL_REFILL_INTERVAL_MS);

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
        nextRefillAtRef.current = Date.now() + BALL_REFILL_INTERVAL_MS;
        setSecondsUntilRefill(BALL_REFILL_INTERVAL_MS / 1000);
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

  const caughtCount = pokemonList.filter((p) => p.caught).length;

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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
