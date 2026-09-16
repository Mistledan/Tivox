import { config } from "./config.js";
import { log, warn, error } from "./logger.js";
import { loadState, saveState, recordPost, postedCount } from "./state.js";
import { generateCaption, topicAt } from "./content.js";

import * as telegram from "./adapters/telegram.js";
import * as x from "./adapters/x.js";
import * as youtube from "./adapters/youtube.js";
import * as tiktok from "./adapters/tiktok.js";

const ADAPTERS = { telegram, x, youtube, tiktok };
const ALL = Object.keys(ADAPTERS);

function parsePlatforms() {
  const arg = process.argv.find((a) => a.startsWith("--platforms="));
  if (!arg) return ALL;
  const list = arg
    .split("=")[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : ALL;
}

async function main() {
  const platforms = parsePlatforms();
  const state = loadState();
  let failures = 0;

  log(`run started (dryRun=${config.dryRun}, count=${config.count}, platforms=${platforms.join(",")})`);

  for (const platform of platforms) {
    const adapter = ADAPTERS[platform];
    if (!adapter) {
      warn(`unknown platform: ${platform}`);
      continue;
    }
    if (!adapter.isConfigured()) {
      warn(`${platform}: not configured, skipping.`);
      continue;
    }

    for (let n = 0; n < config.count; n += 1) {
      const index = postedCount(state, platform) + n;
      const topic = topicAt(index);
      try {
        const caption = await generateCaption(topic, platform, index);
        const result = await adapter.publish({ text: caption }, { dryRun: config.dryRun });
        log(`${platform}: posted (id=${result.id}, angle=${topic.angle})`);
        if (!config.dryRun) {
          recordPost(state, platform, result.id);
        }
      } catch (err) {
        failures += 1;
        error(`${platform}: ${err.message}`);
      }
    }
  }

  if (!config.dryRun) {
    state.runs = [
      ...(state.runs || []),
      { ts: new Date().toISOString(), platforms, count: config.count },
    ].slice(-50);
    saveState(state);
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
  log("run finished");
}

main().catch((err) => {
  error(err);
  process.exitCode = 1;
});
