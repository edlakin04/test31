/* MarketCaptureX Prototype
   - Real Phantom connect + SOL balance (devnet default)
   - UI-only token creation stored in localStorage per wallet
   - Tabs: Create Token / My Tokens
   - Modal gate for dashboard actions when not connected / no token
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

const modal = $("modal");
const modalBackdrop = $("modalBackdrop");
const closeModal = $("closeModal");
const modalConnectBtn = $("modalConnectBtn");
const modalCreateForm = $("modalCreateForm");
const m_presale = $("m_presale");
const m_feeValue = $("m_feeValue");
const m_totalValue = $("m_totalValue");

// dashboard buttons
const btnBuy = $("btnBuy");
const btnSell = $("btnSell");
const btnBuyback = $("btnBuyback");

// dashboard fields
const tokenBadge = $("tokenBadge");
const tokenLogo = $("tokenLogo");
const tokenName = $("tokenName");
const tokenDesc = $("tokenDesc");
const tokenTicker = $("tokenTicker");
const tokenPresale = $("tokenPresale");
const tokenFee = $("tokenFee");

const kpiProfit = $("kpiProfit");
const kpiSells = $("kpiSells");
const kpiBuybacks = $("kpiBuybacks");

$("year").textContent = new Date().getFullYear();

// ======= State =======
let walletPublicKey = null;
let walletAddress = null;
let solBalance = null;

const SERVICE_FEE_RATE = 0.05;
const SUPPLY = 1_000_000_000;

const STORAGE_KEY = "mcx_tokens_v1";

// ======= Helpers =======
function fmtUSD(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
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

// ======= Phantom Connect =======
function getPhantomProvider() {
  if (window?.solana?.isPhantom) return window.solana;
  return null;
}

async function fetchSolBalance(address, cluster = "devnet") {
  // devnet default so it always returns something for demos.
  // Change to "mainnet-beta" if you want mainnet.
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
    return;
  }

  walletDot.classList.add("connected");
  walletLine.textContent = shortAddr(walletAddress);
  walletSub.textContent =
    solBalance == null ? "Fetching balance…" : `${solBalance.toFixed(4)} SOL`;
  connectBtnText.textContent = "Connected";
}

async function connectWallet() {
  const provider = getPhantomProvider();
  if (!provider) {
    alert("Phantom wallet not found. Install Phantom then refresh.");
    return;
  }

  try {
    const res = await provider.connect();
    walletPublicKey = res.publicKey;
    walletAddress = walletPublicKey.toString();

    setWalletUI({ connected: true });

    try {
      solBalance = await fetchSolBalance(walletAddress, "devnet");
    } catch (e) {
      solBalance = null;
    }

    setWalletUI({ connected: true });
    hydrateDashboard();
  } catch (err) {
    // user rejected connect
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
  hydrateDashboard();
}

// ======= Tabs / Pages =======
function setTab(which) {
  const isCreate = which === "create";
  tabCreate.classList.toggle("active", isCreate);
  tabMy.classList.toggle("active", !isCreate);
  pageCreate.classList.toggle("active", isCreate);
  pageMy.classList.toggle("active", !isCreate);

  // Change hero wording depending on page, like you asked
  if (isCreate) {
    heroTitle.innerHTML =
      `Launch a token with a <span class="grad grad-purple">professional</span> setup — fast.`;
    heroSub.innerHTML =
      `MarketCaptureX is a clean presale + token creation interface. Define your coin, upload a logo, set a fixed supply, and choose your presale allocation. <span class="muted">Designed to look like something a real team would ship.</span>`;
  } else {
    heroTitle.innerHTML =
      `Manage your token like a <span class="grad grad-blue">real</span> product dashboard.`;
    heroSub.innerHTML =
      `This view is built for developer handoff: profits, sell pressure, buybacks, and token metadata in one place. <span class="muted">Actions are gated unless you’ve connected and created a coin.</span>`;
  }
}

tabCreate.addEventListener("click", () => setTab("create"));
tabMy.addEventListener("click", () => setTab("my"));

// ======= Fee UI updates =======
function updateFeeUI(inputEl, feeEl, totalEl) {
  const v = Number(inputEl.value || 0);
  const { fee, total } = computeFee(v);
  feeEl.textContent = fmtUSD(fee);
  totalEl.textContent = fmtUSD(total);
}

presale.addEventListener("input", () => updateFeeUI(presale, feeValue, totalValue));
m_presale.addEventListener("input", () => updateFeeUI(m_presale, m_feeValue, m_totalValue));

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

// ======= Create coin (prototype) =======
function requireWalletOrShowModal() {
  if (!walletAddress) {
    showModal();
    return false;
  }
  return true;
}

function handleCreate({ fromModal = false }) {
  if (!requireWalletOrShowModal()) return;

  const name = (fromModal ? $("m_coinName") : $("coinName")).value.trim();
  const ticker = safeUpper((fromModal ? $("m_ticker") : $("ticker")).value);
  const description = (fromModal ? $("m_description") : $("description")).value.trim();
  const presaleUSD = Number((fromModal ? $("m_presale") : $("presale")).value || 0);

  if (!name || !ticker || !description || presaleUSD <= 0) {
    alert("Please fill out all fields (and enter a presale amount).");
    return;
  }

  // Logo: only from main form (modal doesn't include upload to keep it clean)
  let logoDataUrl = null;
  if (!fromModal) {
    const file = logoInput.files?.[0];
    if (file) {
      // If preview exists, reuse it
      const img = logoPreview.querySelector("img");
      if (img?.src) logoDataUrl = img.src;
    }
  }

  const { fee, total } = computeFee(presaleUSD);

  // Store token (prototype)
  const token = {
    name,
    ticker,
    description,
    supply: SUPPLY,
    presaleUSD,
    feeUSD: fee,
    totalUSD: total,
    logoDataUrl,
    createdAt: new Date().toISOString(),
  };

  setTokenForWallet(walletAddress, token);

  // Minimal success feedback
  const msg =
    `Coin created (prototype).\n\n` +
    `Presale: ${fmtUSD(presaleUSD)}\n` +
    `Service fee (5%): ${fmtUSD(fee)}\n` +
    `Total charged: ${fmtUSD(total)}\n\n` +
    `Note: This is UI-only storage (local) for demo.`;

  alert(msg);

  hydrateDashboard();
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
});

// ======= Modal =======
function showModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function hideModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}
modalBackdrop.addEventListener("click", hideModal);
closeModal.addEventListener("click", hideModal);

modalConnectBtn.addEventListener("click", async () => {
  await connectWallet();
});

// ======= Dashboard gating =======
function gateDashboardAction() {
  const token = getTokenForWallet(walletAddress);
  if (!walletAddress || !token) {
    showModal();
    return false;
  }
  return true;
}

[btnBuy, btnSell, btnBuyback].forEach((b) => {
  b.addEventListener("click", () => {
    if (!gateDashboardAction()) return;

    // Prototype action
    alert("Action clicked (prototype UI). Wire this to your program/backend.");
  });
});

// ======= Dashboard hydration =======
function hydrateDashboard() {
  const token = getTokenForWallet(walletAddress);

  if (!walletAddress) {
    tokenBadge.textContent = "Wallet not connected";
    tokenName.textContent = "—";
    tokenDesc.textContent = "Connect your wallet to see token data.";
    tokenTicker.textContent = "—";
    tokenPresale.textContent = "—";
    tokenFee.textContent = "—";
    tokenLogo.innerHTML = "";
    setKPIs({ profit: 0, sells: 0, buybacks: 0 });
    return;
  }

  if (!token) {
    tokenBadge.textContent = "No token yet";
    tokenName.textContent = "—";
    tokenDesc.textContent = "Create a token to populate this panel.";
    tokenTicker.textContent = "—";
    tokenPresale.textContent = "—";
    tokenFee.textContent = "—";
    tokenLogo.innerHTML = "";
    setKPIs({ profit: 0, sells: 0, buybacks: 0 });
    return;
  }

  tokenBadge.textContent = `${token.ticker} • Active`;
  tokenName.textContent = token.name;
  tokenDesc.textContent = token.description;
  tokenTicker.textContent = token.ticker;
  tokenPresale.textContent = fmtUSD(token.presaleUSD);
  tokenFee.textContent = fmtUSD(token.feeUSD);

  if (token.logoDataUrl) {
    tokenLogo.innerHTML = `<img alt="logo" src="${token.logoDataUrl}">`;
  } else {
    tokenLogo.innerHTML = "";
  }

  // Fake KPIs for dev-style feel (deterministic-ish)
  const seed = token.createdAt ? Date.parse(token.createdAt) : Date.now();
  const base = Math.max(200, Math.min(5000, Math.floor((seed % 7000) + 400)));
  setKPIs({
    profit: base * 3,
    sells: base * 1.2,
    buybacks: base * 0.8,
  });
  updateChartWithToken(token);
}

function setKPIs({ profit, sells, buybacks }) {
  kpiProfit.textContent = fmtUSD(profit);
  kpiSells.textContent = fmtUSD(sells);
  kpiBuybacks.textContent = fmtUSD(buybacks);
}

// ======= Chart =======
let chart = null;

function makeSeries(token) {
  // Creates a clean "dev dashboard" series
  const points = 14;
  const labels = [];
  const profits = [];
  const sells = [];
  const buybacks = [];

  const seed = token ? Date.parse(token.createdAt) : Date.now();
  let p = (seed % 900) + 240;
  let s = (seed % 500) + 160;
  let b = (seed % 300) + 90;

  for (let i = 0; i < points; i++) {
    labels.push(`W${i + 1}`);
    // gentle variations
    p = p + (Math.sin((i + 1) * 0.9) * 22) + 10;
    s = s + (Math.cos((i + 1) * 0.75) * 14) + 8;
    b = b + (Math.sin((i + 1) * 0.6) * 10) + 6;

    profits.push(Math.max(0, Math.round(p)));
    sells.push(Math.max(0, Math.round(s)));
    buybacks.push(Math.max(0, Math.round(b)));
  }

  return { labels, profits, sells, buybacks };
}

function initChart() {
  const ctx = document.getElementById("chart");
  if (!ctx) return;

  const empty = makeSeries(null);

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: empty.labels,
      datasets: [
        {
          label: "Profits",
          data: empty.profits,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Sells",
          data: empty.sells,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Buybacks",
          data: empty.buybacks,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "rgba(255,255,255,0.72)",
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
          },
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "rgba(255,255,255,0.55)" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "rgba(255,255,255,0.55)" },
        },
      },
    },
  });
}

function updateChartWithToken(token) {
  if (!chart) return;
  const s = makeSeries(token);
  chart.data.labels = s.labels;
  chart.data.datasets[0].data = s.profits;
  chart.data.datasets[1].data = s.sells;
  chart.data.datasets[2].data = s.buybacks;
  chart.update();
}

// ======= Connect button behavior =======
connectBtn.addEventListener("click", async () => {
  if (!walletAddress) {
    await connectWallet();
  } else {
    // for prototype: allow disconnect on second click
    await disconnectWallet();
  }
});

// ======= Init =======
function boot() {
  setWalletUI({ connected: false });
  updateFeeUI(presale, feeValue, totalValue);
  updateFeeUI(m_presale, m_feeValue, m_totalValue);
  initChart();
  hydrateDashboard();

  // If Phantom is already connected (auto-restore)
  const provider = getPhantomProvider();
  if (provider) {
    provider.on("connect", () => {});
    provider.on("disconnect", () => {
      walletAddress = null;
      walletPublicKey = null;
      solBalance = null;
      setWalletUI({ connected: false });
      hydrateDashboard();
    });

    // attempt silent connect if trusted
    provider.connect({ onlyIfTrusted: true }).then(async (res) => {
      walletPublicKey = res.publicKey;
      walletAddress = walletPublicKey.toString();
      setWalletUI({ connected: true });
      try {
        solBalance = await fetchSolBalance(walletAddress, "devnet");
      } catch {
        solBalance = null;
      }
      setWalletUI({ connected: true });
      hydrateDashboard();
    }).catch(() => {});
  }
}
boot();
