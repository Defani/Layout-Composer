// ---------------------------------------------------------------- data items
// Attribute tables and charts read the features of a GeoLibre layer, filter
// them, group them and add up a value (count, a numeric field, area or length).

// Features of a GeoLibre layer (GeoJSON features), or [].
function layerFeatures(id) {
  if (!id) return [];
  try {
    const f = S.app?.getLayerFeatures?.(id);
    if (Array.isArray(f)) return f;
    if (Array.isArray(f?.features)) return f.features;
  } catch (e) {
    console.warn("[Layout Composer] getLayerFeatures", e);
  }
  return [];
}
// Vector layers that can feed a table or chart.
function dataLayerOptions(emptyLabel = "Choose a layer…") {
  const opts = [["", emptyLabel]];
  for (const l of allProjectLayers()) if (!isDataRaster(l) && !isTileLayer(l)) opts.push([l.id, l.name || l.id]);
  return opts;
}
// Attribute names (and whether they are numeric) of a layer.
function layerFields(id) {
  const feats = layerFeatures(id).slice(0, 500);
  const seen = new Map();
  for (const f of feats) {
    for (const [k, v] of Object.entries(f?.properties || {})) {
      if (v == null || v === "") continue;
      const num = typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
      const cur = seen.get(k);
      seen.set(k, cur == null ? num : cur && num);
    }
  }
  return [...seen].map(([name, numeric]) => ({ name, numeric }));
}

