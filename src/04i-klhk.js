// ---------------------------------------------------------------- KLHK standard
// SK MENLHK No. 399 Tahun 2024, Lampiran II "Spesifikasi Teknis Penyajian IGT LHK":
// datum and grid, paper size per scale, the marginal information and its order,
// the official layouts (1 signer, up to 4 signers, signatures of several parties),
// thematic symbology (KLHK_SYMBOLOGY, 04h) and RBI base-map legend symbols.

const KLHK_SPEC = {
  source: "SK MENLHK No. 399 Tahun 2024 tentang Standar Penyebarluasan IGT LHK, Lampiran II",
  datum: "WGS 1984 (SRGI)",
  crs: "Geografis (lintang/bujur), derajat menit detik",
  font: "Arial",
  textColor: "#000000",
  // grid: lines in light blue or "+" marks in black, at least 2 latitude and 2 longitude labels
  grid: { line: "#BEE8FF", mark: "#000000" },
  // minimum paper per scale, landscape [width, height] mm, plus map face and marginal info minimums
  sizes: [
    { scale: 500000, paper: [900, 510], face: [580, 320], info: [280, 150] },
    { scale: 250000, paper: [800, 600], face: [510, 380], info: [250, 180] },
    { scale: 50000, paper: [420, 297], face: [260, 180], info: [120, 80] },
    { scale: 25000, paper: [420, 297], face: [260, 180], info: [120, 80] },
    { scale: 10000, paper: [297, 210], face: [180, 120], info: [80, 50] },
  ],
  partiesExtraHeight: 150, // maps signed by several parties: paper 15 cm larger
  // marginal information (Informasi Tepi Peta), in this order down the right-hand panel
  order: [
    "Nomor Surat", "Nomor Lembar Peta (peta berseri)", "Logo Instansi", "Judul Peta (KAPITAL, Arial Bold, rata tengah)",
    "Panjang/Luas Areal yang Dipetakan (m / ha; UTM atau Cylindrical Equal Area)", "Skala Peta (angka dan bar)",
    "Arah Utara (panah ke atas, huruf U)", "Catatan Proyeksi (proyeksi, sistem koordinat, datum)", "Keterangan Peta",
    "Dasar dan Sumber Peta (Nama Data, Skala, Instansi, Tahun)", "Catatan (Arial Italic, dalam kotak sendiri)",
    "Peta Situasi (skala angka saja, skala lebih kecil)", "Tanda Tangan/Legalitas", "Nama Instansi Penerbit dan Tahun",
  ],
  signatures: {
    one: "1 pejabat / lampiran SK: setelah catatan proyeksi",
    four: "2-4 pejabat: setelah peta situasi",
    parties: "para pihak: di bawah isi peta dan informasi tepi (kertas +15 cm)",
  },
};

// RBI base-map symbols. "klhk" follows the official KLHK sample maps (SK 399/2024),
// "sni" the RBI colour table of SNI 6502.3:2010 (CMYK -> RGB as printed there).
const KLHK_RBI = {
  klhk: {
    ibukota: { label: "Ibukota Provinsi", patch: { type: "capital", fill: "#FF0000" } },
    ibukotaKab: { label: "Ibukota Kabupaten/Kota", patch: { type: "capital", fill: "#FF0000", radius: 0.9 } },
    negara: { label: "Batas Negara", patch: { type: "line", stroke: "#000000", strokeWidth: 0.5, dash: "negara" } },
    provinsi: { label: "Batas Provinsi", patch: { type: "line", stroke: "#000000", strokeWidth: 0.4, dash: "provinsi" } },
    kabupaten: { label: "Batas Kabupaten/Kota", patch: { type: "line", stroke: "#000000", strokeWidth: 0.35, dash: "kabupaten" } },
    kecamatan: { label: "Batas Kecamatan", patch: { type: "line", stroke: "#000000", strokeWidth: 0.25, dash: "dashdot" } },
    pantai: { label: "Garis Pantai", patch: { type: "line", stroke: "#00C1FF", strokeWidth: 0.35 } },
    jalan: { label: "Jalan", patch: { type: "line", stroke: "#FF0000", strokeWidth: 0.4 } },
    sungai: { label: "Sungai", patch: { type: "river", stroke: "#00A4E5", strokeWidth: 0.45 } },
    danau: { label: "Danau / Waduk", patch: { type: "lake", fill: "#BEE8FF", stroke: "#00A4E5" } },
    laut: { label: "Laut", patch: { type: "fill", fill: "#BEE8FF" } },
  },
  sni: {
    negara: { label: "Batas Negara", patch: { type: "line", stroke: "#000000", strokeWidth: 0.5, dash: "negara" } },
    provinsi: { label: "Batas Provinsi", patch: { type: "line", stroke: "#000000", strokeWidth: 0.4, dash: "provinsi" } },
    kabupaten: { label: "Batas Kabupaten/Kota", patch: { type: "line", stroke: "#000000", strokeWidth: 0.35, dash: "kabupaten" } },
    kecamatan: { label: "Batas Kecamatan", patch: { type: "line", stroke: "#000000", strokeWidth: 0.25, dash: "dashdot" } },
    pantai: { label: "Garis Pantai", patch: { type: "line", stroke: "#00FFFF", strokeWidth: 0.35 } },
    jalanArteri: { label: "Jalan Arteri", patch: { type: "line", stroke: "#FF66FF", strokeWidth: 0.6 } },
    jalanKolektor: { label: "Jalan Kolektor", patch: { type: "line", stroke: "#000000", strokeWidth: 0.45 } },
    jalanLain: { label: "Jalan Lain", patch: { type: "line", stroke: "#FF99FF", strokeWidth: 0.3 } },
    sungai: { label: "Sungai", patch: { type: "river", stroke: "#00FFFF", strokeWidth: 0.45 } },
    danau: { label: "Danau / Waduk", patch: { type: "lake", fill: "#CCFFFF", stroke: "#00FFFF" } },
    laut: { label: "Laut", patch: { type: "fill", fill: "#CCFFFF" } },
  },
};
const KLHK_RBI_GROUPS = [
  ["BATAS ADMINISTRASI", ["ibukota", "ibukotaKab", "negara", "provinsi", "kabupaten", "kecamatan", "pantai"]],
  ["PERHUBUNGAN", ["jalan", "jalanArteri", "jalanKolektor", "jalanLain"]],
  ["PERAIRAN", ["sungai", "danau", "laut"]],
];

