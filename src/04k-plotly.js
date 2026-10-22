// ---------------------------------------------------------------- Plotly charts
// Charts drawn by the bundled Plotly.js and kept as plain SVG (cached per chart),
// so they look like Plotly on screen and export cleanly to PNG / PDF / SVG.
// Data comes from a GeoLibre layer (aggregate) or from typed "label, value" rows.

const PLOTLY_KINDS = [
  ["donut", "Donut"], ["pie", "Pie"], ["bar", "Column"], ["hbar", "Bar"], ["line", "Line"], ["area", "Area"], ["scatter", "Dots"],
  ["lollipop", "Lollipop"], ["bubble", "Bubble"], ["funnel", "Funnel"], ["funnelarea", "Funnel area"], ["treemap", "Treemap"],
  ["sunburst", "Sunburst"], ["icicle", "Icicle"], ["rose", "Rose (polar)"], ["radar", "Radar"], ["waterfall", "Waterfall"],
  ["histogram", "Histogram"], ["box", "Box plot"], ["violin", "Violin"], ["heatbar", "Heat strip"],
];
const NATIVE_KINDS = new Set(["pie", "donut", "bar", "hbar"]);
const PLOTLY_COLORWAY = ["#636EFA", "#EF553B", "#00CC96", "#AB63FA", "#FFA15A", "#19D3F3", "#FF6692", "#B6E880", "#FF97FF", "#FECB52"];
const PLOTLY_THEMES = {
  plotly: { name: "Plotly", plot: "#E5ECF6", grid: "#FFFFFF", zero: "#FFFFFF", font: "#2a3f5f", paper: "rgba(0,0,0,0)" },
  white: { name: "White", plot: "#FFFFFF", grid: "#EBF0F8", zero: "#EBF0F8", font: "#2a3f5f", paper: "rgba(0,0,0,0)" },
  minimal: { name: "Minimal", plot: "#FFFFFF", grid: null, zero: "#BBBBBB", font: "#333333", paper: "rgba(0,0,0,0)", lines: true },
  seaborn: { name: "Seaborn", plot: "#EAEAF2", grid: "#FFFFFF", zero: "#FFFFFF", font: "#262626", paper: "rgba(0,0,0,0)" },
  ggplot2: { name: "ggplot2", plot: "#EBEBEB", grid: "#FFFFFF", zero: "#FFFFFF", font: "#444444", paper: "rgba(0,0,0,0)" },
  dark: { name: "Dark", plot: "#111111", grid: "#283442", zero: "#283442", font: "#f2f5fa", paper: "#111111" },
};
const PLOTLY = { ready: false, cache: new Map(), queue: Promise.resolve() };

function loadPlotly() {
  if (PLOTLY.ready) return Promise.resolve();
  return loadVendorScript("plotly").then(() => {
    if (!window.Plotly?.toImage) throw new Error("Plotly did not start");
    PLOTLY.ready = true;
  });
}
// typed rows: "label, value" (or tab / semicolon separated), one per line
function manualRows(p) {
  const rows = [];
  for (const line of String(p.manual || "").split(/\r?\n/)) {
    const m = line.split(/[,;\t]/);
    if (m.length < 2) continue;
    const v = parseFloat(String(m[m.length - 1]).replace(/\s/g, ""));
    if (!Number.isFinite(v)) continue;
    rows.push({ key: m.slice(0, -1).join(",").trim() || "—", value: v, count: 1 });
  }
  return { rows, total: rows.reduce((s, r) => s + r.value, 0) };
}
function chartRows(p) {
  if (p.dataSource === "manual") return manualRows(p);
  return aggregate(p);
}
// raw per-feature values by class, for histogram / box / violin
function chartRaw(p) {
  if (p.dataSource === "manual") return manualRows(p).rows.map((r) => ({ g: r.key, v: r.value }));
  const mode = p.valueMode === "count" ? "area" : p.valueMode;
  return layerFeatures(p.layer).filter((f) => passFilter(f, p.filter)).map((f) => ({ g: p.group ? String(f?.properties?.[p.group] ?? "(empty)") : "All", v: featureValue(f, mode, p.valueField) }));
}
function chartColors(p, rows) {
  if (p.colorMode === "plotly") return rows.map((_, i) => PLOTLY_COLORWAY[i % PLOTLY_COLORWAY.length]);
  if (p.dataSource === "manual" && p.colorMode === "layer") return rows.map((_, i) => PLOTLY_COLORWAY[i % PLOTLY_COLORWAY.length]);
  return dataColors(p, rows);
}

