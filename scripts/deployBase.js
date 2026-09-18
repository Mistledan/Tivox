const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying TVX on Base with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const TVX = await hre.ethers.getContractFactory("TVX");
  const tvx = await TVX.deploy();

  await tvx.waitForDeployment();

  const address = await tvx.getAddress();
  console.log("TVX deployed to:", address);
  console.log("Total supply:", hre.ethers.formatEther(await tvx.totalSupply()), "TVX");

  console.log("\nVerify the source with:");
  console.log(`npx hardhat verify --network base ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});