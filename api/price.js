module.exports = async (req, res) => {
  try {
    const symbol = (req.query.symbol || "XAU").toString().toUpperCase();
    const url = `https://www.alphavantage.co/query?function=GOLD_SILVER_SPOT&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data || data.price == null) {
      const msg = (data && (data.Note || data.Information || data["Error Message"])) || "Price unavailable";
      return res.status(502).json({ error: msg });
    }
    return res.status(200).json({
      symbol: data.nominal || symbol,
      price: parseFloat(data.price),
      timestamp: data.timestamp || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
