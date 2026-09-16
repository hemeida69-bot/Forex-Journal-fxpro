const { notionFetch } = require("../lib/notion");
const { pageToAccount, accountToProperties } = require("../lib/accounts");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const data = await notionFetch(`/databases/${process.env.NOTION_ACCOUNTS_DB}/query`, {
        method: "POST",
        body: JSON.stringify({ sorts: [{ timestamp: "created_time", direction: "ascending" }], page_size: 100 }),
      });
      return res.status(200).json(data.results.map(pageToAccount));
    }
    if (req.method === "POST") {
      const a = req.body || {};
      const defaults = {
        name: a.name || "New Account",
        startingBalance: a.startingBalance || 10000,
        currency: a.currency || "$",
        contractSize: a.contractSize || 100,
        symbol: a.symbol || "XAUUSD",
        broker: a.broker || "",
        dailyLossLimit: a.dailyLossLimit || 500,
        maxOverallLoss: a.maxOverallLoss || 1000,
        profitTarget: a.profitTarget || 500,
      };
      const data = await notionFetch(`/pages`, {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_ACCOUNTS_DB },
          properties: accountToProperties(defaults),
        }),
      });
      return res.status(200).json(pageToAccount(data));
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
