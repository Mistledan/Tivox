require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const isSepoliaCommand = process.argv.includes("--network") && process.argv.includes("sepolia");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (isSepoliaCommand && (!value || value.includes("YOUR_") || value.includes("PASTE_"))) {
    throw new Error(`${name} is required for Sepolia commands. Set it in .env.`);
  }
  return value || "";
}

function getSepoliaAccounts() {
  const privateKey = getRequiredEnv("PRIVATE_KEY").trim();
  if (!privateKey) {
    return [];
  }

  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    if (isSepoliaCommand) {
      throw new Error("PRIVATE_KEY must be a 64-character hex private key, with or without 0x.");
    }
    return [];
  }

  return [normalized];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: getRequiredEnv("SEPOLIA_RPC_URL"),
      accounts: getSepoliaAccounts(),
    },
  },
  etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY || "",
},
};
