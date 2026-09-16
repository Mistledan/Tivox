const hre = require("hardhat");

async function main() {
  const tokenAddress = process.env.TIVOX_CONTRACT_ADDRESS;
  const recipient = process.env.TRANSFER_TO;
  const amount = process.env.TRANSFER_AMOUNT || "10";

  if (!tokenAddress) {
    throw new Error("Set TIVOX_CONTRACT_ADDRESS in .env before transferring.");
  }

  if (!recipient || !hre.ethers.isAddress(recipient)) {
    throw new Error("Set TRANSFER_TO in .env to a valid recipient address.");
  }

  const [sender] = await hre.ethers.getSigners();
  const tivox = await hre.ethers.getContractAt("TIVOX", tokenAddress);
  const decimals = Number(await tivox.decimals());
  const value = hre.ethers.parseUnits(amount, decimals);

  console.log(`Sending ${amount} TVX from ${sender.address} to ${recipient}...`);
  const tx = await tivox.transfer(recipient, value);
  await tx.wait();

  console.log("Transfer complete:", tx.hash);
  console.log("Sender balance:", hre.ethers.formatUnits(await tivox.balanceOf(sender.address), decimals), "TVX");
  console.log("Recipient balance:", hre.ethers.formatUnits(await tivox.balanceOf(recipient), decimals), "TVX");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
