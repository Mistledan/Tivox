// Social automation configuration.
// Every value comes from the environment; nothing is hard-coded.

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SOCIAL_DIR = path.resolve(__dirname, "..");
export const CONTENT_DIR = path.join(SOCIAL_DIR, "content");
export const ASSETS_DIR = path.join(SOCIAL_DIR, "assets");

function env(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === null ? fallback : String(value).trim();
}

export const config = {
  dryRun: process.argv.includes("--dry-run") || env("SOCIAL_DRY_RUN") === "1",
  count: Math.max(1, Number(env("SOCIAL_COUNT", "1")) || 1),
  llm: {
    apiKey: env("OPENAI_API_KEY"),
    baseUrl: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    model: env("OPENAI_MODEL", "gpt-4o-mini"),
  },
  telegram: {
    token: env("TELEGRAM_BOT_TOKEN"),
    chatId: env("TELEGRAM_CHAT_ID"),
  },
  x: {
    consumerKey: env("X_CONSUMER_KEY"),
    consumerSecret: env("X_CONSUMER_SECRET"),
    accessToken: env("X_ACCESS_TOKEN"),
    accessSecret: env("X_ACCESS_TOKEN_SECRET"),
  },
  youtube: {
    clientId: env("YOUTUBE_CLIENT_ID"),
    clientSecret: env("YOUTUBE_CLIENT_SECRET"),
    refreshToken: env("YOUTUBE_REFRESH_TOKEN"),
    privacyStatus: env("YOUTUBE_PRIVACY_STATUS", "private"),
    categoryId: env("YOUTUBE_CATEGORY_ID", "28"),
  },
  tiktok: {
    accessToken: env("TIKTOK_ACCESS_TOKEN"),
    privacyLevel: env("TIKTOK_PRIVACY_LEVEL", "SELF_ONLY"),
  },
  market: {
    token: env("TVX_ADDRESS"),
    lineEnabled: env("SOCIAL_MARKET_LINE", "0") === "1",
  },
};

export function platformConfigured(platform) {
  switch (platform) {
    case "telegram":
      return Boolean(config.telegram.token && config.telegram.chatId);
    case "x":
      return Boolean(
        config.x.consumerKey &&
          config.x.consumerSecret &&
          config.x.accessToken &&
          config.x.accessSecret
      );
    case "youtube":
      return Boolean(
        config.youtube.clientId &&
          config.youtube.clientSecret &&
          config.youtube.refreshToken
      );
    case "tiktok":
      return Boolean(config.tiktok.accessToken);
    default:
      return false;
  }
}