function plotlyFigure(item) {
  const p = item.props;
  const agg = chartRows(p);
  const pie = ["pie", "donut", "funnelarea", "treemap", "sunburst", "icicle", "rose"].includes(p.kind);
  const rows = pie ? agg.rows.filter((r) => r.value > 0) : agg.rows;
  if (!rows.length && !["histogram", "box", "violin"].includes(p.kind)) return null;
  const labels = rows.map((r) => r.key);
  const values = rows.map((r) => round(r.value, 6));
  const colors = chartColors(p, rows);
  const one = p.colorMode === "single" ? p.color || "#636EFA" : colors[0] || PLOTLY_COLORWAY[0];
  const th = PLOTLY_THEMES[p.plotStyle] || PLOTLY_THEMES.plotly;
  const f = p.font;
  const px = (pt) => round(pt * (96 / 72), 2);
  const dec = p.valueMode === "count" && p.dataSource !== "manual" ? 0 : p.decimals ?? 2;
  const fmt = (v) => fmtData(v, { ...p, decimals: dec });
  const textinfo = p.labels === "percent" ? "percent" : p.labels === "value" ? "value" : p.labels === "label" ? "label" : "none";
  const valueText = p.labels === "none" ? undefined : values.map(fmt);
  const line = { color: p.sliceStroke || "#ffffff", width: p.sliceStroke ? 1 : 0 };
  let data = [];
  const k = p.kind;
  if (k === "pie" || k === "donut") data = [{ type: "pie", labels, values, hole: k === "donut" ? clamp(p.hole ?? 0.55, 0.1, 0.85) : 0, marker: { colors, line }, textinfo, sort: false, direction: "clockwise", textfont: { size: px(f.size) } }];
  else if (k === "bar" || k === "hbar") {
    const h = k === "hbar";
    data = [{ type: "bar", orientation: h ? "h" : "v", x: h ? values : labels, y: h ? labels : values, marker: { color: p.colorMode === "single" ? one : colors }, text: valueText, textposition: "auto", cliponaxis: false }];
  } else if (k === "line" || k === "area") data = [{ type: "scatter", mode: "lines+markers", x: labels, y: values, fill: k === "area" ? "tozeroy" : "none", line: { color: one, width: 2.5, shape: "spline" }, marker: { color: one, size: 7 }, text: valueText, textposition: "top center" }];
  else if (k === "scatter") data = [{ type: "scatter", mode: "markers", x: labels, y: values, marker: { color: colors, size: 11, line: { color: "#ffffff", width: 1 } } }];
  else if (k === "lollipop") data = [
    { type: "bar", x: labels, y: values, width: 0.06, marker: { color: colors }, hoverinfo: "skip" },
    { type: "scatter", mode: "markers+text", x: labels, y: values, marker: { color: colors, size: 13 }, text: valueText, textposition: "top center" },
  ];
  else if (k === "bubble") {
    const max = Math.max(...values, 1);
    data = [{ type: "scatter", mode: "markers+text", x: labels, y: values, text: p.labels === "none" ? undefined : labels, textposition: "middle center", marker: { color: colors, size: values.map((v) => 14 + 46 * Math.sqrt(Math.max(v, 0) / max)), opacity: 0.85, line: { color: "#ffffff", width: 1 } } }];
  } else if (k === "funnel") data = [{ type: "funnel", y: labels, x: values, marker: { color: colors }, textinfo: textinfo === "percent" ? "value+percent initial" : textinfo }];
  else if (k === "funnelarea") data = [{ type: "funnelarea", labels, values, marker: { colors, line }, textinfo }];
  else if (k === "treemap") data = [{ type: "treemap", labels, parents: labels.map(() => ""), values, marker: { colors, line }, textinfo: textinfo === "none" ? "label" : `label+${textinfo === "percent" ? "percent root" : textinfo === "label" ? "text" : "value"}` }];
  else if (k === "sunburst" || k === "icicle") {
    const root = p.rootLabel || "Total";
    data = [{ type: k, labels: [root, ...labels], parents: ["", ...labels.map(() => root)], values: [round(agg.total, 6), ...values], branchvalues: "total", marker: { colors: ["#ffffff", ...colors], line }, textinfo: textinfo === "none" ? "label" : `label+${textinfo === "percent" ? "percent root" : "value"}` }];
  } else if (k === "rose") data = [{ type: "barpolar", r: values, theta: labels, marker: { color: colors, line } }];
  else if (k === "radar") data = [{ type: "scatterpolar", r: [...values, values[0]], theta: [...labels, labels[0]], fill: "toself", line: { color: one, width: 2 }, fillcolor: `${one}55`, marker: { color: one } }];
  else if (k === "waterfall") data = [{ type: "waterfall", x: [...labels, "Total"], y: [...values, 0], measure: [...labels.map(() => "relative"), "total"], text: p.labels === "none" ? undefined : [...values.map(fmt), fmt(agg.total)], textposition: "outside", connector: { line: { color: "#9ca3af", width: 1 } }, increasing: { marker: { color: one } }, decreasing: { marker: { color: "#EF553B" } }, totals: { marker: { color: "#2a3f5f" } } }];
  else if (k === "histogram") data = [{ type: "histogram", x: chartRaw(p).map((r) => r.v), marker: { color: one, line: { color: "#ffffff", width: 1 } } }];
  else if (k === "box" || k === "violin") {
    const raw = chartRaw(p);
    const groups = [...new Set(raw.map((r) => r.g))];
    data = groups.map((g, i) => ({ type: k, y: raw.filter((r) => r.g === g).map((r) => r.v), name: g, marker: { color: colors[labels.indexOf(g)] || PLOTLY_COLORWAY[i % 10] }, boxpoints: k === "box" ? "outliers" : false, box: k === "violin" ? { visible: true } : undefined, meanline: k === "violin" ? { visible: true } : undefined }));
  } else if (k === "heatbar") data = [{ type: "heatmap", z: [values], x: labels, y: [""], colorscale: sampleColorscale(p), showscale: true, text: [values.map(fmt)], texttemplate: p.labels === "none" ? "" : "%{text}" }];
  if (!data.length) return null;

  const W = round(item.w * PX96, 1);
  const H = round(item.h * PX96, 1);
  const title = String(p.title || "").trim() ? resolveVars(p.title, item) : "";
  // a legend only where the classes are separate entries (a polar bar is one trace)
  const legend = p.showLegend && ["pie", "donut", "funnelarea", "box", "violin"].includes(k);
  const axis = { gridcolor: th.grid || undefined, showgrid: !!th.grid && p.gridlines !== false, zerolinecolor: th.zero, linecolor: th.lines ? "#444444" : undefined, showline: !!th.lines, automargin: true, tickfont: { size: px(f.size) } };
  const layout = {
    width: W,
    height: H,
    paper_bgcolor: p.background || th.paper,
    plot_bgcolor: th.plot,
    font: { family: `${f.family || "Arial"}, Arial, sans-serif`, size: px(f.size), color: th.font },
    colorway: PLOTLY_COLORWAY,
    margin: { l: 6, r: 6, t: title ? px(p.titleFont.size) * 2.4 : 8, b: 6, pad: 2 },
    title: title ? { text: title, font: { size: px(p.titleFont.size), color: p.titleFont.color || th.font, family: `${p.titleFont.family || f.family || "Arial"}, Arial, sans-serif` }, x: 0.5, xanchor: "center", y: 0.98, yanchor: "top" } : undefined,
    showlegend: legend,
    legend: { font: { size: px(f.size) }, bgcolor: "rgba(0,0,0,0)" },
    xaxis: axis,
    yaxis: { ...axis },
    polar: { bgcolor: th.plot, radialaxis: { gridcolor: th.grid || "#dddddd", tickfont: { size: px(f.size * 0.9) } }, angularaxis: { gridcolor: th.grid || "#dddddd", tickfont: { size: px(f.size) } } },
    bargap: 0.25,
    uniformtext: { minsize: px(f.size * 0.8), mode: "hide" },
  };
  // donut: the total in the middle
  if (k === "donut" && p.centerText === "total") layout.annotations = [{ text: `<b>${esc(fmt(agg.total))}</b><br><span style="font-size:${px(f.size * 0.9)}px">${esc((VALUE_UNITS[p.valueMode] && p.dataSource !== "manual" ? VALUE_UNITS[p.valueMode] : "") || "total")}</span>`, showarrow: false, font: { size: px(f.size * 1.4) }, x: 0.5, y: 0.5, xref: "paper", yref: "paper" }];
  return { data, layout, W, H };
}
function sampleColorscale(p) {
  const cols = colorbarColors({ colormap: p.palette || "viridis", reverse: !!p.paletteReverse });
  return cols.map((c, i) => [cols.length > 1 ? i / (cols.length - 1) : 0, c]);
}
function queuePlotly(key, fig) {
  if (PLOTLY.cache.has(key)) return;
  PLOTLY.cache.set(key, { pending: true });
  if (PLOTLY.cache.size > 80) PLOTLY.cache.delete(PLOTLY.cache.keys().next().value);
  PLOTLY.queue = PLOTLY.queue.then(async () => {
    const div = el("div", { style: { position: "fixed", left: "-30000px", top: "0", width: `${fig.W}px`, height: `${fig.H}px` } });
    document.body.appendChild(div);
    try {
      await loadPlotly();
      await window.Plotly.newPlot(div, fig.data, fig.layout, { staticPlot: true, displayModeBar: false });
      const url = await window.Plotly.toImage(div, { format: "svg", width: fig.W, height: fig.H });
      const svg = decodeURIComponent(url.slice(url.indexOf(",") + 1));
      const root = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
      PLOTLY.cache.set(key, { inner: root.innerHTML, w: fig.W, h: fig.H });
    } catch (e) {
      PLOTLY.cache.set(key, { error: String(e?.message || e).split("\n")[0].slice(0, 140) });
    } finally {
      try {
        window.Plotly?.purge(div);
      } catch {}
      div.remove();
    }
    if (S.open) refreshCanvas();
  });
}
function plotlyChartSvg(item, ctx) {
  const p = item.props;
  if (p.dataSource !== "manual" && !p.layer) return ctx.export ? "" : placeholder(item, "Choose a layer, or type the data (Format → Data)");
  const fig = plotlyFigure(item);
  if (!fig) return ctx.export ? "" : placeholder(item, "No data to chart");
  const key = JSON.stringify([fig.data, fig.layout]);
  const hit = PLOTLY.cache.get(key);
  if (!hit) queuePlotly(key, fig);
  let out = "";
  if (hit?.inner) out += `<svg width="${item.w}" height="${item.h}" viewBox="0 0 ${hit.w} ${hit.h}" preserveAspectRatio="none" overflow="hidden">${hit.inner}</svg>`;
  else {
    // keep the last drawing of this chart while the new one is made (no flicker)
    const prev = PLOTLY.last?.get(item.id);
    if (prev) out += `<svg width="${item.w}" height="${item.h}" viewBox="0 0 ${prev.w} ${prev.h}" preserveAspectRatio="none" overflow="hidden">${prev.inner}</svg>`;
    else if (!ctx.export) out += `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="2.8" fill="${hit?.error ? "#b91c1c" : "#666"}">${esc(hit?.error ? `Chart: ${hit.error}` : "Drawing the chart…")}</text>`;
  }
  if (hit?.inner) {
    PLOTLY.last = PLOTLY.last || new Map();
    PLOTLY.last.set(item.id, hit);
  }
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
}

// Plotly for every new chart; charts made earlier keep the classic drawing
// (engine unset) until their style is switched.
const nativeChartRenderer = RENDERERS.chart;
RENDERERS.chart = function chart(item, ctx) {
  const p = item.props;
  const native = (p.engine === "native" || (!p.engine && p.dataSource !== "manual")) && NATIVE_KINDS.has(p.kind);
  return native ? nativeChartRenderer(item, ctx) : plotlyChartSvg(item, ctx);
};
{
  const base = ITEM_TYPES.chart.defaults;
  ITEM_TYPES.chart.defaults = () => ({ ...base(), engine: "plotly", plotStyle: "plotly", dataSource: "layer", manual: "Forest, 45\nPlantation, 30\nRice field, 15\nSettlement, 10", colorMode: "layer" });
}
