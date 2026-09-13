const { notionFetch } = require("../../lib/notion");
const { pageToTrade, tradeToProperties } = require("../../lib/trades");

module.exports = async (req, res) => {
  const { id } = req.query;
  try {
    if (req.method === "PUT") {
      const t = req.body;
      const data = await notionFetch(`/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: tradeToProperties(t) }),
      });
      return res.status(200).json(pageToTrade(data));
    }
    if (req.method === "DELETE") {
      await notionFetch(`/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
