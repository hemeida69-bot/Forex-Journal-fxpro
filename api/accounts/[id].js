const { notionFetch } = require("../../lib/notion");
const { pageToAccount, accountToProperties } = require("../../lib/accounts");

module.exports = async (req, res) => {
  const { id } = req.query;
  try {
    if (req.method === "PUT") {
      const a = req.body;
      const data = await notionFetch(`/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: accountToProperties(a) }),
      });
      return res.status(200).json(pageToAccount(data));
    }
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
