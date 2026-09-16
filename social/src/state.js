import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "./config.js";

const STATE_FILE = path.join(CONTENT_DIR, "state.json");

const EMPTY = {
  posted: { telegram: [], x: [], youtube: [], tiktok: [] },
  runs: [],
};

export function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      posted: { ...EMPTY.posted, ...(parsed.posted || {}) },
      runs: parsed.runs || [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveState(state) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

export function postedCount(state, platform) {
  return (state.posted[platform] || []).length;
}

export function recordPost(state, platform, id) {
  const list = state.posted[platform] || (state.posted[platform] = []);
  list.push({ id, ts: new Date().toISOString() });
  state.posted[platform] = list.slice(-200);
}