// Fungsi kawasan hutan by name or code, with the colours of KWSHUTAN_AR_250K.lyr.
// Order matters: the more specific tests come first.
const KLHK_KAWASAN = [
  { key: "KKL", label: "Kawasan Konservasi Laut", patch: { type: "fill", fill: "none", stroke: "#C500FF", strokeWidth: 0.42 }, map: { fill: null, line: "#C500FF", width: 1.6 }, test: /(laut|perairan)/i, codes: ["100201", "100211", "100221", "100241", "100251"] },
  { key: "KK", label: "Kawasan Konservasi", patch: { type: "fill", fill: "#AD3FFF" }, map: { fill: "#AD3FFF" }, test: /(ksa|kpa|konservasi|cagar|suaka|taman|tahura|^tn$|^twa$|^tb$|^ca$|^sm$)/i, codes: ["100000", "100200", "100210", "100220", "100230", "100240", "100250", "100260"] },
  { key: "HL", label: "Hutan Lindung", patch: { type: "fill", fill: "#00AD00" }, map: { fill: "#00AD00" }, test: /(lindung|^hl$)/i, codes: ["100100"] },
  { key: "HPK", label: "Hutan Produksi yang dapat Dikonversi", patch: { type: "fill", fill: "#FF5EFF" }, map: { fill: "#FF5EFF" }, test: /(konversi|^hpk$)/i, codes: ["100500"] },
  { key: "HPT", label: "Hutan Produksi Terbatas", patch: { type: "fill", fill: "#8AF200" }, map: { fill: "#8AF200" }, test: /(terbatas|^hpt$)/i, codes: [] },
  { key: "HP", label: "Hutan Produksi Tetap", patch: { type: "fill", fill: "#FFFF00" }, map: { fill: "#FFFF00" }, test: /(produksi( tetap)?$|^hp$)/i, codes: [] },
  { key: "APL", label: "Area Penggunaan Lain", patch: { type: "fill", fill: "#FFFFFF", stroke: "#999999", strokeWidth: 0.1 }, map: { fill: "#FFFFFF" }, test: /(penggunaan lain|^apl$)/i, codes: ["100700"] },
  { key: "AIR", label: "Tubuh Air", patch: { type: "fill", fill: "#CCFFFF" }, map: { fill: "#CCFFFF" }, test: /(tubuh air|danau|^air$)/i, codes: ["500100", "500300"] },
];
// KLHK forest-function codes (Kode Kawasan Hutan): 1001 HL, 1002x KSA/KPA (CA 10021, SM 10022,
// TB 10023, TN 10024, TWA 10025, Tahura 10026; a last digit 1/2 = marine), 1003 HP, 1004 HPT,
// 1005 HPK, 1006 HNB, 1007 APL, 1009 HFK, 5001 perairan. The 6-digit form pads with zeros
// (100300 = HP, 100400 = HPT), as in KWSHUTAN_AR_250K.lyr.

// class of a catalogue symbol by its colours (the forest-area layer is keyed by code)
function klhkKawasanByColor(s) {
  if (!s) return null;
  const f = (s.f || "").toUpperCase();
  if (!f && (s.o || "").toUpperCase() === "#C500FF") return KLHK_KAWASAN[0];
  return KLHK_KAWASAN.find((c) => c.map.fill && c.map.fill.toUpperCase() === f) || null;
}

