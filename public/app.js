const state = {
  loaded: false,
  saveError: false,
  trades: [],
  settings: null,
  tab: "dashboard",
  formOpen: false,
  editingTrade: null,
  expandedId: null,
  confirmDeleteId: null,
  calOffset: 0,
  calSelected: todayStr(),
  livePrice: null,
  priceError: false,
  autoCloseNotice: null,
};

const EMOTIONS = ["calm", "confident", "disciplined", "fomo", "anxious", "revenge", "greedy", "uncertain"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- helpers ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n, currency) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}${currency}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSigned(n, currency) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n > 0) return `+${fmtMoney(n, currency)}`;
  return fmtMoney(n, currency);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function calcPL(t, contractSize) {
  const entry = parseFloat(t.entry), exit = parseFloat(t.exit), lot = parseFloat(t.lot);
  if (isNaN(entry) || isNaN(exit) || isNaN(lot)) return null;
  const diff = t.direction === "buy" ? exit - entry : entry - exit;
  return diff * lot * contractSize;
}
function calcRisk(t, contractSize) {
  const entry = parseFloat(t.entry), sl = parseFloat(t.sl), lot = parseFloat(t.lot);
  if (isNaN(entry) || isNaN(sl) || isNaN(lot)) return null;
  return Math.abs(entry - sl) * lot * contractSize;
}
function enrich(trades, contractSize) {
  return trades
    .map((t) => {
      const hasExit = t.exit !== "" && t.exit !== null && t.exit !== undefined;
      const pl = hasExit ? calcPL(t, contractSize) : null;
      const risk = calcRisk(t, contractSize);
      const rMultiple = pl != null && risk ? pl / risk : null;
      return { ...t, pl, rMultiple };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// icons (minimal inline SVG)
const ICONS = {
  dashboard: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  list: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  calendar: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  settings: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 10.6a1.65 1.65 0 001-1.51V9a2 2 0 114 0v.09A1.65 1.65 0 0015 10.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019 13.4z"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#231A08" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chevronLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronDown: (open) => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="transform:${open ? "rotate(180deg)" : "none"};transition:transform .15s"><polyline points="6 9 12 15 18 9"/></svg>`,
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  alert: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
};

// ---------- API ----------
async function api(path, opts) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}
const getTrades = () => api("/trades");
const createTrade = (t) => api("/trades", { method: "POST", body: JSON.stringify(t) });
const updateTrade = (id, t) => api(`/trades/${id}`, { method: "PUT", body: JSON.stringify(t) });
const deleteTradeApi = (id) => api(`/trades/${id}`, { method: "DELETE" });
const getSettings = () => api("/settings");
const putSettings = (s) => api("/settings", { method: "PUT", body: JSON.stringify(s) });
const getPrice = (symbol) => api(`/price?symbol=${encodeURIComponent(symbol || "XAU")}`);

// ---------- init ----------
async function init() {
  try {
    const [trades, settings] = await Promise.all([getTrades(), getSettings()]);
    state.trades = trades;
    state.settings = settings;
  } catch (e) {
    state.settings = state.settings || { startingBalance: 10000, currency: "$", contractSize: 100, symbol: "XAUUSD", broker: "", dailyLossLimit: 500, maxOverallLoss: 1000, profitTarget: 500 };
    state.saveError = true;
  }
  state.loaded = true;
  render();
  refreshPrice();
  setInterval(refreshPrice, 60000); // keep price (and open-trade auto-close checks) fresh while the app is open
}

async function refreshPrice() {
  try {
    const base = (state.settings.symbol || "XAU").replace(/USD$/i, "") || "XAU";
    state.livePrice = await getPrice(base);
    state.priceError = false;
    await checkAutoClose();
  } catch (e) {
    state.priceError = true;
  }
  render();
}

function symbolsMatch(tradeSymbol, feedSymbol) {
  const norm = (x) => (x || "").toUpperCase().replace(/USD$/, "").trim();
  return norm(tradeSymbol) === norm(feedSymbol);
}

async function checkAutoClose() {
  if (!state.livePrice) return;
  const price = state.livePrice.price;
  const openTrades = state.trades.filter((t) => t.exit === "" || t.exit === null || t.exit === undefined);
  for (const t of openTrades) {
    if (!symbolsMatch(t.symbol, state.livePrice.symbol || state.settings.symbol)) continue;
    const sl = t.sl !== "" && t.sl != null ? parseFloat(t.sl) : null;
    const tp = t.tp !== "" && t.tp != null ? parseFloat(t.tp) : null;
    let closePrice = null;
    let reason = "";
    if (t.direction === "buy") {
      if (tp != null && price >= tp) { closePrice = tp; reason = "TP"; }
      else if (sl != null && price <= sl) { closePrice = sl; reason = "SL"; }
    } else {
      if (tp != null && price <= tp) { closePrice = tp; reason = "TP"; }
      else if (sl != null && price >= sl) { closePrice = sl; reason = "SL"; }
    }
    if (closePrice != null) {
      try {
        const updated = await updateTrade(t.id, { ...t, exit: closePrice });
        state.trades = state.trades.map((x) => (x.id === updated.id ? updated : x));
        state.autoCloseNotice = `${t.symbol} auto-closed at ${reason} (${closePrice})`;
      } catch (e) {
        // leave it open, will retry on next price refresh
      }
    }
  }
}

// ---------- render dispatch ----------
function render() {
  const root = document.getElementById("app");
  if (!state.loaded) {
    root.innerHTML = `<div style="min-height:70vh;display:flex;align-items:center;justify-content:center" class="muted">Loading...</div>`;
    return;
  }
  if (state.formOpen) {
    root.innerHTML = renderTradeForm();
    document.getElementById("bottomnav")?.remove();
    document.getElementById("fab")?.remove();
    attachFormHandlers();
    return;
  }

  const enriched = enrich(state.trades, state.settings.contractSize);
  const closed = enriched.filter((t) => t.pl != null);
  const totalPL = closed.reduce((s, t) => s + t.pl, 0);
  const balance = state.settings.startingBalance + totalPL;
  const todayPL = closed.filter((t) => t.date === todayStr()).reduce((s, t) => s + t.pl, 0);

  let content = "";
  if (state.tab === "dashboard") content = renderDashboard(enriched, closed, totalPL, balance, todayPL);
  else if (state.tab === "trades") content = renderTrades(enriched);
  else if (state.tab === "calendar") content = renderCalendar(closed);
  else if (state.tab === "targets") content = renderTargets();

  root.innerHTML = `
    ${state.saveError ? `<div class="toast">Couldn't reach the server — check your connection</div>` : ""}
    ${state.autoCloseNotice ? `<div class="toast" style="background:#EAF6EE;color:var(--profit);border-bottom:1px solid #CDEAD8">${esc(state.autoCloseNotice)}</div>` : ""}
    ${renderHeader(balance, todayPL)}
    ${content}
  `;

  if (state.autoCloseNotice) {
    state.autoCloseNotice = null;
    setTimeout(() => render(), 4000);
  }

  renderNav();
  attachMainHandlers(enriched);
}

function renderHeader(balance, todayPL) {
  const s = state.settings;
  const c = todayPL > 0 ? "var(--profit)" : todayPL < 0 ? "var(--loss)" : "var(--text)";
  let priceLine;
  if (state.livePrice) {
    priceLine = `<span class="mono" style="font-size:13px;color:var(--text)">${fmtMoney(state.livePrice.price, s.currency)}</span>`;
  } else if (state.priceError) {
    priceLine = `<span class="muted" style="font-size:12px">price unavailable</span>`;
  } else {
    priceLine = `<span class="muted" style="font-size:12px">loading price…</span>`;
  }
  return `
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:7px">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--gold-fill);display:inline-block"></span>
          <span class="muted" style="font-size:13px">${esc(s.symbol)} · ${esc(s.broker)}</span>
        </div>
        <button id="refresh-price" style="background:none;border:none;padding:2px;display:flex;align-items:center;gap:6px;color:var(--text-muted)">
          ${priceLine}
          <span style="font-size:14px">↻</span>
        </button>
      </div>
      <p class="muted" style="font-size:12px;margin:0 0 4px">Account balance</p>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px">
        <p class="mono" style="font-size:30px;font-weight:600;margin:0">${fmtMoney(balance, s.currency)}</p>
        <span class="mono" style="font-size:12.5px;color:var(--text-muted);background:var(--panel-alt);border:0.5px solid var(--border);border-radius:20px;padding:5px 12px">
          Today <span style="color:${c}">${fmtSigned(todayPL, s.currency)}</span>
        </span>
      </div>
      <div style="border-bottom:0.5px solid var(--border);margin-top:16px"></div>
    </div>
  `;
}

function renderNav() {
  const app = document.getElementById("app");
  const items = [
    { key: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { key: "trades", label: "Trades", icon: ICONS.list },
    { key: "calendar", label: "Calendar", icon: ICONS.calendar },
    { key: "targets", label: "Targets", icon: ICONS.settings },
  ];
  const nav = document.createElement("div");
  nav.id = "bottomnav";
  nav.innerHTML = `<div id="bottomnav-inner">${items.map((it) => `
    <button data-tab="${it.key}" class="${state.tab === it.key ? "active" : ""}">
      ${it.icon}<span>${it.label}</span>
    </button>
  `).join("")}</div>`;
  document.body.appendChild(nav);
  nav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => { state.tab = btn.dataset.tab; state.expandedId = null; render(); });
  });

  const fab = document.createElement("button");
  fab.id = "fab";
  fab.innerHTML = ICONS.plus;
  fab.addEventListener("click", () => { state.editingTrade = null; state.formOpen = true; render(); });
  document.body.appendChild(fab);
}

// ---------- Dashboard ----------
function addWorkingDays(startDate, days) {
  const d = new Date(startDate);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function renderDashboard(enriched, closed, totalPL, balance, todayPL) {
  const s = state.settings;
  let running = s.startingBalance, peak = running;
  const sorted = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date));
  const equityPoints = sorted.map((t) => { running += t.pl; if (running > peak) peak = running; return running; });

  // pace toward profit target, based on actual trading days so far
  const dailyTotals = {};
  closed.forEach((t) => { if (t.date) dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.pl; });
  const tradingDays = Object.keys(dailyTotals);
  const avgDailyPL = tradingDays.length ? tradingDays.reduce((a, d) => a + dailyTotals[d], 0) / tradingDays.length : null;
  const remaining = Math.max(0, s.profitTarget - totalPL);
  const workingDaysNeeded = avgDailyPL && avgDailyPL > 0 ? Math.ceil(remaining / avgDailyPL) : null;
  const expectedDate = workingDaysNeeded != null ? addWorkingDays(new Date(), workingDaysNeeded) : null;
  const suggestedDailyTarget = remaining / 20; // benchmark: reach it within ~20 trading days (~1 month)

  const drawdown = Math.max(0, peak - balance);
  const dailyLossUsed = Math.max(0, -todayPL);
  const dailyBreached = s.dailyLossLimit > 0 && dailyLossUsed >= s.dailyLossLimit;
  const maxLossBreached = s.maxOverallLoss > 0 && drawdown >= s.maxOverallLoss;
  const profitReached = s.profitTarget > 0 && totalPL >= s.profitTarget;

  const wins = closed.filter((t) => t.pl > 0);
  const losses = closed.filter((t) => t.pl < 0);
  const winRate = closed.length ? Math.round((wins.length / closed.length) * 100) + "%" : "—";
  const avgProfit = wins.length ? fmtMoney(wins.reduce((a, t) => a + t.pl, 0) / wins.length, s.currency) : "—";
  const avgLoss = losses.length ? fmtMoney(losses.reduce((a, t) => a + t.pl, 0) / losses.length, s.currency) : "—";
  const totalLots = closed.reduce((a, t) => a + (parseFloat(t.lot) || 0), 0);
  const lossSum = Math.abs(losses.reduce((a, t) => a + t.pl, 0));
  const winSum = wins.reduce((a, t) => a + t.pl, 0);
  const profitFactor = lossSum > 0 ? (winSum / lossSum).toFixed(2) : winSum > 0 ? "∞" : "0.00";
  const rValues = closed.filter((t) => t.rMultiple != null);
  const avgRRR = rValues.length ? (rValues.reduce((a, t) => a + t.rMultiple, 0) / rValues.length).toFixed(2) : "—";
  const expectancy = closed.length ? fmtMoney(totalPL / closed.length, s.currency) : "—";

  function objRow(label, detail, ratio, breached) {
    const pct = Math.max(0, Math.min(100, ratio * 100));
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div>
            <p style="font-size:14px;margin:0 0 2px">${label}</p>
            <p class="mono muted" style="font-size:12px;margin:0">${detail}</p>
          </div>
          <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${breached ? "rgba(193,85,74,0.15)" : "rgba(78,159,110,0.15)"};color:${breached ? "var(--loss)" : "var(--profit)"}">
            ${breached ? ICONS.alert : ICONS.check}
          </div>
        </div>
        <div style="height:4px;background:var(--panel-alt);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--gold-fill);border-radius:2px"></div>
        </div>
      </div>
    `;
  }

  function statCell(label, value, color) {
    return `<div><p class="mono" style="font-size:17px;margin:0 0 3px;font-weight:500;color:${color || "var(--text)"}">${value}</p><p class="muted" style="font-size:11.5px;margin:0">${label}</p></div>`;
  }

  const w = 280, h = 100;
  let sparkline = "";
  if (equityPoints.length > 1) {
    const targetBalance = s.startingBalance + s.profitTarget;
    const allValues = [...equityPoints, targetBalance];
    const min = Math.min(...allValues), max = Math.max(...allValues);
    const range = max - min || 1;
    const pts = equityPoints.map((v, i) => {
      const x = (i / (equityPoints.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");
    const targetY = h - ((targetBalance - min) / range) * h;
    sparkline = `
      <svg viewBox="0 0 ${w} ${h + 14}" style="width:100%;height:150px" preserveAspectRatio="none">
        <line x1="0" y1="${targetY}" x2="${w}" y2="${targetY}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="${w}" y="${targetY - 4}" fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)" text-anchor="end">target</text>
        <polyline points="${pts}" fill="none" stroke="var(--gold-fill)" stroke-width="2"/>
      </svg>
    `;
  } else {
    sparkline = `<p class="muted" style="font-size:13px;margin:0">Not enough closed trades yet.</p>`;
  }

  const openTrades = state.trades.filter((t) => t.exit === "" || t.exit === null || t.exit === undefined);
  let openPanel = "";
  if (openTrades.length > 0) {
    openPanel = `
    <div class="panel">
      <p class="muted" style="font-size:13px;margin:0 0 14px;font-weight:500">Open positions</p>
      ${openTrades.map((t) => {
        const livePriceMatches = state.livePrice && symbolsMatch(t.symbol, state.livePrice.symbol || s.symbol);
        const unrealizedPL = livePriceMatches ? calcPL({ ...t, exit: state.livePrice.price }, s.contractSize) : null;
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:0.5px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:${t.direction === "buy" ? "var(--profit)" : "var(--loss)"}">${t.direction === "buy" ? ICONS.up : ICONS.down}</span>
              <div>
                <p style="font-size:13px;margin:0">${esc(t.symbol)} <span class="muted" style="font-size:11px">@ ${esc(t.entry)}</span></p>
                <p class="muted" style="font-size:11px;margin:0">${t.sl ? `SL ${esc(t.sl)}` : "no SL"} · ${t.tp ? `TP ${esc(t.tp)}` : "no TP"}</p>
              </div>
            </div>
            <span class="mono" style="font-size:13px;color:${unrealizedPL == null ? "var(--text-muted)" : unrealizedPL >= 0 ? "var(--profit)" : "var(--loss)"}">
              ${unrealizedPL == null ? "—" : fmtSigned(unrealizedPL, s.currency)}
            </span>
          </div>
        `;
      }).join("")}
      <p class="muted" style="font-size:11px;margin:10px 0 0">Auto-closes at SL/TP while this app is open, checked about once a minute.</p>
    </div>`;
  }

  return `
    ${openPanel}
    <div class="panel">
      <p class="muted" style="font-size:13px;margin:0 0 14px;font-weight:500">Objectives</p>
      ${objRow("Daily loss limit", `Today: ${fmtMoney(todayPL, s.currency)} / limit -${s.dailyLossLimit.toLocaleString()}.00`, s.dailyLossLimit > 0 ? dailyLossUsed / s.dailyLossLimit : 0, dailyBreached)}
      ${objRow("Max loss", `Drawdown: -${drawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / limit -${s.maxOverallLoss.toLocaleString()}.00`, s.maxOverallLoss > 0 ? drawdown / s.maxOverallLoss : 0, maxLossBreached)}
      ${objRow("Profit target", `${fmtMoney(Math.max(totalPL, 0), s.currency)} / ${fmtMoney(s.profitTarget, s.currency)}`, s.profitTarget > 0 ? Math.max(totalPL, 0) / s.profitTarget : 0, !profitReached)}
    </div>
    <div class="panel">
      <p class="muted" style="font-size:13px;margin:0 0 14px;font-weight:500">Statistics</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;row-gap:18px;column-gap:8px">
        ${statCell("Win rate", winRate)}
        ${statCell("Avg profit", avgProfit, wins.length ? "var(--profit)" : "var(--text)")}
        ${statCell("Avg loss", avgLoss, losses.length ? "var(--loss)" : "var(--text)")}
        ${statCell("Trades", closed.length)}
        ${statCell("Lots", totalLots.toFixed(2))}
        ${statCell("Profit factor", profitFactor)}
        ${statCell("Avg RRR", avgRRR)}
        ${statCell("Expectancy", expectancy)}
        ${statCell("Total P&L", fmtMoney(totalPL, s.currency), totalPL >= 0 ? "var(--profit)" : "var(--loss)")}
      </div>
    </div>
    <div class="panel">
      <p class="muted" style="font-size:13px;margin:0 0 14px;font-weight:500">Equity curve</p>
      ${sparkline}
    </div>
    <div class="panel" style="margin-bottom:0">
      <p class="muted" style="font-size:13px;margin:0 0 14px;font-weight:500">Path to profit target</p>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)">
        <span style="font-size:13px">Remaining to target</span>
        <span class="mono" style="font-size:13px">${fmtMoney(remaining, s.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)">
        <span style="font-size:13px">Your avg pace</span>
        <span class="mono" style="font-size:13px;color:${avgDailyPL == null ? "var(--text)" : avgDailyPL >= 0 ? "var(--profit)" : "var(--loss)"}">${avgDailyPL == null ? "Not enough data yet" : `${fmtMoney(avgDailyPL, s.currency)}/day`}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)">
        <span style="font-size:13px">At this pace</span>
        <span class="mono" style="font-size:13px">${workingDaysNeeded == null ? "—" : `${workingDaysNeeded} trading day${workingDaysNeeded === 1 ? "" : "s"}`}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0">
        <span style="font-size:13px">Expected around</span>
        <span class="mono" style="font-size:13px;color:var(--gold)">${expectedDate ? fmtDate(expectedDate) : "—"}</span>
      </div>
      <p class="muted" style="font-size:11.5px;margin:12px 0 0;line-height:1.5">To hit it within about a month (20 trading days) instead, aim for roughly <span class="mono" style="color:var(--text)">${fmtMoney(suggestedDailyTarget, s.currency)}/day</span>.</p>
    </div>
  `;
}

// ---------- Trades ----------
function renderTrades(enriched) {
  if (enriched.length === 0) {
    return `<h2 class="h-title">Trades</h2><p class="muted" style="font-size:13px;text-align:center;padding:24px 0">No trades yet.</p>`;
  }
  return `
    <h2 class="h-title">Trades</h2>
    ${enriched.map((t) => {
      const open = state.expandedId === t.id;
      return `
        <div style="border-bottom:0.5px solid var(--border)">
          <div class="trade-row" data-expand="${t.id}">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:${t.direction === "buy" ? "var(--profit)" : "var(--loss)"}">${t.direction === "buy" ? ICONS.up : ICONS.down}</span>
              <div>
                <p style="font-size:13px;margin:0">${esc(t.symbol)}</p>
                <p class="muted" style="font-size:11px;margin:0">${fmtDate(t.date)}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="mono" style="font-size:13px;color:${t.pl == null ? "var(--text-muted)" : t.pl >= 0 ? "var(--profit)" : "var(--loss)"}">${t.pl == null ? "Open" : fmtMoney(t.pl, state.settings.currency)}</span>
              ${ICONS.chevronDown(open)}
            </div>
          </div>
          ${open ? `
            <div class="muted" style="padding:0 0 14px;font-size:12.5px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                <span>Entry: <span class="mono" style="color:var(--text)">${esc(t.entry)}</span></span>
                <span>Exit: <span class="mono" style="color:var(--text)">${t.exit || "—"}</span></span>
                <span>Lot: <span class="mono" style="color:var(--text)">${esc(t.lot)}</span></span>
                <span>R: <span class="mono" style="color:var(--text)">${t.rMultiple != null ? t.rMultiple.toFixed(2) : "—"}</span></span>
                <span>Psychology: <span style="color:var(--text)">${esc(t.emotion)}</span></span>
              </div>
              ${t.notes ? `<p style="margin:0 0 10px">${esc(t.notes)}</p>` : ""}
              <div style="display:flex;gap:8px">
                <button class="btn-outline" data-edit="${t.id}">Edit</button>
                <button class="btn-danger" data-delete="${t.id}">Delete</button>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }).join("")}
  `;
}

// ---------- Calendar ----------
function renderCalendar(closed) {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + state.calOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const dailyPL = {};
  closed.forEach((t) => { if (t.date) dailyPL[t.date] = (dailyPL[t.date] || 0) + t.pl; });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = todayStr();
  const selectedTrades = closed.filter((t) => t.date === state.calSelected);
  const selectedPL = selectedTrades.reduce((s, t) => s + t.pl, 0);

  return `
    <h2 class="h-title">Calendar</h2>
    <div class="panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="icon-btn" data-cal="-1">${ICONS.chevronLeft}</button>
        <p style="font-size:15px;font-weight:500;margin:0">${monthLabel}</p>
        <button class="icon-btn" data-cal="1">${ICONS.chevronRight}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
        ${WEEKDAYS.map((w) => `<p class="muted" style="font-size:11px;text-align:center;margin:0 0 6px">${w}</p>`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${cells.map((d) => {
          if (d === null) return `<div></div>`;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const pl = dailyPL[dateStr];
          const isToday = dateStr === todayISO;
          const isSelected = dateStr === state.calSelected;
          return `
            <button class="day-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-day="${dateStr}">
              <span style="font-size:12.5px">${d}</span>
              ${pl != null ? `<span class="mono" style="font-size:8.5px;color:${pl >= 0 ? "var(--profit)" : "var(--loss)"};margin-top:1px">${pl >= 0 ? "+" : ""}${Math.round(pl)}</span>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    </div>
    <div class="panel">
      <p class="muted" style="font-size:13px;margin:0 0 8px">${fmtDate(state.calSelected)}</p>
      <p class="mono" style="font-size:22px;margin:0 0 14px;color:${selectedTrades.length ? (selectedPL >= 0 ? "var(--profit)" : "var(--loss)") : "var(--text)"}">
        ${selectedTrades.length ? fmtSigned(selectedPL, state.settings.currency) : "No trades"}
      </p>
      ${selectedTrades.map((t) => `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-top:0.5px solid var(--border);font-size:12.5px">
          <span>${esc(t.symbol)} · ${t.direction}</span>
          <span class="mono" style="color:${t.pl >= 0 ? "var(--profit)" : "var(--loss)"}">${fmtMoney(t.pl, state.settings.currency)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ---------- Targets ----------
function renderTargets() {
  const s = state.settings;
  return `
    <h2 class="h-title">Targets & account</h2>
    <div class="panel">
      <div class="field"><label>Starting balance ($)</label><input class="mono" id="f-startingBalance" value="${s.startingBalance}" inputmode="decimal" /></div>
      <div class="field"><label>Daily loss limit ($)</label><input class="mono" id="f-dailyLossLimit" value="${s.dailyLossLimit}" inputmode="decimal" /></div>
      <div class="field"><label>Max overall loss ($)</label><input class="mono" id="f-maxOverallLoss" value="${s.maxOverallLoss}" inputmode="decimal" /></div>
      <div class="field"><label>Profit target ($)</label><input class="mono" id="f-profitTarget" value="${s.profitTarget}" inputmode="decimal" /></div>
      <p class="muted" style="font-size:12px;margin:0 0 16px;line-height:1.5">These set the reference lines objectives are measured against — set them to whatever risk plan you're running on ${esc(s.broker) || "your broker"}.</p>
      <div style="border-top:0.5px solid var(--border);padding-top:14px;margin-bottom:14px">
        <div class="row">
          <div class="field"><label>Symbol</label><input id="f-symbol" value="${esc(s.symbol)}" /></div>
          <div class="field"><label>Broker</label><input id="f-broker" value="${esc(s.broker)}" /></div>
        </div>
        <div class="row">
          <div class="field"><label>Currency</label><input id="f-currency" value="${esc(s.currency)}" /></div>
          <div class="field"><label>Contract size per lot</label><input class="mono" id="f-contractSize" value="${s.contractSize}" inputmode="decimal" /></div>
        </div>
      </div>
      <button class="btn-primary" id="save-targets">Save targets</button>
    </div>
  `;
}

// ---------- Trade Form ----------
function renderTradeForm() {
  const t = state.editingTrade || { date: todayStr(), symbol: state.settings.symbol, direction: "buy", entry: "", exit: "", lot: "", sl: "", tp: "", emotion: "calm", notes: "" };
  return `
    <div style="padding:18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
        <button id="form-back" style="background:none;border:none;color:var(--text);padding:4px">${ICONS.chevronLeft}</button>
        <h2 class="h-title" style="margin:0">${state.editingTrade ? "Edit trade" : "New trade"}</h2>
      </div>
      <div class="row">
        <div class="field"><label>Date</label><input type="date" id="tf-date" value="${t.date}" /></div>
        <div class="field"><label>Symbol</label><input id="tf-symbol" value="${esc(t.symbol)}" /></div>
      </div>
      <div class="field">
        <label>Direction</label>
        <div class="row dir-toggle">
          <button type="button" data-dir="buy" class="${t.direction === "buy" ? "active" : ""}">Buy</button>
          <button type="button" data-dir="sell" class="${t.direction === "sell" ? "active" : ""}">Sell</button>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Entry price</label>
          <div style="display:flex;gap:6px">
            <input class="mono" id="tf-entry" value="${esc(t.entry)}" inputmode="decimal" />
            ${state.livePrice ? `<button type="button" id="use-live-price" class="btn-outline" style="flex:0 0 auto;padding:0 10px;white-space:nowrap">Use live</button>` : ""}
          </div>
        </div>
        <div class="field"><label>Exit price (optional)</label><input class="mono" id="tf-exit" value="${esc(t.exit)}" inputmode="decimal" /></div>
      </div>
      <div class="row">
        <div class="field"><label>Lot size</label><input class="mono" id="tf-lot" value="${esc(t.lot)}" inputmode="decimal" /></div>
        <div class="field"><label>Stop loss</label><input class="mono" id="tf-sl" value="${esc(t.sl)}" inputmode="decimal" /></div>
        <div class="field"><label>Take profit</label><input class="mono" id="tf-tp" value="${esc(t.tp)}" inputmode="decimal" /></div>
      </div>
      <div class="field">
        <label>Psychology</label>
        <select id="tf-emotion">${EMOTIONS.map((em) => `<option value="${em}" ${t.emotion === em ? "selected" : ""}>${em}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Notes</label><textarea id="tf-notes" rows="3">${esc(t.notes)}</textarea></div>
      <p id="tf-error" style="color:var(--loss);font-size:13px;display:none;margin-top:-6px;margin-bottom:12px"></p>
      <button class="btn-primary" id="tf-submit" data-direction="${t.direction}">Save trade</button>
    </div>
  `;
}

function attachFormHandlers() {
  let direction = (state.editingTrade || {}).direction || "buy";
  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => {
      direction = btn.dataset.dir;
      document.querySelectorAll("[data-dir]").forEach((b) => b.classList.toggle("active", b.dataset.dir === direction));
    });
  });
  document.getElementById("form-back").addEventListener("click", () => { state.formOpen = false; state.editingTrade = null; render(); });
  const useLiveBtn = document.getElementById("use-live-price");
  if (useLiveBtn) {
    useLiveBtn.addEventListener("click", () => {
      if (state.livePrice) document.getElementById("tf-entry").value = state.livePrice.price.toFixed(2);
    });
  }
  document.getElementById("tf-submit").addEventListener("click", async () => {
    const val = (id) => document.getElementById(id).value;
    const entry = val("tf-entry"), lot = val("tf-lot");
    if (!entry || !lot) {
      const err = document.getElementById("tf-error");
      err.textContent = "Enter at least the entry price and lot size";
      err.style.display = "block";
      return;
    }
    const formData = {
      date: val("tf-date"), symbol: val("tf-symbol"), direction,
      entry, exit: val("tf-exit"), lot, sl: val("tf-sl"), tp: val("tf-tp"),
      emotion: val("tf-emotion"), notes: val("tf-notes"),
    };
    const hasExit = formData.exit !== "";
    const pl = hasExit ? calcPL(formData, state.settings.contractSize) : null;
    const risk = calcRisk(formData, state.settings.contractSize);
    formData.pl = pl;
    formData.rMultiple = pl != null && risk ? pl / risk : null;

    try {
      if (state.editingTrade) {
        const updated = await updateTrade(state.editingTrade.id, formData);
        state.trades = state.trades.map((t) => (t.id === updated.id ? updated : t));
      } else {
        const created = await createTrade(formData);
        state.trades = [...state.trades, created];
      }
      state.saveError = false;
    } catch (e) {
      state.saveError = true;
    }
    state.formOpen = false;
    state.editingTrade = null;
    render();
  });
}

// ---------- main handlers ----------
function attachMainHandlers(enriched) {
  const priceBtn = document.getElementById("refresh-price");
  if (priceBtn) priceBtn.addEventListener("click", () => { state.livePrice = null; state.priceError = false; render(); refreshPrice(); });

  document.querySelectorAll("[data-expand]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.expand;
      state.expandedId = state.expandedId === id ? null : id;
      render();
    });
  });
  document.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      state.editingTrade = enriched.find((t) => t.id === el.dataset.edit);
      state.formOpen = true;
      render();
    });
  });
  document.querySelectorAll("[data-delete]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      state.confirmDeleteId = el.dataset.delete;
      renderDeleteModal();
    });
  });
  document.querySelectorAll("[data-cal]").forEach((el) => {
    el.addEventListener("click", () => { state.calOffset += parseInt(el.dataset.cal, 10); render(); });
  });
  document.querySelectorAll("[data-day]").forEach((el) => {
    el.addEventListener("click", () => { state.calSelected = el.dataset.day; render(); });
  });
  const saveBtn = document.getElementById("save-targets");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const val = (id) => document.getElementById(id).value;
      const newSettings = {
        startingBalance: parseFloat(val("f-startingBalance")) || 0,
        dailyLossLimit: parseFloat(val("f-dailyLossLimit")) || 0,
        maxOverallLoss: parseFloat(val("f-maxOverallLoss")) || 0,
        profitTarget: parseFloat(val("f-profitTarget")) || 0,
        symbol: val("f-symbol"),
        broker: val("f-broker"),
        currency: val("f-currency"),
        contractSize: parseFloat(val("f-contractSize")) || 1,
      };
      try {
        state.settings = await putSettings(newSettings);
        state.saveError = false;
      } catch (e) {
        state.saveError = true;
      }
      state.tab = "dashboard";
      render();
    });
  }
}

function renderDeleteModal() {
  const existing = document.getElementById("delete-modal");
  if (existing) existing.remove();
  const div = document.createElement("div");
  div.id = "delete-modal";
  div.className = "modal-backdrop";
  div.innerHTML = `
    <div class="modal-box">
      <p style="font-size:14px;margin:0 0 16px">Delete this trade? This can't be undone.</p>
      <div style="display:flex;gap:8px">
        <button class="btn-outline" id="cancel-delete">Cancel</button>
        <button class="btn-danger" id="confirm-delete" style="background:var(--loss);color:#fff;border:none">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  document.getElementById("cancel-delete").addEventListener("click", () => { state.confirmDeleteId = null; div.remove(); });
  document.getElementById("confirm-delete").addEventListener("click", async () => {
    try {
      await deleteTradeApi(state.confirmDeleteId);
      state.trades = state.trades.filter((t) => t.id !== state.confirmDeleteId);
      state.saveError = false;
    } catch (e) {
      state.saveError = true;
    }
    state.confirmDeleteId = null;
    state.expandedId = null;
    div.remove();
    render();
  });
}

init();
