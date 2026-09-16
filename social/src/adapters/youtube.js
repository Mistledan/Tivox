import fs from "node:fs";
import path from "node:path";
import { config, ASSETS_DIR } from "../config.js";
import { log } from "../logger.js";

export const name = "youtube";

export function isConfigured() {
  const y = config.youtube;
  return Boolean(y.clientId && y.clientSecret && y.refreshToken);
}

export function pickVideo() {
  const dir = path.join(ASSETS_DIR, "videos");
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(mp4|mov|webm)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
  return files[0] || null;
}

async function accessToken() {
  const y = config.youtube;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: y.clientId,
      client_secret: y.clientSecret,
      refresh_token: y.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `YouTube token error ${res.status}: ${data.error_description || data.error || "unknown"}`
    );
  }
  return data.access_token;
}

export async function publish({ text }, { dryRun }) {
  const lines = String(text)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const title = (lines[0] || "TIVOX update").slice(0, 100);
  const description = [
    lines.slice(1).join("\n"),
    "TIVOX ($TVX) — fixed-supply ERC-20 on the Sepolia testnet. Not tradeable, not for sale.",
    "#TIVOX #TVX #ERC20 #Sepolia",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);

  if (dryRun) {
    const preview = pickVideo();
    log(`[youtube] dry-run: title="${title}" video="${preview ? path.basename(preview) : "(none)"}"`);
    return { id: "dry-run" };
  }

  const video = pickVideo();
  if (!video) {
    throw new Error("No video file in social/assets/videos (add an .mp4 first).");
  }

  const token = await accessToken();
  const size = fs.statSync(video).size;

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags: ["TIVOX", "TVX", "ERC20", "Sepolia", "Web3"],
          categoryId: config.youtube.categoryId,
        },
        status: {
          privacyStatus: config.youtube.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`YouTube init error ${initRes.status}: ${body}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube: no upload session URL returned.");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/*" },
    body: fs.readFileSync(video),
  });

  const data = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(`YouTube upload error ${uploadRes.status}: ${JSON.stringify(data)}`);
  }
  return { id: data.id ?? "ok" };
}
