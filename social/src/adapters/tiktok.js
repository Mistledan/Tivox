import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { log } from "../logger.js";
import { pickVideo } from "./youtube.js";

export const name = "tiktok";

const INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";

export function isConfigured() {
  return Boolean(config.tiktok.accessToken);
}

export async function publish({ text }, { dryRun }) {
  if (dryRun) {
    const preview = pickVideo();
    log(`[tiktok] dry-run: "${String(text).slice(0, 60)}…" video="${preview ? path.basename(preview) : "(none)"}"`);
    return { id: "dry-run" };
  }

  const video = pickVideo();
  if (!video) {
    throw new Error("No video file in social/assets/videos (add an .mp4 first).");
  }

  const size = fs.statSync(video).size;

  const initRes = await fetch(INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.tiktok.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: String(text).slice(0, 2200),
        privacy_level: config.tiktok.privacyLevel,
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });

  const initData = await initRes.json().catch(() => ({}));
  const apiError = initData?.error;
  if (!initRes.ok || (apiError && apiError.code && apiError.code !== "ok")) {
    throw new Error(`TikTok init error: ${JSON.stringify(initData)}`);
  }

  const uploadUrl = initData?.data?.upload_url;
  const publishId = initData?.data?.publish_id;
  if (!uploadUrl) {
    throw new Error("TikTok: no upload_url returned (app may need audit approval).");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: fs.readFileSync(video),
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`TikTok upload error ${uploadRes.status}: ${body}`);
  }

  return { id: publishId ?? "ok" };
}