function klhkKawasanCode(value) {
  const v = String(value ?? "").trim();
  if (!/^\d{4,6}$/.test(v)) return null;
  const by = (key) => KLHK_KAWASAN.find((c) => c.key === key);
  if (v[0] === "5") return by("AIR");
  const d = v.padEnd(6, "0");
  const fn = d[3];
  if (fn === "2") return d[5] !== "0" ? by("KKL") : by("KK");
  return { 1: by("HL"), 3: by("HP"), 4: by("HPT"), 5: by("HPK"), 7: by("APL") }[fn] || null;
}

function klhkKawasanClass(value) {
  const v = String(value ?? "").trim();
  return klhkKawasanCode(v) || KLHK_KAWASAN.find((c) => c.test.test(v)) || null;
}

// ---- thematic catalogue lookup
function klhkThemes(query = "") {
  const q = String(query).toLowerCase();
  return KLHK_SYMBOLOGY.filter((t) => !t.error && (!q || `${t.id} ${t.unit} ${t.sub} ${t.name}`.toLowerCase().includes(q))).map((t) => ({ id: t.id, unit: t.unit, sub: t.sub, geom: t.geom, field: t.field || null, classes: t.classes?.length || 0 }));
}
function klhkTheme(id) {
  const t = KLHK_SYMBOLOGY.find((x) => x.id === id) || KLHK_SYMBOLOGY.find((x) => x.id.toLowerCase().includes(String(id).toLowerCase()));
  return t ? clone(t) : null;
}

// A catalogue symbol as a legend patch.
function klhkPatch(s, geom) {
  if (!s) return { type: "fill", fill: "#cccccc" };
  if (s.m) return { type: "point", fill: s.c || "#000000", radius: Math.max(0.6, (s.z || 2) / 2), stroke: s.o || null, strokeWidth: s.ow || 0.15 };
  if (geom === "line" || (s.c !== undefined && s.f === undefined)) return { type: "line", stroke: s.c || "#000000", strokeWidth: Math.max(0.2, s.w || 0.3), dash: s.d && s.d !== "solid" ? (s.d.includes("dot") ? "dot" : "dash") : undefined };
  const hatch = s.h || s.L?.find((l) => l.h)?.h;
  const fill = s.f || s.L?.find((l) => l.f)?.f || (s.p ? s.f : null);
  if (hatch) return { type: "hatch", fill: fill || "none", angle: hatch.a ?? 45, spacing: Math.max(0.8, (hatch.s || 2) * 0.6), hatchColor: hatch.c || "#000000", hatchWidth: hatch.w || 0.15, stroke: s.o || null, strokeWidth: s.ow || 0.15 };
  return { type: "fill", fill: fill || "none", stroke: s.o || (fill ? null : "#666666"), strokeWidth: s.ow || 0.15 };
}

// Legend entries for a catalogue theme (or only the classes whose values are present).
function klhkLegendEntries(theme, present) {
  const t = typeof theme === "string" ? klhkTheme(theme) : theme;
  if (!t) return [];
  const keep = present ? new Set([...present].map(String)) : null;
  const out = [];
  if (t.classes) {
    let group = null;
    const named = new Set();
    for (const c of t.classes) {
      if (keep && !keep.has(String(c.v ?? c.l))) continue;
      const sy = c.s || {};
      if (!sy.f && !sy.o && !sy.h && !sy.L && !sy.m && !sy.c && !sy.p) continue; // classes drawn with nothing
      // forest-function codes: name the class after its official colour, list each once
      if (/^\d{6}$/.test(String(c.l))) {
        const k = klhkKawasanByColor(c.s);
        if (!k || named.has(k.key)) continue;
        named.add(k.key);
        out.push({ key: `klhk:${t.id}:${k.key}`, kind: "item", label: k.label, patch: clone(k.patch), manual: true, userLabel: true });
        continue;
      }
      if (c.g && c.g !== group) {
        group = c.g;
        out.push({ key: `klhk:${t.id}:g:${group}`, kind: "group", label: group, manual: true });
      }
      out.push({ key: `klhk:${t.id}:${c.v ?? c.l}`, kind: "item", label: c.l, patch: klhkPatch(c.s, t.geom), manual: true, userLabel: true });
    }
  } else if (t.symbol) out.push({ key: `klhk:${t.id}`, kind: "item", label: t.label || t.name, patch: klhkPatch(t.symbol, t.geom), manual: true, userLabel: true });
  return out;
}

