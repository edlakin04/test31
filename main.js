/* MarketCaptureX
   - Phantom connect + SOL balance
   - Token creation stored locally for UI flow
   - No pop-up notices/alerts; actions simply proceed/close as expected
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

// Dashboard
const chartOverlay = $("chartOverlay");
const tokenLogo = $("tokenLogo");
const tokenName = $("tokenName");
const tokenDesc = $("tokenDesc");
const tokenTicker = $("tokenTicker");
const tokenPresale = $("tokenPresale");
const tokenFee = $("tokenFee");
const walletSummary = $("walletSummary");

const kpiProfit = $("kpiProfit");
const kpiSells = $("kpiSells");
const kpiRemaining = $("kpiRemaining");

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
  walletSub.textContent =
    solBalance == null ? "Connected" : `${solBalance.toFixed(4)} SOL`;
  connectBtnText.textContent = "Connected";
  walletSummary.textContent = shortAddr(walletAddress);
}

async function connectWallet() {
  const provider = getPhantomProvider();
  if (!provider) return;

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
  } catch {
    // user rejected; do nothing
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

// ======= Tabs / Pages =======
function setTab(which) {
  const isCreate = which === "create";
  tabCreate.classList.toggle("active", isCreate);
  tabMy.classList.toggle("active", !isCreate);
  pageCreate.classList.toggle("active", isCreate);
  pageMy.classList.toggle("active", !isCreate);

  if (!isCreate) hydrateMyTokens();
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

// ======= Token creation =======
function canCreateToken() {
  if (!walletAddress) {
    showModal();
    return false;
  }
  return true;
}

function handleCreate({ fromModal = false }) {
  if (!canCreateToken()) return;

  const name = (fromModal ? $("m_coinName") : $("coinName")).value.trim();
  const ticker = safeUpper((fromModal ? $("m_ticker") : $("ticker")).value);
  const description = (fromModal ? $("m_description") : $("description")).value.trim();
  const presaleUSD = Number((fromModal ? $("m_presale") : $("presale")).value || 0);

  if (!name || !ticker || !description || presaleUSD <= 0) return;

  let logoDataUrl = null;
  if (!fromModal) {
    const img = logoPreview.querySelector("img");
    if (img?.src) logoDataUrl = img.src;
  }

  const { fee, total } = computeFee(presaleUSD);

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

  // silent success: update UI + route to My Tokens
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
});

// ======= Sell actions =======
function pulse(el) {
  el.style.transform = "translateY(-1px)";
  setTimeout(() => (el.style.transform = ""), 120);
}

function handleSellClick(btn) {
  const token = getTokenForWallet(walletAddress);
  if (!walletAddress || !token) {
    showModal();
    return;
  }

  // silently "do" the action: just a subtle button pulse
  pulse(btn);
}

document.querySelectorAll(".sell-chip").forEach((btn) => {
  btn.addEventListener("click", () => handleSellClick(btn));
});

// ======= Chart (empty until real data) =======
let chart = null;

function initChart() {
  const ctx = document.getElementById("chart");
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Performance",
          data: [],
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
        tooltip: { enabled: true },
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

// ======= My Tokens hydration =======
function setOverlay(show, text) {
  if (show) {
    chartOverlay.textContent = text;
    chartOverlay.classList.remove("hidden");
  } else {
    chartOverlay.classList.add("hidden");
  }
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
    kpiProfit.textContent = "—";
    kpiSells.textContent = "—";
    kpiRemaining.textContent = "—";
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      chart.update();
    }
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
    kpiProfit.textContent = "—";
    kpiSells.textContent = "—";
    kpiRemaining.textContent = "—";
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      chart.update();
    }
    return;
  }

  // Token exists, but no real performance data yet
  setOverlay(true, "No performance data yet.");
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

  kpiProfit.textContent = "—";
  kpiSells.textContent = "—";
  kpiRemaining.textContent = "—";

  if (chart) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
  }
}

// ======= Connect button behavior =======
connectBtn.addEventListener("click", async () => {
  if (!walletAddress) {
    await connectWallet();
  } else {
    await disconnectWallet();
  }
});

// ======= Init =======
function boot() {
  setWalletUI({ connected: false });
  updateFeeUI(presale, feeValue, totalValue);
  updateFeeUI(m_presale, m_feeValue, m_totalValue);
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
