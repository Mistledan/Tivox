const abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const sepoliaChainId = "0xaa36a7";
const els = {
  connectWallet: document.querySelector("#connectWallet"),
  contractAddress: document.querySelector("#contractAddress"),
  loadToken: document.querySelector("#loadToken"),
  status: document.querySelector("#status"),
  tokenName: document.querySelector("#tokenName"),
  tokenSymbol: document.querySelector("#tokenSymbol"),
  totalSupply: document.querySelector("#totalSupply"),
  walletBalance: document.querySelector("#walletBalance"),
  recipient: document.querySelector("#recipient"),
  amount: document.querySelector("#amount"),
  sendTokens: document.querySelector("#sendTokens"),
  etherscanLink: document.querySelector("#etherscanLink"),
};

let provider;
let signer;
let token;
let tokenDecimals = 18;

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function getContractAddress() {
  const address = els.contractAddress.value.trim();
  if (!ethers.isAddress(address)) {
    throw new Error("Enter a valid TIVOX contract address.");
  }
  try {
    localStorage.setItem("tivoxContractAddress", address);
  } catch (error) {
    console.warn("Could not save contract address:", error);
  }
  els.etherscanLink.href = `https://sepolia.etherscan.io/token/${address}`;
  return address;
}

async function ensureWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required to use this page.");
  }

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId !== sepoliaChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: sepoliaChainId }],
      });
    } catch (error) {
      if (error && error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: sepoliaChainId,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  const address = await signer.getAddress();
  els.connectWallet.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function loadToken() {
  const address = getContractAddress();
  provider = provider || new ethers.BrowserProvider(window.ethereum);
  signer = signer || (await provider.getSigner());
  token = new ethers.Contract(address, abi, signer);

  const [name, symbol, decimals, totalSupply, walletAddress] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    signer.getAddress(),
  ]);

  tokenDecimals = Number(decimals);
  const balance = await token.balanceOf(walletAddress);

  els.tokenName.textContent = name;
  els.tokenSymbol.textContent = symbol;
  els.totalSupply.textContent = `${ethers.formatUnits(totalSupply, tokenDecimals)} ${symbol}`;
  els.walletBalance.textContent = `${ethers.formatUnits(balance, tokenDecimals)} ${symbol}`;
  setStatus("TIVOX data loaded from Sepolia.");
}

async function sendTokens() {
  if (!token) {
    await loadToken();
  }

  const recipient = els.recipient.value.trim();
  const amount = els.amount.value.trim();
  if (!ethers.isAddress(recipient)) {
    throw new Error("Enter a valid recipient address.");
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  const value = ethers.parseUnits(amount, tokenDecimals);
  setStatus("Waiting for wallet confirmation...");
  const tx = await token.transfer(recipient, value);
  setStatus(`Transaction sent: ${tx.hash}`);
  await tx.wait();
  await loadToken();
  setStatus(`Transfer confirmed: ${tx.hash}`);
}

els.connectWallet.addEventListener("click", async () => {
  try {
    await ensureWallet();
    setStatus("Wallet connected on Sepolia.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

els.loadToken.addEventListener("click", async () => {
  try {
    await ensureWallet();
    await loadToken();
  } catch (error) {
    setStatus(error.message, true);
  }
});

els.sendTokens.addEventListener("click", async () => {
  try {
    await ensureWallet();
    await sendTokens();
  } catch (error) {
    setStatus(error.message, true);
  }
});

try {
  els.contractAddress.value = localStorage.getItem("tivoxContractAddress") || "";
} catch (error) {
  console.warn("Could not restore contract address:", error);
}
