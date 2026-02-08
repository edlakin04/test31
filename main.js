/* MarketCaptureX
   - Phantom connect + SOL balance
   - Token creation stored locally for UI flow
   - Create token (if not connected): connect-only modal
   - Sell: percent buttons fill amount + Sell
   - Buy amount shows estimated token equivalent (simple curve estimate)
   - Auto Sell UI: stores config and updates hint (silent)
*/

const $ = (id) => document.getElementById(id);

// ======= Elements =======
const connectBtn = $("connectBtn");
const connectBtnText = $("connectBtnText");
const walletDot = $("walletDot");
const walletLine = $("walletLine");
const walletSub = $("walletSub");

const tabCreate = $("tabCreate");
const tabMy = $("tabMy");
const pageCreate = $("pageCreate");
const pageMy = $("pageMy");

const heroTitle = $("heroTitle");
const heroSub = $("heroSub");
const heroNote = $("heroNote");

const createForm = $("createForm");
const clearBtn = $("clearBtn");
const desc = $("description");
const descCount = $("descCount");
const logoInput = $("logo");
const logoName = $("logoName");
const logoPreview = $("logoPreview");
const presale = $("presale");
const feeValue = $("feeValue");
const totalValue = $("totalValue");
const tokenEqBuy = $("tokenEqBuy");

// socials (create)
const twitter = $("twitter");
const telegram = $("telegram");
const discord = $("discord");

// Modal + panels
const modal = $("modal");
const modalBackdrop = $("modalBackdrop");
const closeModal = $("closeModal");
const modalTitle = $("modalTitle");
const modalSub = $("modalSub");
const panelConnect = $("panelConnect");
const panelCreate = $("panelCreate");
const modalConnectBtn = $("modalConnectBtn");
const modalConnectBtn2 = $("modalConnectBtn2");
const modalCreateForm = $("modalCreateForm");

// modal form fields
const m_presale = $("m_presale");
const m_feeValue = $("m_feeValue");
const m_totalValue = $("m_totalValue");
const m_tokenEqBuy = $("m_tokenEqBuy");
const m_twitter = $("m_twitter");
const m_telegram = $("m_telegram");
const m_discord = $("m_discord");

// My tokens page
const chartOverlay = $("chartOverlay");
const tokenLogo = $("tokenLogo");
const tokenName = $("tokenName");
const tokenDesc = $("tokenDesc");
const tokenTicker = $("tokenTicker");
const tokenPresale = $("tokenPresale");
const tokenFee = $("tokenFee");
const tokenEstTokens = $("tokenEstTokens");
const walletSummary = $("walletSummary");

const kpiCA = $("kpiCA");
const kpiDevWallet = $("kpiDevWallet");

const linkTwitter = $("linkTwitter");
const linkTelegram = $("linkTelegram");
const linkDiscord = $("linkDiscord");

const holdingsLine = $("holdingsLine");
const sellAmount = $("sellAmount");
const sellEqHint = $("sellEqHint");
const sellBtn = $("sellBtn");

// Auto sell
const profitTarget = $("profitTarget");
const autoPct = $("autoPct");
const enableAutoSellBtn = $("enableAutoSellBtn");
const autoSellHint = $("autoSellHint");

$("year").textContent = new Date().getFullYear();

// ======= State =======
let walletPublicKey = null;
let walletAddress = null;
let solBalance = null;

const SERVICE_FEE_RATE = 0.05;
const SUPPLY = 1_000_000_000;
const STORAGE_KEY = "mcx_tokens_v1";

// ======= Token estimate curve (UI estimate) =======
function estimateTokensForUsd(usd) {
  const x = Math.max(0, Number(usd || 0));
  const k = 20000;
  const share = 0.60;
  const tokens = SUPPLY * share * (1 - Math.exp(-x / k));
  return Math.max(0, Math.floor(tokens));
}

