import fs from "node:fs";
import path from "node:path";
import { config, CONTENT_DIR } from "./config.js";
import { warn } from "./logger.js";

export const LIMITS = {
  telegram: 4096,
  x: 280,
  youtube: 5000,
  tiktok: 2200,
};

const HASHTAGS = ["#TIVOX", "#TVX", "#Base", "#ERC20", "#Uniswap"];

const topics = JSON.parse(
  fs.readFileSync(path.join(CONTENT_DIR, "topics.json"), "utf8")
);

export function topicCount() {
  return topics.length;
}

export function topicAt(index) {
  const n = topics.length;
  return topics[((index % n) + n) % n];
}

const TEMPLATES = {
  steady: [
    "The market panics.\nThe ox pulls.\nSame as yesterday, same as tomorrow.",
    "No spikes, no drama, no exit scam.\nJust 1,000,000,000 TVX and a very stubborn ox.",
    "Everyone is chasing the next shiny thing.\nThe ox is still in the same field it started in.",
  ],
  supply: [
    "No mint function.\nNot a typo — there is no way to make more TVX.\n1,000,000,000. Forever.",
    "Supply today: 1,000,000,000.\nSupply next year: 1,000,000,000 (or less, if people burn).\nThe ox does not do inflation.",
    "You can burn your TVX.\nYou cannot print more.\nThat is the entire monetary policy.",
  ],
  verified: [
    "Source code is verified on BaseScan.\nOpen, readable, verifiable.\nNo 'trust me' in the building.",
    "Every line of TIVOX is verified on-chain.\nThe ox has nothing to hide.",
  ],
  liquidity: [
    "80% of supply is in the pool and the LP is burned.\nNobody can pull the rug on the ox.",
    "Locked forever: the pool's LP tokens went to the dead address at launch.\nCheck it on BaseScan.",
  ],
  trade: [
    "TVX trades on Uniswap V2 over Base.\n0% tax on the way in, 0% on the way out.",
    "Want the ox? It's on Uniswap.\nAlways check the contract address first — no exceptions.",
  ],
  nopanic: [
    "Red candle?\nThe ox does not check charts.\nIt checks the plough.",
    "Volatility is other people's problem.\nThe ox is on a schedule.",
  ],
  build: [
    "Deployed on Base, in public, with real tests.\nSlow and honest beats fast and fake.",
    "Shipping beats promising.\nThe ox builds while everyone else is boarding the spaceship.",
  ],
  honesty: [
    "The honest part: early pools are small and volatile.\nThe ox is not a get-rich plan — it is 1B tokens and 0% tax.",
    "We will never DM you asking for money.\nCheck the official contract address, then ignore the DMs.",
  ],
  faq: [
    "FAQ: Can anyone mint more TVX?\nNo. There is no mint function. Not even the owner.",
    "FAQ: Where does TVX trade?\nUniswap V2 on Base. 0% tax, LP locked, nothing hidden.",
  ],
  community: [
    "The ox is slow, but it is not alone.\nJoin the field on Telegram — one block at a time.",
    "No roadmap full of spaceships.\nJust a locked pool and steady work. Pull up a chair.",
  ],
  general: [
    "The ox keeps pulling.",
    "1,000,000,000 fixed. No mint. Still here.",
  ],
};

function systemPrompt(platform) {
  const limit = LIMITS[platform] || 280;
  return [
    "You write short, punchy social media posts for TIVOX ($TVX), a fixed-supply ERC-20 token that trades on Uniswap V2 over the Base network.",
    "Voice: calm, stubborn, dry humor. The ox does not panic.",
    "Hard rules: never promise or imply returns; never call it an investment; never guarantee price or use words like moon, lambo, or guaranteed; always be honest about volatility; remind readers to verify the official contract address; mention trading on Uniswap when it fits naturally.",
    `Keep the post under ${limit} characters.`,
    "You may use line breaks and at most 3 hashtags.",
    "Return only the post text, with no quotes or preamble.",
  ].join(" ");
}

function enforce(text, platform) {
  const limit = LIMITS[platform] || 280;
  let out = String(text || "").trim();
  if (!out) out = TEMPLATES.general[0];

  const tags = HASHTAGS.slice(0, platform === "x" ? 2 : 3).join(" ");
  if (!out.includes("#TIVOX") && out.length + tags.length + 1 <= limit) {
    out = `${out}\n\n${tags}`;
  }

  if (out.length > limit) {
    const cut = out.slice(0, limit - 1);
    const lastSpace = cut.lastIndexOf(" ");
    out = `${cut.slice(0, lastSpace > limit * 0.6 ? lastSpace : limit - 1).trimEnd()}…`;
  }
  return out;
}

async function llmCaption(topic, platform) {
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      temperature: 0.8,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt(platform) },
        {
          role: "user",
          content: `Angle: ${topic.angle}. Guidance: ${topic.guidance}. Write one post.`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

function templateCaption(topic, platform, index) {
  const pool = TEMPLATES[topic.angle] || TEMPLATES.general;
  return pool[index % pool.length];
}

export async function generateCaption(topic, platform, index) {
  if (config.llm.apiKey) {
    try {
      const text = await llmCaption(topic, platform);
      if (text) return enforce(text, platform);
    } catch (err) {
      warn(`LLM caption failed, using template: ${err.message}`);
    }
  }
  return enforce(templateCaption(topic, platform, index), platform);
}
