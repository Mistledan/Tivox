import crypto from "node:crypto";
import { config } from "../config.js";
import { log } from "../logger.js";

export const name = "x";

const TWEET_URL = "https://api.twitter.com/2/tweets";

export function isConfigured() {
  const c = config.x;
  return Boolean(c.consumerKey && c.consumerSecret && c.accessToken && c.accessSecret);
}

// RFC 3986 percent-encoding for OAuth 1.0a.
function enc(value) {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function oauthHeader(method, url) {
  const c = config.x;
  const oauth = {
    oauth_consumer_key: c.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: c.accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauth)
    .sort()
    .map((key) => `${enc(key)}=${enc(oauth[key])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${enc(url)}&${enc(paramString)}`;
  const signingKey = `${enc(c.consumerSecret)}&${enc(c.accessSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams = { ...oauth, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((key) => `${enc(key)}="${enc(headerParams[key])}"`)
      .join(", ")
  );
}

export async function publish({ text }, { dryRun }) {
  if (dryRun) {
    log(`[x] dry-run:\n${text}\n`);
    return { id: "dry-run" };
  }

  const res = await fetch(TWEET_URL, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", TWEET_URL),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail || data.title || JSON.stringify(data);
    throw new Error(`X error ${res.status}: ${detail}`);
  }
  return { id: data?.data?.id ?? "ok" };
}
