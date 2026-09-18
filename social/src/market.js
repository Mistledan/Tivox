// Live market data for TVX via the free DexScreener API. No API key.
// Works only once TVX_ADDRESS is set (post-launch).

import { config } from "./config.js";

const BASE_URL = "https://api.dexscreener.com/latest/dex/tokens";

export function marketConfigured() {
  return /^0x[a-fA-F0-9]{40}$/.test(config.market.token || "");
}

export async function fetchMarket() {
  if (!marketConfigured()) return null;
  const res = await fetch(`${BASE_URL}/${config.market.token}`);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) return null;

  const base = data.pairs.filter((p) => p && p.chainId === "base");
  const pair = base.find((p) => p.dexId === "uniswap") || base[0];
  if (!pair) return null;

  return {
    priceUsd: Number(pair.priceUsd) || 0,
    change24h: pair.priceChange ? Number(pair.priceChange.h24) : null,
    marketCap: Number(pair.marketCap) || Number(pair.fdv) || null,
    liquidityUsd: Number((pair.liquidity || {}).usd) || null,
    volume24: Number((pair.volume || {}).h24) || null,
    url: pair.url || null,
  };
}

export function formatMarket(m) {
  if (!m || !m.priceUsd) return "TVX market data is not available yet.";
  const price = m.priceUsd >= 1 ? `$${m.priceUsd.toFixed(4)}` : `$${m.priceUsd.toPrecision(4)}`;
  const change = m.change24h === null || m.change24h === undefined
    ? ""
    : ` (${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}% 24h)`;

  let out = `TVX: ${price}${change}`;
  if (m.marketCap) out += `\nMarket cap: ${fmtUsd(m.marketCap)}`;
  if (m.liquidityUsd) out += `\nLiquidity: ${fmtUsd(m.liquidityUsd)}`;
  if (m.volume24) out += `\n24h volume: ${fmtUsd(m.volume24)}`;
  if (m.url) out += `\n${m.url}`;
  return out;
}

function fmtUsd(n) {
  if (!Number.isFinite(n)) return "--";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}