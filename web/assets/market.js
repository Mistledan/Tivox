/* TIVOX live market panel.
 * Reads on-chain state via public Base JSON-RPC (pool, LP lock, community
 * vesting progress) and market stats from the free DexScreener API.
 * No API keys, no third-party JS except the vendored js-sha3 (MIT web3utils).
 * All-fetching is non-blocking and fails silently to the "—" placeholders.
 */
(function () {
  var TVX = window.TVX_ADDRESS || "";
  var VESTING = window.VESTING_ADDRESS || "";
  var ADDR = /^0x[a-fA-F0-9]{40}$/;

  var RPC_URLS = ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://base.llamarpc.com"];
  var DEAD = "0x000000000000000000000000000000000000dEaD";
  var WETH = "0x4200000000000000000000000000000000000006";
  var FACTORY = "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6";
  var DECIMALS = 18;
  var BIG = 10n ** 18n;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  function selector(sig) {
    var bytes = [];
    for (var i = 0; i < sig.length; i++) bytes.push(sig.charCodeAt(i));
    return "0x" + keccak_256(bytes).slice(0, 8);
  }
  function padWord(hex) {
    return hex.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  }
function encodeCall(sig, args) {
    var argHex = "";
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      argHex += padWord(typeof a === "bigint" ? "0x" + a.toString(16) : String(a).toLowerCase());
    }
    return selector(sig) + argHex;
  }

  function decodeUint(hex) {
    try {
      return hex && hex.length > 2 ? BigInt(hex) : 0n;
    } catch (err) {
      return 0n;
    }
  }
  function decodeAddress(hex) {
    if (!hex || hex.length < 42) return "0x" + "0".repeat(40);
    return "0x" + hex.slice(hex.length - 40).toLowerCase();
  }

  async function rpc(method, params) {
    var lastError = null;
    for (var r = 0; r < RPC_URLS.length; r++) {
      try {
        var res = await fetch(RPC_URLS[r], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
        });
        if (!res.ok) throw new Error("http " + res.status);
        var json = await res.json();
        if (json.error) throw new Error(json.error.message || "rpc error");
        return json.result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("all RPC endpoints failed");
  }

  async function callContract(to, sig, args) {
    var hex = encodeCall(sig, args || []);
    return rpc("eth_call", [{ to: to, data: hex }, "latest"]);
  }

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
    return "$" + n.toFixed(2);
  }
  function fmtPrice(p) {
    if (p === null || p === undefined || !isFinite(p)) return "—";
    if (p >= 1) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return "$" + p.toFixed(8).replace(/(\.[0-9]*?[1-9])0+$/, "$1");
  }
  function fmtChange(c) {
    if (c === null || c === undefined || !isFinite(c)) return "—";
    return (c > 0 ? "+" : "") + c.toFixed(2) + "%";
  }
  function fmtTokens(wei) {
    try {
      var val = BigInt(wei) / BIG;
      return Number(val).toLocaleString("en-US");
    } catch (err) {
      return "—";
    }
  }

  async function fetchDex() {
    var res = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + TVX);
    if (!res.ok) return null;
    var data = await res.json();
    if (!data || !Array.isArray(data.pairs)) return null;
    var base = data.pairs.filter(function (p) { return p && p.chainId === "base"; });
    var pair = base.filter(function (p) { return p.dexId === "uniswap"; })[0] || base[0];
    if (!pair) return null;
    return {
      priceUsd: Number(pair.priceUsd) || null,
      change: pair.priceChange ? Number(pair.priceChange.h24) : null,
      marketCap: Number(pair.marketCap) || Number(pair.fdv) || null,
      liquidityUsd: Number(pair.liquidity && pair.liquidity.usd) || null,
      volume24: Number(pair.volume && pair.volume.h24) || null
    };
  }

  async function refresh() {
    if (!ADDR.test(TVX)) return;
    try {
      // --- On-chain: pool + LP lock --------------------------------
      var pairHex = await callContract(FACTORY, "getPair(address,address)", [TVX, WETH]);
      var pair = "0x" + pairHex.slice(pairHex.length - 40);
      if (/^0x0+$/.test(pair)) throw new Error("pool not found");
      window.TIVOX_PAIR = pair;
      (function wireCharts() {
        var dex = $("link-chart-dex");
        var dextools = $("link-chart-dextools");
        if (dex) dex.href = "https://dexscreener.com/base/" + pair;
        if (dextools) dextools.href = "https://www.dextools.io/app/en/base/pair-explorer/" + pair;
      })();

      var token0 = decodeAddress(await callContract(pair, "token0()", []));
      var resHex = await callContract(pair, "getReserves()", []);
      var r0 = decodeUint(resHex.slice(0, 64));
      var r1 = decodeUint(resHex.slice(64, 128));
      var poolTokens = token0.toLowerCase() === TVX.toLowerCase() ? r0 : r1;
      setText("mPool", fmtTokens(poolTokens));

      var lpDead = decodeUint(await callContract(pair, "balanceOf(address)", [DEAD]));
      var lpTotal = decodeUint(await callContract(pair, "totalSupply()", []));
      if (lpTotal > 0n) {
        var burnPct = Number((lpDead * 10000n) / lpTotal) / 100;
        setText("mLp", burnPct >= 99.99 ? "100% burned" : burnPct.toFixed(2) + "% burned");
      } else {
        setText("mLp", "—");
      }

      // --- On-chain: ownership (renounced or still held) -------------
      var ownerHex = await callContract(TVX, "owner()", []);
      var owner = "0x" + ownerHex.slice(ownerHex.length - 40);
      setText("mOwn", /^0x0+$/.test(owner) ? "renounced" : "held");

      // --- On-chain: community vesting -----------------------------
      if (ADDR.test(VESTING)) {
        var supply = decodeUint(await callContract(TVX, "totalSupply()", []));
        var communityTotal = (supply * 20n) / 100n;
        var released = decodeUint(await callContract(VESTING, "released(address)", [TVX]));
        var start = decodeUint(await callContract(VESTING, "start()", []));
        var duration = decodeUint(await callContract(VESTING, "duration()", []));
        var pct = communityTotal > 0n ? Number((released * 1000n) / communityTotal) / 10 : 0;
        setText("mVest", pct.toFixed(1) + "%");
        var endDate = new Date(Number(start + duration) * 1000);
        setText("marketNote", "Vesting: " + (pct >= 99.9 ? "fully released" : "releases linearly; fully vested " + endDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })));
      } else {
        setText("mVest", "—");
      }
    } catch (err) {
      setText("marketNote", "Live pool feed is temporarily unavailable — verify directly on BaseScan.");
    }

    // --- Market stats (DexScreener) ---------------------------------
    try {
      var dex = await fetchDex();
      if (dex && (dex.priceUsd !== null || dex.marketCap !== null)) {
        setText("mPrice", fmtPrice(dex.priceUsd));
        setText("mChange", fmtChange(dex.change));
        setText("mMcap", fmtUsd(dex.marketCap));
        setText("mLiq", fmtUsd(dex.liquidityUsd));
        setText("mVol", fmtUsd(dex.volume24));
        var sub = $("marketSub");
        if (sub) sub.textContent = "Pulled live from Uniswap (Base) + BaseScan-verifiable on-chain reads. Refreshed every minute.";
      } else {
        setText("mPrice", "—");
        setText("mChange", "—");
        setText("mMcap", "—");
        setText("mLiq", "—");
        setText("mVol", "—");
      }
    } catch (err) {
      /* keep placeholders */
    }
  }

  refresh();
  setInterval(refresh, 60000);
})();