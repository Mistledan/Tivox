const hre = require("hardhat");

// Base chain (chainId 8453) Uniswap V2 deployment. Verified on BaseScan:
//   Router02: 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24
//   Factory:  0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6
const UNISWAP_V2_ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
const UNISWAP_V2_FACTORY = "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6";
// LP tokens are sent here on creation, permanently locking the liquidity.
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

const ROUTER_ABI = [
  "function WETH() external view returns (address)",
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === null || value === "" ? fallback : value.trim();
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  console.log("Launch account:", deployer.address);

  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const lpEth = parseFloat(env("LP_ETH", "0"));
  if (!(lpEth > 0)) {
    throw new Error("Set LP_ETH to the amount of ETH you want paired with the token (e.g. 0.5).");
  }
  const communityWallet = env("COMMUNITY_WALLET", "");
  if (!hre.ethers.isAddress(communityWallet) || communityWallet === hre.ethers.ZeroAddress) {
    throw new Error("Set COMMUNITY_WALLET to a valid recipient address.");
  }
  const lpPercent = Math.min(100, Math.max(1, Number(env("LP_PERCENT", "80"))));
  const communityPercent = Math.min(100, Math.max(0, Number(env("COMMUNITY_PERCENT", "20"))));
  const renounce = env("RENOUNCE_OWNERSHIP", "false").toLowerCase() === "true";
  const vestingEnabled = env("VESTING_ENABLED", "true").toLowerCase() !== "false";
  const cliffSeconds = Math.max(0, Number(env("VESTING_CLIFF_DAYS", "30"))) * 86400;
  const durationSeconds = Math.max(1, Number(env("VESTING_DURATION_DAYS", "180"))) * 86400;
  const existingAddress = env("TVX_CONTRACT_ADDRESS", "");

  // --- 1. Deploy (or load) the token --------------------------------
  let tvx;
  if (existingAddress) {
    if (!hre.ethers.isAddress(existingAddress)) {
      throw new Error("TVX_CONTRACT_ADDRESS is not a valid address.");
    }
    tvx = await hre.ethers.getContractAt("TVX", existingAddress);
    console.log("Using existing TVX at:", existingAddress);
  } else {
    console.log("Deploying TVX...");
    const TVX = await hre.ethers.getContractFactory("TVX");
    tvx = await TVX.deploy();
    await tvx.waitForDeployment();
    console.log("TVX deployed to:", await tvx.getAddress());
  }

  const tvxAddress = await tvx.getAddress();
  const totalSupply = await tvx.totalSupply();
  const lpAmount = (totalSupply * BigInt(lpPercent)) / 100n;
  const communityAmount = (totalSupply * BigInt(communityPercent)) / 100n;
  const lpEthWei = hre.ethers.parseEther(lpEth.toFixed(18));

  console.log(`Total supply:   ${hre.ethers.formatEther(totalSupply)} TVX`);
  console.log(`To pool:        ${hre.ethers.formatEther(lpAmount)} TVX + ${hre.ethers.formatEther(lpEthWei)} ETH`);
  console.log(`To community:   ${hre.ethers.formatEther(communityAmount)} TVX -> ${communityWallet}`);

  // --- 2. Create the pool + add liquidity, LP tokens -> dead address ---
  const router = new hre.ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, deployer);
  const factory = new hre.ethers.Contract(UNISWAP_V2_FACTORY, FACTORY_ABI, provider);
  const weth = await router.WETH();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 30;

  console.log("Approving router to spend TVX...");
  const approveTx = await tvx.approve(UNISWAP_V2_ROUTER, lpAmount);
  await approveTx.wait();

  console.log("Creating pool and adding liquidity (LP burned to dead address)...");
  const addTx = await router.addLiquidityETH(
    tvxAddress,
    lpAmount, // amountTokenDesired
    lpAmount, // amountTokenMin (exact; both sides are fully controlled here)
    0n, // amountETHMin
    DEAD_ADDRESS, // to = LP receiver, burned => permanently locked liquidity
    deadline,
    { value: lpEthWei }
  );
  await addTx.wait();

  const pairAddress = await factory.getPair(tvxAddress, weth);
  const pair = new hre.ethers.Contract(pairAddress, ERC20_ABI, provider);
  const lpBurned = await pair.balanceOf(DEAD_ADDRESS);

  console.log("Pair created at:", pairAddress);
  console.log(`Liquidity locked (burned LP): ${hre.ethers.formatEther(lpBurned)} UNI-V2`);

  // --- 3. Send the community allocation --------------------------------
  let vestingAddress = null;
  if (communityAmount > 0n) {
    if (vestingEnabled) {
      const now = Math.floor(Date.now() / 1000);
      const start = now + cliffSeconds;
      const cliffDays = Math.round(cliffSeconds / 86400);
      const durationDays = Math.round(durationSeconds / 86400);

      console.log(`Deploying community vesting (cliff ${cliffDays} days, ${durationDays} days linear)...`);
      const Vesting = await hre.ethers.getContractFactory("TokenVesting");
      const vesting = await Vesting.deploy(communityWallet, start, durationSeconds);
      await vesting.waitForDeployment();
      vestingAddress = await vesting.getAddress();

      const vestTx = await tvx.transfer(vestingAddress, communityAmount);
      await vestTx.wait();
      console.log(`Vested ${hre.ethers.formatEther(communityAmount)} TVX in ${vestingAddress} for ${communityWallet}`);
    } else {
      console.log("Sending community allocation...");
      const communityTx = await tvx.transfer(communityWallet, communityAmount);
      await communityTx.wait();
      console.log(`Sent ${hre.ethers.formatEther(communityAmount)} TVX to ${communityWallet}`);
    }
  }

  // --- 4. Optionally renounce ownership --------------------------------
  if (renounce) {
    console.log("Renouncing ownership...");
    const renounceTx = await tvx.renounceOwnership();
    await renounceTx.wait();
    console.log("Ownership renounced.");
  }

  console.log("\nLaunch complete:");
  console.log("  TVX:     ", tvxAddress);
  console.log("  Pair:    ", pairAddress);
  if (vestingAddress) {
    console.log("  Vesting: ", vestingAddress, `(beneficiary ${communityWallet})`);
  }
  console.log("  Buy:     ", `https://app.uniswap.org/swap?chain=base&outputCurrency=${tvxAddress}`);
  console.log("  BaseScan:", `https://basescan.org/token/${tvxAddress}`);

  console.log("\nPaste the TVX address into web/index.html and web/whitepaper.html, then:");
  console.log(`npx hardhat verify --network base ${tvxAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});