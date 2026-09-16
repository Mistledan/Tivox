import { config } from "../config.js";
import { log } from "../logger.js";

export const name = "telegram";

export function isConfigured() {
  return Boolean(config.telegram.token && config.telegram.chatId);
}

export async function publish({ text }, { dryRun }) {
  if (dryRun) {
    log(`[telegram] dry-run:\n${text}\n`);
    return { id: "dry-run" };
  }

  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram error ${res.status}: ${data.description || "unknown"}`);
  }
  return { id: String(data.result?.message_id ?? "ok") };
}