// ======= Helpers =======
function fmtUSD(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
function fmtInt(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}
function safeUpper(s) {
  return (s || "").trim().toUpperCase();
}
function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function getTokenForWallet(address) {
  if (!address) return null;
  const store = readStore();
  return store[address] || null;
}
function setTokenForWallet(address, token) {
  const store = readStore();
  store[address] = token;
  writeStore(store);
}
function computeFee(amount) {
  const a = Number(amount || 0);
  const fee = a * SERVICE_FEE_RATE;
  const total = a + fee;
  return { fee, total };
}
function makeFakeCA() {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 44; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
function cleanUrl(u) {
  const s = (u || "").trim();
  return s;
}

// ======= Phantom Connect =======
function getPhantomProvider() {
  if (window?.solana?.isPhantom) return window.solana;
  return null;
}

async function fetchSolBalance(address, cluster = "devnet") {
  const { Connection, PublicKey, clusterApiUrl } = window.solanaWeb3;
  const connection = new Connection(clusterApiUrl(cluster), "confirmed");
  const lamports = await connection.getBalance(new PublicKey(address), "confirmed");
  return lamports / 1e9;
}

function setWalletUI({ connected }) {
  if (!connected) {
    walletDot.classList.remove("connected");
    walletLine.textContent = "Not connected";
    walletSub.textContent = "Connect Phantom to continue";
    connectBtnText.textContent = "Connect Wallet";
    walletSummary.textContent = "Not connected";
    return;
  }

  walletDot.classList.add("connected");
  walletLine.textContent = shortAddr(walletAddress);
  walletSub.textContent = solBalance == null ? "Connected" : `${solBalance.toFixed(4)} SOL`;
  connectBtnText.textContent = "Connected";
  walletSummary.textContent = shortAddr(walletAddress);
}

async function connectWallet() {
  const provider = getPhantomProvider();
  if (!provider) return false;

  try {
    const res = await provider.connect();
    walletPublicKey = res.publicKey;
    walletAddress = walletPublicKey.toString();
    solBalance = null;

    setWalletUI({ connected: true });

    try {
      solBalance = await fetchSolBalance(walletAddress, "devnet");
    } catch {
      solBalance = null;
    }

    setWalletUI({ connected: true });
    hydrateMyTokens();
    return true;
  } catch {
    return false;
  }
}

async function disconnectWallet() {
  const provider = getPhantomProvider();
  if (!provider) return;
  try {
    await provider.disconnect();
  } catch {}
  walletPublicKey = null;
  walletAddress = null;
  solBalance = null;
  setWalletUI({ connected: false });
  hydrateMyTokens();
}

// ======= Hero copy switching (no steps) =======
function setHeroFor(which) {
  if (which === "create") {
    heroTitle.innerHTML =
      `We build the token — you decide the <span class="grad grad-purple">ceiling</span>.`;
    heroSub.innerHTML =
      `MarketCaptureX is a creator-first launch flow built around one simple outcome:
       get you <span class="grad grad-blue">out of your position at the high</span>.
       We handle the structure, presentation, and marketing push; you choose the targets, timing, and how the exit is executed.
       The goal is to build attention, drive momentum, and make the sell process feel controlled — not random.`;
    heroNote.innerHTML =
      `We align by holding supply alongside you, and we push marketing using your socials + content.
       You handle DEX costs and ongoing momentum (community, socials, partnerships).
       A clear <span class="mono">5%</span> service fee is shown before checkout.`;
  } else {
    heroTitle.innerHTML =
      `Creator dashboard for <span class="grad grad-blue">controlled exits</span>.`;
    heroSub.innerHTML =
      `Manual sell and <span class="grad grad-blue">Auto Sell</span> are built for speed.
       Set a profit target and a sell percentage — when the condition is met, the sell action triggers automatically.`;
    heroNote.innerHTML =
      `This dashboard keeps the sell process structured. You can also sell manually by amount or by quick percentages.
       Social links are used in the marketing push to build attention and follow-through.`;
  }
}

function setTab(which) {
  const isCreate = which === "create";
  tabCreate.classList.toggle("active", isCreate);
  tabMy.classList.toggle("active", !isCreate);
  pageCreate.classList.toggle("active", isCreate);
  pageMy.classList.toggle("active", !isCreate);

  setHeroFor(which);
  if (!isCreate) hydrateMyTokens();
}

tabCreate.addEventListener("click", () => setTab("create"));
tabMy.addEventListener("click", () => setTab("my"));

// ======= Fee + token eq UI updates =======
function updateFeeUI(inputEl, feeEl, totalEl) {
  const v = Number(inputEl.value || 0);
  const { fee, total } = computeFee(v);
  feeEl.textContent = fmtUSD(fee);
  totalEl.textContent = fmtUSD(total);
}

function updateTokenEq(usdInputEl, eqEl) {
  const v = Number(usdInputEl.value || 0);
  const tokens = estimateTokensForUsd(v);
  eqEl.textContent = `≈ ${fmtInt(tokens)} tokens`;
}

presale.addEventListener("input", () => {
  updateFeeUI(presale, feeValue, totalValue);
  updateTokenEq(presale, tokenEqBuy);
});
m_presale.addEventListener("input", () => {
  updateFeeUI(m_presale, m_feeValue, m_totalValue);
  updateTokenEq(m_presale, m_tokenEqBuy);
});

// ======= Description counter =======
desc.addEventListener("input", () => {
  descCount.textContent = String(desc.value.length);
});

// ======= Logo preview =======
logoInput.addEventListener("change", () => {
  const file = logoInput.files?.[0];
  if (!file) {
    logoName.textContent = "No file selected";
    logoPreview.innerHTML = "";
    return;
  }
  logoName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    logoPreview.innerHTML = `<img alt="logo" src="${reader.result}">`;
  };
  reader.readAsDataURL(file);
});

// ======= Modal =======
function showModal(mode) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  if (mode === "create") {
    modalTitle.textContent = "Create a token";
    modalSub.textContent = "Connect your wallet and create a token to continue.";
    panelConnect.classList.add("hidden");
    panelCreate.classList.remove("hidden");
  } else {
    modalTitle.textContent = "Connect wallet";
    modalSub.textContent = "You need to connect your wallet for this action.";
    panelCreate.classList.add("hidden");
    panelConnect.classList.remove("hidden");
  }
}
function hideModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

