const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying TIVOX with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const TIVOX = await hre.ethers.getContractFactory("TIVOX");
  const tivox = await TIVOX.deploy(deployer.address);

  await tivox.waitForDeployment();

  const address = await tivox.getAddress();
  console.log("TIVOX deployed to:", address);
  console.log("Total supply:", hre.ethers.formatEther(await tivox.totalSupply()), "TVX");

  console.log("\nNext step - verify on Etherscan with:");
  console.log(`npx hardhat verify --network sepolia ${address} ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
