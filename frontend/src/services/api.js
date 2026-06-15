const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}/api${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export async function fetchMarketStatus() {
  return apiFetch("/market/status");
}

export async function fetchIndexHistory(indexId = "DSEX") {
  return apiFetch(`/index/${indexId}/history`);
}

export async function fetchStockHistory(tradeCode = "GP") {
  return apiFetch(`/stock/${tradeCode}/history`);
}
