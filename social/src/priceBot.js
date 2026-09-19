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
import { escapeHtml } from "./escape.js";

const API = `https://api.telegram.org/bot${config.telegram.token}`;
const STATE_FILE = path.join(CONTENT_DIR, "bot-state.json");

const WELCOME =
  "Welcome to the field.\nTIVOX ($TVX) — 1,000,000,000 supply, 0% tax, LP burned and locked forever.\nUse /info for the official links. Nobody here ever DMs asking for money — if one does, it is a scam.";

function sig() {
  return "^ The ox survey of the field (live when trading opens).";
}

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
    if (!market) {
      return escapeHtml("TVX is not trading yet. The pool link will be posted here the moment it goes live.");
    }
    return `${escapeHtml(formatMarket(market))}\n\n${sig()}`;
  },
  "/market": async () => answers["/price"](),
  "/info": async () => {
    const { token } = config.market;
    const ready = /^0x[a-fA-F0-9]{40}$/.test(token);
    const lines = [
      "TIVOX ($TVX)",
      "",
      ready
        ? `<code>Contract</code>: <code>${token}</code>\n<a href="https://basescan.org/token/${token}">BaseScan</a>"
        : "Contract: pending launch — it will be posted here the moment the pool goes live.",
      "",
      "Website: https://mistledan.github.io/Tivox/",
      "Whitepaper: https://mistledan.github.io/Tivox/whitepaper.html",
      "",
      "1,000,000,000 supply. 0% tax. No mint. LP burned and locked forever.",
      "Not financial advice. Verify the address before trading.",
    ];
    return escapeHtml(lines.join("\n"));
  },
  "/start": async () => escapeHtml(WELCOME),
  "/help": async () =>
    escapeHtml("TIVOX commands:\n/info — official links and the contract address\n/price or /market — live market snapshot (once trading)"),
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
    parse_mode: "HTML",
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
        allowed_updates: ["message", "channel_post"],
      });
      for (const update of updates || []) {
        const msg = update.message || update.channel_post || {};
        const chatId = msg.chat && msg.chat.id;
        const text = typeof msg.text === "string" ? msg.text.trim() : "";

        if (chatId && Array.isArray(msg.new_chat_members) && msg.new_chat_members.length > 0) {
          await api("sendMessage", {
            chat_id: chatId,
            text: escapeHtml(WELCOME),
            disable_web_page_preview: false,
            parse_mode: "HTML",
          });
          log(`welcomed new member(s) in chat ${chatId}`);
        }

        if (!chatId || !text) continue;

        const command = text.toLowerCase().split(" ")[0];
        const handler = answers[command];
        if (handler) {
          const answer = await handler();
          await api("sendMessage", {
            chat_id: chatId,
            text: answer,
            disable_web_page_preview: false,
            parse_mode: "HTML",
          });
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