# TVX Launch Runbook (Base mainnet)

Everything needed to take TIVOX from "pre-launch site" to a live, tradable token.
Total hands-on time: ~10 minutes once your wallet holds ETH on Base.

## Pre-flight checklist (before launch day)

- [ ] You hold ETH on **Base** (not Ethereum mainnet). Bridge from Ethereum via
      the official Base bridge or any major bridge. Recommended: enough for
      `LP_ETH` + ~$2-5 of gas headroom.
- [ ] `PRIVATE_KEY` in `.env` belongs to the wallet that holds that Base ETH.
- [ ] `COMMUNITY_WALLET` is an address **you control** and is comfortable
      receiving 200,000,000 TVX (vested). It can be a fresh 2-of-2 multisig if you
      want extra safety.
- [ ] `ETHERSCAN_API_KEY` is set (BaseScan uses Etherscan accounts) for
      verification.
- [ ] `npm run compile` and `npm test` both pass (14 tests).
- [ ] You have ~0.2 ETH minimum (`LP_ETH=0.2`). This is the floor we agreed on —
      below it the pool is bot bait. More is better.

## Environment check

```bash
node -e "require('dotenv').config(); const e=console.log;
e('BASE_RPC_URL', process.env.BASE_RPC_URL);
e('LP_ETH', process.env.LP_ETH);
e('COMMUNITY_WALLET', process.env.COMMUNITY_WALLET);
e('RENOUNCE_OWNERSHIP', process.env.RENOUNCE_OWNERSHIP || 'false');"
```

All values must be present and sane. `RENOUNCE_OWNERSHIP=true` is strongly
recommended — after launch, no address should hold privileged control.

## Launch (the only irreversible step)

```bash
npm run launch:base
```

The script, in order:

1. Deploys `TVX` (1,000,000,000 to the deployer).
2. Approves Uniswap V2 and adds liquidity: 80% + `LP_ETH`, LP → dead address.
3. Deploys `TokenVesting` (30-day cliff, 180-day unlock) and deposits the 20%.
4. Renounces ownership (if `RENOUNCE_OWNERSHIP=true`).

It prints the **TVX address**, **pair address**, and **vesting address**. Save all
three. Verify in BaseScan that the four transactions made it through.

## Post-launch (done on the same day)

1. Verify the contract source (proves bytecode matches the repo):
   ```bash
   npm run verify:base -- <TVX_CONTRACT_ADDRESS>
   ```
2. Paste `<TVX_CONTRACT_ADDRESS>` and `<VESTING_ADDRESS>` into the two constants
   at the top of `web/index.html`:
   - `TVX_ADDRESS`
   - `VESTING_ADDRESS`
3. Commit + push. GitHub Pages redeploys automatically and the site turns live:
   buy button → Uniswap, market panels populate from on-chain + DexScreener.
4. Set `TVX_ADDRESS` in the social bot (`.env` / GitHub Actions secret) so
   `/price` and the market line work.
5. Broadcast the pool link and the contract address in Telegram. First trade
   auto-indexes the pair on DexScreener / Dextools — the chart buttons on the site
   link straight to the pair.

## Verify the trust story on BaseScan (5 minute check)

- **LP locked**: pair contract → `balanceOf(0x...dEaD)` equals ~100% of the LP
  total supply.
- **Community vested**: 200,000,000 TVX sit in the `TokenVesting` contract;
  beneficiary = `COMMUNITY_WALLET`; `start()` ≈ now + 30 days.
- **Renounced**: token contract → `owner()` == `0x000...000`.

## Common pitfalls

- **Wrong network.** `npm run launch:base` uses chain 8453. If your ETH is on
  Ethereum mainnet the tx will fail at the liquidity step. Bridge first.
- **Deadline misses.** The router deadline is 30 minutes; if the RPC stalls,
  re-run — a fresh deploy with a fresh deadline is harmless *only if* the previous
  run did not already add liquidity. Check the printed pair before re-running.
- **Re-running non-idempotently.** `TVX_CONTRACT_ADDRESS` lets you re-run the
  launch steps against an existing token without deploying a second one.
- **Do not** launch with a wallet/`.env` you are not comfortable having on-chain.

## Failure recovery

If an early step fails you can restart from the token only:

```bash
TVX_CONTRACT_ADDRESS=<TVX_ADDRESS> npm run launch:base
```

It skips deployment and proceeds with liquidity + vesting + renounce against the
existing token. Avoid running this twice against the same token/pool.