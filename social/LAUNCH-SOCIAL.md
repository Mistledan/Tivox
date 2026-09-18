# TIVOX Social Media Launch Kit

Everything you can read/pin/post before, during, and after the launch. Copy is
written in the ox voice: calm, stubborn, zero hype. No price promises, no
"guaranteed" language — this keeps accounts alive and honest.

Sweet spot checklist before you post anything:
- [ ] TVX is deployed and the pair exists on Base (post `npm run launch:base`)
- [ ] Contract verified on BaseScan
- [ ] `TVX_ADDRESS` in the launch toolbox
- [ ] Site is live (addresses pasted into `web/index.html`)

---

## 1. Pinned announcement (Telegram channel — post this first, pin it)

```
TIVOX ($TVX) is live on Base.

1,000,000,000 TVX. 0% tax. No mint function.
80% of supply is in the Uniswap pool and the LP tokens are burned — locked forever.
20% is time-locked in a vesting contract (30-day cliff, then linear unlock).

Contract (verify this first, always):
[TVX_ADDRESS] — [BASE_SCAN_TOKEN_URL]

Trade: [UNISWAP_BUY_URL]
Chart: [DEXSCREENER_URL]
Source: verified on BaseScan. Whitepaper at https://mistledan.github.io/Tivox/whitepaper.html

Buy, sell, or hold your own decision. Not financial advice. Nobody will ever DM
you asking for money — if they do, it is a scam.
```

## 2. Channel rules (pin under the announcement, short)

```
1. No price shilling or FUD spam — the ox does not do either.
2. The only official address is the one pinned above. Always verify before trading.
3. Admins never DM first and never ask for money. Block + report anyone who does.
4. No referral spam, no altcoin bombing.
5. Keep it boring. Slow and honest beats fast and fake.
```

## 3. Pre-launch teasers (1 post per day, mix from `content/topics.json`)

Day -3 — build:
```
Deployed on Base, in public, with real tests.
Slow and honest beats fast and fake.
```

Day -2 — supply:
```
No mint function.
Not a typo — there is no way to make more TVX.
1,000,000,000. Forever.
```

Day -1 — liquidity:
```
80% of the supply goes to the pool and the LP is burned.
Nobody can pull the rug on the ox.
```

## 4. Launch announcement (post the minute the pair exists)

Telegram / YouTube description:
```
TVX is live.

1,000,000,000 TVX. 0% tax. No mint. LP burned and locked forever (80%).
20% in a time-locked community vault: 30-day cliff, 180-day linear unlock.

Contract (verify): 0xTVX_ADDRESS
Trade: https://app.uniswap.org/swap?chain=base&outputCurrency=0xTVX_ADDRESS
Chart: https://dexscreener.com/base/0xPAIR
BaseScan: https://basescan.org/token/0xTVX_ADDRESS
Whitepaper: https://mistledan.github.io/Tivox/whitepaper.html

Trade at your own risk. Not financial advice.
```

TikTok short (180-char cut):
```
TVX is live on Base. 1,000,000,000 supply, 0% tax, LP locked forever.
Verify the address, then do your own research. Link in bio.
```

## 5. Post-launch follow-ups

Hour +1 — locked:
```
Locked forever: the pool's LP tokens went to the dead address at launch.
Check it on BaseScan — it is visible on-chain, not a promise.
```

Day +1 — trade:
```
TVX trades on Uniswap V2 over Base.
0% tax on the way in, 0% on the way out.
Always check the contract address first — no exceptions.
```

Day +3 — community:
```
The ox is slow, but it is not alone.
Pulling one block at a time. Pull up a chair.
```

## 6. One-liner replies (moderator copypasta)

Q: "Is this a scam?"
A:
```
It is a real contract on Base, verified on BaseScan, LP burned. Nobody here DMs
for money. It is not an investment guarantee — read the whitepaper and verify
the address before you trade.
```

Q: "Where do I buy?"
A:
```
Uniswap V2 on Base. The pinned announcement has the verified address, the trade
link, and the chart. Skip any DM that offers to sell it to you.
```

## 7. Hashtag set

Brand: #TVX #TIVOX #Base #Uniswap #ERC20
Launch burst: add one of #BuildInPublic #DexScreener #Basechain per post — never
more than 3-4 total hashtags.

## 8. Launch-week cadence

| Day | Post | Angle |
|-----|------|-------|
| -3  | teaser x1 | build |
| -2  | teaser x1 | supply |
| -1  | teaser x1 + go-live notice | liquidity |
| 0   | announcement + pin | launch |
| +1  | follow-up x2-3 | trade, verified |
| +3  | follow-up x2 | community, honesty |

Scheduled posts (the `social.yml` cron, every 6h) keep running through all of this
from `topics.json` — you are only adding the special dates above manually.

## 9. Platform setup (recurring reminder)

Telegram is live. X, YouTube, TikTok still need credentials — full walkthroughs in
`social/README.md`. X posting requires a paid API tier; until then run its posts
manually from this kit.

## 10. Guardrails (permanently)

- Never post a wallet, "presale," or payment address. The token address is the
  ONLY address that ever gets posted.
- Never imply guaranteed returns. If a line promises anything, cut it.
- Every buy/sell mention carries "verify the address" or "not financial advice".
- No emoji spam; the brand is a calm ox, not a rocket.