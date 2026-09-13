function textOf(prop) {
  return prop && prop.rich_text && prop.rich_text[0] ? prop.rich_text[0].plain_text : "";
}

function pageToTrade(page) {
  const p = page.properties;
  return {
    id: page.id,
    date: (p.Date && p.Date.date && p.Date.date.start) || "",
    symbol: textOf(p.Symbol),
    direction: (p.Direction && p.Direction.select && p.Direction.select.name) || "buy",
    entry: p.Entry && p.Entry.number != null ? p.Entry.number : "",
    exit: p.Exit && p.Exit.number != null ? p.Exit.number : "",
    lot: p.Lot && p.Lot.number != null ? p.Lot.number : "",
    sl: p.SL && p.SL.number != null ? p.SL.number : "",
    tp: p.TP && p.TP.number != null ? p.TP.number : "",
    pl: p.PL && p.PL.number != null ? p.PL.number : null,
    rMultiple: p["R Multiple"] && p["R Multiple"].number != null ? p["R Multiple"].number : null,
    emotion: (p.Emotion && p.Emotion.select && p.Emotion.select.name) || "calm",
    notes: textOf(p.Notes),
  };
}

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function tradeToProperties(t) {
  return {
    Name: { title: [{ text: { content: `${t.symbol || "Trade"} ${t.date || ""}`.trim() } }] },
    Date: t.date ? { date: { start: t.date } } : { date: null },
    Symbol: { rich_text: [{ text: { content: t.symbol || "" } }] },
    Direction: { select: { name: t.direction === "sell" ? "sell" : "buy" } },
    Entry: { number: num(t.entry) },
    Exit: { number: num(t.exit) },
    Lot: { number: num(t.lot) },
    SL: { number: num(t.sl) },
    TP: { number: num(t.tp) },
    PL: { number: t.pl == null ? null : t.pl },
    "R Multiple": { number: t.rMultiple == null ? null : t.rMultiple },
    Emotion: { select: { name: t.emotion || "calm" } },
    Notes: { rich_text: [{ text: { content: t.notes || "" } }] },
  };
}

module.exports = { pageToTrade, tradeToProperties };