modalBackdrop.addEventListener("click", hideModal);
closeModal.addEventListener("click", hideModal);

modalConnectBtn.addEventListener("click", async () => {
  const ok = await connectWallet();
  if (ok) hideModal();
});
modalConnectBtn2.addEventListener("click", async () => {
  const ok = await connectWallet();
  if (ok) hideModal();
});

// ======= Token creation =======
function requireWalletForCreate() {
  if (!walletAddress) {
    showModal("connect");
    return false;
  }
  return true;
}

function handleCreate({ fromModal = false }) {
  if (!requireWalletForCreate()) return;

  const name = (fromModal ? $("m_coinName") : $("coinName")).value.trim();
  const ticker = safeUpper((fromModal ? $("m_ticker") : $("ticker")).value);
  const description = (fromModal ? $("m_description") : $("description")).value.trim();
  const presaleUSD = Number((fromModal ? $("m_presale") : $("presale")).value || 0);

  const sTwitter = cleanUrl(fromModal ? m_twitter.value : twitter.value);
  const sTelegram = cleanUrl(fromModal ? m_telegram.value : telegram.value);
  const sDiscord = cleanUrl(fromModal ? m_discord.value : discord.value);

  if (!name || !ticker || !description || presaleUSD <= 0) return;

  let logoDataUrl = null;
  if (!fromModal) {
    const img = logoPreview.querySelector("img");
    if (img?.src) logoDataUrl = img.src;
  }

  const { fee, total } = computeFee(presaleUSD);
  const estTokens = estimateTokensForUsd(presaleUSD);

  const token = {
    name,
    ticker,
    description,
    supply: SUPPLY,
    presaleUSD,
    feeUSD: fee,
    totalUSD: total,
    estPresaleTokens: estTokens,
    logoDataUrl,
    socials: {
      twitter: sTwitter,
      telegram: sTelegram,
      discord: sDiscord,
    },
    ca: makeFakeCA(),
    devWallet: walletAddress,
    autoSell: null,
    createdAt: new Date().toISOString(),
  };

  setTokenForWallet(walletAddress, token);

  hydrateMyTokens();
  setTab("my");
  hideModal();
}

createForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleCreate({ fromModal: false });
});

modalCreateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleCreate({ fromModal: true });
});

clearBtn.addEventListener("click", () => {
  createForm.reset();
  descCount.textContent = "0";
  logoName.textContent = "No file selected";
  logoPreview.innerHTML = "";
  updateFeeUI(presale, feeValue, totalValue);
  updateTokenEq(presale, tokenEqBuy);
});

// ======= Sell UI =======
function getHoldings() {
  const token = getTokenForWallet(walletAddress);
  if (!walletAddress || !token) return 0;
  return Number(token.estPresaleTokens || 0);
}

function updateSellHints() {
  const holdings = getHoldings();
  const amt = Math.max(0, Number(sellAmount.value || 0));

  if (!walletAddress) {
    holdingsLine.textContent = "Holdings: —";
    sellEqHint.textContent = "Connect wallet to use sell controls.";
    return;
  }
  if (holdings <= 0) {
    holdingsLine.textContent = "Holdings: —";
    sellEqHint.textContent = "Create a token to use sell controls.";
    return;
  }

  holdingsLine.textContent = `Holdings: ${fmtInt(holdings)} tokens`;
  const pct = Math.min(100, Math.max(0, (amt / holdings) * 100));
  sellEqHint.textContent = amt > 0 ? `≈ ${pct.toFixed(2)}% of holdings` : "Enter an amount or use quick %";
}

sellAmount.addEventListener("input", updateSellHints);

document.querySelectorAll(".pct").forEach((btn) => {
  btn.addEventListener("click", () => {
    const holdings = getHoldings();
    const pct = Number(btn.getAttribute("data-pct") || 0);

    if (!walletAddress) {
      showModal("connect");
      return;
    }
    if (holdings <= 0) {
      showModal("create");
      return;
    }

    const amt = Math.floor((holdings * pct) / 100);
    sellAmount.value = String(amt);
    updateSellHints();
  });
});

sellBtn.addEventListener("click", () => {
  const holdings = getHoldings();

  if (!walletAddress) {
    showModal("connect");
    return;
  }
  if (holdings <= 0) {
    showModal("create");
    return;
  }

  sellAmount.value = "";
  updateSellHints();
});

// ======= Auto Sell (silent) =======
enableAutoSellBtn.addEventListener("click", () => {
  if (!walletAddress) {
    showModal("connect");
    return;
  }
  const token = getTokenForWallet(walletAddress);
  if (!token) {
    showModal("create");
    return;
  }

  const target = Math.max(0, Number(profitTarget.value || 0));
  const pct = Number(autoPct.value || 10);

  token.autoSell = { targetUSD: target, sellPct: pct, enabledAt: new Date().toISOString() };
  setTokenForWallet(walletAddress, token);

  hydrateMyTokens();
});

// ======= Chart =======
let chart = null;

function initChart() {
  const ctx = document.getElementById("chart");
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Performance", data: [], tension: 0.35, borderWidth: 2, pointRadius: 0 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.72)", boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        tooltip: { enabled: true },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.55)" } },
        y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.55)" } },
      },
    },
  });
}

function setOverlay(show, text) {
  if (show) {
    chartOverlay.textContent = text;
    chartOverlay.classList.remove("hidden");
  } else {
    chartOverlay.classList.add("hidden");
  }
}

// ======= My Tokens hydration =======
function setLink(a, url) {
  if (!url) {
    a.href = "#";
    a.classList.add("disabled");
    return;
  }
  a.href = url;
  a.classList.remove("disabled");
}