// RBI legend block: group headings + the requested symbols, e.g. ["provinsi","sungai","jalan"].
function klhkBaseLegend(keys, variant = "klhk") {
  const set = KLHK_RBI[variant] || KLHK_RBI.klhk;
  const want = new Set(keys || Object.keys(set));
  const out = [];
  for (const [head, ks] of KLHK_RBI_GROUPS) {
    const items = ks.filter((k) => want.has(k) && set[k]);
    if (!items.length) continue;
    out.push({ key: `rbi:g:${head}`, kind: "group", label: head, manual: true });
    for (const k of items) out.push({ key: `rbi:${k}`, kind: "item", label: set[k].label, patch: clone(set[k].patch), manual: true, userLabel: true });
  }
  return out;
}

// ---- styling GeoLibre layers
function klhkStyleLayers(layerId) {
  const m = mainMap();
  if (!m) throw new Error("GeoLibre map not available");
  return { m, layers: styleLayersFor(m.getStyle(), layerId) };
}

// Kawasan hutan: colour a polygon layer by a function field (name, class code or KLHK code).
// Returns legend entries (KLHK order) for the classes present.
async function klhkStyleKawasan(layerId, field) {
  const feats = await S.app.getLayerFeatures(layerId);
  const list = feats?.features || feats || [];
  const values = [...new Set(list.map((f) => f.properties?.[field]).filter((v) => v != null).map(String))];
  const byClass = new Map();
  for (const v of values) {
    const c = klhkKawasanClass(v);
    if (c) byClass.set(v, c);
  }
  const fillExpr = ["match", ["to-string", ["get", field]]];
  const lineExpr = ["match", ["to-string", ["get", field]]];
  const widthExpr = ["match", ["to-string", ["get", field]]];
  for (const [v, c] of byClass) {
    fillExpr.push(v, c.map.fill || "rgba(0,0,0,0)");
    lineExpr.push(v, c.map.line || "rgba(0,0,0,0)");
    widthExpr.push(v, c.map.width || 0);
  }
  fillExpr.push("#F0F0F0");
  lineExpr.push("rgba(0,0,0,0)");
  widthExpr.push(0);
  const { m, layers } = klhkStyleLayers(layerId);
  for (const l of layers) {
    if (l.type === "fill") {
      m.setPaintProperty(l.id, "fill-color", byClass.size ? fillExpr : "#F0F0F0");
      m.setPaintProperty(l.id, "fill-opacity", 1);
      m.setPaintProperty(l.id, "fill-outline-color", "rgba(0,0,0,0)");
    } else if (l.type === "line") {
      m.setPaintProperty(l.id, "line-color", byClass.size ? lineExpr : "rgba(0,0,0,0)");
      m.setPaintProperty(l.id, "line-width", byClass.size ? widthExpr : 0);
    }
  }
  S.styleEpoch = (S.styleEpoch || 0) + 1;
  const present = new Set(byClass.values());
  return KLHK_KAWASAN.filter((c) => present.has(c)).map((c) => ({ key: `klhk:kawasan:${c.key}`, kind: "item", label: c.label, patch: clone(c.patch), manual: true, userLabel: true }));
}

// Any catalogue theme: colour a GeoLibre layer by its field (unique values) or one symbol.
async function klhkApplyTheme(layerId, themeId, field) {
  const t = klhkTheme(themeId);
  if (!t) throw new Error(`No KLHK theme ${themeId}`);
  const f = field || t.field?.[0];
  const { m, layers } = klhkStyleLayers(layerId);
  const color = (s, kind) => {
    if (!s) return null;
    if (kind === "fill") return s.f || s.L?.find((l) => l.f)?.f || s.p?.fg || null;
    if (kind === "line") return s.c || s.o || null;
    return s.c || s.f || null;
  };
  const expr = (kind, fallback) => {
    if (!t.classes || !f) return color(t.symbol, kind) || fallback;
    const e = ["match", ["to-string", ["get", f]]];
    for (const c of t.classes) if (c.v != null && color(c.s, kind)) e.push(String(c.v), color(c.s, kind));
    e.push(color(t.other, kind) || fallback);
    return e.length > 3 ? e : fallback;
  };
  for (const l of layers) {
    if (l.type === "fill") {
      m.setPaintProperty(l.id, "fill-color", expr("fill", "#cccccc"));
      m.setPaintProperty(l.id, "fill-opacity", 1);
    } else if (l.type === "line") m.setPaintProperty(l.id, "line-color", expr("line", "#333333"));
    else if (l.type === "circle") m.setPaintProperty(l.id, "circle-color", expr("point", "#333333"));
  }
  S.styleEpoch = (S.styleEpoch || 0) + 1;
  let present = null;
  if (f) {
    const feats = await S.app.getLayerFeatures(layerId).catch(() => null);
    const list = feats?.features || feats || [];
    if (list.length) present = new Set(list.map((x) => String(x.properties?.[f])));
  }
  return klhkLegendEntries(t, present);
}

