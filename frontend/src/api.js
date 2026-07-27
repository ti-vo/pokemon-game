// api.js
// All calls to the backend live here, in one place, so the rest of the
// frontend never has to know the base URL or fetch details.

const API_BASE = "http://localhost:3001/api";

export async function fetchPokemonList() {
  const response = await fetch(`${API_BASE}/pokemon`);
  if (!response.ok) {
    throw new Error(`Failed to load pokemon list: ${response.status}`);
  }
  return response.json();
}

export async function attemptCatch(pokemonId, ballType) {
  const response = await fetch(`${API_BASE}/pokemon/${pokemonId}/catch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ballType }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Catch attempt failed: ${response.status}`);
  }
  return response.json();
}