function hydrateMyTokens() {
  const token = getTokenForWallet(walletAddress);

  if (!walletAddress) {
    setOverlay(true, "Connect wallet and create a token to view performance.");
    tokenLogo.innerHTML = "";
    tokenName.textContent = "—";
    tokenDesc.textContent = "Connect your wallet and create a token to see details.";
    tokenTicker.textContent = "—";
    tokenPresale.textContent = "—";
    tokenFee.textContent = "—";
    tokenEstTokens.textContent = "—";
    kpiCA.textContent = "—";
    kpiDevWallet.textContent = "—";
    setLink(linkTwitter, "");
    setLink(linkTelegram, "");
    setLink(linkDiscord, "");
    holdingsLine.textContent = "Holdings: —";
    sellEqHint.textContent = "Connect wallet to use sell controls.";
    autoSellHint.textContent = "—";
    if (chart) { chart.data.labels = []; chart.data.datasets[0].data = []; chart.update(); }
    return;
  }

  if (!token) {
    setOverlay(true, "Create a token to view performance.");
    tokenLogo.innerHTML = "";
    tokenName.textContent = "—";
    tokenDesc.textContent = "Create a token to see details.";
    tokenTicker.textContent = "—";
    tokenPresale.textContent = "—";
    tokenFee.textContent = "—";
    tokenEstTokens.textContent = "—";
    kpiCA.textContent = "—";
    kpiDevWallet.textContent = shortAddr(walletAddress);
    setLink(linkTwitter, "");
    setLink(linkTelegram, "");
    setLink(linkDiscord, "");
    holdingsLine.textContent = "Holdings: —";
    sellEqHint.textContent = "Create a token to use sell controls.";
    autoSellHint.textContent = "—";
    if (chart) { chart.data.labels = []; chart.data.datasets[0].data = []; chart.update(); }
    return;
  }

  setOverlay(true, "No performance data yet.");
  tokenName.textContent = token.name;
  tokenDesc.textContent = token.description;
  tokenTicker.textContent = token.ticker;
  tokenPresale.textContent = fmtUSD(token.presaleUSD);
  tokenFee.textContent = fmtUSD(token.feeUSD);
  tokenEstTokens.textContent = fmtInt(token.estPresaleTokens || 0);

  if (token.logoDataUrl) tokenLogo.innerHTML = `<img alt="logo" src="${token.logoDataUrl}">`;
  else tokenLogo.innerHTML = "";

  kpiCA.textContent = token.ca || "—";
  kpiDevWallet.textContent = token.devWallet ? shortAddr(token.devWallet) : "—";

  setLink(linkTwitter, token.socials?.twitter || "");
  setLink(linkTelegram, token.socials?.telegram || "");
  setLink(linkDiscord, token.socials?.discord || "");

  updateSellHints();

  if (token.autoSell && token.autoSell.targetUSD >= 0) {
    const t = token.autoSell.targetUSD ? fmtUSD(token.autoSell.targetUSD) : "—";
    autoSellHint.textContent = `Auto Sell: target ${t} • sell ${token.autoSell.sellPct}%`;
    profitTarget.value = token.autoSell.targetUSD || "";
    autoPct.value = String(token.autoSell.sellPct || 10);
  } else {
    autoSellHint.textContent = "Auto Sell not enabled";
  }

  if (chart) { chart.data.labels = []; chart.data.datasets[0].data = []; chart.update(); }
}

// ======= Connect button behavior =======
connectBtn.addEventListener("click", async () => {
  if (!walletAddress) await connectWallet();
  else await disconnectWallet();
});

// ======= Init =======
function boot() {
  setHeroFor("create");
  setWalletUI({ connected: false });

  updateFeeUI(presale, feeValue, totalValue);
  updateFeeUI(m_presale, m_feeValue, m_totalValue);
  updateTokenEq(presale, tokenEqBuy);
  updateTokenEq(m_presale, m_tokenEqBuy);

  initChart();
  hydrateMyTokens();

  const provider = getPhantomProvider();
  if (provider) {
    provider.on("disconnect", () => {
      walletAddress = null;
      walletPublicKey = null;
      solBalance = null;
      setWalletUI({ connected: false });
      hydrateMyTokens();
    });

    provider
      .connect({ onlyIfTrusted: true })
      .then(async (res) => {
        walletPublicKey = res.publicKey;
        walletAddress = walletPublicKey.toString();
        setWalletUI({ connected: true });
        try {
          solBalance = await fetchSolBalance(walletAddress, "devnet");
        } catch {
          solBalance = null;
        }
        setWalletUI({ connected: true });
        hydrateMyTokens();
      })
      .catch(() => {});
  }
}
boot();