// ---- geodesic area / length (WGS84 sphere, like turf)
const R_EARTH = 6378137;
function ringAreaM2(ring) {
  let a = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += ((x2 - x1) * Math.PI) / 180 * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((a * R_EARTH * R_EARTH) / 2);
}
function geomAreaM2(g) {
  if (!g) return 0;
  const poly = (rings) => (rings.length ? ringAreaM2(rings[0]) - rings.slice(1).reduce((s, r) => s + ringAreaM2(r), 0) : 0);
  if (g.type === "Polygon") return poly(g.coordinates);
  if (g.type === "MultiPolygon") return g.coordinates.reduce((s, p) => s + poly(p), 0);
  if (g.type === "GeometryCollection") return g.geometries.reduce((s, x) => s + geomAreaM2(x), 0);
  return 0;
}
function haversineM([x1, y1], [x2, y2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((y2 - y1) * r) / 2) ** 2 + Math.cos(y1 * r) * Math.cos(y2 * r) * Math.sin(((x2 - x1) * r) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}
function geomLengthM(g) {
  if (!g) return 0;
  const line = (c) => c.slice(1).reduce((s, p, i) => s + haversineM(c[i], p), 0);
  if (g.type === "LineString") return line(g.coordinates);
  if (g.type === "MultiLineString" || g.type === "Polygon") return g.coordinates.reduce((s, c) => s + line(c), 0);
  if (g.type === "MultiPolygon") return g.coordinates.reduce((s, p) => s + p.reduce((t, c) => t + line(c), 0), 0);
  return 0;
}

// ---- filtering and grouping
const FILTER_OPS = [["=", "equals"], ["!=", "is not"], [">", ">"], [">=", "≥"], ["<", "<"], ["<=", "≤"], ["contains", "contains"]];
function passFilter(f, flt) {
  if (!flt?.field) return true;
  const v = f?.properties?.[flt.field];
  const t = flt.value ?? "";
  const nv = Number(v);
  const nt = Number(t);
  const numeric = t !== "" && Number.isFinite(nt) && Number.isFinite(nv);
  switch (flt.op) {
    case "!=":
      return String(v ?? "") !== String(t);
    case ">":
      return numeric && nv > nt;
    case ">=":
      return numeric && nv >= nt;
    case "<":
      return numeric && nv < nt;
    case "<=":
      return numeric && nv <= nt;
    case "contains":
      return String(v ?? "").toLowerCase().includes(String(t).toLowerCase());
    default:
      return String(v ?? "") === String(t);
  }
}
// Value of one feature for a value mode.
function featureValue(f, mode, field) {
  if (mode === "area") return geomAreaM2(f.geometry) / 10000; // hectares
  if (mode === "areakm") return geomAreaM2(f.geometry) / 1e6;
  if (mode === "length") return geomLengthM(f.geometry) / 1000; // km
  if (mode === "sum" || mode === "mean") {
    const n = Number(f?.properties?.[field]);
    return Number.isFinite(n) ? n : 0;
  }
  return 1;
}
const VALUE_MODES = [
  ["count", "Number of features"],
  ["sum", "Sum of a field"],
  ["mean", "Average of a field"],
  ["area", "Area (ha)"],
  ["areakm", "Area (km²)"],
  ["length", "Length (km)"],
];
const VALUE_UNITS = { area: "ha", areakm: "km²", length: "km" };
// [{key, value, count}] grouped by `group` (or one row per feature when group is empty).
function aggregate(p) {
  const feats = layerFeatures(p.layer).filter((f) => passFilter(f, p.filter));
  const groups = new Map();
  for (const f of feats) {
    const key = p.group ? String(f?.properties?.[p.group] ?? "(empty)") : "All";
    const g = groups.get(key) || { key, value: 0, count: 0 };
    g.value += featureValue(f, p.valueMode, p.valueField);
    g.count += 1;
    groups.set(key, g);
  }
  let rows = [...groups.values()];
  if (p.valueMode === "mean") rows.forEach((r) => (r.value = r.count ? r.value / r.count : 0));
  if (p.sort === "value-desc") rows.sort((a, b) => b.value - a.value);
  else if (p.sort === "value-asc") rows.sort((a, b) => a.value - b.value);
  else if (p.sort === "label") rows.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  const top = Math.round(p.topN || 0);
  if (top > 0 && rows.length > top) {
    const rest = rows.slice(top);
    rows = rows.slice(0, top);
    rows.push({ key: p.otherLabel || "Other", value: rest.reduce((s, r) => s + r.value, 0), count: rest.reduce((s, r) => s + r.count, 0), other: true });
  }
  return { rows, total: rows.reduce((s, r) => s + r.value, 0), totalCount: rows.reduce((s, r) => s + r.count, 0), featureCount: feats.length };
}
function fmtData(v, p) {
  const d = Math.max(0, Math.min(6, Math.round(p.decimals ?? 2)));
  const s = Number(v).toLocaleString(p.locale || "en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return s;
}

// Colors of a layer's classes (from its GeoLibre symbology), keyed by attribute value.
function symbologyColors(layerId, field) {
  const m = mainMap();
  const out = new Map();
  if (!m || !layerId) return out;
  let style;
  try {
    style = m.getStyle();
  } catch {
    return out;
  }
  for (const l of styleLayersFor(style, layerId)) {
    const paint = l.paint || {};
    const expr = paint["fill-color"] ?? paint["circle-color"] ?? paint["line-color"] ?? paint["fill-extrusion-color"];
    if (!Array.isArray(expr) || expr[0] !== "match") continue;
    const input = expr[1];
    const getField = Array.isArray(input) && (input[0] === "get" || (input[0] === "to-string" && Array.isArray(input[1]) && input[1][0] === "get")) ? (input[0] === "get" ? input[1] : input[1][1]) : null;
    if (field && getField && getField !== field) continue;
    for (let i = 2; i < expr.length - 1; i += 2) {
      const keys = Array.isArray(expr[i]) ? expr[i] : [expr[i]];
      if (typeof expr[i + 1] === "string") for (const k of keys) out.set(String(k), expr[i + 1]);
    }
    if (typeof expr[expr.length - 1] === "string") out.set("__other", expr[expr.length - 1]);
    if (out.size) break;
  }
  return out;
}
// One color per aggregated row.
function dataColors(p, rows) {
  const n = rows.length;
  const pal = (i) => sampleColors(colorbarColors({ colormap: p.palette || "viridis", reverse: !!p.paletteReverse }), n > 1 ? i / (n - 1) : 0.5);
  if (p.colorMode === "single") return rows.map(() => p.color || "#0d99ff");
  if (p.colorMode === "palette") return rows.map((_, i) => pal(i));
  const sym = symbologyColors(p.layer, p.group);
  return rows.map((r, i) => (r.other ? "#bdbdbd" : sym.get(r.key) || sym.get("__other") || pal(i)));
}

// Fill defaults shared by the table and the chart.
const DATA_DEFAULTS = () => ({
  layer: "",
  group: "",
  valueMode: "area",
  valueField: "",
  filter: { field: "", op: "=", value: "" },
  sort: "value-desc",
  topN: 0,
  otherLabel: "Other",
  decimals: 2,
  locale: "en-US",
});
// Pick the first vector layer and a sensible grouping field when a data item is added.
function initDataItem(item) {
  const p = item.props;
  const first = dataLayerOptions().find(([id]) => id);
  if (!first) return;
  p.layer = first[0];
  autoGroupField(p);
}
function autoGroupField(p) {
  const fields = layerFields(p.layer);
  const sym = symbologyColors(p.layer, "");
  // prefer the field the layer is styled by, otherwise the first text field
  const m = mainMap();
  let styled = "";
  try {
    for (const l of styleLayersFor(m.getStyle(), p.layer)) {
      const e = l.paint?.["fill-color"] ?? l.paint?.["circle-color"] ?? l.paint?.["line-color"];
      if (Array.isArray(e) && e[0] === "match" && Array.isArray(e[1]) && e[1][0] === "get") styled = e[1][1];
      if (styled) break;
    }
  } catch {}
  p.group = styled || fields.find((f) => !f.numeric)?.name || "";
  const geomType = layerFeatures(p.layer)[0]?.geometry?.type || "";
  if (/Polygon/.test(geomType)) p.valueMode = "area";
  else if (/Line/.test(geomType)) p.valueMode = "length";
  else p.valueMode = "count";
  void sym;
}

// ---------------------------------------------------------------- attribute table
ITEM_TYPES.attrtable = {
  label: "Attribute Table",
  icon: "table",
  size: [90, 40],
  defaults: () => ({
    ...DATA_DEFAULTS(),
    mode: "summary",
    columns: [],
    showCount: false,
    showPercent: true,
    showTotal: true,
    groupHeader: "",
    valueHeader: "",
    maxRows: 30,
    header: true,
    colWidths: "",
    font: font({ size: 7 }),
    headerFont: font({ size: 7.5, bold: true, color: "#ffffff" }),
    headerBg: "#1f4e79",
    zebra: true,
    zebraColor: "#eef3f8",
    footerBg: "#dde6f0",
    borderColor: "#5b6b7b",
    borderWidth: 0.2,
    outerBorder: true,
    innerBorder: true,
    padding: 1.2,
    background: "#ffffff",
    align: "left",
    autoHeight: true,
  }),
};
// Rows of strings + per-column alignment for an attribute table.
function attrTableRows(p) {
  if (p.mode === "rows") {
    const feats = layerFeatures(p.layer).filter((f) => passFilter(f, p.filter));
    let cols = (p.columns || []).filter(Boolean);
    if (!cols.length) cols = layerFields(p.layer).slice(0, 4).map((f) => f.name);
    const withVal = p.valueMode === "area" || p.valueMode === "areakm" || p.valueMode === "length";
    const list = feats.map((f) => ({ f, v: withVal ? featureValue(f, p.valueMode) : 0 }));
    if (p.sort === "value-desc" && withVal) list.sort((a, b) => b.v - a.v);
    else if (p.sort === "value-asc" && withVal) list.sort((a, b) => a.v - b.v);
    else if (p.sort === "label" && cols[0]) list.sort((a, b) => String(a.f.properties?.[cols[0]] ?? "").localeCompare(String(b.f.properties?.[cols[0]] ?? ""), undefined, { numeric: true }));
    const shown = list.slice(0, Math.max(1, Math.round(p.maxRows || 30)));
    const head = [...cols, ...(withVal ? [p.valueHeader || `${VALUE_MODES.find(([k]) => k === p.valueMode)[1]}`] : [])];
    const numCol = cols.map((c) => layerFields(p.layer).find((f) => f.name === c)?.numeric);
    const rows = shown.map(({ f, v }) => [
      ...cols.map((c, i) => {
        const raw = f.properties?.[c];
        return numCol[i] && raw !== "" && raw != null ? fmtData(raw, { ...p, decimals: Number.isInteger(Number(raw)) ? 0 : p.decimals }) : String(raw ?? "");
      }),
      ...(withVal ? [fmtData(v, p)] : []),
    ]);
    const align = [...numCol.map((n) => (n ? "right" : "left")), ...(withVal ? ["right"] : [])];
    let footer = null;
    if (p.showTotal && withVal) footer = [`Total (${list.length})`, ...cols.slice(1).map(() => ""), fmtData(list.reduce((s, x) => s + x.v, 0), p)];
    if (list.length > shown.length) rows.push([`… ${list.length - shown.length} more`, ...head.slice(1).map(() => "")]);
    return { head, rows, footer, align };
  }
  const agg = aggregate(p);
  const unit = VALUE_UNITS[p.valueMode];
  const vh = p.valueHeader || (p.valueMode === "count" ? "Count" : p.valueMode === "sum" || p.valueMode === "mean" ? `${p.valueMode === "mean" ? "Average" : "Total"} ${p.valueField || ""}`.trim() : `${VALUE_MODES.find(([k]) => k === p.valueMode)[1]}`);
  const head = [p.groupHeader || p.group || "Class", vh];
  const align = ["left", "right"];
  if (p.showCount && p.valueMode !== "count") {
    head.push("Count");
    align.push("right");
  }
  if (p.showPercent) {
    head.push("%");
    align.push("right");
  }
  const rows = agg.rows.map((r) => {
    const row = [r.key, fmtData(r.value, { ...p, decimals: p.valueMode === "count" ? 0 : p.decimals })];
    if (p.showCount && p.valueMode !== "count") row.push(fmtData(r.count, { ...p, decimals: 0 }));
    if (p.showPercent) row.push(fmtData(agg.total ? (r.value / agg.total) * 100 : 0, { ...p, decimals: 1 }));
    return row;
  });
  let footer = null;
  if (p.showTotal) {
    footer = ["Total", fmtData(agg.total, { ...p, decimals: p.valueMode === "count" ? 0 : p.decimals })];
    if (p.showCount && p.valueMode !== "count") footer.push(fmtData(agg.totalCount, { ...p, decimals: 0 }));
    if (p.showPercent) footer.push(agg.total ? "100.0" : "0.0");
  }
  void unit;
  return { head, rows, footer, align };
}
RENDERERS.attrtable = function attrtable(item, ctx) {
  const p = item.props;
  if (!p.layer) return ctx.export ? "" : placeholder(item, "Choose a layer in the panel");
  const t = attrTableRows(p);
  if (!t.rows.length) return ctx.export ? "" : placeholder(item, "No features match");
  const rows = [...(p.header ? [t.head] : []), ...t.rows, ...(t.footer ? [t.footer] : [])];
  const fake = { ...item, props: { ...p, rows, colAlign: t.align, footer: !!t.footer, vars: false } };
  const svg = RENDERERS.table(fake, ctx);
  const natural = S.legendCache.get(item.id);
  if (p.autoHeight && natural && Math.abs(item.h - natural) > 0.3) item.h = round(natural, 2);
  return svg;
};

// ---------------------------------------------------------------- chart
const CHART_KINDS = [["pie", "Pie"], ["donut", "Donut"], ["bar", "Column"], ["hbar", "Bar"]];
ITEM_TYPES.chart = {
  label: "Chart",
  icon: "chart",
  size: [80, 55],
  defaults: () => ({
    ...DATA_DEFAULTS(),
    kind: "donut",
    colorMode: "layer",
    palette: "viridis",
    paletteReverse: false,
    color: "#0d99ff",
    labels: "percent",
    showLegend: true,
    legendValues: "value",
    title: "",
    titleFont: font({ size: 9, bold: true }),
    font: font({ size: 6.5 }),
    hole: 0.55,
    centerText: "total",
    gridlines: true,
    axisColor: "#6b7280",
    sliceStroke: "#ffffff",
    background: "",
    bgOpacity: 1,
    padding: 2,
    border: { show: false, color: "#333333", width: 0.25, radius: 0 },
  }),
};
function chartArc(cx, cy, r0, r1, a0, a1) {
  const P = (v) => round(v, 3);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const pt = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    // full circle as two halves
    const half = chartArc(cx, cy, r0, r1, a0, a0 + Math.PI) + chartArc(cx, cy, r0, r1, a0 + Math.PI, a1 - 1e-6);
    return half;
  }
  const [x1, y1] = pt(r1, a0);
  const [x2, y2] = pt(r1, a1);
  if (r0 <= 0) return `M${P(cx)},${P(cy)}L${P(x1)},${P(y1)}A${P(r1)},${P(r1)} 0 ${large} 1 ${P(x2)},${P(y2)}Z`;
  const [x3, y3] = pt(r0, a1);
  const [x4, y4] = pt(r0, a0);
  return `M${P(x1)},${P(y1)}A${P(r1)},${P(r1)} 0 ${large} 1 ${P(x2)},${P(y2)}L${P(x3)},${P(y3)}A${P(r0)},${P(r0)} 0 ${large} 0 ${P(x4)},${P(y4)}Z`;
}
RENDERERS.chart = function chart(item, ctx) {
  const p = item.props;
  if (!p.layer) return ctx.export ? "" : placeholder(item, "Choose a layer in the panel");
  const agg = aggregate(p);
  const rows = agg.rows.filter((r) => r.value > 0);
  if (!rows.length) return ctx.export ? "" : placeholder(item, "No data to chart");
  const cols = dataColors(p, rows);
  const f = p.font;
  const fh = f.size * PT;
  const P = (v) => round(v, 3);
  const pad = p.padding || 0;
  const unit = VALUE_UNITS[p.valueMode] ? ` ${VALUE_UNITS[p.valueMode]}` : "";
  const dec = p.valueMode === "count" ? 0 : p.decimals;
  const fmtV = (v) => fmtData(v, { ...p, decimals: dec });
  const pct = (v) => `${fmtData(agg.total ? (v / agg.total) * 100 : 0, { ...p, decimals: 1 })}%`;
  let out = "";
  if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
  let top = pad;
  if (String(p.title || "").trim()) {
    const tf = p.titleFont;
    out += richLine(resolveVars(p.title, item), item.w / 2, pad + tf.size * PT * 0.9, tf, "middle").svg;
    top += tf.size * PT * 1.5;
  }
  const W = item.w - pad * 2;
  const H = item.h - top - pad;
  if (p.kind === "pie" || p.kind === "donut") {
    // legend to the right when there is room, otherwise below
    const legendW = p.showLegend ? Math.min(W * 0.5, Math.max(...rows.map((r, i) => textWidthMm(`${r.key}  ${p.legendValues === "percent" ? pct(r.value) : p.legendValues === "value" ? fmtV(r.value) + unit : ""}`, f))) + fh * 1.8) : 0;
    const side = p.showLegend && W - legendW >= H * 0.75;
    const lh = fh * 1.45;
    const legendH = p.showLegend && !side ? rows.length * lh : 0;
    const areaW = side ? W - legendW - 2 : W;
    const areaH = H - legendH;
    const r1 = Math.max(2, Math.min(areaW, areaH) / 2 - 0.5);
    const r0 = p.kind === "donut" ? r1 * clamp(p.hole ?? 0.55, 0.2, 0.85) : 0;
    const cx = pad + areaW / 2;
    const cy = top + areaH / 2;
    let a = 0;
    rows.forEach((r, i) => {
      const da = (r.value / agg.total) * Math.PI * 2;
      out += `<path d="${chartArc(cx, cy, r0, r1, a, a + da)}" fill="${esc(cols[i])}" stroke="${esc(p.sliceStroke || "none")}" stroke-width="${p.sliceStroke ? 0.25 : 0}" stroke-linejoin="round"/>`;
      if (p.labels !== "none" && da > 0.32) {
        const mid = a + da / 2;
        const rr = r0 ? (r0 + r1) / 2 : r1 * 0.62;
        const txt = p.labels === "percent" ? pct(r.value) : p.labels === "value" ? fmtV(r.value) : r.key;
        out += `<text x="${P(cx + rr * Math.sin(mid))}" y="${P(cy - rr * Math.cos(mid))}" text-anchor="middle" dominant-baseline="central" ${fontAttrs({ ...f, color: "#ffffff", bold: true })} stroke="rgba(0,0,0,0.35)" stroke-width="0.35" paint-order="stroke">${esc(txt)}</text>`;
      }
      a += da;
    });
    if (r0 && p.centerText === "total") {
      out += `<text x="${P(cx)}" y="${P(cy - fh * 0.15)}" text-anchor="middle" ${fontAttrs({ ...f, bold: true, size: f.size * 1.35 })}>${esc(fmtV(agg.total))}</text>`;
      out += `<text x="${P(cx)}" y="${P(cy + fh * 1.05)}" text-anchor="middle" ${fontAttrs({ ...f, color: "#6b7280" })}>${esc((unit || " features").trim())}</text>`;
    }
    if (p.showLegend) {
      const lx = side ? pad + areaW + 2 : pad;
      let ly = side ? top + Math.max(0, (H - rows.length * lh) / 2) : top + areaH + 1;
      rows.forEach((r, i) => {
        const val = p.legendValues === "percent" ? pct(r.value) : p.legendValues === "value" ? `${fmtV(r.value)}${unit}` : "";
        out += `<rect x="${P(lx)}" y="${P(ly + (lh - fh) / 2)}" width="${P(fh)}" height="${P(fh)}" rx="${P(fh * 0.2)}" fill="${esc(cols[i])}"/>`;
        out += `<text x="${P(lx + fh * 1.5)}" y="${P(ly + lh / 2)}" dominant-baseline="central" ${fontAttrs(f)}>${esc(r.key)}${val ? `<tspan fill="#6b7280"> ${esc(val)}</tspan>` : ""}</text>`;
        ly += lh;
      });
    }
  } else {
    const horiz = p.kind === "hbar";
    const max = Math.max(...rows.map((r) => r.value));
    // axis ticks: as many as fit without touching
    const tickFmt = (t, st) => fmtData(t, { ...p, decimals: st % 1 ? Math.min(2, p.decimals) : 0 });
    const makeTicks = (target) => {
      const st = niceStep(max, Math.max(1, target));
      const top = Math.ceil(max / st - 1e-9) * st || 1;
      const list = [];
      for (let v = 0; v <= top + st * 1e-6; v += st) list.push(v);
      return { step: st, axisMax: top, ticks: list };
    };
    let { step, axisMax, ticks } = makeTicks(4);
    const tickW = Math.max(...ticks.map((t) => textWidthMm(tickFmt(t, step), f)));
    const valueText = (r) => (p.labels === "percent" ? pct(r.value) : p.labels === "value" ? fmtV(r.value) : "");
    const ac = esc(p.axisColor || "#6b7280");
    if (horiz) {
      const labW = Math.min(W * 0.4, Math.max(...rows.map((r) => textWidthMm(r.key, f))) + 1.5);
      const x0 = pad + labW;
      const plotW = Math.max(5, W - labW - (p.labels !== "none" ? Math.max(...rows.map((r) => textWidthMm(valueText(r), f))) + 1.5 : 1));
      const plotH = H - fh * 1.6;
      const fitN = Math.floor(plotW / (tickW + 2.5));
      if (fitN < ticks.length - 1) ({ step, axisMax, ticks } = makeTicks(Math.max(1, fitN)));
      if (ticks.length > 2 && plotW / (ticks.length - 1) < tickW + 1) ticks = [0, axisMax];
      const bh = plotH / rows.length;
      ticks.forEach((t) => {
        const x = x0 + (t / axisMax) * plotW;
        if (p.gridlines) out += `<line x1="${P(x)}" y1="${P(top)}" x2="${P(x)}" y2="${P(top + plotH)}" stroke="#e5e7eb" stroke-width="0.15"/>`;
        out += `<text x="${P(x)}" y="${P(top + plotH + fh * 1.2)}" text-anchor="middle" ${fontAttrs({ ...f, color: "#6b7280" })}>${esc(tickFmt(t, step))}</text>`;
      });
      rows.forEach((r, i) => {
        const y = top + i * bh;
        const bw = (r.value / axisMax) * plotW;
        out += `<rect x="${P(x0)}" y="${P(y + bh * 0.15)}" width="${P(Math.max(bw, 0.2))}" height="${P(bh * 0.7)}" rx="${P(Math.min(0.6, bh * 0.15))}" fill="${esc(cols[i])}"/>`;
        out += `<text x="${P(x0 - 1)}" y="${P(y + bh / 2)}" text-anchor="end" dominant-baseline="central" ${fontAttrs(f)}>${esc(r.key)}</text>`;
        if (p.labels !== "none") out += `<text x="${P(x0 + bw + 0.8)}" y="${P(y + bh / 2)}" dominant-baseline="central" ${fontAttrs({ ...f, color: "#374151" })}>${esc(valueText(r) || r.key)}</text>`;
      });
      out += `<line x1="${P(x0)}" y1="${P(top)}" x2="${P(x0)}" y2="${P(top + plotH)}" stroke="${ac}" stroke-width="0.25"/>`;
    } else {
      const x0 = pad + tickW + 1;
      const rot = rows.length > 4;
      const labH = rot ? Math.min(H * 0.35, Math.max(...rows.map((r) => textWidthMm(r.key, f))) * 0.75 + fh) : fh * 1.6;
      const plotW = W - tickW - 1;
      const plotH = H - labH - fh;
      const y0 = top + fh + plotH;
      const bw = plotW / rows.length;
      ticks.forEach((t) => {
        const y = y0 - (t / axisMax) * plotH;
        if (p.gridlines) out += `<line x1="${P(x0)}" y1="${P(y)}" x2="${P(x0 + plotW)}" y2="${P(y)}" stroke="#e5e7eb" stroke-width="0.15"/>`;
        out += `<text x="${P(x0 - 0.8)}" y="${P(y)}" text-anchor="end" dominant-baseline="central" ${fontAttrs({ ...f, color: "#6b7280" })}>${esc(tickFmt(t, step))}</text>`;
      });
      rows.forEach((r, i) => {
        const x = x0 + i * bw;
        const bh = (r.value / axisMax) * plotH;
        out += `<rect x="${P(x + bw * 0.15)}" y="${P(y0 - bh)}" width="${P(bw * 0.7)}" height="${P(Math.max(bh, 0.2))}" rx="${P(Math.min(0.6, bw * 0.1))}" fill="${esc(cols[i])}"/>`;
        if (p.labels !== "none") out += `<text x="${P(x + bw / 2)}" y="${P(y0 - bh - 0.8)}" text-anchor="middle" ${fontAttrs({ ...f, color: "#374151" })}>${esc(valueText(r) || r.key)}</text>`;
        out += rot
          ? `<text transform="translate(${P(x + bw / 2)} ${P(y0 + 1.2)}) rotate(-40)" text-anchor="end" dominant-baseline="hanging" ${fontAttrs(f)}>${esc(r.key)}</text>`
          : `<text x="${P(x + bw / 2)}" y="${P(y0 + fh * 1.2)}" text-anchor="middle" ${fontAttrs(f)}>${esc(r.key)}</text>`;
      });
      out += `<line x1="${P(x0)}" y1="${P(y0)}" x2="${P(x0 + plotW)}" y2="${P(y0)}" stroke="${ac}" stroke-width="0.25"/>`;
    }
  }
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};
