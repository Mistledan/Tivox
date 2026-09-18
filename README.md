# TIVOX Token (TVX)

TIVOX is a community token on the **Base** network that people can actually trade.

- Name: TIVOX
- Symbol: TVX
- Supply: 1,000,000,000 TVX (fixed at deployment)
- Decimals: 18
- Network: Base (chain ID 8453)
- DEX: Uniswap V2 (Base)
- Transfer tax: 0%
- Features: burnable, ownable (no privileged powers), no post-deploy minting
- Distribution: 80% to the Uniswap pool (LP burned = locked forever), 20% time-locked
  in a vesting contract (30-day cliff, then linear unlock over 6 months)

## Project structure

```
contracts/TVX.sol             mainnet token contract (1B supply)
contracts/TIVOX.sol           legacy Sepolia testnet contract (1M supply, historical only)
scripts/                      deploy + launch helpers
test/                         Hardhat test suite (TVX + legacy TIVOX)
web/                          the static site published to GitHub Pages
  index.html                  landing page with Buy links and contract card
  whitepaper.html             full project whitepaper
  styles.css                  shared site stylesheet
  404.html                    not-found page
  assets/mascot.png           brand image (also used for og:image / favicon)
social/                       social media automation (Telegram, X, YouTube, TikTok)
.github/workflows/            CI + GitHub Pages deploy + social scheduler
```

## Design notes

- **Fixed supply.** `TOTAL_SUPPLY` is a constant and the full 1,000,000,000 TVX is
  minted once in the constructor. There is no `mint` function, so no address — not
  even the owner — can create more TVX.
- **0% tax.** A plain ERC-20 with no fee hooks, no reflections, and no hidden
  deductions. Transfers move exactly the amount requested.
- **Locked liquidity.** At launch, 80% of the supply is paired with ETH on Uniswap
  V2 and the LP tokens are sent to the dead address. That liquidity can never be
  pulled.
- **Time-locked community share.** The remaining 20% is held by a `TokenVesting`
  contract (OpenZeppelin `VestingWallet`): zero releases for 30 days, then linear
  unlock over 6 months to a public beneficiary. The community allocation cannot be
  dumped at launch.
- **Why `Ownable`?** Ownership is explicit and transferable on-chain and grants no
  privileged powers (no minting, pausing, freezing, seizure). It is renounced as
  part of the launch procedure for maximum transparency.
- **Burnable.** Holders can burn their own tokens; supply can only ever decrease.

## 1. Install

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in:

- `BASE_RPC_URL`: a full HTTPS Base RPC URL (e.g. `https://mainnet.base.org` or an
  Alchemy/Infura endpoint)
- `PRIVATE_KEY`: the wallet that will deploy the token. **On Base this must hold
  real ETH, bridged from Ethereum.** Never use a key you are not comfortable using
  on-chain — and never commit `.env`.
- `ETHERSCAN_API_KEY`: your Etherscan API key (Basescan uses the same account)
- `COMMUNITY_WALLET`: the beneficiary that receives the vested 20% community
  allocation
- `LP_ETH`: how much ETH (in ETH units, e.g. `0.2` or `0.5`) to pair with the
  tokens. **0.2 ETH is the honest floor (~$550)** — below that the pool is too
  shallow to survive; prefer more if you can afford it

Optional overrides (defaults shown): `LP_PERCENT=80`, `COMMUNITY_PERCENT=20`,
`VESTING_ENABLED=true`, `VESTING_CLIFF_DAYS=30`, `VESTING_DURATION_DAYS=180`,
`RENOUNCE_OWNERSHIP=true`, `TVX_CONTRACT_ADDRESS=`.

## 3. Compile and test locally

```bash
npm run compile
npm test
```

## 4. Launch on Base (deploy + lock liquidity + vest community share)

The wallet must hold real ETH on Base. Then:

```bash
npm run launch:base
```

The script, in order:

1. Deploys `TVX` (1,000,000,000 supply to the deployer)
2. Approves Uniswap V2 and adds liquidity: `LP_PERCENT`% of supply + `LP_ETH` worth
   of ETH, with the LP tokens sent to the dead address (permanent lock)
3. Deploys a `TokenVesting` (audited OpenZeppelin `VestingWallet`) for the
   community: `COMMUNITY_PERCENT`% is transferred in and releases to
   `COMMUNITY_WALLET` only after a 30-day cliff, then linearly over 6 months
4. Renounces ownership if `RENOUNCE_OWNERSHIP=true`

It prints the token address, pool/pair address, vesting contract, and the
Uniswap + BaseScan links.

> Deploy-only (no pool, no allocations): `npm run deploy:base`

## 5. Verify the contract on BaseScan

```bash
npm run verify:base -- <TVX_CONTRACT_ADDRESS>
```

## 6. Point the website at the live token

After launching, paste the TVX address into **two places**:

- `web/index.html` — the `TVX_ADDRESS` constant in the script at the bottom
- `web/whitepaper.html` — the `WP_ADDRESS` constant in the script at the bottom

Once a real 0x address is set, the site automatically wires the Buy buttons to
Uniswap, the contract card to BaseScan, and the footer pills to the token page.

## 7. The website

The site is fully static — no JavaScript dependencies, no external APIs.

- `web/index.html` is the landing page: overview, token facts, contract card,
  principles, and FAQ.
- `web/whitepaper.html` documents the specification, distribution, architecture,
  locked liquidity, transparency, and risks.
- `web/styles.css` is the shared stylesheet used by every page.

Browse locally:

```bash
npx serve web
```

## 8. Deployment (GitHub Pages)

The `Deploy site` workflow publishes the `web/` folder to GitHub Pages on every
push. The site is live at https://mistledan.github.io/Tivox/.

## 9. CI

`.github/workflows/ci.yml` compiles and tests the contracts on every push and pull
request, and checks that all required site files exist.

## 10. Social media automation

`social/` is a dependency-free Node package that posts rotating TIVOX content to
Telegram, X, YouTube, and TikTok. See [`social/README.md`](social/README.md) for
setup. Preview locally:

```bash
node social/src/index.js --dry-run
```

`.github/workflows/social.yml` runs it on a 6-hour schedule with platform
credentials stored as repository secrets.

## Legacy testnet (historical)

`contracts/TIVOX.sol` is the original 1M-supply token deployed on the Sepolia
testnet during development. It was a proof-of-work demo and is unrelated to the
market. It remains in the repo only as a historical engineering artifact.