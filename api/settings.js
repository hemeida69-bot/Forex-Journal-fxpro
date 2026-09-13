const { notionFetch } = require("../lib/notion");

function textOf(prop) {
  return prop && prop.rich_text && prop.rich_text[0] ? prop.rich_text[0].plain_text : "";
}

function pageToSettings(page) {
  const p = page.properties;
  return {
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

function settingsToProperties(s) {
  return {
    "Starting Balance": { number: parseFloat(s.startingBalance) || 0 },
    Currency: { rich_text: [{ text: { content: s.currency || "$" } }] },
    "Contract Size": { number: parseFloat(s.contractSize) || 1 },
    Symbol: { rich_text: [{ text: { content: s.symbol || "" } }] },
    Broker: { rich_text: [{ text: { content: s.broker || "" } }] },
    "Daily Loss Limit": { number: parseFloat(s.dailyLossLimit) || 0 },
    "Max Overall Loss": { number: parseFloat(s.maxOverallLoss) || 0 },
    "Profit Target": { number: parseFloat(s.profitTarget) || 0 },
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const data = await notionFetch(`/pages/${process.env.NOTION_SETTINGS_PAGE_ID}`);
      return res.status(200).json(pageToSettings(data));
    }
    if (req.method === "PUT") {
      const s = req.body;
      const data = await notionFetch(`/pages/${process.env.NOTION_SETTINGS_PAGE_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: settingsToProperties(s) }),
      });
      return res.status(200).json(pageToSettings(data));
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
