import { config } from "../config.js";
import { log } from "../logger.js";
import { fetchMarket, formatMarket } from "../market.js";
import { escapeHtml } from "../escape.js";

export const name = "telegram";

export function isConfigured() {
  return Boolean(config.telegram.token && config.telegram.chatId);
}

export async function publish({ text }, { dryRun }) {
  let body = text;
  if (config.market.lineEnabled) {
    const market = await fetchMarket();
    if (market) {
      body = `${text}\n\n${formatMarket(market)}`;
    }
  }

  if (dryRun) {
    log(`[telegram] dry-run:\n${body}\n`);
    return { id: "dry-run" };
  }

  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text: escapeHtml(body),
      disable_web_page_preview: false,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram error ${res.status}: ${data.description || "unknown"}`);
  }
  return { id: String(data.result?.message_id ?? "ok") };
}
