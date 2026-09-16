function textOf(prop) {
  return prop && prop.rich_text && prop.rich_text[0] ? prop.rich_text[0].plain_text : "";
}

function pageToAccount(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: (p.Name && p.Name.title && p.Name.title[0] && p.Name.title[0].plain_text) || "Account",
    startingBalance: p["Starting Balance"] && p["Starting Balance"].number != null ? p["Starting Balance"].number : 10000,
    currency: textOf(p.Currency) || "$",
    contractSize: p["Contract Size"] && p["Contract Size"].number != null ? p["Contract Size"].number : 100,
    symbol: textOf(p.Symbol) || "XAUUSD",
    broker: textOf(p.Broker) || "",
    dailyLossLimit: p["Daily Loss Limit"] && p["Daily Loss Limit"].number != null ? p["Daily Loss Limit"].number : 500,
    maxOverallLoss: p["Max Overall Loss"] && p["Max Overall Loss"].number != null ? p["Max Overall Loss"].number : 1000,
    profitTarget: p["Profit Target"] && p["Profit Target"].number != null ? p["Profit Target"].number : 500,
  };
}

function accountToProperties(a) {
  return {
    Name: { title: [{ text: { content: a.name || "Account" } }] },
    "Starting Balance": { number: parseFloat(a.startingBalance) || 0 },
    Currency: { rich_text: [{ text: { content: a.currency || "$" } }] },
    "Contract Size": { number: parseFloat(a.contractSize) || 1 },
    Symbol: { rich_text: [{ text: { content: a.symbol || "" } }] },
    Broker: { rich_text: [{ text: { content: a.broker || "" } }] },
    "Daily Loss Limit": { number: parseFloat(a.dailyLossLimit) || 0 },
    "Max Overall Loss": { number: parseFloat(a.maxOverallLoss) || 0 },
    "Profit Target": { number: parseFloat(a.profitTarget) || 0 },
  };
}

module.exports = { pageToAccount, accountToProperties };
