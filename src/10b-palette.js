// ---------------------------------------------------------------- Category Colors
// A categorical (non-gradient) palette applied straight to a GeoLibre layer:
// the classes come from the layer's own data, colours from "Distinct 200"
// (200 well-separated colours), the official KLHK classes, Plotly, Tableau or
// ColorBrewer; opacity 100 % by default. Applied as a Mapbox GL style through
// GeoLibre's "Import style" (saved with the project); legends follow.

// 200 colours, neighbours far apart: golden-angle hues with cycling lightness and saturation
const DISTINCT_200 = (() => {
  const out = [];
  const L = [48, 62, 38, 70, 55];
  const Sat = [72, 58, 85, 48];
  for (let i = 0; i < 200; i++) {
    const h = (i * 137.508) % 360;
    const s = Sat[i % Sat.length] / 100;
    const l = L[Math.floor(i / 2) % L.length] / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    out.push(`#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  }
  return out;
})();
const CAT_PALETTES = {
  distinct200: ["Distinct 200 (no gradient)", DISTINCT_200],
  klhk: ["KLHK — official class colours", null],
  plotly: ["Plotly", ["#636EFA", "#EF553B", "#00CC96", "#AB63FA", "#FFA15A", "#19D3F3", "#FF6692", "#B6E880", "#FF97FF", "#FECB52"]],
  tableau10: ["Tableau 10", ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"]],
  set1: ["ColorBrewer Set1", ["#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#FFFF33", "#A65628", "#F781BF", "#999999"]],
  set2: ["ColorBrewer Set2", ["#66C2A5", "#FC8D62", "#8DA0CB", "#E78AC3", "#A6D854", "#FFD92F", "#E5C494", "#B3B3B3"]],
  set3: ["ColorBrewer Set3", ["#8DD3C7", "#FFFFB3", "#BEBADA", "#FB8072", "#80B1D3", "#FDB462", "#B3DE69", "#FCCDE5", "#D9D9D9", "#BC80BD", "#CCEBC5", "#FFED6F"]],
  paired: ["ColorBrewer Paired", ["#A6CEE3", "#1F78B4", "#B2DF8A", "#33A02C", "#FB9A99", "#E31A1C", "#FDBF6F", "#FF7F00", "#CAB2D6", "#6A3D9A", "#FFFF99", "#B15928"]],
  dark2: ["ColorBrewer Dark2", ["#1B9E77", "#D95F02", "#7570B3", "#E7298A", "#66A61E", "#E6AB02", "#A6761D", "#666666"]],
  pastel1: ["ColorBrewer Pastel1", ["#FBB4AE", "#B3CDE3", "#CCEBC5", "#DECBE4", "#FED9A6", "#FFFFCC", "#E5D8BD", "#FDDAEC", "#F2F2F2"]],
};
// KLHK colour for a class value: official class tables (SK 399/2024) and the forest-area codes
function klhkClassColor(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (typeof KLHK_SYMBOLOGY !== "undefined") {
    for (const layer of KLHK_SYMBOLOGY) {
      for (const c of layer.classes || []) {
        if (String(c.v ?? "").toLowerCase() === v || String(c.l ?? "").toLowerCase() === v) {
          const f = c.s?.f || c.s?.L?.find((x) => x.f)?.f || c.s?.o;
          if (f) return f;
        }
      }
    }
  }
  if (typeof KLHK_KAWASAN !== "undefined") {
    const k = KLHK_KAWASAN.find((c) => c.test?.test(v) || c.label.toLowerCase() === v || c.key.toLowerCase() === v);
    if (k) return k.patch?.fill || null;
  }
  return null;
}
// the classes of a field, most common first (or A–Z)
function catClasses(layerId, field, order = "count") {
  const counts = new Map();
  for (const f of layerFeatures(layerId) || []) {
    const v = f?.properties?.[field];
    const k = v == null || v === "" ? "(empty)" : String(v);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const rows = [...counts].map(([value, count]) => ({ value, count }));
  rows.sort(order === "az" ? (a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }) : (a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return rows;
}
function catAssign(rows, palette, offset = 0) {
  const fallback = DISTINCT_200;
  let j = offset;
  return rows.map((r) => {
    if (palette === "klhk") {
      const c = klhkClassColor(r.value);
      if (c) return { ...r, color: c, klhk: true };
      return { ...r, color: fallback[j++ % fallback.length] };
    }
    const list = CAT_PALETTES[palette]?.[1] || fallback;
    return { ...r, color: list[(j++) % list.length] };
  });
}
// a Mapbox GL style for the layer, as GeoLibre's "Import style" reads it
function catStyleJson(field, rows, geom, { opacity, outline, outlineWidth, other }) {
  const match = ["match", ["to-string", ["get", field]]];
  for (const r of rows) if (r.value !== "(empty)") match.push(r.value, r.color);
  match.push(other);
  const color = rows.filter((r) => r.value !== "(empty)").length ? match : other;
  const layers = [];
  if (/Polygon/.test(geom)) {
    layers.push({ id: "glc-cat-fill", type: "fill", source: "glc", paint: { "fill-color": color, "fill-opacity": opacity } });
    layers.push({ id: "glc-cat-line", type: "line", source: "glc", paint: { "line-color": outline, "line-width": outlineWidth, "line-opacity": 1 } });
  } else if (/Line/.test(geom)) {
    layers.push({ id: "glc-cat-line", type: "line", source: "glc", paint: { "line-color": color, "line-width": Math.max(outlineWidth, 1.5), "line-opacity": opacity } });
  } else {
    layers.push({ id: "glc-cat-circle", type: "circle", source: "glc", paint: { "circle-color": color, "circle-opacity": opacity, "circle-radius": 5, "circle-stroke-color": outline, "circle-stroke-width": outlineWidth } });
  }
  return { version: 8, name: "Category colors", sources: { glc: { type: "geojson", data: { type: "FeatureCollection", features: [] } } }, layers };
}
// apply: saved with the project through importLayerStyle, else straight on the map
function catApply(layerId, style) {
  const app = mtApp();
  if (app?.importLayerStyle) {
    const r = app.importLayerStyle(layerId, JSON.stringify(style));
    if (r?.ok) return { saved: true, warnings: r.warnings || [] };
    if (r && !r.ok && r.reason === "unsupported-layer") throw new Error("This layer takes no style (only GeoJSON and vector-tile layers do).");
  }
  const m = mainMap();
  let done = 0;
  for (const sl of styleLayersFor(m.getStyle(), layerId)) {
    const src = style.layers.find((l) => l.type === sl.type);
    if (!src) continue;
    for (const [k, v] of Object.entries(src.paint)) {
      try {
        m.setPaintProperty(sl.id, k, v);
        done++;
      } catch {}
    }
  }
  if (!done) throw new Error("The colours could not be applied to this layer.");
  return { saved: false, warnings: [] };
}

function openCategoryColors(presetLayer) {
  const layers = mtVectorLayers();
  if (!layers.length) return mtToast("No vector layer to colour.", "warn");
  const layer = mtSelect(layers.map((l) => [l.id, l.name || l.id]), presetLayer || mtApp()?.getSelectedLayerId?.() || layers[0].id);
  const field = mtSelect([], "");
  const pal = mtSelect(Object.entries(CAT_PALETTES).map(([k, [l]]) => [k, l]), "distinct200");
  const order = mtSelect([["count", "Most features first"], ["az", "A → Z"]], "count");
  const opacity = mtInput("100", { type: "number", min: 0, max: 100, step: 5 });
  const outline = el("input", { type: "color", class: `${NS}-color`, value: "#333333", title: "Outline color" });
  const outlineW = mtInput("0.6", { type: "number", min: 0, max: 10, step: 0.1 });
  const other = el("input", { type: "color", class: `${NS}-color`, value: "#bdbdbd", title: "Color of values not in the list" });
  const list = el("div", { class: `${NS}-catlist` });
  const info = el("p", { class: `${NS}-muted` });
  let rows = [];
  let offset = 0;
  const fillFields = () => {
    const fields = layerFields(layer.value);
    field.replaceChildren(...fields.map((f) => el("option", { value: f.name }, `${f.name}${f.numeric ? " (number)" : ""}`)));
    // the field the layer is styled by, else the first text field
    let styled = "";
    try {
      for (const l of styleLayersFor(mainMap().getStyle(), layer.value)) {
        const e = l.paint?.["fill-color"] ?? l.paint?.["circle-color"] ?? l.paint?.["line-color"];
        if (Array.isArray(e) && e[0] === "match") styled = JSON.stringify(e[1]).match(/"get","([^"]+)"/)?.[1] || "";
        if (styled) break;
      }
    } catch {}
    field.value = styled && fields.some((f) => f.name === styled) ? styled : fields.find((f) => !f.numeric)?.name || fields[0]?.name || "";
  };
  const draw = () => {
    rows = catAssign(catClasses(layer.value, field.value, order.value), pal.value, offset);
    const many = rows.length > 200;
    info.textContent = `${rows.length} class${rows.length === 1 ? "" : "es"}${pal.value === "klhk" ? ` · ${rows.filter((r) => r.klhk).length} matched to KLHK colours` : ""}${many ? " · more than 200: colours repeat" : ""}`;
    list.replaceChildren(...rows.slice(0, 400).map((r) => {
      const sw = el("input", { type: "color", class: `${NS}-color`, value: r.color, title: "Change this colour" });
      sw.addEventListener("input", () => (r.color = sw.value));
      return el("div", { class: `${NS}-catrow` }, sw, el("span", { class: `${NS}-catval`, title: r.value }, r.value), el("span", { class: `${NS}-muted` }, String(r.count)));
    }));
  };
  for (const c of [layer, field, pal, order]) c.addEventListener("change", () => {
    if (c === layer) fillFields();
    offset = 0;
    draw();
  });
  fillFields();
  draw();
  mtDialog({
    title: "Category colours",
    sub: "A categorical palette from the layer's own data, applied to the GeoLibre layer",
    wide: true,
    body: [
      el("div", { class: `${NS}-grid2` }, mtField("Layer", layer), mtField("Classes from field", field)),
      el("div", { class: `${NS}-grid3` }, mtField("Palette", pal), mtField("Order", order), mtField("Opacity (%)", opacity)),
      el("div", { class: `${NS}-grid3` }, mtField("Outline", outline), mtField("Outline width (px)", outlineW), mtField("Other values", other)),
      el("div", { class: `${NS}-btnrow` }, el("button", { type: "button", class: `${NS}-btn`, onclick: () => {
        offset += 7;
        draw();
      } }, "Shuffle colours"), info),
      list,
    ],
    ok: "Apply to layer",
    onOk: () => {
      if (!field.value) throw new Error("Choose the field that holds the classes.");
      const geom = (layerFeatures(layer.value) || []).find((f) => f?.geometry)?.geometry?.type || "Polygon";
      const style = catStyleJson(field.value, rows, geom, { opacity: clamp((parseFloat(opacity.value) || 100) / 100, 0, 1), outline: outline.value, outlineWidth: Math.max(0, parseFloat(outlineW.value) || 0), other: other.value });
      const r = catApply(layer.value, style);
      mtToast(r.saved ? `${rows.length} class colours applied and saved with the project.` : `${rows.length} class colours applied on the map (this GeoLibre version cannot save them with the project).`, r.saved ? "info" : "warn");
      // layouts: legends and live frames follow the new colours
      if (S.doc) {
        S.styleEpoch = (S.styleEpoch || 0) + 1;
        setTimeout(() => {
          try {
            refreshAutoLegends();
            if (S.open) renderAll();
          } catch {}
        }, 400);
      }
    },
  });
}
