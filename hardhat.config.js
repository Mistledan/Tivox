require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const NETWORKS = {
  sepolia: { rpcEnv: "SEPOLIA_RPC_URL", chainId: 11155111 },
  base: { rpcEnv: "BASE_RPC_URL", chainId: 8453 },
};

function currentNetwork() {
  const idx = process.argv.indexOf("--network");
  return idx >= 0 ? process.argv[idx + 1] : "";
}

const network = currentNetwork();
const isLive = Object.prototype.hasOwnProperty.call(NETWORKS, network);

function requireEnv(name) {
  const value = process.env[name];
  if (isLive && (!value || value.includes("YOUR_") || value.includes("PASTE_"))) {
    throw new Error(`${name} is required for the ${network} network. Set it in .env.`);
  }
  return value || "";
}

function getAccounts() {
  const raw = (process.env.PRIVATE_KEY || "").trim();
  if (!raw) {
    return [];
  }

  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    if (isLive) {
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
      url: requireEnv(NETWORKS.sepolia.rpcEnv),
      accounts: getAccounts(),
      chainId: NETWORKS.sepolia.chainId,
    },
    base: {
      url: requireEnv(NETWORKS.base.rpcEnv),
      accounts: getAccounts(),
      chainId: NETWORKS.base.chainId,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};