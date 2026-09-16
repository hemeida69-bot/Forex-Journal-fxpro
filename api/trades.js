const { notionFetch } = require("../lib/notion");
const { pageToTrade, tradeToProperties } = require("../lib/trades");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const accountId = req.query.accountId;
      const includeUnassigned = req.query.includeUnassigned === "1";
      const body = { sorts: [{ property: "Date", direction: "descending" }], page_size: 100 };
      if (accountId) {
        body.filter = includeUnassigned
          ? { or: [
              { property: "Account", relation: { contains: accountId } },
              { property: "Account", relation: { is_empty: true } },
            ] }
          : { property: "Account", relation: { contains: accountId } };
      }
      const data = await notionFetch(`/databases/${process.env.NOTION_TRADES_DB}/query`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.status(200).json(data.results.map(pageToTrade));
    }
    if (req.method === "POST") {
      const t = req.body;
      const data = await notionFetch(`/pages`, {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_TRADES_DB },
          properties: tradeToProperties(t),
        }),
      });
      return res.status(200).json(pageToTrade(data));
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