// ---- basemaps in the KLHK / RBI look (OpenFreeMap vector tiles) and Mapzen terrain hillshade
const KLHK_TERRAIN = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
function klhkBasemapStyle(variant = "klhk", { hillshade = false, glyphs } = {}) {
  const c = variant === "sni"
    ? { land: "#FFFFFF", water: "#CCFFFF", coast: "#00FFFF", river: "#00FFFF", road: "#FF66FF", road2: "#FF99FF" }
    : { land: "#FFFFFF", water: "#BEE8FF", coast: "#00C1FF", river: "#00A4E5", road: "#FF0000", road2: "#FF7A7A" };
  const style = {
    version: 8,
    glyphs: glyphs || "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    layers: [
      { id: "klhk-bg", type: "background", paint: { "background-color": c.land } },
      { id: "klhk-water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": c.water } },
      { id: "klhk-coast", type: "line", source: "omt", "source-layer": "water", filter: ["==", ["get", "class"], "ocean"], paint: { "line-color": c.coast, "line-width": 0.8 } },
      { id: "klhk-river", type: "line", source: "omt", "source-layer": "waterway", filter: ["in", ["get", "class"], ["literal", ["river", "canal"]]], paint: { "line-color": c.river, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 12, 1.4] } },
      { id: "klhk-stream", type: "line", source: "omt", "source-layer": "waterway", minzoom: 10, filter: ["in", ["get", "class"], ["literal", ["stream", "ditch", "drain"]]], paint: { "line-color": c.river, "line-width": 0.5 } },
      { id: "klhk-road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 10, filter: ["in", ["get", "class"], ["literal", ["minor", "service", "track"]]], paint: { "line-color": c.road2, "line-width": 0.5 } },
      { id: "klhk-road", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]], paint: { "line-color": c.road, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 12, 1.6] } },
      { id: "klhk-bnd-kab", type: "line", source: "omt", "source-layer": "boundary", filter: ["all", ["in", ["get", "admin_level"], ["literal", [5, 6]]], ["!=", ["get", "maritime"], 1]], paint: { "line-color": "#000000", "line-width": 0.6, "line-dasharray": [5, 1.6, 0.6, 1.6] } },
      { id: "klhk-bnd-prov", type: "line", source: "omt", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]], paint: { "line-color": "#000000", "line-width": 0.9, "line-dasharray": [6, 1.6, 2, 1.6] } },
      { id: "klhk-bnd-negara", type: "line", source: "omt", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]], paint: { "line-color": "#000000", "line-width": 1.2, "line-dasharray": [2.2, 1.8] } },
      { id: "klhk-place", type: "symbol", source: "omt", "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town"]]], layout: { "text-field": ["coalesce", ["get", "name:id"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 5, 9, 12, 12], "text-offset": [0, 0.7], "text-anchor": "top" }, paint: { "text-color": "#000000", "text-halo-color": "#FFFFFF", "text-halo-width": 1 } },
      { id: "klhk-place-dot", type: "circle", source: "omt", "source-layer": "place", filter: ["==", ["get", "class"], "city"], paint: { "circle-color": "#FF0000", "circle-radius": 3, "circle-stroke-color": "#000000", "circle-stroke-width": 0.5 } },
    ],
  };
  if (hillshade) {
    style.sources["mapzen-terrain"] = { type: "raster-dem", tiles: [KLHK_TERRAIN], encoding: "terrarium", tileSize: 256, maxzoom: 15, attribution: "Mapzen Terrain Tiles (AWS Open Data)" };
    style.layers.splice(1, 0, { id: "klhk-hillshade", type: "hillshade", source: "mapzen-terrain", paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#5a5a5a", "hillshade-highlight-color": "#FFFFFF" } });
  }
  return style;
}

// ---- the official layout, built for a scale (or explicit paper size)
// opts: { scale, paper:[w,h], signers: 1|4|"parties", name, title, area, legend:[entries],
//         dasar, sumber, catatan, instansi, tahun, logos:[src], lampiran:{nomor,tanggal},
//         signature: {an, jabatan, nama, nip}, mapView:{center,zoom}, situasiView:{center,zoom},
//         basemap, nlp }
function klhkLayoutDoc(opts = {}) {
  const sz = KLHK_SPEC.sizes.find((s) => s.scale === opts.scale) || KLHK_SPEC.sizes.find((s) => s.scale >= (opts.scale || 50000)) || KLHK_SPEC.sizes[2];
  const parties = opts.signers === "parties";
  const [W, H0] = opts.paper || sz.paper;
  const H = H0 + (parties ? KLHK_SPEC.partiesExtraHeight : 0);
  const doc = newDoc(opts.name || "Peta KLHK");
  Object.assign(doc.page, { size: "custom", orientation: W >= H ? "landscape" : "portrait", width: W, height: H, margin: 0, showMargin: false });
  const k = clamp(W / 420, 0.75, 2.4) * 1.12; // type scale: A3 ≈ 1
  const F = (size, extra = {}) => ({ family: "Arial", size: round(size * k, 1), bold: false, italic: false, color: "#000000", spacing: 0, ...extra });
  const items = doc.items;
  const add = (type, rect, name, props = {}, top = {}) => {
    const it = newItem(type, rect.x, rect.y);
    Object.assign(it, { w: round(rect.w, 2), h: round(rect.h, 2), name, ...top });
    it.props = deepMerge(it.props, props);
    items.push(it);
    return it;
  };
  const box = (r, name, sw = 0.25) => add("shape", r, name, { shape: "rect", fill: "", stroke: "#000000", strokeWidth: sw });
  const text = (r, name, t, font, extra = {}) => add("text", r, name, { text: t, font, align: "center", valign: "middle", wrap: true, autoHeight: false, lineHeight: 1.2, ...extra });

  const m = round(W * 0.0275, 1); // outer margin
  const g = round(W * 0.0125, 1); // gutter for grid labels
  const pw = round(W * 0.205, 1); // marginal panel width
  const bottomH = parties ? KLHK_SPEC.partiesExtraHeight - g : 0;
  const top = m + g;
  const faceH = H - 2 * (m + g) - (parties ? bottomH + g : 0);
  const px = W - m - g * 0.6 - pw;
  box({ x: m, y: m, w: W - 2 * m, h: H - 2 * m }, "Garis tepi", 0.6);

  // isi peta
  const map = add("map", { x: m + g, y: top, w: px - g * 1.4 - (m + g), h: faceH }, "Isi peta", {
    source: "live",
    basemap: opts.basemap || "geolibre",
    view: opts.mapView || { center: [118, -2], zoom: 4, bearing: 0 },
    frame: { show: true, color: "#000000", width: 0.4 },
    grid: { show: true, type: "dms", lang: "id", style: "lines", color: KLHK_SPEC.grid.line, width: 0.25, opacity: 1, labelPos: "outside", labels: { top: true, bottom: true, left: true, right: true }, font: F(5.5) },
  });

  // informasi tepi: every block at its natural height, the legend gets what is left,
  // spare room is shared evenly between blocks; publisher and year sit at the bottom.
  box({ x: px, y: top, w: pw, h: faceH }, "Panel informasi tepi", 0.35);
  const ix = px + pw * 0.06;
  const iw = pw * 0.88;
  const hU = (f) => round(faceH * f, 2);
  const textH = (str, font, w, lh = 1.2) => String(str).split("\n").reduce((n, part) => n + Math.max(1, wrapText(part, font, w).length), 0) * font.size * PT * lh + 1.4;
  const blocks = [];
  const block = (h, draw, flex = false) => blocks.push({ h, draw, flex });
  if (opts.nlp) text({ x: px + pw * 0.55, y: m + g * 0.15, w: pw * 0.45, h: g * 0.7 }, "Nomor lembar peta", opts.nlp, F(5));
  const logos = opts.logos?.length ? opts.logos : null;
  const lh = hU(0.055);
  block(lh, (y) => {
    if (logos) {
      const n = logos.length;
      const gap = iw * 0.03;
      const each = Math.min((iw - gap * (n - 1)) / n, lh * 1.6);
      const tot = each * n + gap * (n - 1);
      logos.forEach((src, i) => add("image", { x: ix + (iw - tot) / 2 + i * (each + gap), y, w: each, h: lh }, `Logo ${i + 1}`, { src, fit: "contain" }));
    } else text({ x: ix, y, w: iw, h: lh }, "Logo instansi", "LOGO INSTANSI PENERBIT PETA", F(5));
  });
  const tf = F(12.5, { bold: true });
  const title = String(opts.title || "JUDUL PETA").toUpperCase();
  block(textH(title, tf, iw, 1.15), (y, h) => text({ x: ix, y, w: iw, h }, "Judul peta", title, tf, { lineHeight: 1.15 }));
  if (opts.area !== false) {
    const af = F(6.5);
    const at = opts.area || "LUAS : ± … Ha";
    block(textH(at, af, iw), (y, h) => text({ x: ix, y, w: iw, h }, "Luas areal", at, af));
  }
  const sf = F(7);
  const sbf = F(5.5);
  const barH = round(1.6 * k, 2);
  const sbH = sbf.size * PT * 2 + barH + 4;
  const sfH = sf.size * PT * 1.2 + 1;
  block(sfH + 1.5 + sbH, (y) => {
    add("scalebar", { x: ix, y, w: iw, h: sfH }, "Skala angka", { linkedMap: map.id, style: "numeric", numericPrefix: "SKALA ", align: "center", font: sf, locale: "id" });
    add("scalebar", { x: ix + iw * 0.04, y: y + sfH + 1.5, w: iw * 0.88, h: sbH }, "Skala bar", { linkedMap: map.id, style: "dual", dualBase: "paper", dualSplit: false, units: "km", segments: 4, barHeight: barH, lineWidth: 0.2, font: sbf });
  });
  const nh = hU(0.045);
  block(nh, (y) => add("north", { x: ix + iw / 2 - nh * 0.45, y, w: nh * 0.9, h: nh }, "Arah utara", { label: "U", linkedMap: map.id, variant: "classic" }));
  const pf = F(5.5);
  const proj = opts.proyeksi || "Sistem Proyeksi : Geografis\nSistem Koordinat : Geografis\nDatum : WGS 1984 / SRGI";
  block(textH(proj, pf, iw, 1.25), (y, h) => text({ x: ix, y, w: iw, h }, "Catatan proyeksi", proj, pf, { align: "left", lineHeight: 1.25 }));
  const one = opts.signers === 1 || opts.signers == null;
  if (opts.lampiran || one) {
    const L = opts.lampiran || {};
    const lt = `${L.judul || "Lampiran Surat …"}\nNomor : ${L.nomor || "…"}\nTanggal : ${L.tanggal || "…"}`;
    const lf = F(5.5, { bold: !!L.judul });
    block(textH(lt, lf, iw, 1.25), (y, h) => text({ x: ix, y, w: iw, h }, "Nomor surat", lt, lf, { align: "left", lineHeight: 1.25 }));
  }
  const sigText = (sg) => (sg ? `${sg.an ? `${sg.an}\n` : ""}${sg.jabatan || "Jabatan"},\n\n\n\n${sg.nama || "Nama"}${sg.nip ? `\nNIP. ${sg.nip}` : ""}` : "Tanda Tangan / Legalitas\n\n\n\n");
  if (one) {
    const gf = F(6);
    const st = sigText(opts.signature);
    block(textH(st, gf, iw), (y, h) => text({ x: ix, y, w: iw, h }, "Tanda tangan", st, gf));
  }
  // legend: flexible, sized below
  const legendBlock = { h: 0, flex: true, draw: null };
  blocks.push(legendBlock);
  const list = (head, v) => (v ? `${head}\n${[].concat(v).map((t, i) => `${i + 1}. ${t}`).join("\n")}` : `${head}\n…`);
  const df = F(5);
  const ds = `${list("Dasar :", opts.dasar)}\n${list("Sumber :", opts.sumber)}`;
  block(textH(ds, df, iw), (y, h) => text({ x: ix, y, w: iw, h }, "Dasar dan sumber peta", ds, df, { align: "left", valign: "top", lineHeight: 1.2 }));
  if (opts.catatan !== false) {
    const cf = F(5, { italic: true });
    const ct = list("Catatan :", opts.catatan);
    const ch = textH(ct, cf, iw - 2) + 1;
    block(ch, (y, h) => {
      box({ x: ix, y, w: iw, h }, "Kotak catatan", 0.2);
      text({ x: ix + 1, y: y + 0.5, w: iw - 2, h: h - 1 }, "Catatan", ct, cf, { align: "left", valign: "top", lineHeight: 1.2 });
    });
  }
  // peta situasi: own grid, red box of the mapped area, numeric scale only
  const situasiH = hU(0.17);
  block(situasiH, (y) => {
    const sit = add("map", { x: ix + g * 0.5, y: y + g * 0.35, w: iw - g, h: situasiH - g * 0.9 }, "Peta situasi", {
      source: "live", basemap: opts.situasiBasemap || "klhk", view: opts.situasiView || { center: [118, -2.5], zoom: 3, bearing: 0 },
      frame: { show: true, color: "#000000", width: 0.3 },
      grid: { show: true, type: "dms", lang: "id", style: "lines", color: KLHK_SPEC.grid.line, width: 0.2, interval: opts.situasiInterval || 10, labelPos: "outside", labels: { top: true, bottom: true, left: true, right: true }, font: F(4.2) },
      overview: { source: map.id, color: "#FF0000", width: 0.5, fill: "#FF0000", fillOpacity: 0, marker: "rect" },
    });
    const kf = F(4);
    add("legend", { x: sit.x + 0.8, y: sit.y + sit.h - kf.size * PT * 1.2 - 3.2, w: sit.w * 0.42, h: kf.size * PT * 1.2 + 2.4 }, "Keterangan peta situasi", {
      title: "", itemFont: kf, patchW: round(3.5 * k, 1), patchH: round(2 * k, 1), padding: 0.6, background: "#FFFFFF", border: { show: true, color: "#000000", width: 0.15 }, autoSync: false, showGroups: false,
      entries: [{ key: "sit:loc", kind: "item", label: "Lokasi yang dipetakan", patch: { type: "fill", fill: "none", stroke: "#FF0000", strokeWidth: 0.4 }, manual: true, userLabel: true }],
    });
    add("scalebar", { x: sit.x + sit.w * 0.5, y: sit.y + 0.8, w: sit.w * 0.48, h: F(4.2).size * PT * 1.2 + 1 }, "Skala peta situasi", { linkedMap: sit.id, style: "numeric", numericPrefix: "Skala ", align: "right", font: F(4.2), locale: "id" });
  });
  if (opts.signers === 4) {
    const sign4H = hU(0.11);
    block(sign4H, (y) => {
      const roles = opts.roles || ["Pembuat", "Pemeriksa", "Mengetahui", "Mengesahkan"];
      const cw = iw / 2;
      const ch = sign4H / 2;
      roles.slice(0, 4).forEach((r, i) => {
        const r0 = { x: ix + (i % 2) * cw, y: y + Math.floor(i / 2) * ch, w: cw, h: ch };
        box(r0, `Kotak TTD ${i + 1}`, 0.2);
        text(r0, `TTD ${r}`, `Tanda Tangan / Legalitas\n${r}`, F(5));
      });
    });
  }
  const pubF = F(7, { bold: true });
  const pub = `${String(opts.instansi || "NAMA INSTANSI PENERBIT PETA").toUpperCase()}\n${opts.tahun ? `TAHUN ${opts.tahun}` : "TAHUN PENERBITAN PETA"}`;
  block(textH(pub, pubF, iw, 1.25), (y, h) => text({ x: ix, y, w: iw, h }, "Instansi penerbit", pub, pubF, { lineHeight: 1.25 }));

  // size the legend from the room left, then share the spare space
  const pad = hU(0.012);
  const inner = faceH - 2 * pad;
  const minGap = hU(0.01);
  const fixed = blocks.reduce((t, b) => t + (b.flex ? 0 : b.h), 0);
  const room = Math.max(10, inner - fixed - minGap * (blocks.length - 1));
  const lg = add("legend", { x: ix, y: 0, w: iw, h: room }, "Keterangan peta", {
    title: "KETERANGAN", titleFont: F(7, { bold: true }), groupFont: F(5.8), itemFont: F(5.8), patchW: round(6 * Math.sqrt(k), 1), patchH: round(3.2 * Math.sqrt(k), 1), rowGap: round(0.8 * Math.sqrt(k), 2), padding: 0.5, background: "",
    linkedMap: map.id, autoSync: !opts.legend, entries: opts.legend || [], columns: 1, colGap: 2 * k, autoHeight: false,
  });
  klhkFitLegend(lg, room / 1.15, opts.legendColumns);
  legendBlock.h = Math.min(room, layoutLegend(lg).height * 1.15 + 1);
  legendBlock.draw = (y, h) => Object.assign(lg, { y: round(y, 2), h: round(h, 2) });
  const gap = Math.max(minGap, (inner - fixed - legendBlock.h) / (blocks.length - 1));
  let y = top + pad;
  for (const b of blocks) {
    b.draw(y, b.h);
    y += b.h + gap;
  }
  if (parties) {
    const r = { x: m + g, y: top + faceH + g, w: W - 2 * (m + g), h: bottomH };
    box(r, "Kotak TTD para pihak", 0.3);
    text(r, "TTD para pihak", "TANDA TANGAN BERBAGAI PIHAK", F(12));
  }
  return doc;
}

// Make a legend fit its box: up to 2 columns on narrow panels (3 on wide ones),
// then smaller type, measured with the real legend layout.
function klhkFitLegend(item, maxH, fixedCols) {
  const p = item.props;
  const base = { t: p.titleFont.size, g: p.groupFont.size, i: p.itemFont.size, pw: p.patchW, ph: p.patchH, gap: p.rowGap };
  const maxCols = fixedCols || (item.w > 110 ? 3 : 2);
  // one column reads best: shrink the type a little before adding columns
  const tries = [];
  for (let cols = fixedCols || 1; cols <= maxCols; cols++) for (const scale of cols === 1 ? [1, 0.92, 0.85] : [1, 0.92, 0.85, 0.78, 0.7]) tries.push([cols, scale]);
  for (const [cols, scale] of tries) {
    {
      p.columns = cols;
      p.titleFont.size = round(base.t * scale, 1);
      p.groupFont.size = round(base.g * scale, 1);
      p.itemFont.size = round(base.i * scale, 1);
      p.patchW = round(base.pw * scale, 1);
      p.patchH = round(base.ph * scale, 1);
      p.rowGap = round(base.gap * scale, 2);
      if (layoutLegend(item).height <= maxH) return true;
    }
  }
  return false;
}

// Create and open the layout; frame the main map on GeoLibre's current view.
function klhkNewLayout(opts = {}) {
  const doc = klhkLayoutDoc(opts);
  newLayout(doc);
  const map = doc.items.find((i) => i.name === "Isi peta");
  if (map && !opts.mapView) viewFromGeoLibre(map);
  for (const l of doc.items.filter((i) => i.type === "legend" && i.props.autoSync)) syncLegendEntries(l);
  saveLibrary();
  renderAll();
  fitPage();
  return doc.id;
}
