// Telegram command bot for TVX: replies to /price and /market in the chat.
// Run it somewhere always-on (a small VPS, a free cloud host, or a cron-one-shot
// mode below). Dependency-free: plain HTTP long-polling against the Bot API.
//
//   node social/src/priceBot.js               # long-running poll loop
//   node social/src/priceBot.js --once        # single /price broadcast to the chat
//
// Requires TELEGRAM_BOT_TOKEN (+ TELEGRAM_CHAT_ID for --once) and, once the
// token is live, TVX_ADDRESS.

import fs from "node:fs";
import path from "node:path";
import { config, CONTENT_DIR } from "./config.js";
import { log, error } from "./logger.js";
import { fetchMarket, formatMarket } from "./market.js";

const API = `https://api.telegram.org/bot${config.telegram.token}`;
const STATE_FILE = path.join(CONTENT_DIR, "bot-state.json");

async function api(method, payload = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`${method}: ${data.description || res.status}`);
  }
  return data.result;
}

function loadOffset() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return Number(state.offset) || 0;
  } catch (err) {
    return 0;
  }
}

function saveOffset(offset) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ offset, updatedAt: new Date().toISOString() }));
  } catch (err) {
    error(`could not persist offset: ${err.message}`);
  }
}

const answers = {
  "/price": async () => {
    const market = await fetchMarket();
    if (!market) return "TVX is not trading yet. The pool link will be posted here the moment it goes live.";
    return formatMarket(market);
  },
  "/market": async () => answers["/price"](),
  "/start": async () =>
    "TIVOX ($TVX): 1,000,000,000 supply, 0% tax, LP burned and locked forever.\nCommands: /price",
  "/help": async () => "TIVOX commands: /price or /market for the live market snapshot.",
};

async function broadcastOnce() {
  if (!config.telegram.chatId) {
    error("--once requires TELEGRAM_CHAT_ID");
    process.exitCode = 1;
    return;
  }
  const answer = await answers["/price"]();
  const result = await api("sendMessage", {
    chat_id: config.telegram.chatId,
    text: answer,
    disable_web_page_preview: false,
  });
  log(`broadcast ok (message_id=${result?.message_id})`);
}

async function pollLoop() {
  if (!config.telegram.token) {
    error("priceBot requires TELEGRAM_BOT_TOKEN");
    process.exitCode = 1;
    return;
  }
  let offset = loadOffset();
  log("price bot polling (Ctrl+C to stop)...");
  for (;;) {
    try {
      const updates = await api("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"],
      });
      for (const update of updates || []) {
        const msg = update.message || {};
        const chatId = msg.chat && msg.chat.id;
        const text = typeof msg.text === "string" ? msg.text.trim() : "";
        if (!chatId || !text) continue;

        const command = text.toLowerCase().split(" ")[0];
        const handler = answers[command];
        if (handler) {
          const answer = await handler();
          await api("sendMessage", { chat_id: chatId, text: answer, disable_web_page_preview: false });
          log(`answered ${command} in chat ${chatId}`);
        }
        offset = update.update_id + 1;
      }
      saveOffset(offset);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      error(err.message);
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }
}

const once = process.argv.includes("--once");
(once ? broadcastOnce() : pollLoop()).catch((err) => {
  error(err);
  process.exitCode = 1;
  process.exit(process.exitCode);
});