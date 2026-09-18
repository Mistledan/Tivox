# TIVOX Token (TVX)

TIVOX is a fixed-supply ERC-20 token for Sepolia testing.

- Name: TIVOX
- Symbol: TVX
- Supply: 1,000,000 TVX
- Decimals: 18
- Features: burnable, ownable, no post-deploy minting

## Project structure

```
contracts/TIVOX.sol        the token contract
scripts/                   deploy + transfer helpers
test/                      Hardhat test suite
web/                       the static site published to GitHub Pages
  index.html               landing page (share this)
  whitepaper.html          full project whitepaper
  styles.css               shared site stylesheet
  404.html                 not-found page
  assets/mascot.png        brand image (also used for og:image / favicon)
social/                    social media automation (Telegram, X, YouTube, TikTok)
.github/workflows/         CI + GitHub Pages deploy + social scheduler
```

## Design notes

- **Fixed supply.** `TOTAL_SUPPLY` is a constant and the full amount is minted
  once in the constructor. There is no `mint` function, so no address — not even
  the owner — can create more TVX.
- **Why `Ownable`?** The token inherits OpenZeppelin `Ownable` so ownership is
  explicit and transferable on-chain (a transparent, known address rather than an
  anonymous deployer). It does **not** grant any privileged token powers: no
  minting, no pausing, no freezing, no seizure. If you would rather remove even
  the appearance of privilege, delete `Ownable` and the constructor argument before
  any deployment.
- **Burnable.** Holders can burn their own tokens; supply can only ever decrease.

## 1. Install

```bash
npm install
```

## 2. Configure Sepolia

Copy the example env file:

```bash
cp .env.example .env
```

Fill in:

- `SEPOLIA_RPC_URL`: a full HTTPS Sepolia RPC URL, such as an Alchemy or Infura URL
- `PRIVATE_KEY`: a test wallet private key, 64 hex characters, with or without `0x`
- `ETHERSCAN_API_KEY`: your Etherscan API key

Use a test wallet only. Never put a main-wallet private key in this project.
`.env` is gitignored and must never be committed.

## 3. Compile and test locally

```bash
npm run compile
npm test
```

## 4. Deploy to Sepolia

Make sure the deployer wallet has Sepolia ETH, then run:

```bash
npm run deploy:sepolia
```

The script prints the deployed contract address and the exact verify command.

## 5. Verify the contract on Etherscan

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

Example:

```bash
npm run verify:sepolia -- 0xYourContract 0xYourWallet
```

## 6. Import/view TIVOX in the test wallet

In MetaMask on Sepolia:

1. Select Import tokens.
2. Paste the deployed TIVOX contract address.
3. Confirm symbol `TVX` and decimals `18`.

## 7. Send test tokens between addresses

You can send from MetaMask, from the web tools page, or with the script.

For the script, add these to `.env`:

```bash
TIVOX_CONTRACT_ADDRESS=0xYourContract
TRANSFER_TO=0xRecipient
TRANSFER_AMOUNT=10
```

Then run:

```bash
npm run transfer:sepolia
```

## 8. The website

The site is fully static — no JavaScript dependencies, no external APIs.

- `web/index.html` is the public landing page: overview, token facts, contract
  address, principles, and FAQ.
- `web/whitepaper.html` documents the token specification, contract architecture,
  security model, transparency, and risks.
- `web/styles.css` is the shared stylesheet used by every page.

Open the files directly in a browser, or serve the folder locally:

```bash
npx serve web
```

## 9. Deployment (GitHub Pages)

The `Deploy site` workflow publishes the `web/` folder to GitHub Pages on every
push to `master`/`main`. Enable it once under **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

The site is live at https://mistledan.github.io/Tivox/. The `canonical` and
Open Graph tags in `web/index.html` and `web/whitepaper.html` already point at
that URL; update them if the site ever moves.

## 10. CI

`.github/workflows/ci.yml` compiles and tests the contracts on every push and pull
request, and runs a JavaScript syntax check on the site scripts.

## 11. Social media automation

`social/` is a dependency-free Node package that posts rotating TIVOX content to
Telegram, X, YouTube, and TikTok. See [`social/README.md`](social/README.md) for
setup. Preview it locally without any API keys:

```bash
node social/src/index.js --dry-run
```

`.github/workflows/social.yml` runs it on a 6-hour schedule. Add the platform
credentials as repository secrets, then trigger it once manually with
**dry_run = true** to confirm the output.

## Current local verification

The project compiles and the local test suite covers metadata, fixed supply,
ownership, transfers, and burning.
