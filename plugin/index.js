// GeoLibre Layout Composer — a QGIS-style print layout designer for GeoLibre.
// Built from src/*.js by build.sh into one self-contained ES module.
//
// Every layout item is described in millimetres on the page and rendered to an
// SVG fragment (map items additionally host a live MapLibre instance). The same
// SVG drives the on-screen preview and the PNG/PDF/SVG export, so what you see
// is what gets printed.

const PLUGIN_ID = "geolibre-layout-composer";
const PLUGIN_NAME = "Layout Composer";
const PLUGIN_VERSION = "1.6.0";
const NS = "glc"; // CSS class prefix
const STORE_KEY = "glc:layouts:v1";
const PX96 = 96 / 25.4; // CSS px per mm at 96 dpi
const PT = 0.352778; // mm per typographic point
const EARTH_CIRC = 40075016.686;

const PAPER_SIZES = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  B4: [250, 353],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
  Tabloid: [279.4, 431.8],
  "F4 / Folio": [215, 330],
};

const FONTS = [
  "Arial",
  "Helvetica",
  "Segoe UI",
  "Calibri",
  "Tahoma",
  "Verdana",
  "Trebuchet MS",
  "Century Gothic",
  "Franklin Gothic Medium",
  "Gill Sans MT",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Book Antiqua",
  "Palatino Linotype",
  "Cambria",
  "Courier New",
  "Consolas",
  "Impact",
];

const BASEMAP_STYLES = {
  geolibre: "Same as GeoLibre",
  liberty: "Streets",
  positron: "Light gray",
  bright: "Bright streets",
  satellite: "Satellite imagery",
  topo: "Topographic",
  none: "None (layers only)",
};
const BASEMAP_URLS = {
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
  bright: "https://tiles.openfreemap.org/styles/bright",
};
const RASTER_BASEMAPS = {
  satellite: {
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Esri, Maxar, Earthstar Geographics",
  },
  topo: {
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Esri",
  },
};

// ---------------------------------------------------------------- utilities
let uidCounter = 0;
function uid(prefix = "it") {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d = 2) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const clone = (o) => JSON.parse(JSON.stringify(o));
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}
function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && base?.[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else out[k] = v;
  }
  return out;
}
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}
function debounce(fn, ms) {
  let t = null;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function fmtNumber(n, decimals = 0) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function todayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
}
function safeName(s) {
  return String(s || "layout").replace(/[^\w\-]+/g, "_").slice(0, 60) || "layout";
}

// Text measurement for wrapping/legend layout (mm in, mm out).
const measureCtx = (() => {
  let ctx = null;
  return () => {
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    return ctx;
  };
})();
function textWidthMm(text, font) {
  const ctx = measureCtx();
  // Measure at 100px then scale: font.size is in pt.
  ctx.font = `${font.italic ? "italic " : ""}${font.bold ? "bold " : ""}100px "${font.family || "Arial"}"`;
  const px = ctx.measureText(String(text)).width;
  return (px / 100) * (font.size || 10) * PT * (1 + (font.spacing || 0) * 0.0);
}
function wrapText(text, font, maxWidthMm) {
  const out = [];
  for (const para of String(text ?? "").split("\n")) {
    if (!maxWidthMm || maxWidthMm <= 0) {
      out.push(para);
      continue;
    }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const w of words) {
      const test = line + w;
      if (line && textWidthMm(test.trimEnd(), font) > maxWidthMm) {
        out.push(line.trimEnd());
        line = w.trimStart();
      } else line = test;
    }
    out.push(line.trimEnd());
  }
  return out;
}
function fontAttrs(f) {
  return [
    `font-family="${esc(f.family || "Arial")}, Arial, sans-serif"`,
    `font-size="${round((f.size || 10) * PT, 3)}"`,
    f.bold ? `font-weight="bold"` : "",
    f.italic ? `font-style="italic"` : "",
    `fill="${esc(f.color || "#000")}"`,
    f.spacing ? `letter-spacing="${round(f.spacing * PT * 0.1, 3)}"` : "",
  ].join(" ");
}
function haloAttrs(f) {
  if (!f.halo) return "";
  return `stroke="${esc(f.haloColor || "#fff")}" stroke-width="${round((f.haloWidth || 0.6) * 1, 3)}" paint-order="stroke" stroke-linejoin="round"`;
}
function applyCase(text, mode) {
  if (mode === "upper") return String(text).toUpperCase();
  if (mode === "lower") return String(text).toLowerCase();
  if (mode === "title") return String(text).replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
  return text;
}
function dashArray(style, w) {
  const s = Math.max(w, 0.2);
  if (style === "dash") return `${s * 4} ${s * 2.5}`;
  if (style === "dot") return `${s * 0.1} ${s * 2}`;
  if (style === "longdash") return `${s * 9} ${s * 3}`;
  if (style === "longdashdot") return `${s * 9} ${s * 3} ${s * 0.1} ${s * 3}`;
  if (style === "dashdot") return `${s * 4} ${s * 2} ${s * 0.1} ${s * 2}`;
  return "";
}

// ---------------------------------------------------------------- state
const S = {
  app: null,
  root: null, // overlay element
  open: false,
  library: null, // {active, layouts:{id: doc}}
  doc: null, // active layout document
  selection: [],
  zoom: 2.5, // screen px per mm
  tool: "select",
  contentMode: null, // map item id being panned
  history: [],
  future: [],
  clipboard: null,
  maps: new Map(), // itemId -> {map, container, key}
  legendCache: new Map(),
  ui: {},
  disposers: [],
  dirtyTimer: null,
};

function newDoc(name = "Layout 1") {
  return {
    id: uid("lay"),
    name,
    page: {
      size: "A4",
      orientation: "landscape",
      width: 297,
      height: 210,
      background: "#ffffff",
      margin: 10,
      showMargin: true,
      gridSize: 5,
      showGrid: false,
      snapGrid: true,
      snapGuides: true,
      showGuides: true,
      guides: { v: [], h: [] },
      border: { show: false, color: "#000000", width: 0.6, double: false, inset: 5, gap: 1.2 },
    },
    items: [],
    vars: { title: "Map Title", author: "", organization: "", source: "", projection: "WGS 84 / Pseudo-Mercator" },
    updated: Date.now(),
  };
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const lib = JSON.parse(raw);
      if (lib && lib.layouts && Object.keys(lib.layouts).length) return lib;
    }
  } catch (e) {
    console.warn("[Layout Composer] could not read saved layouts", e);
  }
  return null;
}
const saveLibrary = debounce(() => {
  if (!S.library) return;
  try {
    if (S.doc) {
      S.doc.updated = Date.now();
      S.library.layouts[S.doc.id] = S.doc;
      S.library.active = S.doc.id;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(S.library));
  } catch (e) {
    console.warn("[Layout Composer] save failed (image may be too large)", e);
    toast("Autosave failed — an image/logo is probably too large. Use Save as JSON instead.", "warn");
  }
}, 600);

// ---------------------------------------------------------------- history
function pushHistory() {
  if (!S.doc) return;
  S.history.push(JSON.stringify(S.doc));
  if (S.history.length > 100) S.history.shift();
  S.future = [];
}
function undo() {
  if (!S.history.length) return;
  S.future.push(JSON.stringify(S.doc));
  S.doc = JSON.parse(S.history.pop());
  S.selection = S.selection.filter((id) => findItem(id));
  afterDocReplaced();
}
function redo() {
  if (!S.future.length) return;
  S.history.push(JSON.stringify(S.doc));
  S.doc = JSON.parse(S.future.pop());
  S.selection = S.selection.filter((id) => findItem(id));
  afterDocReplaced();
}
// Apply a mutation with undo support and re-render.
function commit(fn, { renderProps = true } = {}) {
  pushHistory();
  fn();
  saveLibrary();
  renderAll({ props: renderProps });
}

function findItem(id) {
  return S.doc?.items.find((i) => i.id === id) || null;
}
function selectedItems() {
  return S.selection.map(findItem).filter(Boolean);
}
function mapItems() {
  return (S.doc?.items || []).filter((i) => i.type === "map");
}
function toast(msg, kind = "info") {
  const host = S.root?.querySelector(`.${NS}-toasts`);
  if (!host) return;
  const t = el("div", { class: `${NS}-toast ${NS}-toast-${kind}` }, msg);
  host.appendChild(t);
  setTimeout(() => t.classList.add("out"), 3200);
  setTimeout(() => t.remove(), 3700);
}

// Text variables: {judul}, {tanggal}, {skala}, {skala:<itemName>}, {proyeksi}...
function resolveVars(text, item) {
  let emptied = false;
  const out = String(text ?? "").replace(/\{([\w]+)(?::([^}]+))?\}/g, (m, key, arg) => {
    const v = resolveVar(m, key, arg);
    if (v === "") emptied = true;
    return v;
  });
  // "{organization} · {year}" with an empty variable should not leave a dangling separator
  return emptied ? out.split("\n").map((l) => l.replace(/^[\s·•,|]+|[\s·•,|]+$/g, "")).join("\n") : out;
}
// Indonesian variable names from layouts saved by earlier versions.
const VAR_ALIASES = { judul: "title", pembuat: "author", instansi: "organization", sumber: "source", proyeksi: "projection" };
function resolveVar(m, key, arg) {
  {
    const k = VAR_ALIASES[key.toLowerCase()] || key.toLowerCase();
    if (k === "tanggal" || k === "date") return todayStr();
    if (k === "tahun" || k === "year") return String(new Date().getFullYear());
    if (k === "skala" || k === "scale") {
      const target = arg ? S.doc.items.find((i) => i.type === "map" && i.name === arg) : mapItems()[0];
      return target ? `1 : ${fmtNumber(mapScale(target))}` : "1 : -";
    }
    if (k === "halaman" || k === "page") return S.doc.page.size;
    if (S.doc.vars && k in S.doc.vars) return S.doc.vars[k];
    return m;
  }
}
// ---------------------------------------------------------------- north arrows
// Each variant draws into a 100x100 box, north up. c1 = primary (ink),
// c2 = secondary (paper), L = label ("U" / "N"), F = label font family.
function star(cx, cy, rOut, rIn, n, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${round(cx + r * Math.cos(a), 2)},${round(cy + r * Math.sin(a), 2)}`);
  }
  return pts.join(" ");
}
// A split (two-tone) compass point from centre toward angle `deg`.
function splitPoint(deg, len, half, c1, c2, sw = 0.8) {
  const a = ((deg - 90) * Math.PI) / 180;
  const tip = [50 + len * Math.cos(a), 50 + len * Math.sin(a)];
  const l = [50 + half * Math.cos(a - Math.PI / 2), 50 + half * Math.sin(a - Math.PI / 2)];
  const r = [50 + half * Math.cos(a + Math.PI / 2), 50 + half * Math.sin(a + Math.PI / 2)];
  const p = (pt) => `${round(pt[0], 2)},${round(pt[1], 2)}`;
  return (
    `<polygon points="50,50 ${p(tip)} ${p(l)}" fill="${c1}" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<polygon points="50,50 ${p(tip)} ${p(r)}" fill="${c2}" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="round"/>`
  );
}
function nLabel(L, F, c1, x = 50, y = 13, size = 16, weight = "bold") {
  if (!L) return "";
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${c1}">${esc(L)}</text>`;
}

const NORTH_ARROWS = [
  {
    id: "classic",
    name: "Classic two-tone",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 66,90 50,78" fill="${c2}" stroke="${c1}" stroke-width="2" stroke-linejoin="round"/>` +
      `<polygon points="50,24 34,90 50,78" fill="${c1}" stroke="${c1}" stroke-width="2" stroke-linejoin="round"/>` +
      nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "solid",
    name: "Solid arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 70,92 50,80 30,92" fill="${c1}"/>` + nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "outline",
    name: "Outline arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 70,92 50,80 30,92" fill="${c2}" stroke="${c1}" stroke-width="3" stroke-linejoin="round"/>` +
      nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "esri",
    name: "Split arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,26 64,74 50,64" fill="${c1}"/><polygon points="50,26 36,74 50,64" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
      `<polygon points="50,94 36,74 50,80 64,74" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 12, 17),
  },
  {
    id: "needle",
    name: "Compass needle",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="56" r="34" fill="none" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,24 57,56 43,56" fill="${c1}"/><polygon points="50,88 57,56 43,56" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
      `<circle cx="50" cy="56" r="3" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "star4",
    name: "4-point star",
    svg: (c1, c2, L, F) =>
      [0, 90, 180, 270].map((d) => splitPoint(d, 34, 8, c1, c2)).join("") +
      nLabel(L, F, c1, 50, 8, 14),
  },
  {
    id: "rose8",
    name: "8-point compass rose",
    svg: (c1, c2, L, F) =>
      [45, 135, 225, 315].map((d) => splitPoint(d, 24, 6, c1, c2, 0.6)).join("") +
      [0, 90, 180, 270].map((d) => splitPoint(d, 38, 8, c1, c2, 0.6)).join("") +
      nLabel(L, F, c1, 50, 6, 11),
  },
  {
    id: "rose16",
    name: "16-point compass rose",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="50" r="27" fill="none" stroke="${c1}" stroke-width="0.8"/>` +
      [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((d) => splitPoint(d, 20, 3.5, c1, c2, 0.4)).join("") +
      [45, 135, 225, 315].map((d) => splitPoint(d, 28, 6, c1, c2, 0.5)).join("") +
      [0, 90, 180, 270].map((d) => splitPoint(d, 40, 8, c1, c2, 0.5)).join("") +
      nLabel(L, F, c1, 50, 5, 10),
  },
  {
    id: "rose-ring",
    name: "Ringed compass rose",
    svg: (c1, c2, L, F) => {
      let ticks = "";
      for (let i = 0; i < 72; i++) {
        const a = (i * 5 * Math.PI) / 180;
        const r1 = 36;
        const r2 = i % 18 === 0 ? 31 : i % 2 === 0 ? 33 : 34.5;
        ticks += `<line x1="${round(50 + r1 * Math.sin(a), 2)}" y1="${round(54 - r1 * Math.cos(a), 2)}" x2="${round(50 + r2 * Math.sin(a), 2)}" y2="${round(54 - r2 * Math.cos(a), 2)}" stroke="${c1}" stroke-width="0.6"/>`;
      }
      return (
        `<g transform="translate(0,4)"><circle cx="50" cy="50" r="38" fill="${c2}" stroke="${c1}" stroke-width="1.2"/><circle cx="50" cy="50" r="36" fill="none" stroke="${c1}" stroke-width="0.5"/></g>` +
        ticks +
        `<g transform="translate(0,4)">` +
        [45, 135, 225, 315].map((d) => splitPoint(d, 20, 5, c1, c2, 0.5)).join("") +
        [0, 90, 180, 270].map((d) => splitPoint(d, 30, 7, c1, c2, 0.5)).join("") +
        `</g>` +
        nLabel(L, F, c1, 50, 6, 11)
      );
    },
  },
  {
    id: "circle-n",
    name: "Circle + arrow",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="55" r="36" fill="${c2}" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,26 66,78 50,68 34,78" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 8, 15),
  },
  {
    id: "circle-filled",
    name: "Filled circle",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="55" r="36" fill="${c1}"/>` +
      `<polygon points="50,24 64,76 50,66 36,76" fill="${c2}"/>` +
      nLabel(L, F, c1, 50, 8, 15),
  },
  {
    id: "triangle",
    name: "Triangle + letter",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,8 86,92 14,92" fill="${c1}"/>` +
      (L ? `<text x="50" y="70" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="30" font-weight="bold" fill="${c2}">${esc(L)}</text>` : ""),
  },
  {
    id: "chevron",
    name: "Chevron",
    svg: (c1, c2, L, F) =>
      `<polyline points="24,62 50,30 76,62" fill="none" stroke="${c1}" stroke-width="9" stroke-linejoin="miter" stroke-linecap="square"/>` +
      `<polyline points="24,88 50,56 76,88" fill="none" stroke="${c1}" stroke-width="9" stroke-linejoin="miter" stroke-linecap="square" opacity="0.45"/>` +
      nLabel(L, F, c1, 50, 12, 18),
  },
  {
    id: "minimal",
    name: "Minimal line",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="30" x2="50" y2="94" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,24 58,42 50,38 42,42" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 12, 18, "normal"),
  },
  {
    id: "arrow-base",
    name: "Arrow with base",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 66,70 54,66 54,92 46,92 46,66 34,70" fill="${c1}"/>` + nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "double",
    name: "Double arrow (N–S)",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,20 62,50 50,44 38,50" fill="${c1}"/><polygon points="50,80 62,50 50,56 38,50" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      nLabel(L, F, c1, 50, 9, 14) +
      `<text x="50" y="92" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="12" fill="${c1}">${L ? "S" : ""}</text>`,
  },
  {
    id: "cross",
    name: "Cardinal cross (N/E/S/W)",
    svg: (c1, c2, L, F) => {
      const id = L === "U" ? ["U", "T", "S", "B"] : ["N", "E", "S", "W"];
      const t = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="11" font-weight="bold" fill="${c1}">${s}</text>`;
      return (
        `<line x1="50" y1="18" x2="50" y2="82" stroke="${c1}" stroke-width="1.5"/><line x1="18" y1="50" x2="82" y2="50" stroke="${c1}" stroke-width="1.5"/>` +
        `<polygon points="50,16 56,38 50,34 44,38" fill="${c1}"/>` +
        `<circle cx="50" cy="50" r="5" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
        (L ? t(50, 7, id[0]) + t(93, 50, id[1]) + t(50, 93, id[2]) + t(7, 50, id[3]) : "")
      );
    },
  },
  {
    id: "true-north",
    name: "True north star",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="32" x2="50" y2="96" stroke="${c1}" stroke-width="2.5"/>` +
      `<polygon points="${star(50, 22, 12, 5, 5)}" fill="${c1}"/>` +
      `<polygon points="50,40 58,62 50,56 42,62" fill="${c1}"/>`,
  },
  {
    id: "military",
    name: "Topographic (GN/MN)",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="30" x2="50" y2="94" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 56,40 44,40" fill="${c1}"/>` +
      `<line x1="50" y1="94" x2="64" y2="40" stroke="${c1}" stroke-width="1.4"/>` +
      `<text x="67" y="36" font-family="${esc(F)}, Arial" font-size="9" fill="${c1}">GN</text>` +
      `<line x1="50" y1="94" x2="38" y2="44" stroke="${c1}" stroke-width="1.4" stroke-dasharray="3 2"/>` +
      `<text x="26" y="40" font-family="${esc(F)}, Arial" font-size="9" fill="${c1}">MN</text>` +
      nLabel(L, F, c1, 50, 12, 14),
  },
  {
    id: "diamond",
    name: "Diamond",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,22 64,58 50,94 36,58" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 64,58 36,58" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "kite",
    name: "Kite",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,22 68,52 50,94 32,52" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 68,52 50,94" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "badge",
    name: "Square badge",
    svg: (c1, c2, L, F) =>
      `<rect x="14" y="10" width="72" height="84" rx="10" fill="${c1}"/>` +
      `<polygon points="50,40 64,82 50,74 36,82" fill="${c2}"/>` +
      (L ? `<text x="50" y="26" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="18" font-weight="bold" fill="${c2}">${esc(L)}</text>` : ""),
  },
  {
    id: "hex",
    name: "Hexagon",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="${c2}" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,34 62,76 50,68 38,76" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 22, 14),
  },
  {
    id: "fancy",
    name: "Ornate classic",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="58" r="22" fill="none" stroke="${c1}" stroke-width="1"/><circle cx="50" cy="58" r="18" fill="none" stroke="${c1}" stroke-width="0.5"/>` +
      `<g transform="translate(0,8)">` +
      [45, 135, 225, 315].map((d) => splitPoint(d, 16, 4, c1, c2, 0.5)).join("") +
      `</g>` +
      `<polygon points="50,18 56,58 50,96 44,58" fill="${c2}" stroke="${c1}" stroke-width="0.8"/>` +
      `<polygon points="50,18 56,58 50,58" fill="${c1}"/><polygon points="50,96 44,58 50,58" fill="${c1}"/>` +
      `<polygon points="28,58 50,52 72,58 50,64" fill="${c2}" stroke="${c1}" stroke-width="0.8"/>` +
      nLabel(L, F, c1, 50, 8, 13),
  },
  {
    id: "half-circle",
    name: "Half circle",
    svg: (c1, c2, L, F) =>
      `<path d="M14,78 A36,36 0 0 1 86,78 Z" fill="${c2}" stroke="${c1}" stroke-width="2.5"/>` +
      `<polygon points="50,26 60,78 50,70 40,78" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 90, 13),
  },
  {
    id: "text-only",
    name: "Letter + line",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="46" x2="50" y2="96" stroke="${c1}" stroke-width="2"/><polygon points="50,40 55,52 45,52" fill="${c1}"/>` +
      nLabel(L || "N", F, c1, 50, 22, 34),
  },
];

// ---------------------------------------------------------------- shapes
// Shapes draw into the item's own w x h (mm) box.
const SHAPES = [
  { id: "rect", name: "Rectangle", d: (w, h) => `M0,0H${w}V${h}H0Z` },
  { id: "rounded", name: "Rounded rectangle", rounded: true },
  { id: "ellipse", name: "Ellipse", ellipse: true },
  { id: "triangle", name: "Triangle", d: (w, h) => `M${w / 2},0L${w},${h}L0,${h}Z` },
  { id: "rtriangle", name: "Right triangle", d: (w, h) => `M0,0L${w},${h}L0,${h}Z` },
  { id: "diamond", name: "Diamond", d: (w, h) => `M${w / 2},0L${w},${h / 2}L${w / 2},${h}L0,${h / 2}Z` },
  { id: "pentagon", name: "Pentagon", poly: 5 },
  { id: "hexagon", name: "Hexagon", poly: 6 },
  { id: "octagon", name: "Octagon", poly: 8 },
  { id: "star5", name: "5-point star", star: [5, 0.42] },
  { id: "star8", name: "8-point star", star: [8, 0.55] },
  { id: "arrow-r", name: "Arrow right", d: (w, h) => `M0,${h * 0.3}H${w * 0.62}V0L${w},${h / 2}L${w * 0.62},${h}V${h * 0.7}H0Z` },
  { id: "arrow-l", name: "Arrow left", d: (w, h) => `M${w},${h * 0.3}H${w * 0.38}V0L0,${h / 2}L${w * 0.38},${h}V${h * 0.7}H${w}Z` },
  { id: "arrow-u", name: "Arrow up", d: (w, h) => `M${w * 0.3},${h}V${h * 0.38}H0L${w / 2},0L${w},${h * 0.38}H${w * 0.7}V${h}Z` },
  { id: "arrow-2", name: "Double arrow", d: (w, h) => `M0,${h / 2}L${w * 0.25},0V${h * 0.3}H${w * 0.75}V0L${w},${h / 2}L${w * 0.75},${h}V${h * 0.7}H${w * 0.25}V${h}Z` },
  { id: "chevron", name: "Chevron", d: (w, h) => `M0,0H${w * 0.75}L${w},${h / 2}L${w * 0.75},${h}H0L${w * 0.25},${h / 2}Z` },
  { id: "banner", name: "Ribbon / banner", d: (w, h) => `M0,0H${w}L${w * 0.92},${h / 2}L${w},${h}H0L${w * 0.08},${h / 2}Z` },
  { id: "tab", name: "Title tab", d: (w, h) => `M0,${h}V${h * 0.25}Q0,0 ${h * 0.25},0H${w - h * 0.25}Q${w},0 ${w},${h * 0.25}V${h}Z` },
  { id: "callout", name: "Callout", d: (w, h) => `M0,0H${w}V${h * 0.75}H${w * 0.35}L${w * 0.2},${h}V${h * 0.75}H0Z` },
  { id: "cross", name: "Plus sign", d: (w, h) => `M${w * 0.35},0H${w * 0.65}V${h * 0.35}H${w}V${h * 0.65}H${w * 0.65}V${h}H${w * 0.35}V${h * 0.65}H0V${h * 0.35}H${w * 0.35}Z` },
  { id: "parallelogram", name: "Parallelogram", d: (w, h) => `M${w * 0.2},0H${w}L${w * 0.8},${h}H0Z` },
  { id: "trapezoid", name: "Trapezoid", d: (w, h) => `M${w * 0.2},0H${w * 0.8}L${w},${h}H0Z` },
  { id: "line-h", name: "Horizontal line", line: "h" },
  { id: "line-v", name: "Vertical line", line: "v" },
  { id: "line-d", name: "Diagonal line", line: "d" },
  { id: "arrow-line", name: "Arrow line", line: "arrow" },
];
function shapePath(shape, w, h) {
  if (shape.d) return shape.d(w, h);
  if (shape.poly) {
    const n = shape.poly;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n % 2 ? 0 : Math.PI / n);
      pts.push(`${round(w / 2 + (w / 2) * Math.cos(a), 3)},${round(h / 2 + (h / 2) * Math.sin(a), 3)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  if (shape.star) {
    const [n, inner] = shape.star;
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 1 : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push(`${round(w / 2 + (w / 2) * r * Math.cos(a), 3)},${round(h / 2 + (h / 2) * r * Math.sin(a), 3)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  return `M0,0H${w}V${h}H0Z`;
}

// ---------------------------------------------------------------- scale bars
const SCALEBAR_STYLES = [
  { id: "single", name: "Single box" },
  { id: "double", name: "Double box" },
  { id: "line-up", name: "Line, ticks up" },
  { id: "line-down", name: "Line, ticks down" },
  { id: "line-mid", name: "Line, ticks middle" },
  { id: "stepped", name: "Stepped line" },
  { id: "hollow", name: "Hollow box" },
  { id: "alt-line", name: "Alternating line" },
  { id: "ruler", name: "Ruler" },
  { id: "numeric", name: "Numeric (1 : n)" },
];

// Frame/border presets for the page and text boxes.
const BORDER_STYLES = { solid: "Solid", dash: "Dashed", longdash: "Long dash", dot: "Dotted", dashdot: "Dash-dot", longdashdot: "Long dash-dot" };
// ---------------------------------------------------------------- geometry
// Map items store their view as {center, zoom, bearing}, where `zoom` is the
// MapLibre zoom the frame would have when the page is drawn at 96 dpi. That
// makes the map scale independent of how far the composer canvas is zoomed.
const WORLD = 512;
function lngToX(lng, z) {
  return ((lng + 180) / 360) * WORLD * 2 ** z;
}
function latToY(lat, z) {
  const phi = (clamp(lat, -85.0511, 85.0511) * Math.PI) / 180;
  return (0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)) * WORLD * 2 ** z;
}
function xToLng(x, z) {
  return (x / (WORLD * 2 ** z)) * 360 - 180;
}
function yToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / (WORLD * 2 ** z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

// Projection helper for a map item, in item-local millimetres.
function mapGeom(item) {
  const v = item.props.view;
  const z = v.zoom;
  const b = ((v.bearing || 0) * Math.PI) / 180;
  const cx = lngToX(v.center[0], z);
  const cy = latToY(v.center[1], z);
  const W = item.w * PX96;
  const H = item.h * PX96;
  const cos = Math.cos(-b);
  const sin = Math.sin(-b);
  return {
    w: item.w,
    h: item.h,
    project(lng, lat) {
      const dx = lngToX(lng, z) - cx;
      const dy = latToY(lat, z) - cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      return [(W / 2 + rx) / PX96, (H / 2 + ry) / PX96];
    },
    unproject(xmm, ymm) {
      const rx = xmm * PX96 - W / 2;
      const ry = ymm * PX96 - H / 2;
      // inverse rotation
      const dx = rx * cos + ry * sin;
      const dy = -rx * sin + ry * cos;
      return [xToLng(cx + dx, z), yToLat(cy + dy, z)];
    },
    bounds() {
      const pts = [
        this.unproject(0, 0),
        this.unproject(item.w, 0),
        this.unproject(item.w, item.h),
        this.unproject(0, item.h),
      ];
      // densify edges so rotated frames are covered
      for (let i = 1; i < 8; i++) {
        pts.push(this.unproject((item.w * i) / 8, 0), this.unproject((item.w * i) / 8, item.h));
        pts.push(this.unproject(0, (item.h * i) / 8), this.unproject(item.w, (item.h * i) / 8));
      }
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      return { west: Math.min(...xs), east: Math.max(...xs), south: Math.min(...ys), north: Math.max(...ys), corners: pts.slice(0, 4) };
    },
  };
}

function metersPerMm(item) {
  // ground metres represented by one paper millimetre
  const v = item.props.view;
  const mPerPx = (EARTH_CIRC * Math.cos((v.center[1] * Math.PI) / 180)) / (WORLD * 2 ** v.zoom);
  return mPerPx * PX96;
}
function mapScale(item) {
  return Math.round(metersPerMm(item) * 1000);
}
function zoomForScale(scale, lat) {
  const mPerPx = (scale / 1000) / PX96;
  return Math.log2((EARTH_CIRC * Math.cos((lat * Math.PI) / 180)) / (WORLD * mPerPx));
}
// Zoom that makes a w x h (mm) frame show the given bounds.
function zoomForBounds(b, wmm, hmm) {
  const W = wmm * PX96;
  const H = hmm * PX96;
  const dx = lngToX(b.east, 0) - lngToX(b.west, 0);
  const dy = latToY(b.south, 0) - latToY(b.north, 0);
  const zx = Math.log2(W / Math.max(dx, 1e-9));
  const zy = Math.log2(H / Math.max(dy, 1e-9));
  return Math.min(zx, zy);
}

function niceStep(range, target = 5) {
  const raw = range / Math.max(target, 1);
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const nice = f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10;
  return nice * p;
}
// Common "pretty" scales for the scale picker.
const PRESET_SCALES = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];

// ---------------------------------------------------------------- coordinate labels
function hemi(value, axis, lang) {
  if (lang === "id") return axis === "x" ? (value < 0 ? "BB" : "BT") : value < 0 ? "LS" : "LU";
  return axis === "x" ? (value < 0 ? "W" : "E") : value < 0 ? "S" : "N";
}
function fmtCoord(value, axis, fmt, lang = "id", decimals = 2) {
  const a = Math.abs(value);
  const h = value === 0 ? "" : ` ${hemi(value, axis, lang)}`;
  if (fmt === "dd") return `${a.toFixed(decimals)}°${h}`;
  if (fmt === "dd-signed") return `${value.toFixed(decimals)}°`;
  // DMS / DM
  let d = Math.floor(a);
  let mFloat = (a - d) * 60;
  let m = Math.floor(mFloat);
  let s = Math.round((mFloat - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }
  if (fmt === "dm") return `${d}°${String(Math.round(mFloat) % 60).padStart(2, "0")}'${h}`;
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"${h}`;
}

// ---------------------------------------------------------------- UTM (WGS84)
const UTM = (() => {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const rad = Math.PI / 180;
  function zoneOf(lng) {
    return clamp(Math.floor((lng + 180) / 6) + 1, 1, 60);
  }
  function forward(lng, lat, zone, south) {
    const lon0 = ((zone - 1) * 6 - 180 + 3) * rad;
    const phi = lat * rad;
    const lam = lng * rad;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const T = Math.tan(phi) ** 2;
    const C = ep2 * Math.cos(phi) ** 2;
    const A = Math.cos(phi) * (lam - lon0);
    const M =
      a *
      ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi -
        ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
        ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
        ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
    const E =
      k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
    let Nn =
      k0 *
      (M +
        N *
          Math.tan(phi) *
          (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
    if (south) Nn += 10000000;
    return [E, Nn];
  }
  function inverse(E, Nn, zone, south) {
    const lon0 = ((zone - 1) * 6 - 180 + 3) * rad;
    const x = E - 500000;
    const y = south ? Nn - 10000000 : Nn;
    const M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const phi1 =
      mu +
      ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
      ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
      ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
      ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
    const T1 = Math.tan(phi1) ** 2;
    const C1 = ep2 * Math.cos(phi1) ** 2;
    const R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5;
    const D = x / (N1 * k0);
    const lat =
      phi1 -
      ((N1 * Math.tan(phi1)) / R1) *
        (D ** 2 / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6) / 720);
    const lng = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) / Math.cos(phi1);
    return [lng / rad, lat / rad];
  }
  return { zoneOf, forward, inverse };
})();

// ---------------------------------------------------------------- grid lines
// Returns {lines:[{pts:[[x,y]...], axis:'x'|'y', value}], fmt(value, axis)}
// for a map item, in item mm.
function computeGrid(item) {
  const g = item.props.grid;
  const geom = mapGeom(item);
  const b = geom.bounds();
  const lines = [];
  const target = Math.max(2, Math.round(Math.max(item.w, item.h) / 32));
  if (g.type === "utm") {
    const zone = g.zone || UTM.zoneOf(item.props.view.center[0]);
    const south = item.props.view.center[1] < 0;
    const corners = [];
    for (let i = 0; i <= 10; i++) {
      for (const [x, y] of [
        [(item.w * i) / 10, 0],
        [(item.w * i) / 10, item.h],
        [0, (item.h * i) / 10],
        [item.w, (item.h * i) / 10],
      ]) {
        const [lng, lat] = geom.unproject(x, y);
        corners.push(UTM.forward(lng, lat, zone, south));
      }
    }
    // pad the range so lines run past the frame and cross its edges cleanly
    let minE = Math.min(...corners.map((c) => c[0]));
    let maxE = Math.max(...corners.map((c) => c[0]));
    let minN = Math.min(...corners.map((c) => c[1]));
    let maxN = Math.max(...corners.map((c) => c[1]));
    const pe = (maxE - minE) * 0.05;
    const pn = (maxN - minN) * 0.05;
    minE -= pe;
    maxE += pe;
    minN -= pn;
    maxN += pn;
    const stepE = g.interval > 0 ? g.interval : niceStep(maxE - minE, target);
    const stepN = g.interval > 0 ? g.interval : stepE;
    if ((maxE - minE) / stepE > 200 || (maxN - minN) / stepN > 200) return { lines, b };
    const SAMPLES = 24;
    for (let e = Math.ceil(minE / stepE) * stepE; e <= maxE; e += stepE) {
      const pts = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const n = minN + ((maxN - minN) * i) / SAMPLES;
        const [lng, lat] = UTM.inverse(e, n, zone, south);
        pts.push(geom.project(lng, lat));
      }
      lines.push({ pts, axis: "x", value: e });
    }
    for (let n = Math.ceil(minN / stepN) * stepN; n <= maxN; n += stepN) {
      const pts = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const e = minE + ((maxE - minE) * i) / SAMPLES;
        const [lng, lat] = UTM.inverse(e, n, zone, south);
        pts.push(geom.project(lng, lat));
      }
      lines.push({ pts, axis: "y", value: n });
    }
    return { lines, b, utm: { zone, south } };
  }
  // geographic graticule
  let step = g.interval > 0 ? g.interval : niceDegStep(Math.max(b.east - b.west, b.north - b.south) / target);
  if ((b.east - b.west) / step > 200) step = niceDegStep((b.east - b.west) / 10);
  const SAMPLES = 16;
  const padX = (b.east - b.west) * 0.05;
  const padY = (b.north - b.south) * 0.05;
  const s0 = clamp(b.south - padY, -85, 85);
  const s1 = clamp(b.north + padY, -85, 85);
  const w0 = b.west - padX;
  const w1 = b.east + padX;
  // snap to the step grid with an integer counter so values stay exact (no float drift)
  for (let k = Math.ceil(b.west / step - 1e-9); k * step <= b.east + 1e-9; k++) {
    const lng = k * step;
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) pts.push(geom.project(lng, s0 + ((s1 - s0) * i) / SAMPLES));
    lines.push({ pts, axis: "x", value: round(lng, 9) });
  }
  for (let k = Math.ceil(b.south / step - 1e-9); k * step <= b.north + 1e-9; k++) {
    const lat = k * step;
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) pts.push(geom.project(w0 + ((w1 - w0) * i) / SAMPLES, lat));
    lines.push({ pts, axis: "y", value: round(lat, 9) });
  }
  return { lines, b };
}
// Degree steps that read well in DMS: 1", 2", 5", 10", 15", 30", 1', 2' ...
function niceDegStep(raw) {
  const steps = [
    1 / 3600, 2 / 3600, 5 / 3600, 10 / 3600, 15 / 3600, 30 / 3600,
    1 / 60, 2 / 60, 5 / 60, 10 / 60, 15 / 60, 20 / 60, 30 / 60,
    1, 2, 5, 10, 15, 20, 30, 45, 90,
  ];
  return steps.find((s) => s >= raw) || 90;
}
// Where a polyline crosses the rectangle edges: [{edge, x, y}]
function edgeCrossings(pts, w, h) {
  const out = [];
  const edges = [
    ["top", (p) => p[1], 0],
    ["bottom", (p) => p[1], h],
    ["left", (p) => p[0], 0],
    ["right", (p) => p[0], w],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const c = pts[i + 1];
    for (const [edge, get, val] of edges) {
      const va = get(a) - val;
      const vc = get(c) - val;
      if ((va <= 0 && vc > 0) || (va > 0 && vc <= 0)) {
        const t = va / (va - vc);
        const x = a[0] + (c[0] - a[0]) * t;
        const y = a[1] + (c[1] - a[1]) * t;
        if (x >= -0.01 && x <= w + 0.01 && y >= -0.01 && y <= h + 0.01) out.push({ edge, x, y });
      }
    }
  }
  return out;
}
// ---------------------------------------------------------------- item types
const DEFAULT_FONT = { family: "Arial", size: 9, bold: false, italic: false, color: "#111111", spacing: 0 };
const font = (o = {}) => ({ ...DEFAULT_FONT, ...o });

const ITEM_TYPES = {
  map: {
    label: "Map",
    icon: "map",
    size: [150, 110],
    defaults: () => ({
      source: "live",
      view: { center: [106.8, -6.2], zoom: 10, bearing: 0 },
      scaleLock: 0,
      basemap: "geolibre",
      background: "#ffffff",
      frame: { show: true, color: "#000000", width: 0.5 },
      frameShape: "rect",
      frameRadius: 4,
      frameImage: "",
      grid: {
        show: false,
        type: "dms",
        interval: 0,
        lang: "en",
        style: "lines",
        color: "#555555",
        width: 0.15,
        dash: "solid",
        opacity: 0.85,
        crossSize: 2.5,
        labels: { top: true, bottom: true, left: true, right: true },
        labelPos: "outside",
        rotateSide: true,
        gap: 1,
        font: font({ size: 6, color: "#222222" }),
        decimals: 2,
        frameStyle: "none",
        zebraWidth: 1.5,
        zebraColor: "#000000",
        tickLen: 2,
        zone: 0,
        utmUnit: "m",
      },
      overview: { source: "", color: "#e11d48", width: 0.6, fill: "#e11d48", fillOpacity: 0.12, marker: "rect" },
    }),
  },
  legend: {
    label: "Legend",
    icon: "list",
    size: [60, 50],
    defaults: () => ({
      title: "LEGEND",
      titleFont: font({ size: 10, bold: true }),
      titleAlign: "left",
      groupFont: font({ size: 7.5, bold: true }),
      itemFont: font({ size: 7.5 }),
      columns: 1,
      colGap: 5,
      rowGap: 1.4,
      patchW: 7,
      patchH: 4,
      padding: 3,
      background: "#ffffff",
      bgOpacity: 1,
      border: { show: false, color: "#333333", width: 0.3, radius: 0 },
      linkedMap: "",
      showGroups: true,
      autoSync: true,
      autoHeight: true,
      entries: [],
    }),
  },
  scalebar: {
    label: "Scale bar",
    icon: "scalebar",
    size: [70, 12],
    defaults: () => ({
      style: "single",
      units: "auto",
      segments: 4,
      leftSegments: 1,
      segmentValue: 0,
      barHeight: 2,
      color1: "#000000",
      color2: "#ffffff",
      lineWidth: 0.3,
      font: font({ size: 7 }),
      unitLabel: "",
      linkedMap: "",
      numericPrefix: "Scale ",
      dualUnit: "papercm",
      dualLabel: "",
      showNumeric: false,
      align: "left",
    }),
  },
  north: {
    label: "North Arrow",
    icon: "north",
    size: [16, 22],
    defaults: () => ({
      variant: "classic",
      color1: "#111111",
      color2: "#ffffff",
      label: "N",
      fontFamily: "Arial",
      rotateWithMap: true,
      linkedMap: "",
      rotation: 0,
    }),
  },
  text: {
    label: "Text",
    icon: "text",
    size: [60, 12],
    defaults: () => ({
      text: "New text",
      font: font({ size: 11 }),
      align: "left",
      valign: "middle",
      lineHeight: 1.2,
      padding: 1,
      background: "",
      bgOpacity: 1,
      border: { show: false, color: "#000000", width: 0.3, style: "solid", radius: 0 },
      textCase: "none",
      halo: false,
      haloColor: "#ffffff",
      haloWidth: 0.6,
      wrap: true,
    }),
  },
  image: {
    label: "Image / Logo",
    icon: "image",
    size: [25, 25],
    defaults: () => ({ src: "", fit: "contain", opacity: 1, border: { show: false, color: "#000000", width: 0.3, radius: 0 } }),
  },
  shape: {
    label: "Shape",
    icon: "shape",
    size: [40, 25],
    defaults: () => ({
      shape: "rect",
      fill: "#ffffff",
      fillOpacity: 1,
      stroke: "#000000",
      strokeWidth: 0.4,
      strokeStyle: "solid",
      radius: 3,
      shadow: false,
      fillType: "solid",
      fill2: "#cbd5e1",
      gradientAngle: 90,
      pattern: "/",
      patternColor: "#111111",
      patternSpacing: 2,
      patternWidth: 0.2,
      patternBg: false,
    }),
  },
  table: {
    label: "Table / Info box",
    icon: "table",
    size: [70, 30],
    defaults: () => ({
      rows: [
        ["Data source", "{source}"],
        ["Projection", "{projection}"],
        ["Prepared by", "{author}"],
        ["Date", "{date}"],
      ],
      header: false,
      colWidths: "35,65",
      font: font({ size: 7 }),
      headerFont: font({ size: 7.5, bold: true }),
      headerBg: "#e5e7eb",
      zebra: false,
      zebraColor: "#f3f4f6",
      borderColor: "#333333",
      borderWidth: 0.25,
      outerBorder: true,
      innerBorder: true,
      padding: 1.2,
      background: "#ffffff",
      align: "left",
    }),
  },
};

function newItem(type, x, y, extra = {}) {
  const def = ITEM_TYPES[type];
  const count = (S.doc?.items.filter((i) => i.type === type).length || 0) + 1;
  const item = {
    id: uid(type),
    type,
    name: `${def.label} ${count}`,
    x,
    y,
    w: def.size[0],
    h: def.size[1],
    rot: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    props: def.defaults(),
  };
  if (extra.props) item.props = deepMerge(item.props, extra.props);
  const { props, ...rest } = extra;
  Object.assign(item, rest);
  return item;
}

// The map an item (scale bar, north arrow, legend) follows: its explicit link,
// or the first map on the page.
function linkedMapOf(item) {
  const id = item.props.linkedMap;
  return (id && findItem(id)) || mapItems()[0] || null;
}

// A captured GeoLibre view fills the frame (cover); keep the frame's view in
// step with it so grids, scale bars and insets stay exact.
function syncSnapshotView(item) {
  const sn = item.props.snapshot;
  const W = item.w * PX96;
  const H = item.h * PX96;
  const k = Math.max(W / sn.cw, H / sn.ch);
  item.props.view = { center: [...sn.center], zoom: sn.zoom + Math.log2(k), bearing: sn.bearing || 0 };
  const iw = (sn.cw * k) / PX96;
  const ih = (sn.ch * k) / PX96;
  return { src: sn.src, w: iw, h: ih, x: (item.w - iw) / 2, y: (item.h - ih) / 2 };
}

// ---- text effects (Canva-style): shadow, lift, hollow, outline, highlight, neon
const TEXT_EFFECTS = { none: "None", shadow: "Shadow", lift: "Lift", hollow: "Hollow", outline: "Outline", highlight: "Highlight", neon: "Neon", echo: "Echo" };
function textEffect(item, lines, x, y0, lh, anchor) {
  const p = item.props;
  const e = p.effect || "none";
  const c = esc(p.effectColor || "#000000");
  const k = (p.effectStrength ?? 50) / 50; // 0..2
  const id = item.id.replace(/[^\w]/g, "");
  const f = p.font;
  const res = { defs: "", before: "", groupAttr: "", textAttr: "" };
  if (e === "shadow") {
    res.defs = `<defs><filter id="tfx-${id}" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="${round(0.35 * k, 3)}" dy="${round(0.35 * k, 3)}" stdDeviation="${round(0.25 * k, 3)}" flood-color="${c}" flood-opacity="0.55"/></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "lift") {
    res.defs = `<defs><filter id="tfx-${id}" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="${round(0.5 * k, 3)}" stdDeviation="${round(0.9 * k, 3)}" flood-color="#000000" flood-opacity="0.35"/></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "neon") {
    res.defs = `<defs><filter id="tfx-${id}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="${round(0.6 * k, 3)}" result="b"/><feFlood flood-color="${c}" flood-opacity="0.95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "hollow") {
    res.textAttr = `fill="none" stroke="${esc(f.color)}" stroke-width="${round(0.12 * Math.max(k, 0.3) * (f.size / 10), 3)}"`;
  } else if (e === "outline") {
    res.textAttr = `stroke="${c}" stroke-width="${round(0.25 * Math.max(k, 0.3) * (f.size / 10), 3)}" paint-order="stroke" stroke-linejoin="round"`;
  } else if (e === "echo") {
    const dx = 0.45 * k;
    const dyy = 0.45 * k;
    res.before = `<text text-anchor="${anchor}" ${fontAttrs({ ...f, color: p.effectColor || "#999999" })} opacity="0.45">${lines.map((ln, i) => `<tspan x="${round(x + dx * 2, 3)}" y="${round(y0 + i * lh + dyy * 2, 3)}">${esc(ln)}</tspan>`).join("")}</text>` + `<text text-anchor="${anchor}" ${fontAttrs({ ...f, color: p.effectColor || "#999999" })} opacity="0.7">${lines.map((ln, i) => `<tspan x="${round(x + dx, 3)}" y="${round(y0 + i * lh + dyy, 3)}">${esc(ln)}</tspan>`).join("")}</text>`;
  } else if (e === "highlight") {
    const fh = f.size * PT;
    res.before = lines
      .map((ln, i) => {
        const w = textWidthMm(ln, f);
        if (!w) return "";
        const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
        const pad = fh * 0.18 * Math.max(k, 0.5);
        return `<rect x="${round(x0 - pad, 3)}" y="${round(y0 + i * lh - fh * 0.82 - pad / 2, 3)}" width="${round(w + pad * 2, 3)}" height="${round(fh * 1.05 + pad, 3)}" rx="${round(pad, 3)}" fill="${esc(p.effectColor || "#fde047")}"/>`;
      })
      .join("");
  }
  return res;
}

// ---- map frame shapes (circle, triangle, … or an image used as a mask)
const MAP_FRAME_SHAPES = [
  ["rect", "Rectangle"], ["rounded", "Rounded rectangle"], ["circle", "Circle / ellipse"], ["triangle", "Triangle"],
  ["diamond", "Diamond"], ["pentagon", "Pentagon"], ["hexagon", "Hexagon"], ["octagon", "Octagon"],
  ["star", "Star"], ["heart", "Heart"], ["shield", "Shield"], ["arch", "Arch"], ["image", "Image (mask)…"],
];
// SVG path of a map frame shape in a w × h box, or null for a plain rectangle.
function mapFramePath(p, w, h) {
  const s = p.frameShape || "rect";
  const r = clamp(p.frameRadius ?? 4, 0, Math.min(w, h) / 2);
  const R = (v) => round(v, 3);
  switch (s) {
    case "rounded":
      return `M${R(r)},0H${R(w - r)}A${R(r)},${R(r)} 0 0 1 ${R(w)},${R(r)}V${R(h - r)}A${R(r)},${R(r)} 0 0 1 ${R(w - r)},${R(h)}H${R(r)}A${R(r)},${R(r)} 0 0 1 0,${R(h - r)}V${R(r)}A${R(r)},${R(r)} 0 0 1 ${R(r)},0Z`;
    case "circle":
      return `M0,${R(h / 2)}A${R(w / 2)},${R(h / 2)} 0 1 0 ${R(w)},${R(h / 2)}A${R(w / 2)},${R(h / 2)} 0 1 0 0,${R(h / 2)}Z`;
    case "triangle":
      return `M${R(w / 2)},0L${R(w)},${R(h)}L0,${R(h)}Z`;
    case "diamond":
      return `M${R(w / 2)},0L${R(w)},${R(h / 2)}L${R(w / 2)},${R(h)}L0,${R(h / 2)}Z`;
    case "pentagon":
      return shapePath({ poly: 5 }, w, h);
    case "hexagon":
      return shapePath({ poly: 6 }, w, h);
    case "octagon":
      return shapePath({ poly: 8 }, w, h);
    case "star":
      return shapePath({ star: [5, 0.5] }, w, h);
    case "heart":
      return SHAPES.find((x) => x.id === "heart")?.d(w, h) || null;
    case "shield":
      return `M0,0H${R(w)}V${R(h * 0.45)}C${R(w)},${R(h * 0.75)} ${R(w * 0.75)},${R(h * 0.9)} ${R(w / 2)},${R(h)}C${R(w * 0.25)},${R(h * 0.9)} 0,${R(h * 0.75)} 0,${R(h * 0.45)}Z`;
    case "arch":
      return `M0,${R(h)}V${R(Math.min(w / 2, h))}A${R(w / 2)},${R(Math.min(w / 2, h))} 0 0 1 ${R(w)},${R(Math.min(w / 2, h))}V${R(h)}Z`;
    default:
      return null;
  }
}
function mapFrameIsImage(p) {
  return p.frameShape === "image" && !!p.frameImage;
}

// ---- image adjustments + masks
function imageMaskShape(item, r) {
  const p = item.props;
  const m = p.mask || "none";
  const { w, h } = item;
  if (m === "circle") return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (m === "hexagon") return `<path d="${shapePath({ poly: 6 }, w, h)}"/>`;
  if (m === "star") return `<path d="${shapePath({ star: [5, 0.45] }, w, h)}"/>`;
  if (m === "heart") return `<path d="${SHAPES.find((x) => x.id === "heart").d(w, h)}"/>`;
  if (m === "blob") return `<path d="M${w * 0.5},0C${w * 0.85},0 ${w},${h * 0.2} ${w},${h * 0.5}S${w * 0.8},${h} ${w * 0.45},${h}S0,${h * 0.75} 0,${h * 0.45}S${w * 0.2},0 ${w * 0.5},0Z"/>`;
  return `<rect width="${w}" height="${h}" rx="${r}"/>`;
}
function imageFilter(item) {
  const a = item.props.adjust || {};
  const b = (a.brightness || 0) / 100;
  const c = 1 + (a.contrast || 0) / 100;
  const sat = Math.max(0, 1 + (a.saturation || 0) / 100) * (1 - (a.grayscale || 0) / 100);
  const hue = a.hue || 0;
  const blur = a.blur || 0;
  const sepia = (a.sepia || 0) / 100;
  if (!b && c === 1 && sat === 1 && !hue && !blur && !sepia) return { defs: "", attr: "" };
  const id = `imf-${item.id.replace(/[^\w]/g, "")}`;
  const slope = round(c, 4);
  const icept = round(-(0.5 * c) + 0.5 + b, 4);
  const sepiaM = sepia
    ? `<feColorMatrix type="matrix" values="${[0.393 + 0.607 * (1 - sepia), 0.769 - 0.769 * (1 - sepia), 0.189 - 0.189 * (1 - sepia), 0, 0, 0.349 - 0.349 * (1 - sepia), 0.686 + 0.314 * (1 - sepia), 0.168 - 0.168 * (1 - sepia), 0, 0, 0.272 - 0.272 * (1 - sepia), 0.534 - 0.534 * (1 - sepia), 0.131 + 0.869 * (1 - sepia), 0, 0, 0, 0, 0, 1, 0].map((v) => round(v, 4)).join(" ")}"/>`
    : "";
  return {
    defs:
      `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
      `<feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${icept}"/><feFuncG type="linear" slope="${slope}" intercept="${icept}"/><feFuncB type="linear" slope="${slope}" intercept="${icept}"/></feComponentTransfer>` +
      `<feColorMatrix type="saturate" values="${round(sat, 4)}"/>` +
      (hue ? `<feColorMatrix type="hueRotate" values="${hue}"/>` : "") +
      sepiaM +
      (blur ? `<feGaussianBlur stdDeviation="${round(blur, 3)}"/>` : "") +
      `</filter>`,
    attr: ` filter="url(#${id})"`,
  };
}

// ---------------------------------------------------------------- SVG renderers
// renderItem(item, ctx) -> SVG markup in item-local mm (0..w, 0..h).
// ctx = { export: bool, mapImages: Map(itemId -> dataURL) }
function renderItem(item, ctx = {}) {
  const fn = RENDERERS[item.type];
  if (!fn) return "";
  try {
    return glassUnderlay(item) + fn(item, ctx);
  } catch (e) {
    console.error("[Layout Composer] render", item.type, e);
    return `<rect width="${item.w}" height="${item.h}" fill="#fee2e2"/><text x="2" y="5" font-size="3" fill="#b91c1c">Error: ${esc(e.message)}</text>`;
  }
}

function strokeAttrs(color, width, style) {
  const d = dashArray(style, width);
  return `stroke="${esc(color)}" stroke-width="${width}"${d ? ` stroke-dasharray="${d}"` : ""}`;
}

const RENDERERS = {
  // ---------------------------------------------------- map
  map(item, ctx) {
    const p = item.props;
    const { w, h } = item;
    const clipId = `clip-${item.id}`;
    const shapeD = mapFramePath(p, w, h);
    const imgMask = mapFrameIsImage(p);
    const clipShape = shapeD ? `<path d="${shapeD}"/>` : `<rect width="${w}" height="${h}"/>`;
    let out = `<defs><clipPath id="${clipId}">${clipShape}</clipPath>`;
    if (imgMask) out += `<mask id="mk-${item.id}" mask-type="alpha" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><image href="${esc(p.frameImage)}" width="${w}" height="${h}" preserveAspectRatio="none"/></mask>`;
    out += `</defs>`;
    const snap = p.source === "snapshot" && p.snapshot?.src ? syncSnapshotView(item) : null;
    out += imgMask ? `<g mask="url(#mk-${item.id})">` : `<g clip-path="url(#${clipId})">`;
    if (ctx.export || snap) out += `<rect width="${w}" height="${h}" fill="${esc(p.background || "#fff")}"/>`;
    if (snap) {
      out += `<image href="${snap.src}" x="${round(snap.x, 3)}" y="${round(snap.y, 3)}" width="${round(snap.w, 3)}" height="${round(snap.h, 3)}" preserveAspectRatio="none"/>`;
    } else if (ctx.export) {
      const img = ctx.mapImages?.get(item.id);
      if (img) out += `<image href="${img}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
    }
    // overview / locator rectangles of other maps
    if (p.overview?.source) {
      const src = findItem(p.overview.source);
      if (src && src.type === "map") out += renderOverview(item, src, p.overview);
    }
    if (p.grid?.show && p.grid.style !== "none") out += renderGridLines(item);
    out += `</g>`;
    if (p.grid?.show && !shapeD && !imgMask) out += renderGridFrame(item);
    if (p.frame?.show && !imgMask) {
      out += shapeD
        ? `<path d="${shapeD}" fill="none" stroke="${esc(p.frame.color)}" stroke-width="${p.frame.width}" stroke-linejoin="round"/>`
        : `<rect width="${w}" height="${h}" fill="none" stroke="${esc(p.frame.color)}" stroke-width="${p.frame.width}"/>`;
    }
    return out;
  },

  // ---------------------------------------------------- legend
  legend(item) {
    const lay = layoutLegend(item);
    S.legendCache.set(item.id, lay.height);
    const p = item.props;
    if (p.autoHeight && Math.abs(item.h - lay.height) > 0.2) item.h = round(lay.height, 2);
    let out = "";
    if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
    out += lay.svg;
    if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
    return out;
  },

  // ---------------------------------------------------- scale bar
  scalebar(item, ctx) {
    const p = item.props;
    const map = linkedMapOf(item);
    if (!map) return ctx.export ? "" : placeholder(item, "Add a map first");
    const scale = mapScale(map);
    const f = p.font;
    const fh = f.size * PT;
    if (p.style === "numeric") {
      const txt = `${p.numericPrefix || ""}1 : ${fmtNumber(scale)}`;
      const x = p.align === "center" ? item.w / 2 : p.align === "right" ? item.w : 0;
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      return `<text x="${x}" y="${item.h / 2}" text-anchor="${anchor}" dominant-baseline="central" ${fontAttrs(f)}>${esc(txt)}</text>`;
    }
    if (p.style === "dual") return renderDualScalebar(item, p, map);
    const mPerMm = metersPerMm(map);
    const segs = Math.max(1, Math.round(p.segments));
    const left = p.leftSegments ? 1 : 0;
    // leave room for the last label + unit text
    const reserve = textWidthMm("00000 km", f) * 0.75;
    const avail = Math.max(5, item.w - reserve);
    let unit = p.units === "m" ? 1 : p.units === "km" ? 1000 : 0;
    let segVal = p.segmentValue > 0 ? p.segmentValue : 0;
    if (!segVal) {
      const rawM = (avail * mPerMm) / (segs + left);
      if (!unit) unit = rawM >= 500 ? 1000 : 1;
      segVal = niceFloor(rawM / unit);
    } else if (!unit) unit = segVal * 1 >= 1000 ? 1000 : 1;
    const unitTxt = p.unitLabel || (unit === 1000 ? "km" : "m");
    const segLen = (segVal * unit) / mPerMm;
    const x0 = left ? segLen : 0;
    const bh = p.barHeight;
    const lw = p.lineWidth;
    const c1 = esc(p.color1);
    const c2 = esc(p.color2);
    const labelAbove = ["line-down"].includes(p.style);
    const barY = labelAbove ? fh + 1.2 : 0.4;
    const labelY = labelAbove ? fh * 0.8 : barY + bh + 1 + fh * 0.8;
    let out = "";
    const lbl = (x, v, anchor = "middle") =>
      `<text x="${round(x, 3)}" y="${round(labelY, 3)}" text-anchor="${anchor}" ${fontAttrs(f)}>${esc(v)}</text>`;
    const fmtV = (v) => fmtNumber(v, v % 1 ? (v * 10) % 1 ? 2 : 1 : 0);
    const total = segs + left;
    const boxes = (y, height, invert = false) => {
      let s = "";
      // left (subdivided) segment
      if (left) {
        const sub = 4;
        for (let i = 0; i < sub; i++) {
          const fill = (i % 2 === 0) !== invert ? c1 : c2;
          s += `<rect x="${round((segLen / sub) * i, 3)}" y="${y}" width="${round(segLen / sub, 3)}" height="${height}" fill="${fill}" stroke="${c1}" stroke-width="${lw}"/>`;
        }
      }
      for (let i = 0; i < segs; i++) {
        const fill = (i % 2 === 0) !== invert ? c1 : c2;
        s += `<rect x="${round(x0 + segLen * i, 3)}" y="${y}" width="${round(segLen, 3)}" height="${height}" fill="${fill}" stroke="${c1}" stroke-width="${lw}"/>`;
      }
      return s;
    };
    switch (p.style) {
      case "double":
        out += boxes(barY, bh / 2) + boxes(barY + bh / 2, bh / 2, true);
        break;
      case "hollow":
        out += `<rect x="0" y="${barY}" width="${round(segLen * total, 3)}" height="${bh}" fill="${c2}" stroke="${c1}" stroke-width="${lw}"/>`;
        for (let i = 0; i < segs; i++) {
          if (i % 2 === 0) out += `<rect x="${round(x0 + segLen * i, 3)}" y="${barY + bh * 0.3}" width="${round(segLen, 3)}" height="${bh * 0.4}" fill="${c1}"/>`;
        }
        if (left) out += `<rect x="0" y="${barY + bh * 0.3}" width="${round(segLen / 2, 3)}" height="${bh * 0.4}" fill="${c1}"/>`;
        break;
      case "line-up":
      case "line-down":
      case "line-mid":
      case "ruler": {
        const yLine = p.style === "line-up" ? barY + bh : p.style === "line-down" ? barY : barY + bh / 2;
        out += `<line x1="0" y1="${yLine}" x2="${round(segLen * total, 3)}" y2="${yLine}" stroke="${c1}" stroke-width="${lw * 1.6}"/>`;
        const ticks = [];
        if (left) for (let i = 0; i < 4; i++) ticks.push([(segLen / 4) * i, 0.6]);
        for (let i = 0; i <= segs; i++) ticks.push([x0 + segLen * i, 1]);
        if (p.style === "ruler") {
          for (let i = 0; i < segs; i++) for (let k = 1; k < 10; k++) ticks.push([x0 + segLen * i + (segLen / 10) * k, k === 5 ? 0.65 : 0.4]);
        }
        for (const [x, t] of ticks) {
          let y1 = barY;
          let y2 = barY + bh;
          if (p.style === "line-up") y1 = barY + bh - bh * t;
          else if (p.style === "line-down") y2 = barY + bh * t;
          else if (p.style === "ruler") {
            y1 = barY;
            y2 = barY + bh * t;
          } else {
            y1 = barY + bh / 2 - (bh / 2) * t;
            y2 = barY + bh / 2 + (bh / 2) * t;
          }
          out += `<line x1="${round(x, 3)}" y1="${round(y1, 3)}" x2="${round(x, 3)}" y2="${round(y2, 3)}" stroke="${c1}" stroke-width="${lw * 1.4}"/>`;
        }
        if (p.style === "ruler") out += `<rect x="0" y="${barY}" width="${round(segLen * total, 3)}" height="${bh}" fill="none" stroke="${c1}" stroke-width="${lw}"/>`;
        break;
      }
      case "stepped": {
        let d = `M0,${barY + bh}`;
        for (let i = 0; i < total; i++) {
          const y = i % 2 === 0 ? barY + bh : barY;
          const x1 = segLen * i;
          d += `L${round(x1, 3)},${y}L${round(x1 + segLen, 3)},${y}`;
          if (i < total - 1) d += `L${round(x1 + segLen, 3)},${i % 2 === 0 ? barY : barY + bh}`;
        }
        out += `<path d="${d}" fill="none" stroke="${c1}" stroke-width="${lw * 2}"/>`;
        break;
      }
      case "alt-line": {
        for (let i = 0; i < total; i++) {
          const col = i % 2 === 0 ? c1 : c2;
          out += `<line x1="${round(segLen * i, 3)}" y1="${barY + bh / 2}" x2="${round(segLen * (i + 1), 3)}" y2="${barY + bh / 2}" stroke="${col}" stroke-width="${bh * 0.7}"/>`;
        }
        out += `<rect x="0" y="${barY + bh * 0.15}" width="${round(segLen * total, 3)}" height="${bh * 0.7}" fill="none" stroke="${c1}" stroke-width="${lw}"/>`;
        break;
      }
      default:
        out += boxes(barY, bh);
    }
    if (left) out += lbl(0, fmtV(segVal));
    for (let i = 0; i <= segs; i++) {
      const v = segVal * i;
      const isLast = i === segs;
      out += lbl(x0 + segLen * i, fmtV(v));
      if (isLast) {
        const tw = textWidthMm(fmtV(v), f);
        out += `<text x="${round(x0 + segLen * i + tw / 2 + 1, 3)}" y="${round(labelY, 3)}" text-anchor="start" ${fontAttrs(f)}>${esc(unitTxt)}</text>`;
      }
    }
    if (p.showNumeric) {
      const ny = Math.max(labelY, barY + bh) + fh * 1.3;
      out += `<text x="${round((segLen * total) / 2, 3)}" y="${round(ny, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(`${p.numericPrefix || ""}1 : ${fmtNumber(scale)}`)}</text>`;
    }
    return out;
  },

  // ---------------------------------------------------- north arrow
  north(item) {
    const p = item.props;
    const variant = NORTH_ARROWS.find((v) => v.id === p.variant) || NORTH_ARROWS[0];
    let rot = p.rotation || 0;
    if (p.rotateWithMap) {
      const map = linkedMapOf(item);
      if (map) rot -= map.props.view.bearing || 0;
    }
    return (
      `<svg x="0" y="0" width="${item.w}" height="${item.h}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
      `<g transform="rotate(${round(rot, 2)} 50 50)">${variant.svg(esc(p.color1), esc(p.color2), p.label, p.fontFamily || "Arial")}</g></svg>`
    );
  },

  // ---------------------------------------------------- text
  text(item) {
    const p = item.props;
    const f = p.font;
    const pad = p.padding || 0;
    let out = "";
    const r = p.border?.radius || 0;
    if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${r}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
    const content = applyCase(resolveVars(p.text, item), p.textCase);
    const lines = hasMath(content) ? content.split("\n") : wrapText(content, f, p.wrap ? item.w - pad * 2 : 0);
    const lh = f.size * PT * (p.lineHeight || 1.2);
    const blockH = lh * lines.length;
    const asc = f.size * PT * 0.8;
    let y0 = pad + asc + (lh - f.size * PT) / 2;
    if (p.valign === "middle") y0 = (item.h - blockH) / 2 + asc + (lh - f.size * PT) / 2;
    if (p.valign === "bottom") y0 = item.h - pad - blockH + asc + (lh - f.size * PT) / 2;
    const x = p.align === "center" ? item.w / 2 : p.align === "right" ? item.w - pad : pad;
    const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
    const tfx = textEffect(item, lines, x, y0, lh, anchor);
    out += tfx.defs + tfx.before + `<g${tfx.groupAttr}>`;
    if (hasMath(content)) {
      // $...$ math: one MathJax line per text line (no automatic wrapping)
      content.split("\n").forEach((ln, i) => {
        out += richLine(ln, x, y0 + i * lh, f, anchor, tfx.textAttr || haloAttrs({ ...p, halo: p.halo })).svg;
      });
    } else {
      const deco = p.decoration && p.decoration !== "none" ? ` text-decoration="${p.decoration}"` : "";
      out += `<text text-anchor="${anchor}" ${fontAttrs(f)}${deco} ${tfx.textAttr || haloAttrs({ ...p, halo: p.halo })}>`;
      lines.forEach((ln, i) => {
        out += `<tspan x="${round(x, 3)}" y="${round(y0 + i * lh, 3)}">${esc(ln) || " "}</tspan>`;
      });
      out += `</text>`;
    }
    out += `</g>`;
    if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${r}" fill="none" ${strokeAttrs(p.border.color, p.border.width, p.border.style)}/>`;
    return out;
  },

  // ---------------------------------------------------- image
  image(item, ctx) {
    const p = item.props;
    if (!p.src) return ctx.export ? "" : placeholder(item, "Double-click to choose a logo");
    const par = p.fit === "cover" ? "xMidYMid slice" : p.fit === "fill" ? "none" : "xMidYMid meet";
    const r = p.border?.radius || 0;
    const clipId = `imgclip-${item.id}`;
    const mask = imageMaskShape(item, r);
    const filt = imageFilter(item);
    let out = `<defs><clipPath id="${clipId}">${mask}</clipPath>${filt.defs}</defs>`;
    out += `<image href="${esc(p.src)}" width="${item.w}" height="${item.h}" preserveAspectRatio="${par}" opacity="${p.opacity ?? 1}" clip-path="url(#${clipId})"${filt.attr}/>`;
    if (p.border?.show) out += mask.replace("/>", ` fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`);
    return out;
  },

  // ---------------------------------------------------- shape
  shape(item) {
    const p = item.props;
    const shape = SHAPES.find((s) => s.id === p.shape) || SHAPES[0];
    const { w, h } = item;
    const sw = p.strokeWidth || 0;
    const stroke = sw > 0 ? strokeAttrs(p.stroke, sw, p.strokeStyle) : `stroke="none"`;
    const paint = fillPaint(item, p);
    const fill = paint.attr;
    let out = paint.defs ? `<defs>${paint.defs}</defs>` : "";
    if (p.shadow) out += `<defs><filter id="sh-${item.id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.8" dy="0.8" stdDeviation="0.8" flood-opacity="0.35"/></filter></defs>`;
    const filt = p.shadow ? ` filter="url(#sh-${item.id})"` : "";
    if (shape.line) {
      let x1 = 0;
      let y1 = h / 2;
      let x2 = w;
      let y2 = h / 2;
      if (shape.line === "v") [x1, y1, x2, y2] = [w / 2, 0, w / 2, h];
      if (shape.line === "d") [x1, y1, x2, y2] = [0, h, w, 0];
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${strokeAttrs(p.stroke, Math.max(sw, 0.1), p.strokeStyle)} stroke-linecap="round"${filt}/>`;
      if (shape.line === "arrow") {
        const a = Math.max(sw * 4, 2);
        out += `<polygon points="${w},${h / 2} ${w - a * 1.4},${h / 2 - a / 2} ${w - a * 1.4},${h / 2 + a / 2}" fill="${esc(p.stroke)}"/>`;
      }
      return out;
    }
    if (shape.ellipse) return out + `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${fill} ${stroke}${filt}/>`;
    if (shape.rounded) return out + `<rect width="${w}" height="${h}" rx="${p.radius || 0}" ${fill} ${stroke}${filt}/>`;
    return out + `<path d="${shapePath(shape, w, h)}" ${fill} ${stroke} stroke-linejoin="round"${filt}/>`;
  },

  // ---------------------------------------------------- table
  table(item, ctx) {
    const p = item.props;
    const rows = (p.rows || []).filter((r) => Array.isArray(r));
    if (!rows.length) return ctx.export ? "" : placeholder(item, "Empty table");
    const nCols = Math.max(...rows.map((r) => r.length));
    let widths = String(p.colWidths || "")
      .split(",")
      .map((v) => parseFloat(v))
      .filter((v) => v > 0);
    while (widths.length < nCols) widths.push(widths.length ? widths[widths.length - 1] : 1);
    widths = widths.slice(0, nCols);
    const sum = widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((v) => (v / sum) * item.w);
    const pad = p.padding;
    // row heights from wrapped text
    const rowsLaid = rows.map((r, ri) => {
      const f = p.header && ri === 0 ? p.headerFont : p.font;
      const cells = colW.map((cw, ci) => wrapText(resolveVars(r[ci] ?? "", item), f, cw - pad * 2));
      const lh = f.size * PT * 1.25;
      const height = Math.max(...cells.map((c) => c.length)) * lh + pad * 2;
      return { cells, f, lh, height };
    });
    const natural = rowsLaid.reduce((a, r) => a + r.height, 0);
    const stretch = natural < item.h ? item.h / natural : 1;
    let out = p.background ? `<rect width="${item.w}" height="${item.h}" fill="${esc(p.background)}"/>` : "";
    let y = 0;
    rowsLaid.forEach((row, ri) => {
      const rh = row.height * stretch;
      if (p.header && ri === 0 && p.headerBg) out += `<rect x="0" y="${round(y, 3)}" width="${item.w}" height="${round(rh, 3)}" fill="${esc(p.headerBg)}"/>`;
      else if (p.zebra && ri % 2 === (p.header ? 0 : 1)) out += `<rect x="0" y="${round(y, 3)}" width="${item.w}" height="${round(rh, 3)}" fill="${esc(p.zebraColor)}"/>`;
      let x = 0;
      row.cells.forEach((lines, ci) => {
        const cw = colW[ci];
        const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
        const tx = p.align === "center" ? x + cw / 2 : p.align === "right" ? x + cw - pad : x + pad;
        const textH = lines.length * row.lh;
        const ty = y + (rh - textH) / 2 + row.f.size * PT * 0.85;
        out += `<text text-anchor="${anchor}" ${fontAttrs(row.f)}>`;
        lines.forEach((ln, li) => (out += `<tspan x="${round(tx, 3)}" y="${round(ty + li * row.lh, 3)}">${esc(ln) || " "}</tspan>`));
        out += `</text>`;
        if (p.innerBorder && ci > 0) out += `<line x1="${round(x, 3)}" y1="${round(y, 3)}" x2="${round(x, 3)}" y2="${round(y + rh, 3)}" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth}"/>`;
        x += cw;
      });
      if (p.innerBorder && ri > 0) out += `<line x1="0" y1="${round(y, 3)}" x2="${item.w}" y2="${round(y, 3)}" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth}"/>`;
      y += rh;
    });
    if (p.outerBorder) out += `<rect width="${item.w}" height="${round(Math.max(y, item.h), 3)}" fill="none" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth * 1.6}"/>`;
    S.legendCache.set(item.id, natural);
    return out;
  },
};

function niceFloor(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const n = f >= 5 ? 5 : f >= 2.5 ? 2.5 : f >= 2 ? 2 : 1;
  return n * p;
}

function placeholder(item, msg) {
  return (
    `<rect width="${item.w}" height="${item.h}" fill="#f3f4f6" stroke="#9ca3af" stroke-width="0.3" stroke-dasharray="1.5 1"/>` +
    `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="${round(clamp(Math.min(item.h / 4, (item.w * 0.9) / (msg.length * 0.52)), 0.8, 4), 3)}" fill="#6b7280">${esc(msg)}</text>`
  );
}

// ---------------------------------------------------- map overlays
function renderOverview(item, src, ov) {
  const geomSrc = mapGeom(src);
  const geom = mapGeom(item);
  const pts = [];
  const N = 6;
  for (let i = 0; i < N; i++) pts.push(geomSrc.unproject((src.w * i) / N, 0));
  for (let i = 0; i < N; i++) pts.push(geomSrc.unproject(src.w, (src.h * i) / N));
  for (let i = N; i > 0; i--) pts.push(geomSrc.unproject((src.w * i) / N, src.h));
  for (let i = N; i > 0; i--) pts.push(geomSrc.unproject(0, (src.h * i) / N));
  const proj = pts.map(([lng, lat]) => geom.project(lng, lat));
  const xs = proj.map((p) => p[0]);
  const ys = proj.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  // Too small to see as a box: draw a marker instead.
  if (ov.marker === "point" || (ov.marker === "rect" && Math.max(bw, bh) < 1.2)) {
    return (
      `<circle cx="${round(cx, 3)}" cy="${round(cy, 3)}" r="1.6" fill="${esc(ov.fill)}" fill-opacity="${Math.max(ov.fillOpacity, 0.6)}" stroke="${esc(ov.color)}" stroke-width="${ov.width}"/>` +
      `<circle cx="${round(cx, 3)}" cy="${round(cy, 3)}" r="3.2" fill="none" stroke="${esc(ov.color)}" stroke-width="${ov.width * 0.7}"/>`
    );
  }
  if (ov.marker === "cross") {
    return (
      `<line x1="${round(cx, 3)}" y1="0" x2="${round(cx, 3)}" y2="${item.h}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-dasharray="1.5 1"/>` +
      `<line x1="0" y1="${round(cy, 3)}" x2="${item.w}" y2="${round(cy, 3)}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-dasharray="1.5 1"/>` +
      `<polygon points="${proj.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" fill="${esc(ov.fill)}" fill-opacity="${ov.fillOpacity}" stroke="${esc(ov.color)}" stroke-width="${ov.width}"/>`
    );
  }
  return `<polygon points="${proj.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" fill="${esc(ov.fill)}" fill-opacity="${ov.fillOpacity}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-linejoin="round"/>`;
}

function gridLabel(g, line, utm) {
  if (utm) {
    const km = g.utmUnit === "km";
    const u = km ? "km" : "m";
    const suf = g.lang === "id" ? (line.axis === "x" ? ` ${u}T` : ` ${u}U`) : line.axis === "x" ? ` ${u}E` : ` ${u}N`;
    return `${km ? round(line.value / 1000, 3) : Math.round(line.value)}${suf}`;
  }
  return fmtCoord(line.value, line.axis, g.type, g.lang, g.decimals);
}

function renderGridLines(item) {
  const g = item.props.grid;
  const { lines } = computeGrid(item);
  const st = `stroke="${esc(g.color)}" stroke-width="${g.width}" stroke-opacity="${g.opacity}"${g.dash !== "solid" ? ` stroke-dasharray="${dashArray(g.dash, g.width)}"` : ""} fill="none"`;
  let out = "";
  if (g.style === "lines") {
    for (const ln of lines) out += `<polyline points="${ln.pts.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" ${st}/>`;
  } else if (g.style === "cross" || g.style === "dots") {
    // intersections: approximate by intersecting x-lines and y-lines segment-wise
    const xs = lines.filter((l) => l.axis === "x");
    const ys = lines.filter((l) => l.axis === "y");
    const c = g.crossSize / 2;
    for (const a of xs)
      for (const b of ys) {
        const p = polyIntersect(a.pts, b.pts);
        if (!p || p[0] < 0 || p[1] < 0 || p[0] > item.w || p[1] > item.h) continue;
        if (g.style === "dots") out += `<circle cx="${round(p[0], 3)}" cy="${round(p[1], 3)}" r="${g.width * 2}" fill="${esc(g.color)}" fill-opacity="${g.opacity}"/>`;
        else out += `<path d="M${round(p[0] - c, 3)},${round(p[1], 3)}h${2 * c}M${round(p[0], 3)},${round(p[1] - c, 3)}v${2 * c}" ${st}/>`;
      }
  }
  return out;
}
function segIntersect(a, b, c, d) {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  const u = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
function polyIntersect(p1, p2) {
  for (let i = 0; i < p1.length - 1; i++) for (let j = 0; j < p2.length - 1; j++) {
    const r = segIntersect(p1[i], p1[i + 1], p2[j], p2[j + 1]);
    if (r) return r;
  }
  return null;
}

function renderGridFrame(item) {
  const g = item.props.grid;
  const { lines, utm } = computeGrid(item);
  const { w, h } = item;
  const rotated = Math.abs(item.props.view.bearing || 0) > 0.01;
  const f = g.font;
  const fh = f.size * PT;
  let out = "";
  const zw = g.frameStyle === "zebra" ? g.zebraWidth : 0;
  const crossingsByEdge = { top: [], bottom: [], left: [], right: [] };
  for (const ln of lines) {
    for (const c of edgeCrossings(ln.pts, w, h)) {
      const ok = rotated || ((c.edge === "top" || c.edge === "bottom") ? ln.axis === "x" : ln.axis === "y");
      if (ok) crossingsByEdge[c.edge].push({ ...c, line: ln });
    }
  }
  // zebra border
  if (g.frameStyle === "zebra") {
    const zc = esc(g.zebraColor);
    for (const edge of ["top", "bottom", "left", "right"]) {
      const horiz = edge === "top" || edge === "bottom";
      const len = horiz ? w : h;
      const stops = [0, ...crossingsByEdge[edge].map((c) => (horiz ? c.x : c.y)).sort((a, b) => a - b), len];
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        const fill = i % 2 === 0 ? zc : "#ffffff";
        if (edge === "top") out += `<rect x="${round(a, 3)}" y="${-zw}" width="${round(b - a, 3)}" height="${zw}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "bottom") out += `<rect x="${round(a, 3)}" y="${h}" width="${round(b - a, 3)}" height="${zw}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "left") out += `<rect x="${-zw}" y="${round(a, 3)}" width="${zw}" height="${round(b - a, 3)}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "right") out += `<rect x="${w}" y="${round(a, 3)}" width="${zw}" height="${round(b - a, 3)}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
      }
    }
    for (const [x, y] of [[-zw, -zw], [w, -zw], [-zw, h], [w, h]]) out += `<rect x="${x}" y="${y}" width="${zw}" height="${zw}" fill="${zc}"/>`;
  }
  // tick marks
  if (g.frameStyle === "ticks-in" || g.frameStyle === "ticks-out" || g.frameStyle === "ticks-cross") {
    const t = g.tickLen;
    for (const edge of Object.keys(crossingsByEdge)) {
      for (const c of crossingsByEdge[edge]) {
        let inn = g.frameStyle !== "ticks-out" ? t : 0;
        let outw = g.frameStyle !== "ticks-in" ? t : 0;
        let d = "";
        if (edge === "top") d = `M${c.x},${-outw}V${inn}`;
        if (edge === "bottom") d = `M${c.x},${h - inn}V${h + outw}`;
        if (edge === "left") d = `M${-outw},${c.y}H${inn}`;
        if (edge === "right") d = `M${w - inn},${c.y}H${w + outw}`;
        out += `<path d="${d}" stroke="${esc(g.color)}" stroke-width="${Math.max(g.width * 1.5, 0.2)}"/>`;
      }
    }
  }
  // labels
  const gap = g.gap + zw + (g.frameStyle === "ticks-out" || g.frameStyle === "ticks-cross" ? g.tickLen : 0);
  const inside = g.labelPos === "inside";
  const fa = `${fontAttrs(f)}${inside ? ` stroke="#ffffff" stroke-width="0.5" paint-order="stroke"` : ""}`;
  for (const edge of Object.keys(crossingsByEdge)) {
    if (!g.labels?.[edge]) continue;
    for (const c of crossingsByEdge[edge]) {
      const txt = esc(gridLabel(g, c.line, utm));
      const tw = textWidthMm(txt, f);
      if (edge === "top" || edge === "bottom") {
        if (c.x < tw / 2 - 0.5 || c.x > w - tw / 2 + 0.5) continue;
        const y = edge === "top" ? (inside ? gap + fh * 0.8 : -gap) : inside ? h - gap : h + gap + fh * 0.8;
        out += `<text x="${round(c.x, 3)}" y="${round(y, 3)}" text-anchor="middle" ${fa}>${txt}</text>`;
      } else {
        const vert = g.rotateSide;
        if (vert && (c.y < tw / 2 - 0.5 || c.y > h - tw / 2 + 0.5)) continue;
        if (!vert && (c.y < fh / 2 || c.y > h - fh / 2)) continue;
        if (vert) {
          const x = edge === "left" ? (inside ? gap + fh * 0.8 : -gap) : inside ? w - gap : w + gap + fh * 0.8;
          const ang = -90;
          out += `<text transform="translate(${round(x, 3)} ${round(c.y, 3)}) rotate(${ang})" text-anchor="middle" ${fa}>${txt}</text>`;
        } else {
          const x = edge === "left" ? (inside ? gap : -gap) : inside ? w - gap : w + gap;
          const anchor = (edge === "left") !== inside ? "end" : "start";
          out += `<text x="${round(x, 3)}" y="${round(c.y, 3)}" text-anchor="${anchor}" dominant-baseline="central" ${fa}>${txt}</text>`;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------- legend layout
function legendPatch(patch, x, y, pw, ph) {
  if (!patch) return "";
  const P = (v) => round(v, 3);
  switch (patch.type) {
    case "line": {
      const sw = clamp(patch.strokeWidth ?? 0.6, 0.2, ph);
      const d = patch.dash ? ` stroke-dasharray="${dashArray(patch.dash, sw)}"` : "";
      return `<line x1="${P(x)}" y1="${P(y + ph / 2)}" x2="${P(x + pw)}" y2="${P(y + ph / 2)}" stroke="${esc(patch.stroke)}" stroke-width="${sw}"${d} stroke-linecap="round"/>`;
    }
    case "point": {
      const r = clamp(patch.radius ?? ph / 3, 0.6, ph / 2);
      return `<circle cx="${P(x + pw / 2)}" cy="${P(y + ph / 2)}" r="${P(r)}" fill="${esc(patch.fill)}" fill-opacity="${patch.fillOpacity ?? 1}" stroke="${esc(patch.stroke || "none")}" stroke-width="${patch.strokeWidth ?? 0.2}"/>`;
    }
    case "gradient": {
      const id = `lg${Math.random().toString(36).slice(2, 8)}`;
      const stops = (patch.colors || []).map((c, i, a) => `<stop offset="${a.length > 1 ? i / (a.length - 1) : 0}" stop-color="${esc(c)}"/>`).join("");
      return `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="url(#${id})" stroke="#666" stroke-width="0.15"/>`;
    }
    case "tile": {
      const src = tileThumb(patch.url);
      const id = `lt${Math.random().toString(36).slice(2, 8)}`;
      if (src) {
        return `<defs><clipPath id="${id}"><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}"/></clipPath></defs><image href="${src}" x="${P(x)}" y="${P(y + ph / 2 - pw / 2)}" width="${P(pw)}" height="${P(pw)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="none" stroke="#666" stroke-width="0.15"/>`;
      }
      // placeholder: a small tiled map
      const cw = pw / 3;
      const chh = ph / 2;
      let cells = "";
      const tones = ["#cfe3c4", "#e8e2d4", "#b9d7ea", "#e8e2d4", "#d9e8cc", "#cfe3c4"];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) cells += `<rect x="${P(x + i * cw)}" y="${P(y + j * chh)}" width="${P(cw)}" height="${P(chh)}" fill="${tones[i * 2 + j]}" stroke="#ffffff" stroke-width="0.12"/>`;
      return `${cells}<path d="M${P(x)},${P(y + ph * 0.7)}C${P(x + pw * 0.3)},${P(y + ph * 0.2)} ${P(x + pw * 0.6)},${P(y + ph * 0.9)} ${P(x + pw)},${P(y + ph * 0.35)}" fill="none" stroke="#f59e0b" stroke-width="0.3"/><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="none" stroke="#666" stroke-width="0.15"/>`;
    }
    case "raster":
      return `<rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="${esc(patch.fill || "#9ca3af")}" stroke="#666" stroke-width="0.15"/><path d="M${P(x)},${P(y + ph)}L${P(x + pw * 0.4)},${P(y + ph * 0.35)}L${P(x + pw * 0.6)},${P(y + ph * 0.65)}L${P(x + pw)},${P(y)}" fill="none" stroke="#fff" stroke-width="0.25" opacity="0.6"/>`;
    default: {
      const sw = patch.stroke ? clamp(patch.strokeWidth ?? 0.3, 0.1, 1) : 0;
      return `<rect x="${P(x + sw / 2)}" y="${P(y + sw / 2)}" width="${P(pw - sw)}" height="${P(ph - sw)}" fill="${esc(patch.fill || "none")}" fill-opacity="${patch.fillOpacity ?? 1}" stroke="${esc(patch.stroke || "none")}" stroke-width="${sw}"/>`;
    }
  }
}

function layoutLegend(item) {
  const p = item.props;
  const pad = p.padding;
  let svg = "";
  let y = pad;
  if (p.title) {
    const tf = p.titleFont;
    const lines = hasMath(p.title) ? [p.title] : wrapText(p.title, tf, item.w - pad * 2);
    const lh = tf.size * PT * 1.2;
    const x = p.titleAlign === "center" ? item.w / 2 : pad;
    const anchor = p.titleAlign === "center" ? "middle" : "start";
    for (const ln of lines) {
      y += lh;
      svg += richLine(ln, x, y - lh * 0.22, tf, anchor).svg;
    }
    y += tf.size * PT * 0.5;
  }
  const entries = (p.entries || []).filter((e) => !e.hidden && (p.showGroups || e.kind !== "group"));
  const cols = Math.max(1, Math.round(p.columns));
  const colW = (item.w - pad * 2 - (cols - 1) * p.colGap) / cols;
  // measure entries
  const measured = entries.map((e) => {
    const f = e.kind === "group" ? p.groupFont : p.itemFont;
    const textX = e.kind === "group" ? 0 : p.patchW + 2;
    const lines = hasMath(e.label) ? [e.label] : wrapText(e.label ?? "", f, colW - textX);
    const lh = f.size * PT * 1.2;
    const height = e.kind === "group" ? lines.length * lh + 0.6 : Math.max(p.patchH, lines.length * lh);
    return { e, f, lines, lh, textX, height };
  });
  const totalH = measured.reduce((a, m) => a + m.height + p.rowGap, 0);
  const perCol = totalH / cols;
  let col = 0;
  let cy = y;
  let acc = 0;
  let maxY = y;
  measured.forEach((m, idx) => {
    if (col < cols - 1 && acc > 0 && acc + m.height / 2 > perCol * (col + 1)) {
      col += 1;
      cy = y;
    }
    const x = pad + col * (colW + p.colGap);
    if (m.e.kind !== "group") svg += legendPatch(m.e.patch, x, cy + (m.height - p.patchH) / 2, p.patchW, p.patchH);
    const blockH = m.lines.length * m.lh;
    const ty = cy + (m.height - blockH) / 2 + m.f.size * PT * 0.85;
    if (hasMath(m.e.label)) svg += richLine(m.e.label, x + m.textX, ty, m.f).svg;
    else {
      svg += `<text ${fontAttrs(m.f)}>`;
      m.lines.forEach((ln, i) => (svg += `<tspan x="${round(x + m.textX, 3)}" y="${round(ty + i * m.lh, 3)}">${esc(ln)}</tspan>`));
      svg += `</text>`;
    }
    cy += m.height + p.rowGap;
    acc += m.height + p.rowGap;
    maxY = Math.max(maxY, cy);
  });
  if (!entries.length) {
    svg += `<text x="${pad}" y="${round(y + 4, 3)}" font-family="Arial" font-size="2.6" fill="#9ca3af">(no entries yet — click "Sync from map")</text>`;
    maxY = y + 6;
  }
  return { svg, height: maxY - p.rowGap + pad };
}
// ---------------------------------------------------------------- color bar
// A matplotlib-style color bar: continuous or binned, horizontal or vertical,
// with optional pointed (triangle) or square extensions for out-of-range values.
const COLORMAPS = {
  viridis: ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"],
  plasma: ["#0d0887", "#46039f", "#7201a8", "#9c179e", "#bd3786", "#d8576b", "#ed7953", "#fb9f3a", "#fdca26", "#f0f921"],
  inferno: ["#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60", "#cf4446", "#ed6925", "#fb9b06", "#f7d13d", "#fcffa4"],
  magma: ["#000004", "#180f3d", "#440f76", "#721f81", "#9e2f7f", "#cd4071", "#f1605d", "#fd9668", "#feca8d", "#fcfdbf"],
  cividis: ["#00224e", "#123570", "#3b496c", "#575d6d", "#707173", "#8a8678", "#a59c74", "#c3b369", "#e1cc55", "#fee838"],
  turbo: ["#30123b", "#4145ab", "#4675ed", "#39a2fc", "#1bcfd4", "#24eca6", "#61fc6c", "#a4fc3b", "#d1e834", "#f3c63a", "#fe9b2d", "#f36315", "#d93806", "#b11901", "#7a0403"],
  spectral: ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],
  rdylgn: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
  rdylbu: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee090", "#ffffbf", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
  rdbu: ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac", "#053061"],
  brbg: ["#543005", "#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e", "#003c30"],
  coolwarm: ["#3b4cc0", "#6788ee", "#9abbff", "#c9d7f0", "#edd1c2", "#f7a889", "#e26952", "#b40426"],
  terrain: ["#333399", "#0294fa", "#01cc66", "#80e680", "#fffe99", "#ccbe7d", "#997c5d", "#996e66", "#ccb8b3", "#ffffff"],
  ylgn: ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#006837", "#004529"],
  ylorrd: ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"],
  blues: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
  greens: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"],
  oranges: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"],
  reds: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"],
  purples: ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#54278f", "#3f007d"],
  jet: ["#00007f", "#0000ff", "#007fff", "#00ffff", "#7fff7f", "#ffff00", "#ff7f00", "#ff0000", "#7f0000"],
  greys: ["#ffffff", "#f0f0f0", "#d9d9d9", "#bdbdbd", "#969696", "#737373", "#525252", "#252525", "#000000"],
  gray: ["#000000", "#ffffff"],
  hot: ["#0b0000", "#4c0000", "#8e0000", "#d00000", "#ff1300", "#ff5600", "#ff9800", "#ffda00", "#ffff3c", "#ffffff"],
  cool: ["#00ffff", "#1ce3ff", "#38c7ff", "#55aaff", "#718eff", "#8e71ff", "#aa55ff", "#c738ff", "#e31cff", "#ff00ff"],
  rainbow: ["#8000ff", "#4c4ffc", "#1996f3", "#1acfe3", "#4cf2ce", "#80feb3", "#b2f295", "#e6cf73", "#ff964f", "#ff0000"],
  ocean: ["#008000", "#004c1c", "#001938", "#001a55", "#004c71", "#00808e", "#19b2aa", "#4ce6c6", "#80ffe3", "#ffffff"],
  gist_earth: ["#000000", "#122870", "#2a6a84", "#3d8b6f", "#4f9a50", "#7aaa55", "#a9b65d", "#bd9f6e", "#d7b9a5", "#fdfbfb"],
  bwr: ["#0000ff", "#3939ff", "#7171ff", "#aaaaff", "#e3e3ff", "#ffe3e3", "#ffaaaa", "#ff7171", "#ff3939", "#ff0000"],
  seismic: ["#00004c", "#0000a6", "#0000ff", "#7171ff", "#e3e3ff", "#ffe3e3", "#ff7171", "#ff0000", "#c00000", "#800000"],
  piyg: ["#8e0152", "#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221", "#276419"],
  prgn: ["#40004b", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837", "#00441b"],
  puor: ["#2d004b", "#542788", "#8073ac", "#b2abd2", "#d8daeb", "#fee0b6", "#fdb863", "#e08214", "#b35806", "#7f3b08"],
  ylgnbu: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"],
  ylorbr: ["#ffffe5", "#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#993404", "#662506"],
  bupu: ["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#810f7c", "#4d004b"],
  gnbu: ["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"],
  twilight: ["#e2d9e2", "#a5b5cf", "#6981c0", "#5e43a5", "#2f1436", "#5a1d3f", "#9e3d4a", "#c7806f", "#d9c0b8", "#e2d9e2"],
  cubehelix: ["#000000", "#1a1530", "#163d4e", "#1f6642", "#54792f", "#a07949", "#d07e93", "#cf9cda", "#c1caf3", "#ffffff"],
};
const COLORMAP_LABELS = {
  viridis: "Viridis", plasma: "Plasma", inferno: "Inferno", magma: "Magma", cividis: "Cividis", turbo: "Turbo",
  spectral: "Spectral", rdylgn: "RdYlGn", rdylbu: "RdYlBu", rdbu: "RdBu", brbg: "BrBG", coolwarm: "Coolwarm",
  terrain: "Terrain", ylgn: "YlGn", ylorrd: "YlOrRd", blues: "Blues", greens: "Greens", oranges: "Oranges",
  reds: "Reds", purples: "Purples", jet: "Jet", greys: "Greys", gray: "Gray",
  hot: "Hot", cool: "Cool", rainbow: "Rainbow", ocean: "Ocean", gist_earth: "Earth", bwr: "BWR", seismic: "Seismic",
  piyg: "PiYG", prgn: "PRGn", puor: "PuOr", ylgnbu: "YlGnBu", ylorbr: "YlOrBr", bupu: "BuPu", gnbu: "GnBu",
  twilight: "Twilight", cubehelix: "Cubehelix",
};

function hexToRgb(h) {
  const c = normalizeHex(h);
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
// Colors of a color bar, low → high.
function colorbarColors(p) {
  let cols = null;
  if (p.colormap === "custom") {
    cols = String(p.customColors || "")
      .split(/[\s,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  if (!cols || cols.length < 2) cols = COLORMAPS[p.colormap] || COLORMAPS.viridis;
  return p.reverse ? [...cols].reverse() : cols;
}
function sampleColors(cols, t) {
  t = clamp(t, 0, 1);
  const x = t * (cols.length - 1);
  const i = Math.min(Math.floor(x), cols.length - 2);
  const f = x - i;
  const a = hexToRgb(cols[i]);
  const b = hexToRgb(cols[i + 1]);
  return rgbToHex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
}
function colormapGradientCss(name, reverse) {
  const cols = colorbarColors({ colormap: name, reverse });
  return `linear-gradient(90deg, ${cols.join(", ")})`;
}

// Tick values for the bar.
// Finite low/high of a color bar (bad input → 0…1, equal values → ±0.5).
function colorbarRange(p) {
  let a = Number(p.vmin);
  let b = Number(p.vmax);
  if (!Number.isFinite(a)) a = 0;
  if (!Number.isFinite(b)) b = a + 1;
  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  if (hi === lo) [lo, hi] = [lo - 0.5, hi + 0.5];
  return [lo, hi];
}
function colorbarTicks(p) {
  const [lo, hi] = colorbarRange(p);
  if (!(hi > lo)) return [lo];
  if (p.tickMode === "custom") {
    return String(p.customTicks || "")
      .split(/[\s,;]+/)
      .map(Number)
      .filter((v) => Number.isFinite(v) && v >= lo - 1e-12 && v <= hi + 1e-12);
  }
  const n = Math.max(2, Math.round(p.tickCount || 5));
  if (p.tickMode === "nice") {
    const step = niceStep(hi - lo, n - 1);
    const out = [];
    for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) out.push(round(k * step, 10));
    return out;
  }
  // linear: n ticks from min to max inclusive, like np.linspace
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}
function tickDecimals(p, ticks) {
  if (p.decimals >= 0) return p.decimals;
  if (ticks.length < 2) return Math.abs(ticks[0] || 0) < 10 ? 2 : 0;
  const step = Math.abs(ticks[1] - ticks[0]) || 1;
  // smallest decimal count that keeps every tick exact (max 4)
  const maxD = clamp(Math.ceil(-Math.log10(step)) + 2, 0, 4);
  for (let d = 0; d <= maxD; d++) {
    if (ticks.every((t) => Math.abs(t - round(t, d)) < step * 1e-6)) return d;
  }
  return clamp(Math.ceil(-Math.log10(step)) + 1, 0, 4);
}
function fmtTick(v, d, p) {
  const s = p.thousands
    ? Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
    : Number(v).toFixed(d);
  return `${p.prefix || ""}${s === "-0" ? "0" : s}${p.suffix || ""}`;
}

ITEM_TYPES.colorbar = {
  label: "Color Bar",
  icon: "colorbar",
  size: [70, 16],
  defaults: () => ({
    source: "",
    colormap: "viridis",
    reverse: false,
    customColors: "#2c7bb6, #abd9e9, #ffffbf, #fdae61, #d7191c",
    vmin: 0,
    vmax: 1,
    bins: 0,
    orientation: "horizontal",
    thickness: 3.5,
    extend: "neither",
    extendShape: "triangle",
    extendFrac: 0.05,
    tickMode: "linear",
    tickCount: 5,
    customTicks: "",
    decimals: -1,
    thousands: true,
    prefix: "",
    suffix: "",
    tickSide: "after",
    tickDir: "out",
    tickLen: 1.2,
    tickWidth: 0.2,
    tickColor: "#111111",
    tickFont: font({ size: 7 }),
    outline: true,
    outlineColor: "#111111",
    outlineWidth: 0.25,
    title: "Value",
    titlePos: "before",
    titleAlign: "center",
    titleFont: font({ size: 8, bold: true }),
    padding: 1.5,
    background: "",
    bgOpacity: 1,
    border: { show: false, color: "#333333", width: 0.3, radius: 0 },
  }),
};

RENDERERS.colorbar = function colorbar(item) {
  const p = item.props;
  const horiz = p.orientation !== "vertical";
  const cols = colorbarColors(p);
  const ticks = colorbarTicks(p);
  const dec = tickDecimals(p, ticks);
  const labels = ticks.map((t) => fmtTick(t, dec, p));
  const tf = p.tickFont;
  const tfh = tf.size * PT;
  const ttf = p.titleFont;
  const tth = ttf.size * PT;
  const pad = p.padding || 0;
  const tickLen = p.tickDir === "none" ? 0 : p.tickLen;
  const tickOut = p.tickDir === "out" || p.tickDir === "both" ? tickLen : 0;
  const [lo, hi] = colorbarRange(p);
  const span = hi - lo || 1;
  const extLo = p.extend === "min" || p.extend === "both";
  const extHi = p.extend === "max" || p.extend === "both";
  const labelW = labels.map((l) => textWidthMm(l, tf));
  const maxLabelW = Math.max(0, ...labelW);
  const P = (v) => round(v, 3);
  const uid8 = item.id.replace(/[^\w]/g, "").slice(-10);
  const after = p.tickSide !== "before";
  let out = "";
  if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;

  // ---- geometry: bar rectangle (x0,y0,len along the axis, th across)
  let bx;
  let by;
  let len;
  let th;
  let titleSvg = "";
  const hasTitle = !!String(p.title || "").trim();
  if (horiz) {
    const titleH = hasTitle && p.titlePos !== "side" ? tth * 1.3 : 0;
    const sideTitleW = hasTitle && p.titlePos === "side" ? richLine(p.title, 0, 0, ttf).width + 2 : 0;
    const labelBand = tickOut + 0.8 + tfh;
    const marginL = Math.max(labelW[0] || 0, 0) / 2;
    const marginR = Math.max(labelW[labelW.length - 1] || 0, 0) / 2;
    th = Math.max(0.5, Math.min(p.thickness, item.h - pad * 2 - titleH - labelBand));
    // the extensions take a share of the total length
    const total = item.w - pad * 2 - sideTitleW - marginL - marginR;
    len = Math.max(2, total / (1 + (extLo + extHi) * p.extendFrac));
    const ext = len * p.extendFrac;
    bx = pad + sideTitleW + marginL + (extLo ? ext : 0);
    const titleBefore = hasTitle && p.titlePos === "before";
    const ticksBefore = !after;
    by = pad + (titleBefore ? titleH : 0) + (ticksBefore ? labelBand : 0);
    if (hasTitle) {
      const tx = p.titleAlign === "left" ? bx - (extLo ? ext : 0) : p.titleAlign === "right" ? bx + len + (extHi ? ext : 0) : bx + len / 2;
      const anchor = p.titleAlign === "left" ? "start" : p.titleAlign === "right" ? "end" : "middle";
      if (p.titlePos === "side") {
        titleSvg = richLine(p.title, pad, by + th / 2 + tth * 0.35, ttf, "start").svg;
      } else {
        const ty = p.titlePos === "before" ? pad + tth * 0.95 : by + th + (after ? labelBand : 0) + tth * 1.15;
        titleSvg = richLine(p.title, tx, ty, ttf, anchor).svg;
      }
    }
  } else {
    const titleH = hasTitle && p.titlePos !== "side" ? tth * 1.4 : 0;
    const sideTitleW = hasTitle && p.titlePos === "side" ? tth * 1.4 : 0;
    const labelBand = tickOut + 0.8 + maxLabelW;
    const marginT = tfh / 2;
    const marginB = tfh / 2;
    th = Math.max(0.5, Math.min(p.thickness, item.w - pad * 2 - sideTitleW - labelBand));
    const total = item.h - pad * 2 - titleH - marginT - marginB;
    len = Math.max(2, total / (1 + (extLo + extHi) * p.extendFrac));
    const ext = len * p.extendFrac;
    by = pad + (p.titlePos === "before" ? titleH : 0) + marginT + (extHi ? ext : 0);
    bx = pad + sideTitleW + (after ? 0 : labelBand);
    if (hasTitle) {
      if (p.titlePos === "side") {
        titleSvg = `<g transform="translate(${P(pad + tth * 0.95)} ${P(by + len / 2)}) rotate(-90)">${richLine(p.title, 0, 0, ttf, "middle").svg}</g>`;
      } else {
        const ty = p.titlePos === "before" ? pad + tth * 0.95 : by + len + (extLo ? ext : 0) + marginB + tth * 1.2;
        const tx = p.titleAlign === "left" ? pad : p.titleAlign === "right" ? item.w - pad : bx + th / 2;
        const anchor = p.titleAlign === "left" ? "start" : p.titleAlign === "right" ? "end" : "middle";
        titleSvg = richLine(p.title, tx, ty, ttf, anchor).svg;
      }
    }
  }
  const ext = len * p.extendFrac;

  // position along the bar for a data value (horizontal: left→right low→high; vertical: bottom→top)
  const pos = (v) => (horiz ? bx + ((v - lo) / span) * len : by + len - ((v - lo) / span) * len);

  // ---- fill
  const gid = `cbg-${uid8}`;
  const bins = Math.max(0, Math.round(p.bins || 0));
  if (bins >= 2) {
    for (let i = 0; i < bins; i++) {
      const c = sampleColors(cols, (i + 0.5) / bins);
      const a = (len * i) / bins;
      const b = (len * (i + 1)) / bins;
      out += horiz
        ? `<rect x="${P(bx + a)}" y="${P(by)}" width="${P(b - a + 0.02)}" height="${P(th)}" fill="${c}"/>`
        : `<rect x="${P(bx)}" y="${P(by + len - b)}" width="${P(th)}" height="${P(b - a + 0.02)}" fill="${c}"/>`;
    }
  } else {
    const stops = cols.map((c, i) => `<stop offset="${round(i / (cols.length - 1), 4)}" stop-color="${esc(c)}"/>`).join("");
    out += `<defs><linearGradient id="${gid}" ${horiz ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="1" x2="0" y2="0"'}>${stops}</linearGradient></defs>`;
    out += `<rect x="${P(bx)}" y="${P(by)}" width="${P(horiz ? len : th)}" height="${P(horiz ? th : len)}" fill="url(#${gid})"/>`;
  }
  // ---- extensions (under / over colors = the colormap ends)
  const tri = p.extendShape !== "rect";
  let outline = "";
  if (horiz) {
    const y0 = by;
    const y1 = by + th;
    const ym = by + th / 2;
    const x0 = bx;
    const x1 = bx + len;
    if (extLo) out += tri ? `<polygon points="${P(x0)},${P(y0)} ${P(x0 - ext)},${P(ym)} ${P(x0)},${P(y1)}" fill="${cols[0]}"/>` : `<rect x="${P(x0 - ext)}" y="${P(y0)}" width="${P(ext + 0.02)}" height="${P(th)}" fill="${cols[0]}"/>`;
    if (extHi) out += tri ? `<polygon points="${P(x1)},${P(y0)} ${P(x1 + ext)},${P(ym)} ${P(x1)},${P(y1)}" fill="${cols[cols.length - 1]}"/>` : `<rect x="${P(x1 - 0.02)}" y="${P(y0)}" width="${P(ext + 0.02)}" height="${P(th)}" fill="${cols[cols.length - 1]}"/>`;
    const L = extLo ? (tri ? `L${P(x0 - ext)},${P(ym)}` : `L${P(x0 - ext)},${P(y1)}L${P(x0 - ext)},${P(y0)}`) : "";
    const R = extHi ? (tri ? `L${P(x1 + ext)},${P(ym)}` : `L${P(x1 + ext)},${P(y0)}L${P(x1 + ext)},${P(y1)}`) : "";
    outline = `M${P(x0)},${P(y0)}L${P(x1)},${P(y0)}${R}L${P(x1)},${P(y1)}L${P(x0)},${P(y1)}${L}Z`;
  } else {
    const x0 = bx;
    const x1 = bx + th;
    const xm = bx + th / 2;
    const yt = by;
    const yb = by + len;
    if (extHi) out += tri ? `<polygon points="${P(x0)},${P(yt)} ${P(xm)},${P(yt - ext)} ${P(x1)},${P(yt)}" fill="${cols[cols.length - 1]}"/>` : `<rect x="${P(x0)}" y="${P(yt - ext)}" width="${P(th)}" height="${P(ext + 0.02)}" fill="${cols[cols.length - 1]}"/>`;
    if (extLo) out += tri ? `<polygon points="${P(x0)},${P(yb)} ${P(xm)},${P(yb + ext)} ${P(x1)},${P(yb)}" fill="${cols[0]}"/>` : `<rect x="${P(x0)}" y="${P(yb - 0.02)}" width="${P(th)}" height="${P(ext + 0.02)}" fill="${cols[0]}"/>`;
    const T = extHi ? (tri ? `L${P(xm)},${P(yt - ext)}` : `L${P(x0)},${P(yt - ext)}L${P(x1)},${P(yt - ext)}`) : "";
    const B = extLo ? (tri ? `L${P(xm)},${P(yb + ext)}` : `L${P(x1)},${P(yb + ext)}L${P(x0)},${P(yb + ext)}`) : "";
    outline = `M${P(x0)},${P(yt)}${T}L${P(x1)},${P(yt)}L${P(x1)},${P(yb)}${B}L${P(x0)},${P(yb)}Z`;
  }
  if (p.outline) out += `<path d="${outline}" fill="none" stroke="${esc(p.outlineColor)}" stroke-width="${p.outlineWidth}" stroke-linejoin="miter"/>`;

  // ---- ticks + labels
  const tc = esc(p.tickColor);
  ticks.forEach((t, i) => {
    const q = pos(t);
    const inner = p.tickDir === "in" || p.tickDir === "both" ? tickLen : 0;
    if (horiz) {
      const edge = after ? by + th : by;
      const dirOut = after ? 1 : -1;
      if (tickLen) out += `<line x1="${P(q)}" y1="${P(edge - dirOut * inner)}" x2="${P(q)}" y2="${P(edge + dirOut * tickOut)}" stroke="${tc}" stroke-width="${p.tickWidth}"/>`;
      const ly = after ? edge + tickOut + 0.8 + tfh * 0.78 : edge - tickOut - 0.8;
      out += `<text x="${P(q)}" y="${P(ly)}" text-anchor="middle" ${fontAttrs(tf)}>${esc(labels[i])}</text>`;
    } else {
      const edge = after ? bx + th : bx;
      const dirOut = after ? 1 : -1;
      if (tickLen) out += `<line x1="${P(edge - dirOut * inner)}" y1="${P(q)}" x2="${P(edge + dirOut * tickOut)}" y2="${P(q)}" stroke="${tc}" stroke-width="${p.tickWidth}"/>`;
      const lx = edge + dirOut * (tickOut + 0.8);
      out += `<text x="${P(lx)}" y="${P(q)}" text-anchor="${after ? "start" : "end"}" dominant-baseline="central" ${fontAttrs(tf)}>${esc(labels[i])}</text>`;
    }
  });
  out += titleSvg;
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};

// ---- read value range / colors from a GeoLibre layer
function projectLayers() {
  try {
    return S.app?.getProjectSnapshot?.()?.layers || [];
  } catch {
    return [];
  }
}
// Layer kinds as GeoLibre stores them (type + source + metadata).
const TILE_TYPE_RE = /^(xyz|tiles?|tms|wms|wmts|arcgis|pmtiles-raster|mbtiles-raster|raster-tiles?)$/i;
function isTileLayer(l) {
  if (!l) return false;
  if (l.metadata?.rasterState) return false;
  const t = String(l.type || "");
  if (TILE_TYPE_RE.test(t)) return true;
  const kind = String(l.metadata?.sourceKind || "");
  if (/xyz|wms|wmts|tile/i.test(kind)) return true;
  return l.source?.type === "raster" && !/cog|tif/i.test(t);
}
function isDataRaster(l) {
  if (!l) return false;
  if (l.metadata?.rasterState) return true;
  if (isTileLayer(l)) return false;
  return /cog|geotiff|tiff?|raster|zarr|netcdf|georaster|dem/i.test(String(l.type || "")) || /\.(tiff?|vrt)(\?|$)/i.test(String(l.source?.url || l.url || ""));
}
// [min, max] from whatever GeoLibre stored: rescale [[a,b]], [a,b], "a,b", {min,max}, stats…
function rasterRange(l) {
  const md = l?.metadata || {};
  const rs = md.rasterState || {};
  const pair = (v) => {
    if (v == null) return null;
    if (typeof v === "string") v = v.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (Array.isArray(v)) {
      if (Array.isArray(v[0])) return pair(v[0]);
      if (v.length >= 2 && v.slice(0, 2).every((x) => x !== null && x !== "" && Number.isFinite(Number(x)))) return [Number(v[0]), Number(v[1])];
      return null;
    }
    if (typeof v === "object") {
      const lo = v.min ?? v.vmin ?? v.minimum ?? v.low;
      const hi = v.max ?? v.vmax ?? v.maximum ?? v.high;
      if (Number.isFinite(Number(lo)) && Number.isFinite(Number(hi)) && lo !== null && hi !== null) return [Number(lo), Number(hi)];
    }
    return null;
  };
  const band = Array.isArray(rs.bands) ? Math.max(0, Number(rs.bands[0]) - 1 || 0) : 0;
  const cands = [
    rs.rescale, rs.range, rs.domain, rs, rs.stats?.[band], rs.statistics?.[band], rs.stats, rs.statistics,
    md.statistics?.[band], md.stats?.[band], md.bandStats?.[band], md.statistics, md.stats, md.range,
    l?.style?.rasterRange, l?.style?.rescale,
  ];
  for (const c of cands) {
    const r = pair(c);
    if (r && r[0] !== r[1]) return r;
  }
  return null;
}
// Colormap name → {name, reverse} for the COLORMAPS table, or null.
const CMAP_ALIASES = { grey: "gray", greys: "greys", grayscale: "gray", greyscale: "gray", earth: "gist_earth", spectral_r: "spectral", rdylgn: "rdylgn", ndvi: "rdylgn", elevation: "terrain", dem: "terrain" };
function rasterColormap(name) {
  let n = String(name || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!n) return null;
  let reverse = false;
  if (/_r$/.test(n)) {
    reverse = true;
    n = n.slice(0, -2);
  }
  n = CMAP_ALIASES[n] || n;
  if (!COLORMAPS[n]) n = n.replace(/_/g, "");
  return COLORMAPS[n] ? { name: n, reverse } : null;
}
// All project layers: the live list plus snapshot-only layers (some rasters are drawn by deck.gl).
function allProjectLayers() {
  const snap = projectLayers();
  const byId = new Map(snap.map((l) => [l.id, l]));
  const out = [];
  const seen = new Set();
  for (const gl of glLayers()) {
    out.push({ ...gl, ...(byId.get(gl.id) || {}), name: gl.name || byId.get(gl.id)?.name, visible: gl.visible });
    seen.add(gl.id);
  }
  for (const l of snap) if (!seen.has(l.id)) out.push(l);
  return out;
}
function colorbarSourceOptions() {
  const opts = [["", "Manual values"]];
  for (const l of allProjectLayers()) {
    const raster = isDataRaster(l);
    const graduated = l.style?.vectorStyleMode && l.style.vectorStyleMode !== "single";
    if (raster || graduated) opts.push([l.id, `${l.name || l.id}${raster ? " (raster)" : " (graduated)"}`]);
  }
  return opts;
}
// Copy vmin/vmax/colormap from a layer into the color bar props. Returns a message.
function readColorbarFromLayer(p) {
  const l = allProjectLayers().find((x) => x.id === p.source);
  if (!l) return "Layer not found in the current GeoLibre project.";
  const named = !p.title || p.title === "Value" || p.title === p._autoTitle;
  if (isDataRaster(l)) {
    const rs = l.metadata?.rasterState || {};
    const r = rasterRange(l);
    if (r) {
      p.vmin = r[0];
      p.vmax = r[1];
      // data ranges are rarely round: label round values inside them
      if (p.tickMode !== "custom") p.tickMode = "nice";
    }
    const multi = Array.isArray(rs.bands) && rs.bands.length >= 3 && !rs.colormap;
    const cm = rasterColormap(rs.colormap || rs.colormapName || rs.cmap || l.style?.colormap);
    if (cm) {
      p.colormap = cm.name;
      p.reverse = cm.reverse;
    } else if (!rs.colormap && !multi) {
      // single band without a colormap is shown in grey
      p.colormap = "gray";
      p.reverse = false;
    }
    if (named) p.title = p._autoTitle = l.name || p.title;
    const cmMsg = rs.colormap && !cm ? ` Colormap “${rs.colormap}” is not in the list — pick the closest one.` : "";
    if (multi) return `“${l.name}” is an RGB composite; a color bar applies to single-band rasters.`;
    return r ? `Range ${fmtNumber(p.vmin, 2)} – ${fmtNumber(p.vmax, 2)} read from “${l.name}”.${cmMsg}` : `Colormap read from “${l.name}”; it has no stored value range, so set min/max manually.${cmMsg}`;
  }
  const st = l.style || {};
  const stops = Array.isArray(st.vectorStyleStops) ? st.vectorStyleStops.filter((s) => s && s.color != null && Number.isFinite(Number(s.value))) : [];
  if (stops.length >= 2) {
    p.vmin = Number(stops[0].value);
    p.vmax = Number(stops[stops.length - 1].value);
    const cm = rasterColormap(st.vectorStyleColorRamp);
    if (cm && st.vectorStyleMode !== "categorized") {
      p.colormap = cm.name;
      p.reverse = cm.reverse;
    } else {
      p.colormap = "custom";
      p.reverse = false;
      p.customColors = stops.map((s) => s.color).join(", ");
    }
    if (named) p.title = p._autoTitle = st.vectorStyleProperty || l.name;
    return `Range ${fmtNumber(p.vmin, 2)} – ${fmtNumber(p.vmax, 2)} read from “${l.name}”.`;
  }
  return `“${l.name}” has no stored value range — set min/max manually.`;
}
// ---------------------------------------------------------------- LaTeX (MathJax)
// Formulas render through MathJax 3 (SVG output, no font cache) so each formula
// becomes self-contained vector paths that work on screen, in PNG/PDF and in SVG.
// MathJax loads on first use; until then the plain text is drawn as a stand-in.
const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js";
const MATH = { promise: null, ready: false, failed: false, cache: new Map() };

function loadMathJax() {
  if (MATH.ready) return Promise.resolve();
  if (MATH.promise) return MATH.promise;
  MATH.promise = new Promise((resolve, reject) => {
    if (window.MathJax?.tex2svg) {
      MATH.ready = true;
      return resolve();
    }
    if (!window.MathJax) {
      window.MathJax = { svg: { fontCache: "none" }, startup: { typeset: false }, options: { enableMenu: false } };
    }
    const sc = document.createElement("script");
    sc.src = MATHJAX_URL;
    sc.async = true;
    sc.onload = () =>
      (window.MathJax.startup?.promise || Promise.resolve()).then(() => {
        MATH.ready = !!window.MathJax?.tex2svg;
        if (MATH.ready) resolve();
        else reject(new Error("MathJax did not start"));
      });
    sc.onerror = () => {
      MATH.failed = true;
      MATH.promise = null;
      reject(new Error("Could not load MathJax (check the internet connection)"));
    };
    document.head.appendChild(sc);
  });
  MATH.promise.then(
    () => {
      MATH.cache.clear();
      if (S.open) scheduleOverlayRefresh(true);
    },
    (e) => toast(e.message, "warn"),
  );
  return MATH.promise;
}

const hasMath = (s) => /\$[^$]+\$/.test(String(s ?? ""));

// "Area ($km^2$)" -> "\text{Area (}km^2\text{)}"
function textToTex(str) {
  const parts = String(str).split(/(\$[^$]*\$)/);
  return parts
    .map((p) => {
      if (/^\$[^$]*\$$/.test(p)) return p.slice(1, -1);
      if (!p) return "";
      return `\\text{${p.replace(/[{}]/g, "")}}`;
    })
    .join("");
}

// Render TeX once and cache: {inner, minX, minY, w, h} in MathJax units (1000 = 1 em).
function texToSvg(tex, display = false) {
  const key = `${display ? "D" : "I"}|${tex}`;
  if (MATH.cache.has(key)) return MATH.cache.get(key);
  if (!MATH.ready) {
    loadMathJax().catch(() => {});
    return null;
  }
  let res;
  try {
    const node = window.MathJax.tex2svg(tex, { display });
    const svg = node.querySelector("svg");
    const vb = (svg.getAttribute("viewBox") || "0 0 0 0").split(/\s+/).map(Number);
    const err = svg.querySelector("[data-mjx-error]");
    res = { inner: svg.innerHTML, minX: vb[0], minY: vb[1], w: vb[2], h: vb[3], error: err ? err.getAttribute("data-mjx-error") : "" };
  } catch (e) {
    res = { inner: "", minX: 0, minY: 0, w: 0, h: 0, error: e.message };
  }
  MATH.cache.set(key, res);
  return res;
}

// A single line of text that may contain $...$ math. Returns {svg, width} in mm,
// positioned with its baseline at y. anchor: start | middle | end.
function richLine(str, x, y, f, anchor = "start", extraAttrs = "") {
  const text = String(str ?? "");
  if (!hasMath(text)) {
    return { svg: `<text x="${round(x, 3)}" y="${round(y, 3)}" text-anchor="${anchor}" ${fontAttrs(f)} ${extraAttrs}>${esc(text)}</text>`, width: textWidthMm(text, f) };
  }
  const m = texToSvg(textToTex(text));
  if (!m || m.error) {
    const plain = text.replace(/\$/g, "");
    const fill = m?.error ? `fill="#b91c1c"` : "";
    return { svg: `<text x="${round(x, 3)}" y="${round(y, 3)}" text-anchor="${anchor}" ${fontAttrs(f)} ${fill}>${esc(plain)}</text>`, width: textWidthMm(plain, f) };
  }
  const size = (f.size || 10) * PT;
  const w = (m.w / 1000) * size;
  const h = (m.h / 1000) * size;
  const top = y + (m.minY / 1000) * size;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return {
    svg: `<svg x="${round(left, 3)}" y="${round(top, 3)}" width="${round(w, 3)}" height="${round(h, 3)}" viewBox="${m.minX} ${m.minY} ${m.w} ${m.h}" overflow="visible" color="${esc(f.color || "#000")}" fill="${esc(f.color || "#000")}">${m.inner}</svg>`,
    width: w,
  };
}

// ---------------------------------------------------------------- formula item
ITEM_TYPES.latex = {
  label: "Formula (LaTeX)",
  icon: "sigma",
  size: [50, 14],
  defaults: () => ({
    tex: "R^2 = 0.95",
    display: true,
    size: 14,
    color: "#111111",
    align: "center",
    valign: "middle",
    padding: 1,
    background: "",
    bgOpacity: 1,
    border: { show: false, color: "#333333", width: 0.3, radius: 0 },
  }),
};

RENDERERS.latex = function latex(item, ctx) {
  const p = item.props;
  let out = "";
  if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
  const tex = resolveVars(p.tex || "", item);
  const m = tex.trim() ? texToSvg(tex, !!p.display) : null;
  const pad = p.padding || 0;
  if (!m) {
    out += `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Times New Roman, serif" font-style="italic" font-size="${round((p.size || 12) * PT, 3)}" fill="${esc(p.color)}">${esc(tex || (ctx.export ? "" : "(empty formula)"))}</text>`;
  } else if (m.error) {
    out += `<text x="2" y="${round(item.h / 2, 3)}" dominant-baseline="central" font-family="Arial" font-size="2.6" fill="#b91c1c">LaTeX error: ${esc(m.error)}</text>`;
  } else {
    const size = (p.size || 12) * PT;
    const w = (m.w / 1000) * size;
    const h = (m.h / 1000) * size;
    const x = p.align === "left" ? pad : p.align === "right" ? item.w - pad - w : (item.w - w) / 2;
    const y = p.valign === "top" ? pad : p.valign === "bottom" ? item.h - pad - h : (item.h - h) / 2;
    out += `<svg x="${round(x, 3)}" y="${round(y, 3)}" width="${round(w, 3)}" height="${round(h, 3)}" viewBox="${m.minX} ${m.minY} ${m.w} ${m.h}" overflow="visible" color="${esc(p.color)}" fill="${esc(p.color)}">${m.inner}</svg>`;
    S.legendCache.set(item.id, h + pad * 2);
    S.mathWidth = S.mathWidth || new Map();
    S.mathWidth.set(item.id, w + pad * 2);
  }
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};

// ---------------------------------------------------------------- symbol catalog
const LATEX_SYMBOLS = {
  Greek: [
    ["α", "\\alpha"], ["β", "\\beta"], ["γ", "\\gamma"], ["δ", "\\delta"], ["ε", "\\epsilon"], ["ζ", "\\zeta"], ["η", "\\eta"], ["θ", "\\theta"],
    ["ι", "\\iota"], ["κ", "\\kappa"], ["λ", "\\lambda"], ["μ", "\\mu"], ["ν", "\\nu"], ["ξ", "\\xi"], ["π", "\\pi"], ["ρ", "\\rho"],
    ["σ", "\\sigma"], ["τ", "\\tau"], ["υ", "\\upsilon"], ["φ", "\\phi"], ["χ", "\\chi"], ["ψ", "\\psi"], ["ω", "\\omega"], ["Γ", "\\Gamma"],
    ["Δ", "\\Delta"], ["Θ", "\\Theta"], ["Λ", "\\Lambda"], ["Ξ", "\\Xi"], ["Π", "\\Pi"], ["Σ", "\\Sigma"], ["Υ", "\\Upsilon"], ["Φ", "\\Phi"],
    ["Ψ", "\\Psi"], ["Ω", "\\Omega"],
  ],
  Operators: [
    ["±", "\\pm"], ["∓", "\\mp"], ["×", "\\times"], ["÷", "\\div"], ["·", "\\cdot"], ["√", "\\sqrt{}"], ["∑", "\\sum_{i=1}^{n}"], ["∏", "\\prod_{i=1}^{n}"],
    ["∫", "\\int_{}^{}"], ["∮", "\\oint"], ["∂", "\\partial"], ["∇", "\\nabla"], ["∞", "\\infty"], ["≈", "\\approx"], ["≠", "\\neq"], ["≤", "\\leq"],
    ["≥", "\\geq"], ["≡", "\\equiv"], ["∝", "\\propto"], ["∼", "\\sim"], ["≅", "\\cong"], ["⊥", "\\perp"], ["∥", "\\parallel"], ["∠", "\\angle"],
    ["°", "^{\\circ}"], ["′", "\\prime"],
  ],
  Units: [
    ["m²", "m^{2}"], ["m⁻²", "m^{-2}"], ["km²", "km^{2}"], ["cm³", "cm^{3}"], ["ha⁻¹", "ha^{-1}"], ["Mg ha⁻¹", "Mg\\,ha^{-1}"], ["g C m⁻²", "g\\,C\\,m^{-2}"],
    ["g cm⁻³", "g\\,cm^{-3}"], ["kg m⁻³", "kg\\,m^{-3}"], ["W m⁻² sr⁻¹ µm⁻¹", "W\\,m^{-2}\\,sr^{-1}\\,\\mu m^{-1}"], ["µm", "\\mu m"], ["nm", "nm"],
    ["°C", "^{\\circ}C"], ["%", "\\%"], ["‰", "\\text{‰}"], ["R²", "R^{2}"], ["p<.05", "p < 0.05"], ["n=", "n = "], ["x̄", "\\bar{x}"], ["σ", "\\sigma"],
    ["×10ⁿ", "\\times 10^{n}"],
  ],
  Arrows: [
    ["→", "\\rightarrow"], ["←", "\\leftarrow"], ["↔", "\\leftrightarrow"], ["⇒", "\\Rightarrow"], ["⇔", "\\Leftrightarrow"], ["↑", "\\uparrow"], ["↓", "\\downarrow"], ["↦", "\\mapsto"],
  ],
  "Sets & logic": [
    ["∈", "\\in"], ["∉", "\\notin"], ["⊂", "\\subset"], ["⊆", "\\subseteq"], ["∪", "\\cup"], ["∩", "\\cap"], ["∀", "\\forall"], ["∃", "\\exists"],
    ["¬", "\\neg"], ["∧", "\\wedge"], ["∨", "\\vee"], ["∅", "\\emptyset"], ["ℝ", "\\mathbb{R}"], ["ℕ", "\\mathbb{N}"], ["ℤ", "\\mathbb{Z}"],
  ],
};
// Structure templates: "|" marks where the caret lands.
const LATEX_TEMPLATES = [
  ["a/b", "Fraction", "\\frac{|}{}"],
  ["x²", "Superscript", "^{|}"],
  ["xᵢ", "Subscript", "_{|}"],
  ["√x", "Square root", "\\sqrt{|}"],
  ["ⁿ√x", "n-th root", "\\sqrt[n]{|}"],
  ["∑", "Sum", "\\sum_{i=1}^{n} |"],
  ["∏", "Product", "\\prod_{i=1}^{n} |"],
  ["∫", "Integral", "\\int_{a}^{b} | \\,dx"],
  ["lim", "Limit", "\\lim_{x \\to \\infty} |"],
  ["v⃗", "Vector", "\\vec{|}"],
  ["x̄", "Overline", "\\overline{|}"],
  ["x̂", "Hat", "\\hat{|}"],
  ["(n k)", "Binomial", "\\binom{|}{k}"],
  ["[ ]", "2×2 matrix", "\\begin{bmatrix} | & b \\\\ c & d \\end{bmatrix}"],
  ["Aa", "Upright text", "\\mathrm{|}"],
];
const RECENT_KEY = "glc:latex-recent";
function recentFormulas() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function rememberFormula(tex) {
  const t = String(tex || "").trim();
  if (!t) return;
  try {
    const list = [t, ...recentFormulas().filter((x) => x !== t)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}
// Insert a snippet into a textarea at the caret ("|" = caret position).
function insertAtCaret(ta, snippet) {
  const caret = snippet.indexOf("|");
  const clean = snippet.replace("|", "");
  const a = ta.selectionStart ?? ta.value.length;
  const b = ta.selectionEnd ?? a;
  const selected = ta.value.slice(a, b);
  const insert = caret >= 0 && selected ? clean.slice(0, caret) + selected + clean.slice(caret) : clean;
  ta.value = ta.value.slice(0, a) + insert + ta.value.slice(b);
  const pos = a + (caret >= 0 ? caret + selected.length : insert.length);
  ta.focus();
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
function symbolCatalog(ta, { mathWrap = false } = {}) {
  const wrap = el("div", { class: `${NS}-symcat` });
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search symbols (e.g. alpha, km, arrow)" });
  const tabs = el("div", { class: `${NS}-symtabs` });
  const grid = el("div", { class: `${NS}-symgrid` });
  let cat = "Greek";
  const put = (code) => insertAtCaret(ta, mathWrap ? `$${code}$` : code);
  const draw = () => {
    grid.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    const list = q ? Object.values(LATEX_SYMBOLS).flat().filter(([g, c]) => g.toLowerCase().includes(q) || c.toLowerCase().includes(q)) : LATEX_SYMBOLS[cat];
    for (const [glyph, code] of list) {
      const b = el("button", { type: "button", class: `${NS}-sym`, title: code }, glyph);
      b.addEventListener("click", () => put(code));
      grid.appendChild(b);
    }
    for (const t of tabs.children) t.classList.toggle("active", !q && t.dataset.cat === cat);
  };
  for (const name of Object.keys(LATEX_SYMBOLS)) {
    const t = el("button", { type: "button", "data-cat": name }, name);
    t.addEventListener("click", () => {
      cat = name;
      search.value = "";
      draw();
    });
    tabs.appendChild(t);
  }
  search.addEventListener("input", draw);
  draw();
  wrap.append(search, tabs, grid);
  return wrap;
}
function templateButtons(ta, { mathWrap = false } = {}) {
  const box = el("div", { class: `${NS}-texttpl` });
  for (const [glyph, name, code] of LATEX_TEMPLATES) {
    const b = el("button", { type: "button", title: `${name}: ${code.replace("|", "…")}` }, glyph);
    b.addEventListener("click", () => insertAtCaret(ta, mathWrap ? `$${code}$` : code));
    box.appendChild(b);
  }
  return box;
}
// ---------------------------------------------------------------- fills, extra shapes, pen paths
const FILL_PATTERNS = {
  "/": "Diagonal /",
  "\\": "Diagonal \\",
  x: "Cross-hatch ×",
  "-": "Horizontal",
  "|": "Vertical",
  "+": "Grid +",
  ".": "Dots",
};

// Paint for a closed shape: solid color, linear gradient or hatch pattern.
function fillPaint(item, p) {
  if (!p.fill) return { defs: "", attr: `fill="none"` };
  const op = p.fillOpacity ?? 1;
  const type = p.fillType || "solid";
  const id = item.id.replace(/[^\w]/g, "");
  if (type === "gradient") {
    const gid = `fg-${id}`;
    const a = p.gradientAngle ?? 90;
    return {
      defs: `<linearGradient id="${gid}" gradientTransform="rotate(${a - 90} 0.5 0.5)"><stop offset="0" stop-color="${esc(p.fill)}"/><stop offset="1" stop-color="${esc(p.fill2 || "#ffffff")}"/></linearGradient>`,
      attr: `fill="url(#${gid})" fill-opacity="${op}"`,
    };
  }
  if (type === "pattern") {
    const pid = `fp-${id}`;
    const s = Math.max(0.6, p.patternSpacing || 2);
    const c = esc(p.patternColor || "#000000");
    const sw = Math.max(0.05, p.patternWidth || 0.2);
    const ln = (d) => `<path d="${d}" stroke="${c}" stroke-width="${sw}" fill="none"/>`;
    const P = p.pattern || "/";
    let body = "";
    if (P === "/" || P === "x") body += ln(`M0,${s}L${s},0M${-s / 2},${s / 2}L${s / 2},${-s / 2}M${s / 2},${s * 1.5}L${s * 1.5},${s / 2}`);
    if (P === "\\" || P === "x") body += ln(`M0,0L${s},${s}M${-s / 2},${s / 2}L${s / 2},${s * 1.5}M${s / 2},${-s / 2}L${s * 1.5},${s / 2}`);
    if (P === "-" || P === "+") body += ln(`M0,${s / 2}H${s}`);
    if (P === "|" || P === "+") body += ln(`M${s / 2},0V${s}`);
    if (P === ".") body += `<circle cx="${s / 2}" cy="${s / 2}" r="${sw * 1.4}" fill="${c}"/>`;
    const bg = p.patternBg ? `<rect width="${s}" height="${s}" fill="${esc(p.fill)}"/>` : "";
    return {
      defs: `<pattern id="${pid}" patternUnits="userSpaceOnUse" width="${s}" height="${s}">${bg}${body}</pattern>`,
      attr: `fill="url(#${pid})" fill-opacity="${op}"`,
    };
  }
  return { defs: "", attr: `fill="${esc(p.fill)}" fill-opacity="${op}"` };
}

// extra shapes (Ploots shape library parity)
SHAPES.splice(
  SHAPES.findIndex((s) => s.id === "diamond") + 1,
  0,
  { id: "triangle-down", name: "Inverted triangle", d: (w, h) => `M0,0H${w}L${w / 2},${h}Z` },
);
SHAPES.splice(
  SHAPES.findIndex((s) => s.id === "star8"),
  0,
  { id: "star4", name: "4-point star", star: [4, 0.38] },
  { id: "star6", name: "6-point star", star: [6, 0.5] },
);
SHAPES.splice(
  SHAPES.findIndex((s) => s.id === "arrow-2"),
  0,
  { id: "arrow-d", name: "Arrow down", d: (w, h) => `M${w * 0.3},0V${h * 0.62}H0L${w / 2},${h}L${w},${h * 0.62}H${w * 0.7}V0Z` },
);
SHAPES.splice(
  SHAPES.findIndex((s) => s.id === "cross"),
  0,
  {
    id: "heart",
    name: "Heart",
    d: (w, h) =>
      `M${w / 2},${h * 0.28}C${w / 2},${h * 0.12} ${w * 0.36},0 ${w * 0.22},0C${w * 0.07},0 0,${h * 0.14} 0,${h * 0.3}C0,${h * 0.56} ${w * 0.3},${h * 0.76} ${w / 2},${h}C${w * 0.7},${h * 0.76} ${w},${h * 0.56} ${w},${h * 0.3}C${w},${h * 0.14} ${w * 0.93},0 ${w * 0.78},0C${w * 0.64},0 ${w / 2},${h * 0.12} ${w / 2},${h * 0.28}Z`,
  },
  {
    id: "speech",
    name: "Speech bubble",
    d: (w, h) => {
      const r = Math.min(w, h) * 0.14;
      const b = h * 0.76;
      return `M${r},0H${w - r}Q${w},0 ${w},${r}V${b - r}Q${w},${b} ${w - r},${b}H${w * 0.42}L${w * 0.24},${h}L${w * 0.27},${b}H${r}Q0,${b} 0,${b - r}V${r}Q0,0 ${r},0Z`;
    },
  },
  { id: "half-circle", name: "Half circle", d: (w, h) => `M0,${h}A${w / 2},${h} 0 0 1 ${w},${h}Z` },
);

// ---------------------------------------------------------------- path item (pen tool)
ITEM_TYPES.path = {
  label: "Drawing",
  icon: "pen",
  size: [30, 20],
  defaults: () => ({
    points: [
      [0, 1],
      [1, 0],
    ],
    closed: false,
    smooth: false,
    stroke: "#111111",
    strokeWidth: 0.5,
    strokeStyle: "solid",
    fill: "",
    fillOpacity: 1,
    fillType: "solid",
    arrowStart: false,
    arrowEnd: false,
  }),
};

function pathD(pts, closed, smooth) {
  if (pts.length < 2) return "";
  const P = (q) => `${round(q[0], 3)},${round(q[1], 3)}`;
  if (!smooth || pts.length < 3) return `M${pts.map(P).join("L")}${closed ? "Z" : ""}`;
  // Catmull-Rom → cubic Bézier
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  let d = `M${P(pts[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d + (closed ? "Z" : "");
}
function arrowHead(tip, from, size, color) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const l = [tip[0] - size * Math.cos(a - 0.4), tip[1] - size * Math.sin(a - 0.4)];
  const r = [tip[0] - size * Math.cos(a + 0.4), tip[1] - size * Math.sin(a + 0.4)];
  return `<polygon points="${round(tip[0], 3)},${round(tip[1], 3)} ${round(l[0], 3)},${round(l[1], 3)} ${round(r[0], 3)},${round(r[1], 3)}" fill="${esc(color)}"/>`;
}

RENDERERS.path = function path(item) {
  const p = item.props;
  const pts = (p.points || []).map(([u, v]) => [u * item.w, v * item.h]);
  if (pts.length < 2) return "";
  const sw = Math.max(0.05, p.strokeWidth || 0);
  const paint = p.closed ? fillPaint(item, p) : { defs: "", attr: `fill="none"` };
  let out = paint.defs ? `<defs>${paint.defs}</defs>` : "";
  const stroke = p.strokeWidth > 0 ? strokeAttrs(p.stroke, sw, p.strokeStyle) : `stroke="none"`;
  out += `<path d="${pathD(pts, p.closed, p.smooth)}" ${paint.attr} ${stroke} stroke-linejoin="round" stroke-linecap="round"/>`;
  if (!p.closed) {
    const size = Math.max(sw * 4, 1.6);
    if (p.arrowEnd) out += arrowHead(pts[pts.length - 1], pts[pts.length - 2], size, p.stroke);
    if (p.arrowStart) out += arrowHead(pts[0], pts[1], size, p.stroke);
  }
  return out;
};
// ---------------------------------------------------------------- dual-unit scale bar
// One bar, two unit axes: ground distance below, a second unit above (paper
// centimetres by default, as on topographic sheets). The first segment of each
// axis is split in two: 0 · ½ · 1 · 2 · 3 …
SCALEBAR_STYLES.splice(SCALEBAR_STYLES.findIndex((s) => s.id === "numeric"), 0, { id: "dual", name: "Dual units" });

const SCALE_UNITS = {
  km: { label: "km", perMeter: 1 / 1000 },
  m: { label: "m", perMeter: 1 },
  mi: { label: "mi", perMeter: 1 / 1609.344 },
  nmi: { label: "nmi", perMeter: 1 / 1852 },
  papercm: { label: "cm", paper: true },
};

function renderDualScalebar(item, p, map) {
  const f = p.font;
  const fh = f.size * PT;
  const mPerMm = metersPerMm(map);
  const bh = p.barHeight;
  const lw = p.lineWidth;
  const c1 = esc(p.color1);
  const c2 = esc(p.color2);
  const segs = Math.max(1, Math.round(p.segments));
  // primary (bottom) unit
  const prim = p.units === "auto" ? (mPerMm * item.w > 3000 ? "km" : "m") : p.units;
  const pu = SCALE_UNITS[prim] || SCALE_UNITS.km;
  const perMmP = pu.paper ? 0.1 : mPerMm * pu.perMeter;
  const reserve = textWidthMm("0000 km", f) * 0.7;
  const avail = Math.max(5, item.w - reserve);
  const segVal = p.segmentValue > 0 ? p.segmentValue : niceFloor((avail * perMmP) / segs);
  const L = (segVal * segs) / perMmP; // bar length in mm
  // secondary (top) unit
  const su = SCALE_UNITS[p.dualUnit] || SCALE_UNITS.papercm;
  const perMmS = su.paper ? 0.1 : mPerMm * su.perMeter;
  const totalS = L * perMmS;
  const stepS = niceFloor(totalS / Math.max(2, segs));
  const topY = fh + 1.4; // bar top
  const tickUp = 1;
  const fmt = (v) => fmtNumber(v, Math.abs(v % 1) > 1e-9 ? ((v * 10) % 1 ? 2 : 1) : 0);
  let out = "";

  // bottom axis ticks: 0, ½, 1, 2 … segments
  const bottom = [0, segVal / 2];
  for (let i = 1; i <= segs; i++) bottom.push(segVal * i);
  for (let i = 0; i < bottom.length - 1; i++) {
    const a = bottom[i] / perMmP;
    const b = bottom[i + 1] / perMmP;
    out += `<rect x="${round(a, 3)}" y="${round(topY, 3)}" width="${round(b - a, 3)}" height="${bh}" fill="${i % 2 === 0 ? c1 : c2}" stroke="${c1}" stroke-width="${lw}"/>`;
  }
  const by = topY + bh + 0.9 + fh * 0.8;
  bottom.forEach((v) => {
    out += `<text x="${round(v / perMmP, 3)}" y="${round(by, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(fmt(v))}</text>`;
  });
  const lastW = textWidthMm(fmt(bottom[bottom.length - 1]), f);
  out += `<text x="${round(L + lastW / 2 + 1, 3)}" y="${round(by, 3)}" ${fontAttrs(f)}>${esc(p.unitLabel || pu.label)}</text>`;

  // top axis ticks: 0, ½, 1, 2 … within the bar length
  const top = [0, stepS / 2];
  for (let v = stepS; v <= totalS + stepS * 1e-6; v += stepS) top.push(round(v, 9));
  const ty = topY - tickUp - 0.5;
  top.forEach((v) => {
    const x = v / perMmS;
    out += `<line x1="${round(x, 3)}" y1="${round(topY, 3)}" x2="${round(x, 3)}" y2="${round(topY - tickUp, 3)}" stroke="${c1}" stroke-width="${lw}"/>`;
    out += `<text x="${round(x, 3)}" y="${round(ty, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(fmt(v))}</text>`;
  });
  const lastTop = top[top.length - 1];
  out += `<text x="${round(lastTop / perMmS + textWidthMm(fmt(lastTop), f) / 2 + 1, 3)}" y="${round(ty, 3)}" ${fontAttrs(f)}>${esc(p.dualLabel || su.label)}</text>`;
  return out;
}
// ---------------------------------------------------------------- item effects
// Every item can carry a drop shadow and a frosted-glass backdrop. On screen the
// glass uses CSS backdrop-filter; in exports the map imagery underneath is
// re-drawn blurred and clipped to the item, so PNG/PDF match the preview.
function defaultFx() {
  return {
    shadow: { on: false, color: "#000000", opacity: 0.3, blur: 1.2, dx: 0.5, dy: 0.8 },
    glass: { on: false, blur: 3, tint: "#ffffff", opacity: 0.45, radius: 3, border: true },
  };
}
function itemFx(item) {
  if (!item.fx) item.fx = defaultFx();
  return item.fx;
}
// Tint + edge highlight drawn under the item's own content.
function glassUnderlay(item) {
  const g = item.fx?.glass;
  if (!g?.on) return "";
  const id = item.id.replace(/[^\w]/g, "");
  return (
    `<defs><linearGradient id="gl-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="${item.w}" height="${item.h}" rx="${g.radius}" fill="${esc(g.tint)}" fill-opacity="${g.opacity}"/>` +
    `<rect width="${item.w}" height="${item.h}" rx="${g.radius}" fill="url(#gl-${id})"/>` +
    (g.border ? `<rect x="0.15" y="0.15" width="${round(item.w - 0.3, 3)}" height="${round(item.h - 0.3, 3)}" rx="${g.radius}" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="0.3"/>` : "")
  );
}
// CSS for the on-screen item node.
function applyFxPreview(node, item) {
  const fx = item.fx;
  const Z = S.zoom;
  const sh = fx?.shadow;
  node.style.filter = sh?.on
    ? `drop-shadow(${round(sh.dx * Z, 2)}px ${round(sh.dy * Z, 2)}px ${round(sh.blur * Z, 2)}px ${hexA(sh.color, sh.opacity)})`
    : "";
  const g = fx?.glass;
  node.style.backdropFilter = g?.on ? `blur(${round(g.blur * Z, 2)}px)` : "";
  node.style.webkitBackdropFilter = node.style.backdropFilter;
  node.style.borderRadius = g?.on ? `${g.radius * Z}px` : "";
}
function hexA(hex, a) {
  const [r, g, b] = hexToRgb(normalizeHex(hex));
  return `rgba(${r},${g},${b},${a})`;
}
// SVG for export: filter defs + blurred backdrop of maps beneath a glass item.
function fxExportParts(item, index, mapImages) {
  const fx = item.fx;
  const id = item.id.replace(/[^\w]/g, "");
  let defs = "";
  let filterAttr = "";
  let backdrop = "";
  if (fx?.shadow?.on) {
    const sh = fx.shadow;
    defs += `<filter id="fxs-${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="${sh.dx}" dy="${sh.dy}" stdDeviation="${round(sh.blur / 2, 3)}" flood-color="${esc(sh.color)}" flood-opacity="${sh.opacity}"/></filter>`;
    filterAttr = ` filter="url(#fxs-${id})"`;
  }
  if (fx?.glass?.on) {
    const g = fx.glass;
    defs += `<clipPath id="fxc-${id}"><rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" rx="${g.radius}"/></clipPath><filter id="fxb-${id}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${round(g.blur / 2, 3)}"/></filter>`;
    const below = S.doc.items.slice(0, index).filter((m) => m.type === "map" && !m.hidden && !m.rot && m.x < item.x + item.w && m.x + m.w > item.x && m.y < item.y + item.h && m.y + m.h > item.y);
    for (const m of below) {
      let img = "";
      if (m.props.source === "snapshot" && m.props.snapshot?.src) {
        const sn = syncSnapshotView(m);
        img = `<image href="${sn.src}" x="${round(m.x + sn.x, 3)}" y="${round(m.y + sn.y, 3)}" width="${round(sn.w, 3)}" height="${round(sn.h, 3)}" preserveAspectRatio="none"/>`;
      } else if (mapImages?.get(m.id)) {
        img = `<image href="${mapImages.get(m.id)}" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" preserveAspectRatio="none"/>`;
      }
      if (img) backdrop += `<g clip-path="url(#fxc-${id})"><g filter="url(#fxb-${id})">${img}</g></g>`;
    }
  }
  return { defs, filterAttr, backdrop };
}

// ---------------------------------------------------------------- marker (point symbol + label)
const MARKER_SYMBOLS = [
  { id: "pin", name: "Pin", svg: (f, s) => `<path d="M5 0.6C2.8 0.6 1.2 2.2 1.2 4.3 1.2 7 5 9.6 5 9.6S8.8 7 8.8 4.3C8.8 2.2 7.2 0.6 5 0.6Z" fill="${f}" stroke="${s}" stroke-width="0.6"/><circle cx="5" cy="4.2" r="1.3" fill="#fff"/>` },
  { id: "circle", name: "Circle", svg: (f, s) => `<circle cx="5" cy="5" r="3.6" fill="${f}" stroke="${s}" stroke-width="0.7"/>` },
  { id: "dot", name: "Dot", svg: (f) => `<circle cx="5" cy="5" r="2" fill="${f}"/>` },
  { id: "capital", name: "Capital", svg: (f, s) => `<circle cx="5" cy="5" r="3.8" fill="#fff" stroke="${s}" stroke-width="0.7"/><circle cx="5" cy="5" r="2.2" fill="${f}"/>` },
  { id: "square", name: "Square", svg: (f, s) => `<rect x="1.6" y="1.6" width="6.8" height="6.8" fill="${f}" stroke="${s}" stroke-width="0.7"/>` },
  { id: "triangle", name: "Triangle", svg: (f, s) => `<path d="M5 1.2L9 8.6H1Z" fill="${f}" stroke="${s}" stroke-width="0.7" stroke-linejoin="round"/>` },
  { id: "peak", name: "Peak", svg: (f, s) => `<path d="M5 2L8.6 8H1.4Z" fill="${f}" stroke="${s}" stroke-width="0.5" stroke-linejoin="round"/>` },
  { id: "diamond", name: "Diamond", svg: (f, s) => `<path d="M5 0.8L9.2 5 5 9.2 0.8 5Z" fill="${f}" stroke="${s}" stroke-width="0.7" stroke-linejoin="round"/>` },
  { id: "star", name: "Star", svg: (f, s) => `<polygon points="${star(5, 5.3, 4.6, 1.9, 5)}" fill="${f}" stroke="${s}" stroke-width="0.4" stroke-linejoin="round"/>` },
  { id: "cross", name: "Cross", svg: (f) => `<path d="M2 2L8 8M8 2L2 8" stroke="${f}" stroke-width="1.4" stroke-linecap="round"/>` },
  { id: "flag", name: "Flag", svg: (f, s) => `<path d="M2.4 9.4V1" stroke="${s}" stroke-width="0.7" stroke-linecap="round"/><path d="M2.6 1.2H8.4L7 3.2 8.4 5.2H2.6Z" fill="${f}" stroke="${s}" stroke-width="0.4"/>` },
  { id: "target", name: "Sample point", svg: (f, s) => `<circle cx="5" cy="5" r="3.6" fill="none" stroke="${f}" stroke-width="0.8"/><circle cx="5" cy="5" r="1.2" fill="${f}"/><path d="M5 0.4V2.4M5 7.6V9.6M0.4 5H2.4M7.6 5H9.6" stroke="${s}" stroke-width="0.5"/>` },
];
ITEM_TYPES.marker = {
  label: "Marker",
  icon: "marker",
  size: [32, 8],
  defaults: () => ({
    symbol: "pin",
    size: 6,
    fill: "#dc2626",
    stroke: "#7f1d1d",
    label: "Sample site",
    labelPos: "right",
    font: font({ size: 8 }),
    halo: true,
    haloColor: "#ffffff",
    haloWidth: 0.6,
  }),
};
RENDERERS.marker = function marker(item) {
  const p = item.props;
  const sym = MARKER_SYMBOLS.find((m) => m.id === p.symbol) || MARKER_SYMBOLS[0];
  const s = p.size;
  const hasLabel = !!String(p.label || "").trim();
  const pos = hasLabel ? p.labelPos : "none";
  let sx = (item.w - s) / 2;
  let sy = (item.h - s) / 2;
  if (pos === "right") sx = 0;
  if (pos === "left") sx = item.w - s;
  if (pos === "bottom") sy = 0;
  if (pos === "top") sy = item.h - s;
  let out = `<svg x="${round(sx, 3)}" y="${round(sy, 3)}" width="${s}" height="${s}" viewBox="0 0 10 10" overflow="visible">${sym.svg(esc(p.fill), esc(p.stroke))}</svg>`;
  if (hasLabel) {
    const f = p.font;
    const fh = f.size * PT;
    const halo = p.halo ? `stroke="${esc(p.haloColor)}" stroke-width="${p.haloWidth}" paint-order="stroke" stroke-linejoin="round"` : "";
    const text = resolveVars(p.label, item);
    let x = s + 1;
    let y = item.h / 2 + fh * 0.35;
    let anchor = "start";
    if (pos === "left") [x, anchor] = [item.w - s - 1, "end"];
    if (pos === "top") [x, y, anchor] = [item.w / 2, sy - 0.8, "middle"];
    if (pos === "bottom") [x, y, anchor] = [item.w / 2, s + fh + 0.4, "middle"];
    out += richLine(text, x, y, f, anchor, halo).svg;
  }
  return out;
};
function markerThumb(m) {
  return `<svg width="30" height="30" viewBox="0 0 10 10">${m.svg("currentColor", "currentColor")}</svg>`;
}
// ---------------------------------------------------------------- icon catalog data (generated by tools/build_catalog.py)
const CATALOG = {"iconSets":{"maki":{"label":"Maki","license":"CC0-1.0","url":"https://cdn.jsdelivr.net/npm/@mapbox/maki@8.2.0/icons/{name}.svg","groups":{"Transport":["aerialway","airfield","airport","barrier","bicycle","bicycle-share","bridge","bus","car","car-rental","car-repair","charging-station","elevator","entrance","entrance-alt1","fuel","gate","heliport","highway-rest-area","lift-gate","rail","rail-light","rail-metro","road-accident","roadblock","scooter","taxi","terminal","toll","tunnel","wheelchair"],"Food & shops":["alcohol-shop","bakery","bank","bank-JP","bar","beer","cafe","clothing-store","confectionery","convenience","fast-food","florist","furniture","gift","grocery","hairdresser","hardware","jewelry-store","laundry","restaurant","restaurant-noodle","restaurant-pizza","restaurant-seafood","restaurant-sushi","shoe","shop","teahouse"],"Sports":["american-football","baseball","basketball","bowling-alley","cricket","fitness-centre","golf","horse-riding","ice-cream","pitch","racetrack","racetrack-cycling","racetrack-horse","skateboard","skiing","soccer","stadium","swimming","table-tennis","tennis","volleyball"],"Vegetation & forest":["amusement-park","dog-park","farm","garden","garden-centre","logging","park","park-alt1","parking","parking-garage","parking-paid"],"Tourism & recreation":["animal-shelter","aquarium","attraction","bbq","campsite","casino","information","karaoke","lodging","nightclub","observation-tower","picnic-site","playground","restaurant-bbq","shelter","viewpoint","zoo"],"Basic symbols":["arrow","circle","circle-stroked","cross","diamond","heart","marker","marker-stroked","square","square-stroked","star","star-stroked","triangle","triangle-stroked"],"Education & culture":["art-gallery","castle","castle-JP","cinema","college","college-JP","historic","landmark","landmark-JP","library","marae","monument","monument-JP","museum","music","school","school-JP","theatre"],"Water & hydrology":["beach","dam","drinking-water","ferry","ferry-JP","harbor","hot-spring","lighthouse","lighthouse-JP","racetrack-boat","slipway","water","waterfall","watermill","wetland"],"Health":["blood-bank","dentist","doctor","hospital","hospital-JP","optician","pharmacy","veterinary"],"Utilities & industry":["building","building-alt1","commercial","communications-tower","construction","home","industry","recycling","residential-community","slaughterhouse","toilet","warehouse","waste-basket","windmill"],"Hazards & warnings":["caution","danger"],"Religion":["cemetery","cemetery-JP","place-of-worship","religious-buddhist","religious-christian","religious-jewish","religious-muslim","religious-shinto"],"Government & public":["city","defibrillator","embassy","emergency-phone","fire-station","fire-station-JP","police","police-JP","post","post-JP","prison","ranger-station","telephone","town","town-hall","village"],"Other":["fence","gaming","landuse","mobile-phone","paint","suitcase","watch"],"Terrain & nature":["globe","mountain","natural","rocket","snowmobile","volcano"]}},"temaki":{"label":"Temaki","license":"CC0-1.0","url":"https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5.13.0/icons/{name}.svg","groups":{"Sports":["abseiling","balance_beam","bowling","bowling_alt1","cable_device","climbing","climbing_frame","climbing_wall","cross_country_skiing","dice","disc_golf_basket","field_hockey","gas_device","golf_green","gym","hang_gliding","horizontal_bar","horseshoe","horseshoes","ice_skating","pickleball","power_device","racetrack_oval","shuffleboard","skateboarding","ski_jumping","skiing","sledding","spice_bottle","table_soccer","tennis","vending_ice","vending_ice_cream","vending_ice_cream2","waste_device"],"Tourism & recreation":["accessible_space","basketswing","binoculars","cabin","cable_shutoff","casino","dog_shelter","gas_shutoff","horse_shelter","hut","info_board","maze","picnic_shelter","play_structure","playhouse","power_shutoff","roller_coaster","sandbox","sleep_shelter","slide","slide2","spa","spotting_scope","swing","telescope","tents","vending_newspaper","viewpoint","waste_shutoff","zoo"],"Other":["accounting","activity_panel","anvil","anvil_and_hammer","balloon","bench","benchmark_disk","bikini","billboard","bleachers","blind","bottles","bow_and_arrow","brick_trowel","briefcase","briefcase_asterisk","briefcase_bolt","briefcase_cross","briefcase_info","bulletin_board","bunk_beds","can","cattle_grid","chefs_knife","cleaver","clock","cloth","clothes_hanger","conveyor","curtains","cushion","dagger","detergent_bottle","drag_lift","dress","drink_cup","ear","egg","electronic","fashion_accessories","footwear_decontamination","goods_lift","gown","hand","handbag","hangar","height_restrictor","horn_cleat","hot_drink_cup","hunting_blind","inline_skating","kitchen_sink","latrine","lawyer","lipstick","lock","lounger","lounging","milestone","movie_rental","os_benchmark","perfume","pet_grooming","pick_hammer","platter_lift","plumber","polished_nail","portrait","portrait_framed","psychic","real_estate_agency","rigging","room","rope_fence","rumble_strip","saddle","seesaw","sign_and_bench","social_facility","speaker","spike_strip","splash_pad","stamp","stile_squeezer","striped_way","striped_zone","suitcase","suitcase_key","suitcase_xray","tanning","tanning2","tattoo_machine","ticket","tiling","tire","tire_course","toolbox","tools","vacuum","vacuum_station","vase","vertex","vertical_rotisserie","wall","well_pump_manual","whale_watching","wheel","wind_turbine","window","windpump","windsock","x_oblique","yield","zip_wire"],"Utilities & industry":["adit_profile","antenna","bulb","bulb2","bulb3","bulldozer","cable","cable_manhole","cable_meter","chimney","cooling_tower","cooling_tower_radiation","crane","desk_lamp","domed_tower","gas","gas_manhole","gas_meter","manhole","manufactured_home","mast","mast_communication","mast_lighting","mineshaft_cage","mineshaft_profile","oil_well","pipe","power","power_cb","power_cb2","power_circuit","power_ct","power_isolator","power_la","power_manhole","power_meter","power_pole","power_switch","power_tower","power_transformer","powered_pump","propane_tank","radiation","radio","row_houses","scaffold","silo","storage","storage_drum","storage_fermenter","storage_rental","storage_tank","tower","tower_communication","trench","utility_pole","waste","waste_manhole","waste_meter","well_pump_powered","windmill"],"Transport":["aerialway_pole","airport","app_terminal","bicycle_box","bicycle_locker","bicycle_rental","bicycle_repair","bicycle_shed","bicycle_structure","bicycle_wash","board_bus","board_gondola_lift","board_hanging_rail","board_heavy_rail","board_light_rail","board_monorail","board_school_bus","board_subway","board_train","board_train_bullet","board_train_diesel","board_train_kids","board_train_steam","board_tram","board_transit","board_trolleybus","bollard","bollard_row","bridge","buffer_stop","bus","bus_guided","camper_trailer","camper_trailer_dump","car_dealer","car_pool","car_structure","car_wash","carport","chairlift","chicane_arrow","crossing_markings-dashes","crossing_markings-dots","crossing_markings-ladder","crossing_markings-ladder_paired","crossing_markings-ladder_skewed","crossing_markings-lines","crossing_markings-lines_paired","crossing_markings-zebra","crossing_markings-zebra_bicolour","crossing_markings-zebra_double","crossing_markings-zebra_paired","crossing_rail_rail","crossing_rail_road","crossing_rail_solid","crossing_rail_striped","crossing_tram_road","crossing_tram_solid","crossing_tram_striped","cycle_barrier","cyclist_crosswalk","elevator","fighter_jet","freight_car","gate","golf_cart","gondola_lift","guard_rail","hair_care","hanging_rail","heavy_rail","jetplane_front","junction","junk_car","kerb-flush","kerb-lowered","kerb-raised","kerb-rolled","kerb-unspecified","lift_gate","light_rail","monorail","motorcycle","motorcycle_rental","motorcycle_repair","ped_cyclist_crosswalk","pedestrian","pedestrian_and_cyclist","pedestrian_crosswalk","pedestrian_walled","plane_taxiing","planes","planes_bidirectional","rail_flag","rail_profile","railing","railway_cable_track","railway_signals","railway_track","railway_track_askew","railway_track_mini","railway_track_narrow","railway_track_partial","school_bus","sign_and_car","sign_and_pedestrian","speed_bump","speed_dip","speed_dip_double","speed_hump","speed_table","speedway_8","speedway_oval","stop","subway","tall_gate","taxi_stand","toll_gantry","traffic_signals","train","train_bullet","train_diesel","train_kids","train_steam","train_wash","tram","tram_side","trampoline","transit","transit_shelter","trolleybus","truck","tunnel","turnstile","veterinary_care","wheelchair","wheelchair_active"],"Vegetation & forest":["amusement_park","bicycle_parked","car_parked","garden_bed","grapes","grass","hedge","lawn","motorcycle_parked","needle_and_spool","parking_space","plant","shrub","shrub_low","street_lamp_arm","tree_and_bench","tree_broadleaved","tree_cactus","tree_leafless","tree_needleleaved","tree_palm","tree_row","tree_stump"],"Water & hydrology":["anchor_medal","beach","board_ferry","boat","boat_dry_dock","boat_floating","boat_ramp","boat_rental","boat_repair","boat_tour","boating","buoy","canoe","coral_reef","crossing_markings-surface","diving","ferry","fish_cleaning","fish_ladder","fishing_pier","fountain","geyser_from_ground","houseboat","ice_fishing","islet_tree","jet_skiing","kayaking","pier_fixed","pier_floating","quay","rafting","sail","sailboat","sailing","scuba_diving","shower","spring_rider","surfing","swamp","water","water_bottle","water_device","water_manhole","water_meter","water_shutoff","water_tap","water_tap_drinkable","water_tower","waterskiing","wind_surfing"],"Terrain & nature":["archery","boulder1","boulder2","boulder3","cairn","cape_landform","cliff_falling_rocks","island_trees_building","mountain_asterisk","mountain_cross","mountain_range","natural_arch","rocket_firework","snow","snow_shoeing","snowboarding","snowmobile","valley"],"Government & public":["army_tent","briefcase_shield","bunker","bunker_silo","campfire","capitol","checkpoint","courthouse","embassy","fire_hydrant","fire_hydrant_underground","fireplace","letter_box","military","military_checkpoint","passport_checkpoint","police_checkpoint","police_officer","post_box","poster_box","shield","telephone","town_hall"],"Basic symbols":["asterisk","compass","diamond","heart","pin","temaki"],"Food & shops":["atm","atm2","barn","beauty_salon","bread","bubble_tea","catering","chocolate","coffee","donut","florist","food","furniture","hammer_shoe","hotpot","j_bar_lift","jewelry_store","laundry","meat","milk_jug","money_hand","pet_store","sandwich","shopping_mall","t_bar_lift","vending_bread","vending_cigarettes","vending_cold_drink","vending_cold_drink2","vending_eggs","vending_flat_coin","vending_hot_drink","vending_hot_drink2","vending_lockers","vending_love","vending_machine","vending_medicine","vending_pet_waste","vending_stamps","vending_tickets","vending_venus"],"Education & culture":["book_store","library","museum","obelisk","paifang","plaque","ruins","school","sculpture","statue"],"Health":["hearing_aid","pharmacy","physiotherapist"],"Religion":["hinduism","quakerism","shinto","sikhism","taoism"],"Hazards & warnings":["security_camera"]}}}};
// ---------------------------------------------------------------- icon catalog
// Icons (Maki, Temaki — both CC0) load from jsDelivr on first use and are then
// stored inline in the item, so layouts keep working offline and export cleanly.

// ---- icon item
ITEM_TYPES.icon = {
  label: "Icon",
  icon: "library",
  size: [10, 10],
  defaults: () => ({ set: "maki", name: "marker", svg: "", viewBox: "0 0 15 15", color: "#111111", label: "", labelPos: "right", font: font({ size: 8 }) }),
};
RENDERERS.icon = function iconItem(item, ctx) {
  const p = item.props;
  if (!p.svg) return ctx.export ? "" : placeholder(item, "Loading icon…");
  const hasLabel = !!String(p.label || "").trim();
  const s = Math.min(item.h, hasLabel ? item.h : item.w);
  let out = `<svg x="0" y="${round((item.h - s) / 2, 3)}" width="${round(s, 3)}" height="${round(s, 3)}" viewBox="${esc(p.viewBox)}" overflow="visible"><g fill="${esc(p.color)}" color="${esc(p.color)}">${p.svg}</g></svg>`;
  if (hasLabel) out += richLine(resolveVars(p.label, item), s + 1, item.h / 2 + p.font.size * PT * 0.35, p.font, "start").svg;
  return out;
};
const iconCache = new Map();
async function fetchIconSvg(set, name) {
  const key = `${set}/${name}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const url = CATALOG.iconSets[set].url.replace("{name}", encodeURIComponent(name));
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((txt) => {
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) throw new Error("Not an SVG");
      // keep shapes only; drop scripts / event attributes; let the item color fill them
      svg.querySelectorAll("script,foreignObject").forEach((n) => n.remove());
      svg.querySelectorAll("*").forEach((n) => {
        for (const a of [...n.attributes]) if (/^on/i.test(a.name)) n.removeAttribute(a.name);
        if (n.getAttribute("fill") && n.getAttribute("fill") !== "none") n.removeAttribute("fill");
      });
      const vb = svg.getAttribute("viewBox") || `0 0 ${parseFloat(svg.getAttribute("width")) || 15} ${parseFloat(svg.getAttribute("height")) || 15}`;
      return { svg: svg.innerHTML, viewBox: vb };
    });
  iconCache.set(key, p);
  p.catch(() => iconCache.delete(key));
  return p;
}
async function addIconItem(set, name) {
  const pg = S.doc.page;
  const item = newItem("icon", pg.width / 2 - 5, pg.height / 2 - 5);
  item.name = name.replace(/[-_]/g, " ");
  item.props.set = set;
  item.props.name = name;
  commit(() => S.doc.items.push(item));
  select([item.id]);
  try {
    const ic = await fetchIconSvg(set, name);
    item.props.svg = ic.svg;
    item.props.viewBox = ic.viewBox;
    saveLibrary();
    renderAll();
  } catch (e) {
    toast(`Could not load icon “${name}”: ${e.message}`, "warn");
  }
}

// ---- catalog browser: Maki / Temaki (CC0, jsDelivr)
const ICON_SET_LABELS = { maki: "Maki", temaki: "Temaki" };
function openCatalog(anchor) {
  const tabs = el("div", { class: `${NS}-seg ${NS}-segfull` });
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search icons (water, mountain, airport…)" });
  const body = el("div", { class: `${NS}-catbody` });
  let tab = S.catalogTab && ICON_SET_LABELS[S.catalogTab] ? S.catalogTab : "maki";
  const draw = () => {
    S.catalogTab = tab;
    for (const b of tabs.children) b.classList.toggle("active", b.dataset.v === tab);
    body.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    const set = CATALOG.iconSets[tab];
    body.append(el("p", { class: `${NS}-muted` }, `${set.label} icons · ${set.license} (public domain). Click to place on the page.`));
    const order = ["Basic symbols", "Water & hydrology", "Terrain & nature", "Vegetation & forest", "Transport", "Government & public", "Health", "Education & culture", "Religion", "Tourism & recreation", "Sports", "Food & shops", "Utilities & industry", "Hazards & warnings", "Other"];
    for (const gname of order) {
      const names = (set.groups[gname] || []).filter((n) => !q || n.includes(q.replace(/\s+/g, "-")) || n.includes(q.replace(/\s+/g, "_")));
      if (!names.length) continue;
      const grid = el("div", { class: `${NS}-icongrid` });
      for (const n of names) {
        const b = el("button", { type: "button", class: `${NS}-iconbtn ${NS}-remote`, title: n });
        b.appendChild(el("img", { src: set.url.replace("{name}", encodeURIComponent(n)), alt: n, loading: "lazy" }));
        b.addEventListener("click", () => {
          closePopover();
          addIconItem(tab, n);
        });
        grid.appendChild(b);
      }
      body.appendChild(el("details", { class: `${NS}-catgrp`, open: !!q || gname === "Basic symbols" || gname === "Water & hydrology" }, el("summary", {}, gname, el("small", {}, String(names.length))), grid));
    }
  };
  for (const [v, label] of Object.entries(ICON_SET_LABELS)) {
    const b = el("button", { type: "button", "data-v": v }, label);
    b.addEventListener("click", () => {
      tab = v;
      draw();
    });
    tabs.appendChild(b);
  }
  search.addEventListener("input", draw);
  draw();
  return popoverAt(anchor, el("div", { class: `${NS}-catalog` }, el("div", { class: `${NS}-ptitle` }, "Icon catalog"), tabs, search, body), `${NS}-catpop`);
}
// ---------------------------------------------------------------- MapLibre bridge
function mainMap() {
  try {
    return S.app?.getMap?.() ?? null;
  } catch {
    return null;
  }
}
function MapCtor() {
  const m = mainMap();
  if (m && typeof m.constructor === "function" && m.constructor !== Object) return m.constructor;
  return window.maplibregl?.Map || null;
}
function glLayers() {
  try {
    return S.app?.listLayers?.() ?? [];
  } catch {
    return [];
  }
}
// Style layers that belong to a GeoLibre layer (GeoLibre prefixes/sources by id).
function styleLayersFor(style, glId) {
  return (style.layers || []).filter(
    (l) =>
      l.id === glId ||
      l.source === glId ||
      String(l.id).startsWith(`${glId}`) ||
      (l.source && String(l.source).startsWith(`${glId}`)) ||
      String(l.id).includes(glId),
  );
}
function currentMainView() {
  const m = mainMap();
  if (!m) return null;
  const c = m.getCenter();
  const b = m.getBounds();
  return {
    center: [c.lng, c.lat],
    bearing: m.getBearing(),
    bounds: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() },
  };
}
// Frame `item` on what GeoLibre shows right now.
function viewFromGeoLibre(item) {
  const v = currentMainView();
  if (!v) return false;
  item.props.view.center = v.center;
  item.props.view.bearing = v.bearing;
  item.props.view.zoom = zoomForBounds(v.bounds, item.w, item.h);
  if (item.props.scaleLock) item.props.view.zoom = zoomForScale(item.props.scaleLock, v.center[1]);
  return true;
}

const styleCache = new Map();
async function fetchStyle(url) {
  if (!styleCache.has(url)) {
    styleCache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return clone(await styleCache.get(url));
}

// Sources + layers of the user's GeoLibre layers (no basemap).
function userLayerParts(mainStyle) {
  const sources = {};
  const layers = [];
  const seen = new Set();
  for (const gl of glLayers()) {
    if (gl.visible === false) continue;
    for (const l of styleLayersFor(mainStyle, gl.id)) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      layers.push(l);
      if (l.source && mainStyle.sources?.[l.source]) sources[l.source] = mainStyle.sources[l.source];
    }
  }
  // keep the main style's draw order
  const order = new Map((mainStyle.layers || []).map((l, i) => [l.id, i]));
  layers.sort((a, b) => order.get(a.id) - order.get(b.id));
  return { sources, layers };
}

async function buildStyle(item) {
  const m = mainMap();
  const main = m ? clone(m.getStyle()) : { version: 8, sources: {}, layers: [] };
  const kind = item.props.basemap || "geolibre";
  if (kind === "geolibre") return main;
  const user = userLayerParts(main);
  let base;
  if (BASEMAP_URLS[kind]) {
    try {
      base = await fetchStyle(BASEMAP_URLS[kind]);
    } catch (e) {
      console.warn("[Layout Composer] basemap failed to load", e);
      toast(`Basemap ${BASEMAP_STYLES[kind]} failed to load; using no basemap.`, "warn");
    }
  } else if (RASTER_BASEMAPS[kind]) {
    const r = RASTER_BASEMAPS[kind];
    base = {
      version: 8,
      glyphs: main.glyphs,
      sprite: main.sprite,
      sources: { "glc-raster-base": { type: "raster", tiles: r.tiles, tileSize: 256, attribution: r.attribution, maxzoom: 19 } },
      layers: [{ id: "glc-raster-base", type: "raster", source: "glc-raster-base" }],
    };
  }
  if (!base) {
    base = {
      version: 8,
      glyphs: main.glyphs,
      sprite: main.sprite,
      sources: {},
      layers: [{ id: "glc-bg", type: "background", paint: { "background-color": item.props.background || "#ffffff" } }],
    };
  }
  if (!base.glyphs) base.glyphs = main.glyphs;
  Object.assign(base.sources, user.sources);
  base.layers.push(...user.layers);
  return base;
}

function styleKey(item) {
  return `${item.props.basemap}|${item.props.background}|${S.styleEpoch || 0}`;
}

// Live (preview) maps ---------------------------------------------------------
// The live map is laid out at the frame's 96-dpi size and CSS-scaled to the
// canvas zoom, so labels and line widths keep their printed proportions (WYSIWYG).
function previewZoom(item) {
  return item.props.view.zoom;
}
function placeLiveMap(item, rec) {
  const W = Math.max(1, Math.round(item.w * PX96));
  const H = Math.max(1, Math.round(item.h * PX96));
  const k = S.zoom / PX96;
  const c = rec.container;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  c.style.transform = `scale(${k * (item.w * PX96) / W}, ${k * (item.h * PX96) / H})`;
  // frame shape: clip in the container's own (unscaled 96-dpi) pixels
  const p = item.props;
  const d = mapFramePath(p, W, H);
  c.style.clipPath = d && !mapFrameIsImage(p) ? `path("${d}")` : "";
  const mk = mapFrameIsImage(p) ? `url("${p.frameImage}")` : "";
  if (c._mask !== mk) {
    c._mask = mk;
    for (const k2 of ["maskImage", "webkitMaskImage"]) c.style[k2] = mk;
    for (const k2 of ["maskSize", "webkitMaskSize"]) c.style[k2] = mk ? "100% 100%" : "";
    for (const k2 of ["maskRepeat", "webkitMaskRepeat"]) c.style[k2] = mk ? "no-repeat" : "";
  }
  const ratio = (window.devicePixelRatio || 1) * clamp(k, 0.5, 3);
  if (rec.map && rec.ratio !== ratio && typeof rec.map.setPixelRatio === "function") {
    rec.ratio = ratio;
    rec.map.setPixelRatio(ratio);
  }
}

async function ensureLiveMap(item, host) {
  const Ctor = MapCtor();
  if (!Ctor) return null;
  let rec = S.maps.get(item.id);
  const key = styleKey(item);
  if (rec && rec.key === key) {
    if (rec.container.parentNode !== host) host.prepend(rec.container);
    return rec;
  }
  if (rec && rec.map) {
    // basemap changed: swap style in place
    rec.key = key;
    if (rec.container.parentNode !== host) host.prepend(rec.container);
    const style = await buildStyle(item);
    rec.map.setStyle(style, { diff: false });
    return rec;
  }
  const container = el("div", { class: `${NS}-livemap` });
  host.prepend(container);
  rec = { map: null, container, key, pending: true };
  placeLiveMap(item, rec);
  S.maps.set(item.id, rec);
  const style = await buildStyle(item);
  if (!S.maps.has(item.id) || S.maps.get(item.id) !== rec) return null; // destroyed meanwhile
  const v = item.props.view;
  try {
    rec.map = new Ctor({
      container,
      style,
      center: v.center,
      zoom: previewZoom(item),
      bearing: v.bearing || 0,
      interactive: true,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      dragRotate: true,
      pitchWithRotate: false,
      maxPitch: 0,
      pixelRatio: (window.devicePixelRatio || 1) * clamp(S.zoom / PX96, 0.5, 3),
    });
    rec.ratio = (window.devicePixelRatio || 1) * clamp(S.zoom / PX96, 0.5, 3);
  } catch (e) {
    console.error("[Layout Composer] could not create map", e);
    container.textContent = "Map could not be created: " + e.message;
    return null;
  }
  rec.pending = false;
  rec.map.on("move", () => onLiveMapMove(item.id));
  rec.map.on("error", (e) => console.debug("[Layout Composer] map error", e?.error?.message || e));
  return rec;
}

function onLiveMapMove(id) {
  const rec = S.maps.get(id);
  if (!rec?.map || rec.syncing) return;
  if (S.contentMode !== id && S.tool !== "content") return;
  const item = findItem(id);
  if (!item) return;
  const m = rec.map;
  const c = m.getCenter();
  item.props.view.center = [c.lng, c.lat];
  item.props.view.bearing = m.getBearing();
  if (item.props.scaleLock) {
    // keep the locked scale: undo any zoom change
    const want = zoomForScale(item.props.scaleLock, c.lat);
    item.props.view.zoom = want;
    if (Math.abs(m.getZoom() - want) > 0.001) {
      rec.syncing = true;
      m.setZoom(want);
      rec.syncing = false;
    }
  } else {
    item.props.view.zoom = m.getZoom();
  }
  scheduleOverlayRefresh();
  saveLibrary();
}

function syncLiveMap(item) {
  const rec = S.maps.get(item.id);
  if (!rec?.map) return;
  const m = rec.map;
  rec.syncing = true;
  try {
    placeLiveMap(item, rec);
    m.resize();
    const v = item.props.view;
    const z = previewZoom(item);
    const c = m.getCenter();
    if (Math.abs(c.lng - v.center[0]) > 1e-9 || Math.abs(c.lat - v.center[1]) > 1e-9 || Math.abs(m.getZoom() - z) > 1e-6 || Math.abs(m.getBearing() - (v.bearing || 0)) > 1e-6) {
      m.jumpTo({ center: v.center, zoom: z, bearing: v.bearing || 0 });
    }
  } finally {
    rec.syncing = false;
  }
}

function destroyLiveMap(id) {
  const rec = S.maps.get(id);
  if (!rec) return;
  S.maps.delete(id);
  try {
    rec.map?.remove();
  } catch {}
  rec.container.remove();
}
function destroyAllLiveMaps() {
  for (const id of [...S.maps.keys()]) destroyLiveMap(id);
}

// Capture what GeoLibre draws right now (includes raster / deck.gl layers that a
// copied MapLibre style cannot reproduce) and use it as the frame content.
async function captureGeoLibre(item) {
  const m = mainMap();
  if (!m) throw new Error("GeoLibre map not found");
  const src = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("GeoLibre did not redraw in time")), 6000);
    m.once("render", () => {
      clearTimeout(t);
      try {
        resolve(m.getCanvas().toDataURL("image/jpeg", 0.92));
      } catch (e) {
        reject(e);
      }
    });
    m.triggerRepaint();
  });
  const cv = m.getCanvas();
  const c = m.getCenter();
  item.props.snapshot = { src, cw: cv.clientWidth, ch: cv.clientHeight, center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing(), taken: Date.now() };
  item.props.source = "snapshot";
  item.props.scaleLock = 0;
  destroyLiveMap(item.id);
}

// Offscreen render for export -------------------------------------------------
async function renderMapImage(item, dpi, onProgress) {
  const Ctor = MapCtor();
  if (!Ctor) return null;
  const style = await buildStyle(item);
  const W = Math.max(1, Math.round(item.w * PX96));
  const H = Math.max(1, Math.round(item.h * PX96));
  const container = el("div", {
    style: { position: "fixed", left: "-20000px", top: "0", width: `${W}px`, height: `${H}px`, pointerEvents: "none" },
  });
  document.body.appendChild(container);
  const v = item.props.view;
  let map;
  try {
    map = new Ctor({
      container,
      style,
      center: v.center,
      zoom: v.zoom,
      bearing: v.bearing || 0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio: dpi / 96,
      preserveDrawingBuffer: true,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      maxCanvasSize: [16384, 16384],
    });
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      map.once("idle", finish);
      setTimeout(finish, 45000);
    });
    onProgress?.();
    return map.getCanvas().toDataURL("image/png");
  } catch (e) {
    console.error("[Layout Composer] map export failed", e);
    return null;
  } finally {
    try {
      map?.remove();
    } catch {}
    container.remove();
  }
}

// Legend from the map style -----------------------------------------------------
function expressionClasses(v) {
  if (v == null) return null;
  if (typeof v === "string") return { single: v };
  if (typeof v === "object" && !Array.isArray(v) && v.stops) {
    // legacy function
    return { classes: v.stops.map(([k, c]) => ({ label: String(typeof k === "object" ? k.value : k), color: c })), gradient: v.type !== "categorical" };
  }
  if (!Array.isArray(v)) return null;
  const op = v[0];
  if (op === "match") {
    const classes = [];
    for (let i = 2; i < v.length - 1; i += 2) {
      const keys = Array.isArray(v[i]) ? v[i] : [v[i]];
      if (typeof v[i + 1] === "string") classes.push({ label: keys.join(", "), color: v[i + 1] });
    }
    if (typeof v[v.length - 1] === "string") classes.push({ label: "Other", color: v[v.length - 1], other: true });
    return { classes };
  }
  if (op === "step") {
    const classes = [];
    const stops = [];
    for (let i = 3; i < v.length; i += 2) stops.push(v[i]);
    const colors = [v[2]];
    for (let i = 4; i < v.length; i += 2) colors.push(v[i]);
    colors.forEach((c, i) => {
      let label;
      if (i === 0) label = `< ${fmtNumber(stops[0], 2)}`;
      else if (i === colors.length - 1) label = `≥ ${fmtNumber(stops[i - 1], 2)}`;
      else label = `${fmtNumber(stops[i - 1], 2)} – ${fmtNumber(stops[i], 2)}`;
      if (typeof c === "string") classes.push({ label, color: c });
    });
    return { classes };
  }
  if (op === "interpolate" || op === "interpolate-hcl" || op === "interpolate-lab") {
    const classes = [];
    for (let i = 3; i < v.length; i += 2) if (typeof v[i + 1] === "string") classes.push({ label: fmtNumber(v[i], 2), color: v[i + 1] });
    return { classes, gradient: true };
  }
  if (op === "case") {
    const classes = [];
    for (let i = 1; i < v.length - 1; i += 2) if (typeof v[i + 1] === "string") classes.push({ label: describeCond(v[i]), color: v[i + 1] });
    if (typeof v[v.length - 1] === "string") classes.push({ label: "Other", color: v[v.length - 1], other: true });
    return { classes };
  }
  if (op === "literal" && typeof v[1] === "string") return { single: v[1] };
  if (op === "to-color" && typeof v[1] === "string") return { single: v[1] };
  return null;
}
function describeCond(c) {
  if (Array.isArray(c) && c.length === 3 && Array.isArray(c[1]) && c[1][0] === "get") return `${c[1][1]} ${c[0]} ${c[2]}`;
  return "Class";
}
const num = (v, d) => (typeof v === "number" ? v : d);

// ---------------------------------------------------------------- tile thumbnails for legends
// URL of the tile under the main map centre (XYZ templates and WMS GetMap URLs).
function tileSampleUrl(l) {
  const src = l?.source || {};
  let tpl = (Array.isArray(src.tiles) && src.tiles[0]) || src.url || l?.url || "";
  if (!tpl || !/\{z\}|\{bbox|bbox=|\{x\}/i.test(tpl)) return "";
  const m = mainMap();
  const c = m?.getCenter?.() || { lng: 0, lat: 0 };
  const z = clamp(Math.round((m?.getZoom?.() ?? 3) - 1), 0, 18);
  const n = 2 ** z;
  const x = clamp(Math.floor(((c.lng + 180) / 360) * n), 0, n - 1);
  const latR = (clamp(c.lat, -85, 85) * Math.PI) / 180;
  const y = clamp(Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n), 0, n - 1);
  const R = 6378137 * Math.PI;
  const size = (2 * R) / n;
  const bbox = [-R + x * size, R - (y + 1) * size, -R + (x + 1) * size, R - y * size].map((v) => v.toFixed(2)).join(",");
  return tpl
    .replace(/\{s\}/g, "a")
    .replace(/\{z\}/g, z)
    .replace(/\{x\}/g, x)
    .replace(/\{y\}/g, y)
    .replace(/\{-y\}/g, n - 1 - y)
    .replace(/\{bbox-epsg-3857\}/gi, bbox)
    .replace(/\{ratio\}|\{r\}/g, "");
}
// Tile images are fetched once and kept as data URLs so they survive SVG → canvas export.
const TILE_THUMBS = new Map();
function tileThumb(url) {
  if (!url) return null;
  const hit = TILE_THUMBS.get(url);
  if (hit) return hit === "pending" || hit === "error" ? null : hit;
  TILE_THUMBS.set(url, "pending");
  fetch(url, { mode: "cors" })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status))))
    .then((b) => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    }))
    .then((d) => {
      TILE_THUMBS.set(url, d);
      clearTimeout(tileThumb.t);
      tileThumb.t = setTimeout(() => S.ui && refreshCanvas(), 60);
    })
    .catch(() => TILE_THUMBS.set(url, "error"));
  return null;
}

function legendFromMap() {
  const m = mainMap();
  if (!m) return [];
  const style = m.getStyle();
  const entries = [];
  const layers = allProjectLayers().filter((l) => l.visible !== false);
  for (const gl of layers) {
    if (isDataRaster(gl)) {
      // COG rasters are drawn by deck.gl, outside the MapLibre style
      const rs = gl.metadata?.rasterState || {};
      const cm = rasterColormap(rs.colormap);
      const rgb = Array.isArray(rs.bands) && rs.bands.length >= 3 && !rs.colormap;
      const colors = cm ? colorbarColors({ colormap: cm.name, reverse: cm.reverse }) : rgb ? null : ["#000000", "#ffffff"];
      const r = rasterRange(gl);
      entries.push({
        key: `${gl.id}`,
        kind: "item",
        label: gl.name || gl.id,
        layerId: gl.id,
        patch: colors ? { type: "gradient", colors } : { type: "tile", url: tileSampleUrl(gl) },
        ...(r && colors ? { note: `${fmtNumber(Math.min(...r), 2)} – ${fmtNumber(Math.max(...r), 2)}` } : {}),
      });
      continue;
    }
    if (isTileLayer(gl)) {
      // basemap / XYZ / WMS tiles: a thumbnail of one tile under the map centre
      entries.push({ key: `${gl.id}`, kind: "item", label: gl.name || gl.id, layerId: gl.id, patch: { type: "tile", url: tileSampleUrl(gl) } });
      continue;
    }
    const sls = styleLayersFor(style, gl.id).filter((l) => (l.layout?.visibility ?? "visible") !== "none");
    if (!sls.length) continue;
    const fill = sls.find((l) => l.type === "fill" || l.type === "fill-extrusion");
    const line = sls.find((l) => l.type === "line");
    const circle = sls.find((l) => l.type === "circle");
    const raster = sls.find((l) => l.type === "raster" || l.type === "hillshade" || l.type === "color-relief");
    const heat = sls.find((l) => l.type === "heatmap");
    const symbol = sls.find((l) => l.type === "symbol");
    const name = gl.name || gl.id;
    const push = (label, patch, key) => entries.push({ key: key || `${gl.id}`, kind: "item", label, patch, layerId: gl.id });
    if (heat) {
      const cls = expressionClasses(heat.paint?.["heatmap-color"]);
      push(name, { type: "gradient", colors: cls?.classes?.map((c) => c.color).filter((c) => !/rgba\(0, ?0, ?0, ?0\)/.test(c)) || ["#2563eb", "#facc15", "#dc2626"] });
      continue;
    }
    if (raster && !fill && !line && !circle) {
      push(name, { type: "raster", fill: "#94a3b8" });
      continue;
    }
    let primary = null;
    let patchType = "fill";
    if (fill) {
      primary = expressionClasses(fill.paint?.[fill.type === "fill" ? "fill-color" : "fill-extrusion-color"] ?? "#000000");
    } else if (circle) {
      primary = expressionClasses(circle.paint?.["circle-color"] ?? "#000000");
      patchType = "point";
    } else if (line) {
      primary = expressionClasses(line.paint?.["line-color"] ?? "#000000");
      patchType = "line";
    } else if (symbol) {
      primary = expressionClasses(symbol.paint?.["icon-color"] || symbol.paint?.["text-color"] || "#000000");
      patchType = "point";
    }
    if (!primary) primary = { single: "#888888" };
    const lineCls = line ? expressionClasses(line.paint?.["line-color"]) : null;
    const outline = fill?.paint?.["fill-outline-color"];
    const stroke =
      patchType === "fill" ? (lineCls?.single || (typeof outline === "string" ? outline : null)) : patchType === "point" ? (typeof circle?.paint?.["circle-stroke-color"] === "string" ? circle.paint["circle-stroke-color"] : null) : null;
    const strokeWidth =
      patchType === "fill" ? num(line?.paint?.["line-width"], 0.3) * 0.35 : patchType === "line" ? num(line?.paint?.["line-width"], 1.5) * 0.35 : num(circle?.paint?.["circle-stroke-width"], 0.5) * 0.3;
    const dash = Array.isArray(line?.paint?.["line-dasharray"]) ? "dash" : "";
    const fillOpacity = num(fill?.paint?.["fill-opacity"], num(circle?.paint?.["circle-opacity"], 1));
    const mk = (color) => {
      if (patchType === "line") return { type: "line", stroke: color, strokeWidth, dash };
      if (patchType === "point") return { type: "point", fill: color, fillOpacity, stroke: stroke || "#ffffff", strokeWidth, radius: clamp(num(circle?.paint?.["circle-radius"], 5) * 0.3, 0.8, 2) };
      return { type: "fill", fill: color, fillOpacity, stroke: stroke || "", strokeWidth };
    };
    if (primary.single) {
      push(name, mk(primary.single));
    } else if (primary.classes?.length) {
      entries.push({ key: `${gl.id}::group`, kind: "group", label: name, layerId: gl.id });
      primary.classes.forEach((c, i) => {
        push(c.label, mk(c.color), `${gl.id}::${i}::${c.label}`);
        // the expression's fallback colour is rarely a real class: start hidden
        if (c.other) entries[entries.length - 1].hidden = true;
      });
    }
  }
  return entries;
}

// Merge freshly generated entries with user edits (renamed/hidden labels).
function syncLegendEntries(item) {
  const fresh = legendFromMap();
  const old = new Map((item.props.entries || []).map((e) => [e.key, e]));
  const manual = (item.props.entries || []).filter((e) => e.manual);
  item.props.entries = [
    ...fresh.map((e) => {
      const o = old.get(e.key);
      return o ? { ...e, label: o.userLabel ? o.label : e.label, userLabel: o.userLabel, hidden: o.hidden } : e;
    }),
    ...manual,
  ];
  return fresh.length;
}
// ---------------------------------------------------------------- icons
const ICON_PATHS = {
  select: "M5 3l14 8-6 1.5L10 19z",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  inset: "M3 4h18v16H3zM13 12h6v6h-6z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  ruler: "M2 16l14-14 6 6L8 22zM7 11l2 2M10 8l2 2M13 5l2 2",
  north: "M12 2l6 18-6-4-6 4z",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  title: "M6 4v16M18 4v16M6 12h12",
  image: "M3 4h18v16H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 20",
  shape: "M3 3h8v8H3zM17 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 14l5 7H7z",
  table: "M3 4h18v16H3zM3 10h18M3 15h18M10 4v16",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  redo: "M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  zin: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5M11 8v6M8 11h6",
  zout: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5M8 11h6",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  save: "M5 3h11l5 5v13H3V3zM7 3v6h8M7 21v-7h10v7",
  open: "M3 7V5h7l2 2h9v12H3zM3 7h18",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  close: "M6 6l12 12M18 6L6 18",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  eyeoff: "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  top: "M5 4h14M12 20V8M7 13l5-5 5 5",
  bottom: "M5 20h14M12 4v12M7 11l5 5 5-5",
  copy: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  alL: "M4 3v18M8 7h10v4H8zM8 14h6v4H8z",
  alC: "M12 3v18M6 7h12v4H6zM8 14h8v4H8z",
  alR: "M20 3v18M6 7h10v4H6zM10 14h6v4h-6z",
  alT: "M3 4h18M7 8h4v10H7zM14 8h4v6h-4z",
  alM: "M3 12h18M7 6h4v12H7zM14 8h4v8h-4z",
  alB: "M3 20h18M7 6h4v10H7zM14 10h4v6h-4z",
  disH: "M4 4v16M20 4v16M9 8h6v8H9z",
  disV: "M4 4h16M4 20h16M8 9h8v6H8z",
  template: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  page: "M6 2h9l5 5v15H6zM15 2v5h5",
  vars: "M8 4C5 4 6 10 3 12c3 2 2 8 5 8M16 4c3 0 2 6 5 8-3 2-2 8-5 8",
  movecontent: "M3 3h18v18H3zM12 7v10M7 12h10M12 7l-2 2M12 7l2 2M12 17l-2-2M12 17l2-2M7 12l2-2M7 12l2 2M17 12l-2-2M17 12l-2 2",
  pan: "M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3",
  refresh: "M20 11a8 8 0 1 0-2 5.3M20 4v7h-7",
  plus: "M12 5v14M5 12h14",
  fitlayers: "M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4M8 9l4-2 4 2v6l-4 2-4-2z",
  fitsel: "M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4M8 8h8v8H8z",
  dockleft: "M3 4h18v16H3zM9 4v16M5 8h2M5 11h2",
  dockright: "M3 4h18v16H3zM15 4v16M17 8h2M17 11h2",
  flipH: "M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z",
  flipV: "M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z",
  layout: "M3 3h18v18H3zM6 6h9v8H6zM18 7v4M6 17h5M14 17h4",
  rename: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  colorbar: "M3 9h18v6H3zM3 9l-2 3 2 3M21 9l2 3-2 3M7 18v2M12 18v2M17 18v2",
  sameW: "M4 8h16M4 16h16M4 5v6M20 5v6M4 13v6M20 13v6",
  sameH: "M8 4v16M16 4v16M5 4h6M5 20h6M13 4h6M13 20h6",
  pen: "M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.59 7.59M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  sigma: "M18 4H6l6 8-6 8h12",
  library: "M4 4h5v16H4zM10 4h4v16h-4zM15.5 4.5l4-1 3 15.5-4 1z",
  marker: "M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  eyedrop: "M2 22l1-4 9.5-9.5M14.5 6.5l3 3M13 5l6 6M15 3l6 6-3 3-6-6z",
  fx: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  sync: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
  menu: "M4 7h16M4 12h16M4 17h16",
  chevron: "M7 10l5 5 5-5",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
};
// Two-tone item icons: a soft tinted body (currentColor at low opacity) under a crisp outline,
// so they follow the theme and turn blue as a whole when the tool is active.
const tt = (fill, line, extra = "") =>
  `<path d="${fill}" fill="currentColor" opacity=".2" stroke="none"/>` +
  `<path d="${line}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>${extra}`;
const ICON_SVG = {
  select: tt("M5.5 3.5l13 7.4-5.6 1.5-2.9 5.6z", "M5.5 3.5l13 7.4-5.6 1.5-2.9 5.6zM12.9 12.4l4.6 4.6"),
  pan: tt(
    "M8 11V5.5a1.5 1.5 0 0 1 3 0V10V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15z",
    "M8 11V5.5a1.5 1.5 0 0 1 3 0V10V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15z",
  ),
  movecontent: tt(
    "M3 3h18v18H3z",
    "M3 3h18v18H3zM12 7.5v9M7.5 12h9M10.3 9.2L12 7.5l1.7 1.7M10.3 14.8L12 16.5l1.7-1.7M9.2 10.3L7.5 12l1.7 1.7M14.8 10.3l1.7 1.7-1.7 1.7",
  ),
  map: tt("M9 3.5l6 3v14l-6-3z", "M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3zM9 3.5v14M15 6.5v14"),
  inset: tt("M12.5 11.5h7v7h-7z", "M3 4h18v16H3zM12.5 11.5h7v7h-7zM6 8l3 2.5 2-1.5", '<circle cx="16" cy="15" r="1" fill="currentColor"/>'),
  list: tt(
    "M3.5 5h4v3.5h-4zM3.5 15.5h4V19h-4z",
    "M3.5 5h4v3.5h-4zM3.5 15.5h4V19h-4zM3.5 12h4M11 6.8h9.5M11 12h9.5M11 17.2h9.5",
  ),
  colorbar:
    '<path d="M5 8h4.7v6H5z" fill="currentColor" opacity=".12"/><path d="M9.7 8h4.6v6H9.7z" fill="currentColor" opacity=".38"/><path d="M14.3 8H19v6h-4.7z" fill="currentColor" opacity=".7"/>' +
    '<path d="M5 8h14l3 3-3 3H5l-3-3zM6 17.5v2M12 17.5v2M18 17.5v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  north:
    '<path d="M12 3l5.5 15L12 14.6z" fill="currentColor"/>' +
    '<path d="M12 3L6.5 18 12 14.6 17.5 18z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M10 22v-3.2l4 3.2v-3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>',
  text: tt("M4 4h16v3.5H4z", "M4 7.5V4h16v3.5M12 4v16M9 20h6"),
  title: tt("M5 4h4v16H5zM15 4h4v16h-4z", "M7 4v16M17 4v16M7 12h10M5 4h4M5 20h4M15 4h4M15 20h4"),
  image: tt("M3.5 4.5h17v15h-17z", "M3.5 4.5h17v15h-17zM3.5 17l5.5-5.5 4 4 2.5-2.5 5 5", '<circle cx="15.5" cy="9" r="1.7" fill="currentColor"/>'),
  shape: tt("M3.5 3.5h8v8h-8zM12.5 20.5l4.5-8 4.5 8z", "M3.5 3.5h8v8h-8zM12.5 20.5l4.5-8 4.5 8z", '<circle cx="7.5" cy="16.5" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="7" r="3.8" fill="currentColor" opacity=".55"/>'),
  table: tt("M3.5 4.5h17v5h-17z", "M3.5 4.5h17v15h-17zM3.5 9.5h17M3.5 14.5h17M10 9.5v10"),
  pen: tt("M12.5 19.5l7-7 2.5 2.5-7 7z", "M12.5 19.5l7-7 2.5 2.5-7 7zM18 13l-1.5-7.5L3 2.5l3 13.5 7 1.5zM3 2.5l7.5 7.5", '<circle cx="11.5" cy="11" r="1.6" fill="currentColor"/>'),
  marker: tt("M12 21.5s7-6.4 7-11.8a7 7 0 1 0-14 0c0 5.4 7 11.8 7 11.8z", "M12 21.5s7-6.4 7-11.8a7 7 0 1 0-14 0c0 5.4 7 11.8 7 11.8z", '<circle cx="12" cy="9.7" r="2.6" fill="currentColor"/>'),
  sigma: tt("M6 4h12v3H6z", "M18 7V4H6l6 8-6 8h12v-3"),
  template: tt("M3 3h8v8H3zM13 13h8v8h-8z", "M3 3h8v8H3zM13 3h8v6h-8zM13 13h8v8h-8zM3 15h8v6H3z"),
  page: tt("M6 2.5h9l4.5 4.5v14.5H6z", "M6 2.5h9l4.5 4.5v14.5H6zM15 2.5V7h4.5"),
  layout: tt("M6 6h9v8H6z", "M3 3h18v18H3zM6 6h9v8H6zM18 7v4M6 17h5M14 17h4"),
  scalebar:
    '<rect x="2" y="9" width="20" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="2" y="9" width="5" height="5" fill="currentColor"/><rect x="12" y="9" width="5" height="5" fill="currentColor"/>' +
    '<path d="M2 17v2M12 17v2M22 17v2M7 17v1.2M17 17v1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
};
function icon(name, size = 16) {
  if (ICON_SVG[name]) return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[name]}</svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name] || ""}"/></svg>`;
}
function iconBtn(name, title, onClick, extraClass = "") {
  return el("button", { type: "button", class: `${NS}-ibtn ${extraClass}`, title, "aria-label": title, html: icon(name), onclick: onClick });
}

// ---------------------------------------------------------------- shell
const TOOLS = [
  { id: "select", icon: "select", short: "Select", label: "Select / move (V)" },
  { id: "pan", icon: "pan", short: "Pan", label: "Pan canvas (H, or hold Space)" },
  { id: "content", icon: "movecontent", short: "Content", label: "Move map content (C): drag inside any map frame to pan, scroll to zoom, right-drag to rotate" },
  { sep: true },
  { id: "map", icon: "map", short: "Map", label: "Add map frame" },
  { id: "inset", icon: "inset", short: "Inset", label: "Add inset / key map" },
  { id: "legend", icon: "list", short: "Legend", label: "Add legend" },
  { id: "colorbar", icon: "colorbar", short: "Color bar", label: "Add color bar" },
  { id: "north", icon: "north", short: "North", label: "Add north arrow", gallery: "north" },
];

// Insert menus in the top bar: each opens a small menu or gallery, then arms a tool.
const INSERT_MENUS = [
  {
    id: "text", icon: "text", label: "Text", tools: ["title", "text", "table", "latex"],
    items: [
      ["heading", "title", "Heading", "26 pt bold"],
      ["subheading", "title", "Subheading", "15 pt bold"],
      ["body", "text", "Body text", "Wrapped paragraph"],
      ["caption", "text", "Caption", "Small italic note"],
      ["maplabel", "text", "Map label", "Spaced capitals with halo"],
      ["callout", "text", "Callout", "Text on a colored box"],
      ["title", "title", "Map title", "Uses the {title} variable"],
      ["table", "table", "Table / info box", "Rows and columns, e.g. a title block"],
      ["latex", "sigma", "Formula (LaTeX)", "MathJax formula"],
    ],
  },
  { id: "draw", icon: "pen", label: "Draw", tools: ["pen"], gallery: "draw", tool: "pen" },
  { id: "shape", icon: "shape", label: "Shape", tools: ["shape"], gallery: "shape", tool: "shape" },
  { id: "image", icon: "image", label: "Image", tools: ["image"], tool: "image" },
  { id: "symbols", icon: "marker", label: "Symbols", tools: ["marker"], symbols: true },
  { id: "scalebar", icon: "scalebar", label: "Scale bar", tools: ["scalebar"], gallery: "scalebar", tool: "scalebar" },
];
function buildInsertBar() {
  const grp = el("div", { class: `${NS}-grp ${NS}-insert` });
  for (const m of INSERT_MENUS) {
    const b = el("button", { type: "button", class: `${NS}-ins`, "data-tools": m.tools.join(" "), title: m.label, html: `${icon(m.icon, 16)}<span>${esc(m.label)}</span>${m.tool === "image" ? "" : '<svg class="glc-caret" width="8" height="8" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'}` });
    b.addEventListener("click", () => {
      if (m.tool === "image") return addAtCenter("image");
      if (m.gallery) return openToolGallery({ id: m.tool, gallery: m.gallery }, b);
      if (m.symbols) return openSymbolsMenu(b);
      const list = el("div", { class: `${NS}-menu` });
      for (const [tool, ic, name, hint] of m.items) {
        const it = el("button", { type: "button", class: `${NS}-menuitem`, html: `${icon(ic, 15)}<span>${esc(name)}</span><small>${esc(hint)}</small>` });
        it.addEventListener("click", () => {
          closePopover();
          addAtCenter(tool);
        });
        list.appendChild(it);
      }
      popoverAt(b, list);
    });
    grp.appendChild(b);
  }
  return grp;
}
function openSymbolsMenu(anchor) {
  const body = el("div", {},
    el("div", { class: `${NS}-ptitle` }, "Point markers"),
    galleryGrid("marker", null, (id) => {
      closePopover();
      addAtCenter("marker", id);
    }),
    el("div", { class: `${NS}-msep` }),
  );
  const cat = el("button", { type: "button", class: `${NS}-menuitem`, html: `${icon("library", 15)}<span>Icon catalog…</span><small>Maki · Temaki (CC0)</small>` });
  cat.addEventListener("click", () => openCatalog(anchor));
  body.appendChild(cat);
  popoverAt(anchor, body, `${NS}-galpop`);
}


const EXPORT_FORMATS = [
  ["png", "PNG"],
  ["jpg", "JPG"],
  ["pdf", "PDF"],
  ["svg", "SVG"],
];

function buildShell() {
  const root = el("div", { class: `${NS}-root`, tabindex: "-1" });
  const top = el("header", { class: `${NS}-top` });
  const layoutSel = el("select", { class: `${NS}-layoutsel`, title: "Active layout", onchange: (e) => switchLayout(e.target.value) });
  S.ui.layoutSel = layoutSel;
  const zoomLbl = el("button", { type: "button", class: `${NS}-zoomlbl`, title: "Zoom options", onclick: (e) => openZoomMenu(e.currentTarget) }, "100%");
  S.ui.zoomLbl = zoomLbl;
  S.exportFmt = S.exportFmt || "png";
  S.exportDpi = S.exportDpi || 300;
  // three zones like a desktop design app: file & history | insert | view & export
  const vsep = () => el("span", { class: `${NS}-vsep` });
  top.append(
    el("div", { class: `${NS}-topl` },
      el("div", { class: `${NS}-brand`, title: "Layout Composer", html: `${icon("layout", 16)}` }),
      iconBtn("menu", "Main menu", (e) => openMainMenu(e.currentTarget), `${NS}-mainmenu`),
      iconBtn("dockleft", "Show / hide the Layers panel", () => toggleDock("left"), `${NS}-docktog`),
      vsep(),
      el("div", { class: `${NS}-layoutpick` },
        layoutSel,
        iconBtn("plus", "New layout / templates", (e) => openNewMenu(e.currentTarget)),
      ),
      vsep(),
      iconBtn("undo", "Undo (Ctrl+Z)", undo),
      iconBtn("redo", "Redo (Ctrl+Y)", redo),
    ),
    el("div", { class: `${NS}-topc` }, buildInsertBar()),
    el("div", { class: `${NS}-topr` },
      el("div", { class: `${NS}-zoompill` },
        iconBtn("zout", "Zoom out (Ctrl+−)", () => setZoom(S.zoom / 1.2)),
        zoomLbl,
        iconBtn("zin", "Zoom in (Ctrl++)", () => setZoom(S.zoom * 1.2)),
      ),
      iconBtn("fit", "Fit page (Ctrl+0)", () => fitPage()),
      vsep(),
      iconBtn("save", "Save layout file (.json)", () => exportJSON()),
      el("button", { type: "button", class: `${NS}-btn ${NS}-primary`, title: "Export", html: `${icon("download")}<span>Export</span>`, onclick: (e) => openExportMenu(e.currentTarget) }),
      iconBtn("dockright", "Show / hide the Properties panel", () => toggleDock("right"), `${NS}-docktog`),
      iconBtn("close", "Close Layout Composer", () => closeComposer(), `${NS}-closebtn`),
    ),
  );

  const tools = el("nav", { class: `${NS}-tools` });
  for (const t of TOOLS) {
    if (t.sep) {
      tools.appendChild(el("div", { class: `${NS}-tsep` }));
      continue;
    }
    const b = el("button", { type: "button", class: `${NS}-tool`, "data-tool": t.id, title: t.label, "aria-label": t.label, html: `${icon(t.icon, 18)}<span>${esc(t.short)}</span>` });
    b.addEventListener("click", () => {
      if (t.action) t.action(b);
      else if (t.gallery) openToolGallery(t, b);
      else if (["map", "inset", "legend", "colorbar"].includes(t.id)) addAtCenter(t.id);
      else setTool(t.id);
    });
    tools.appendChild(b);
  }

  const left = el("aside", { class: `${NS}-left` },
    el("div", { class: `${NS}-phead` }, el("span", { class: `${NS}-pheadt`, html: `${icon("layers", 14)}<span>Layers</span>` }), el("span", { class: `${NS}-count` })),
    el("div", { class: `${NS}-itemsearch` }, el("input", { type: "search", class: `${NS}-input`, placeholder: "Search layers…", oninput: (e) => { S.itemFilter = e.target.value; renderItemList(); } })),
    el("div", { class: `${NS}-itemlist` }),
  );

  const stage = el("main", { class: `${NS}-stage` },
    el("div", { class: `${NS}-quick`, style: { display: "none" } }),
    el("div", { class: `${NS}-rcorner` }),
    el("canvas", { class: `${NS}-rtop` }),
    el("canvas", { class: `${NS}-rleft` }),
    el("div", { class: `${NS}-scroll` }, el("div", { class: `${NS}-canvas` }, el("div", { class: `${NS}-paper` }, el("div", { class: `${NS}-pagedecor` }), el("div", { class: `${NS}-items` }), el("div", { class: `${NS}-uguides` }), el("div", { class: `${NS}-selection` }), el("div", { class: `${NS}-guides` })))),
  );

  const right = el("aside", { class: `${NS}-right` },
    el("div", { class: `${NS}-tabs` },
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "item", onclick: () => setTab("item") }, "Item"),
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "page", onclick: () => setTab("page") }, "Page"),
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "vars", onclick: () => setTab("vars") }, "Variables"),
    ),
    el("div", { class: `${NS}-props` }),
  );

  const status = el("footer", { class: `${NS}-status` }, el("span", { class: `${NS}-pos` }, "x –  y –"), el("span", { class: `${NS}-selinfo` }), el("span", { class: `${NS}-hint` }), el("span", { class: `${NS}-viewtoggles` }, viewToggle("grid", "Canvas grid"), viewToggle("guides", "Guides"), viewToggle("snap", "Snap")), el("span", { class: `${NS}-zoomwrap` }, buildZoomSlider()));
  root.append(top, el("div", { class: `${NS}-body` }, tools, left, stage, right), status, el("div", { class: `${NS}-toasts` }));

  S.ui.root = root;
  S.ui.quick = stage.querySelector(`.${NS}-quick`);
  S.ui.scroll = stage.querySelector(`.${NS}-scroll`);
  S.ui.canvas = stage.querySelector(`.${NS}-canvas`);
  S.ui.paper = stage.querySelector(`.${NS}-paper`);
  S.ui.decor = stage.querySelector(`.${NS}-pagedecor`);
  S.ui.items = stage.querySelector(`.${NS}-items`);
  S.ui.sel = stage.querySelector(`.${NS}-selection`);
  S.ui.guides = stage.querySelector(`.${NS}-guides`);
  S.ui.uguides = stage.querySelector(`.${NS}-uguides`);
  S.ui.rTop = stage.querySelector(`.${NS}-rtop`);
  S.ui.rLeft = stage.querySelector(`.${NS}-rleft`);
  S.ui.itemList = left.querySelector(`.${NS}-itemlist`);
  S.ui.itemCount = left.querySelector(`.${NS}-count`);
  S.ui.props = right.querySelector(`.${NS}-props`);
  S.ui.tabs = right.querySelector(`.${NS}-tabs`);
  S.ui.pos = status.querySelector(`.${NS}-pos`);
  S.ui.selInfo = status.querySelector(`.${NS}-selinfo`);
  S.ui.hint = status.querySelector(`.${NS}-hint`);
  S.ui.tools = tools;
  S.ui.itemEls = new Map();
  S.tab = "item";

  S.ui.scroll.addEventListener("scroll", () => drawRulers());
  S.ui.scroll.addEventListener("wheel", onWheel, { passive: false });
  S.ui.canvas.addEventListener("pointerdown", onPointerDown);
  S.ui.canvas.addEventListener("dblclick", onDblClick);
  S.ui.canvas.addEventListener("pointermove", onHoverMove);
  S.ui.canvas.addEventListener("contextmenu", openContextMenu);
  bindRulerGuides();
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = stage.clientWidth;
    if ((S.pendingFit || (lastW && Math.abs(w - lastW) > 40 && S.autoFit)) && S.doc) fitPage();
    lastW = w;
    drawRulers();
  });
  ro.observe(stage);
  S.disposers.push(() => ro.disconnect());
  return root;
}

// Main menu: layouts, files, panels.
function openMainMenu(anchor) {
  const m = el("div", { class: `${NS}-menu` });
  const sep = () => el("div", { class: `${NS}-msep` });
  m.append(
    menuItem("New layout or template…", () => openNewMenu(anchor), { iconName: "plus" }),
    menuItem("Duplicate layout", () => duplicateLayout(), { iconName: "copy" }),
    menuItem("Rename layout…", () => renameLayout(), { iconName: "rename" }),
    menuItem("Save as template…", () => saveAsTemplate(), { iconName: "template" }),
    menuItem("Delete layout", () => deleteLayout(), { iconName: "trash", danger: true }),
    sep(),
    menuItem("Open layout file…", () => importJSON(), { iconName: "open" }),
    menuItem("Save layout file", () => exportJSON(), { iconName: "save" }),
    menuItem("Export…", () => openExportMenu(anchor), { iconName: "download" }),
    sep(),
    menuItem("Layers panel", () => toggleDock("left"), { iconName: "dockleft" }),
    menuItem("Properties panel", () => toggleDock("right"), { iconName: "dockright" }),
    sep(),
    menuItem("Close Layout Composer", () => closeComposer(), { iconName: "close" }),
  );
  popoverAt(anchor, m);
}
function openZoomMenu(anchor) {
  const m = el("div", { class: `${NS}-menu` });
  const pct = (p) => menuItem(`${p}%`, () => setZoom((PX96 * p) / 100));
  m.append(
    menuItem("Zoom in", () => setZoom(S.zoom * 1.2), { iconName: "zin", kbd: "Ctrl +" }),
    menuItem("Zoom out", () => setZoom(S.zoom / 1.2), { iconName: "zout", kbd: "Ctrl −" }),
    el("div", { class: `${NS}-msep` }),
    menuItem("Fit page", () => fitPage(), { iconName: "fit", kbd: "Ctrl 0" }),
    menuItem("Zoom to selection", () => zoomToSelection(), { iconName: "fitsel", kbd: "Shift 2" }),
    el("div", { class: `${NS}-msep` }),
    pct(50), pct(100), pct(200), pct(400),
  );
  popoverAt(anchor, m);
}

// Arrange & align bar at the top of the properties panel (acts on the selection).
function selectionBar(n) {
  const b = (name, title, fn) => iconBtn(name, title, fn);
  const one = n < 2 ? " (to the page)" : "";
  return el("div", { class: `${NS}-selbar` },
    el("div", { class: `${NS}-selrow` },
      b("alL", `Align left${one}`, () => align("left")),
      b("alC", `Center horizontally${one}`, () => align("hcenter")),
      b("alR", `Align right${one}`, () => align("right")),
      b("alT", `Align top${one}`, () => align("top")),
      b("alM", `Center vertically${one}`, () => align("vcenter")),
      b("alB", `Align bottom${one}`, () => align("bottom")),
      b("disH", "Distribute horizontally (3+ items)", () => align("distH")),
      b("disV", "Distribute vertically (3+ items)", () => align("distV")),
    ),
    el("div", { class: `${NS}-selrow` },
      b("top", "Bring to front", () => arrange("top")),
      b("up", "Bring forward", () => arrange("up")),
      b("down", "Send backward", () => arrange("down")),
      b("bottom", "Send to back", () => arrange("bottom")),
      b("sameW", "Match width of the first selected item", () => align("sameW")),
      b("sameH", "Match height of the first selected item", () => align("sameH")),
      b("copy", "Duplicate (Ctrl+D)", () => duplicateSelection()),
      b("trash", "Delete (Del)", () => deleteSelection()),
    ),
  );
}

function openExportMenu(anchor) {
  const fmts = [
    ["png", "PNG", "Raster image"],
    ["jpg", "JPG", "Raster image, smaller file"],
    ["pdf", "PDF", "Page flattened at the chosen resolution"],
    ["vpdf", "Vector PDF", "Text, lines and symbols stay vector; maps are images"],
    ["geopdf", "GeoPDF", "PDF with the map frames georeferenced (WGS 84)"],
    ["svg", "SVG", "Editable vector page; maps embedded at 200 dpi"],
  ];
  const grid = el("div", { class: `${NS}-fmtgrid` });
  const dpiSel = el("select", { class: `${NS}-input` }, ...[75, 96, 150, 200, 300, 400, 600].map((d) => el("option", { value: d, selected: d === S.exportDpi }, `${d} dpi`)));
  const bgSel = el("select", { class: `${NS}-input` }, el("option", { value: "page" }, "Page color"), el("option", { value: "white" }, "White"), el("option", { value: "transparent" }, "Transparent"));
  bgSel.value = S.exportBg || "page";
  const name = el("input", { class: `${NS}-input`, value: S.exportName || safeName(S.doc.name) });
  const ext = el("span", { class: `${NS}-unit` });
  const dpiRow = el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "Resolution"), el("span", { class: `${NS}-pctl` }, dpiSel));
  const bgRow = el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "Background"), el("span", { class: `${NS}-pctl` }, bgSel));
  const info = el("div", { class: `${NS}-muted` });
  const refresh = () => {
    for (const b of grid.children) b.classList.toggle("active", b.dataset.v === S.exportFmt);
    const pg = S.doc.page;
    const px = (mm) => Math.round((mm / 25.4) * S.exportDpi);
    const f = S.exportFmt;
    dpiRow.style.display = f === "svg" ? "none" : "";
    bgSel.querySelector('[value="transparent"]').disabled = !(f === "png" || f === "svg");
    if (bgSel.value === "transparent" && bgSel.querySelector('[value="transparent"]').disabled) bgSel.value = "page";
    ext.textContent = f === "vpdf" || f === "geopdf" ? ".pdf" : `.${f}`;
    info.textContent =
      f === "svg" || f === "vpdf"
        ? fmts.find((x) => x[0] === f)[2] + "."
        : f === "pdf" || f === "geopdf"
          ? `${pg.width} × ${pg.height} mm at ${S.exportDpi} dpi.${f === "geopdf" ? " Readable in QGIS, Avenza Maps and Acrobat." : ""}`
          : `${px(pg.width)} × ${px(pg.height)} px at ${S.exportDpi} dpi.`;
  };
  for (const [v, label, title] of fmts) {
    const b = el("button", { type: "button", "data-v": v, title }, label);
    b.addEventListener("click", () => {
      S.exportFmt = v;
      refresh();
    });
    grid.appendChild(b);
  }
  dpiSel.addEventListener("change", () => {
    S.exportDpi = parseInt(dpiSel.value, 10);
    refresh();
  });
  bgSel.addEventListener("change", () => (S.exportBg = bgSel.value));
  name.addEventListener("input", () => (S.exportName = name.value));
  const go = el("button", { type: "button", class: `${NS}-btn ${NS}-primary ${NS}-wide`, html: `${icon("download")}<span>Export</span>` });
  go.addEventListener("click", () => {
    closePopover();
    S.exportBg = bgSel.value;
    S.exportName = name.value;
    exportLayout(S.exportFmt);
  });
  refresh();
  const pop = popoverAt(
    anchor,
    el("div", { class: `${NS}-exportpop` },
      el("div", { class: `${NS}-ptitle` }, "Export"),
      grid,
      dpiRow,
      bgRow,
      el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "File name"), el("span", { class: `${NS}-pctl` }, name, ext)),
      info,
      go,
    ),
  );
  const r = anchor.getBoundingClientRect();
  const rr = S.ui.root.getBoundingClientRect();
  pop.style.left = `${Math.max(8, r.right - rr.left - pop.offsetWidth)}px`;
}

function setTab(tab) {
  S.tab = tab;
  renderProps();
}
function setTool(id, variant) {
  S.tool = id;
  S.toolVariant = variant || null;
  for (const b of S.ui.tools.querySelectorAll(`.${NS}-tool`)) b.classList.toggle("active", b.dataset.tool === id);
  for (const b of S.ui.root.querySelectorAll(`.${NS}-ins`)) b.classList.toggle("active", b.dataset.tools.split(" ").includes(id));
  S.ui.canvas.dataset.tool = id;
  const hints = {
    select: "Click to select · Shift+click to multi-select · Double-click a map to pan its content · Arrows = nudge 1 mm (Shift 10 mm)",
    pan: "Drag to pan the canvas",
    content: "Drag inside a map frame to move its content · scroll to zoom · right-drag to rotate · V to return to Select",
    pen: "Click to add points · Shift = 45° · click the first point to close · double-click or Enter to finish · Backspace removes a point · Esc cancels",
  };
  if (id === "pen") hints.pen = (DRAW_MODES.find((m) => m.id === (variant || "polyline")) || DRAW_MODES[0]).hint + " · Esc cancels";
  S.ui.hint.textContent = hints[id] || "Click-drag on the paper to draw the item box, or click once for the default size. Esc to cancel.";
}

// ---------------------------------------------------------------- tool galleries
function closePopover() {
  S.ui.popover?.remove();
  S.ui.popover = null;
}
function popoverAt(anchor, content, cls = "") {
  closePopover();
  const pop = el("div", { class: `${NS}-popover ${cls}` }, content);
  S.ui.root.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const rr = S.ui.root.getBoundingClientRect();
  pop.style.left = `${Math.min(r.right + 6 - rr.left, rr.width - pop.offsetWidth - 8)}px`;
  pop.style.top = `${Math.max(8, Math.min(r.top - rr.top, rr.height - pop.offsetHeight - 8))}px`;
  if (r.top + pop.offsetHeight > rr.bottom) pop.style.top = `${Math.max(8, rr.height - pop.offsetHeight - 8)}px`;
  if (anchor.closest(`.${NS}-top`)) {
    pop.style.left = `${Math.min(r.left - rr.left, rr.width - pop.offsetWidth - 8)}px`;
    pop.style.top = `${r.bottom - rr.top + 6}px`;
  }
  setTimeout(() => {
    const off = (e) => {
      if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) {
        closePopover();
        document.removeEventListener("pointerdown", off, true);
      }
    };
    document.addEventListener("pointerdown", off, true);
  }, 0);
  S.ui.popover = pop;
  requestAnimationFrame(() => {
    const b = pop.getBoundingClientRect();
    const R = S.ui.root.getBoundingClientRect();
    if (b.bottom > R.bottom - 6) pop.style.top = `${Math.max(6, R.height - b.height - 6)}px`;
    if (b.right > R.right - 6) pop.style.left = `${Math.max(6, R.width - b.width - 6)}px`;
  });
  return pop;
}
function northThumb(v, size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">${v.svg("currentColor", "var(--glc-paper, #fff)", "N", "Arial")}</svg>`;
}
function shapeThumb(s, size = 40) {
  const w = 30;
  const h = s.line ? 20 : 20;
  const item = { id: "thumb", w, h, props: { ...ITEM_TYPES.shape.defaults(), shape: s.id, fill: "currentColor", fillOpacity: 0.25, stroke: "currentColor", strokeWidth: 1.2, radius: 4 } };
  return `<svg width="${size}" height="${size * 0.7}" viewBox="-2 -2 ${w + 4} ${h + 4}">${RENDERERS.shape(item)}</svg>`;
}
function scalebarThumb(st) {
  const fake = newItem("scalebar", 0, 0);
  fake.w = 60;
  fake.h = 10;
  fake.props.style = st.id;
  fake.props.font.size = 6;
  fake.props.color1 = "currentColor";
  fake.props.color2 = "var(--glc-paper, #fff)";
  const map = mapItems()[0];
  if (!map) return `<span>${esc(st.name)}</span>`;
  fake.props.linkedMap = map.id;
  return `<svg width="120" height="22" viewBox="-2 -1 72 12" overflow="visible">${RENDERERS.scalebar(fake)}</svg>`;
}
function galleryGrid(kind, current, onPick) {
  const grid = el("div", { class: `${NS}-gallery ${NS}-gal-${kind}` });
  const list = { north: NORTH_ARROWS, shape: SHAPES, scalebar: SCALEBAR_STYLES, draw: DRAW_MODES, marker: MARKER_SYMBOLS }[kind];
  for (const v of list) {
    const html = kind === "north" ? northThumb(v) : kind === "shape" ? shapeThumb(v) : kind === "draw" ? drawThumb(v) : kind === "marker" ? markerThumb(v) : scalebarThumb(v);
    const b = el("button", { type: "button", class: `${NS}-gitem ${v.id === current ? "active" : ""}`, title: v.name, html: `${html}<small>${esc(v.name)}</small>` });
    b.addEventListener("click", () => onPick(v.id));
    grid.appendChild(b);
  }
  return grid;
}
function openToolGallery(tool, anchor) {
  const titles = { north: "Choose a north arrow style", shape: "Choose a shape", scalebar: "Choose a scale bar style", draw: "Draw", marker: "Choose a marker symbol" };
  const pop = popoverAt(anchor, el("div", {}, el("div", { class: `${NS}-ptitle` }, titles[tool.gallery]), galleryGrid(tool.gallery, null, (id) => {
    closePopover();
    // drawing needs the pointer; everything else drops straight onto the page
    if (tool.id === "pen") setTool("pen", id);
    else addAtCenter(tool.id, id);
  })), `${NS}-galpop`);
  return pop;
}

// ---------------------------------------------------------------- zoom / scroll
const CANVAS_PAD = 260;
function setZoom(z, anchor) {
  S.autoFit = false;
  const sc = S.ui.scroll;
  const old = S.zoom;
  z = clamp(z, 0.4, 30);
  // keep the point under the cursor (or the view centre) still
  const rect = sc.getBoundingClientRect();
  const ax = anchor ? anchor.x - rect.left : sc.clientWidth / 2;
  const ay = anchor ? anchor.y - rect.top : sc.clientHeight / 2;
  const mmX = (sc.scrollLeft + ax - CANVAS_PAD) / old;
  const mmY = (sc.scrollTop + ay - CANVAS_PAD) / old;
  S.zoom = z;
  layoutCanvas();
  sc.scrollLeft = mmX * z + CANVAS_PAD - ax;
  sc.scrollTop = mmY * z + CANVAS_PAD - ay;
  renderPaper();
  renderSelection();
  drawRulers();
  updateZoomUI();
  renderGuides();
}
function fitPage() {
  S.autoFit = true;
  const sc = S.ui.scroll;
  const pg = S.doc.page;
  // Not laid out yet (overlay just mounted or window hidden): fit once it has a size.
  if (sc.clientWidth < 80 || sc.clientHeight < 80) {
    S.pendingFit = true;
    clearTimeout(S.fitRetry);
    S.fitRetry = setTimeout(() => S.pendingFit && S.open && fitPage(), 250);
    return;
  }
  S.pendingFit = false;
  const z = Math.min((sc.clientWidth - 48) / pg.width, (sc.clientHeight - 48) / pg.height);
  S.zoom = clamp(z, 0.4, 30);
  layoutCanvas();
  sc.scrollLeft = CANVAS_PAD + (pg.width * S.zoom) / 2 - sc.clientWidth / 2;
  sc.scrollTop = CANVAS_PAD + (pg.height * S.zoom) / 2 - sc.clientHeight / 2;
  renderPaper();
  renderSelection();
  drawRulers();
  updateZoomUI();
  renderGuides();
}
function layoutCanvas() {
  const pg = S.doc.page;
  const Z = S.zoom;
  S.ui.canvas.style.width = `${pg.width * Z + CANVAS_PAD * 2}px`;
  S.ui.canvas.style.height = `${pg.height * Z + CANVAS_PAD * 2}px`;
  Object.assign(S.ui.paper.style, { left: `${CANVAS_PAD}px`, top: `${CANVAS_PAD}px`, width: `${pg.width * Z}px`, height: `${pg.height * Z}px` });
  // page background, neatline and margin guides scale with the canvas
  renderPageDecor();
}
function onWheel(e) {
  if (S.contentMode && e.target.closest(`.${NS}-item[data-id="${S.contentMode}"]`)) return; // map handles its own wheel
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setZoom(S.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { x: e.clientX, y: e.clientY });
  }
}
// client px -> page mm
function toMM(e) {
  const r = S.ui.paper.getBoundingClientRect();
  return [(e.clientX - r.left) / S.zoom, (e.clientY - r.top) / S.zoom];
}

// ---------------------------------------------------------------- rulers
function drawRulers() {
  if (!S.ui.rTop || !S.doc) return;
  const dpr = window.devicePixelRatio || 1;
  const sc = S.ui.scroll;
  const Z = S.zoom;
  const style = getComputedStyle(S.ui.root);
  const fg = style.getPropertyValue("--glc-muted-fg").trim() || "#6b7280";
  const bg = style.getPropertyValue("--glc-panel").trim() || "#f8fafc";
  const step = Z >= 6 ? 1 : Z >= 2.5 ? 5 : Z >= 1 ? 10 : 50;
  const labelStep = Z >= 6 ? 10 : Z >= 2.5 ? 10 : Z >= 1 ? 50 : 100;
  for (const [cv, horiz] of [
    [S.ui.rTop, true],
    [S.ui.rLeft, false],
  ]) {
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (!W || !H) continue;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.font = "9px system-ui, sans-serif";
    ctx.lineWidth = 1;
    const off = (horiz ? CANVAS_PAD - sc.scrollLeft : CANVAS_PAD - sc.scrollTop);
    const len = horiz ? W : H;
    const startMm = Math.floor(-off / Z / step) * step;
    const endMm = (len - off) / Z;
    ctx.beginPath();
    for (let mm = startMm; mm <= endMm; mm += step) {
      const p = Math.round(off + mm * Z) + 0.5;
      const major = mm % labelStep === 0;
      const t = major ? 10 : mm % (step * 5) === 0 ? 6 : 3;
      if (horiz) {
        ctx.moveTo(p, H);
        ctx.lineTo(p, H - t);
        if (major) ctx.fillText(String(mm), p + 2, 9);
      } else {
        ctx.moveTo(W, p);
        ctx.lineTo(W - t, p);
        if (major) {
          ctx.save();
          ctx.translate(9, p + 2);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "right";
          ctx.fillText(String(mm), 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.stroke();
    // highlight selection extent
    const sel = selectedItems();
    if (sel.length) {
      const b = bboxOf(sel);
      ctx.fillStyle = "rgba(37,99,235,0.25)";
      if (horiz) ctx.fillRect(off + b.x * Z, 0, b.w * Z, H);
      else ctx.fillRect(0, off + b.y * Z, W, b.h * Z);
    }
  }
}
function bboxOf(items) {
  const x1 = Math.min(...items.map((i) => i.x));
  const y1 = Math.min(...items.map((i) => i.y));
  const x2 = Math.max(...items.map((i) => i.x + i.w));
  const y2 = Math.max(...items.map((i) => i.y + i.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ---------------------------------------------------------------- rendering
function renderAll({ props = true } = {}) {
  if (!S.open || !S.doc) return;
  layoutCanvas();
  renderPageDecor();
  renderPaper();
  renderSelection();
  renderItemList();
  renderLayoutSelect();
  renderGuides();
  updateZoomUI();
  if (props) renderProps();
  drawRulers();
}
function afterDocReplaced() {
  saveLibrary();
  // drop live maps for items that no longer exist
  for (const id of [...S.maps.keys()]) if (!findItem(id)) destroyLiveMap(id);
  renderAll();
}

function pageDecorSVG(forExport, background = "page") {
  const pg = S.doc.page;
  const fill = background === "transparent" ? "" : background === "white" ? "#ffffff" : pg.background || "#fff";
  let s = fill ? `<rect width="${pg.width}" height="${pg.height}" fill="${esc(fill)}"/>` : "";
  const b = pg.border;
  if (b?.show) {
    const i = b.inset || 0;
    s += `<rect x="${i}" y="${i}" width="${pg.width - i * 2}" height="${pg.height - i * 2}" fill="none" stroke="${esc(b.color)}" stroke-width="${b.width}"/>`;
    if (b.double) {
      const g = b.gap || 1.2;
      s += `<rect x="${i + g}" y="${i + g}" width="${pg.width - (i + g) * 2}" height="${pg.height - (i + g) * 2}" fill="none" stroke="${esc(b.color)}" stroke-width="${b.width * 0.4}"/>`;
    }
  }
  if (!forExport && pg.showMargin && pg.margin > 0) {
    const m = pg.margin;
    s += `<rect x="${m}" y="${m}" width="${pg.width - 2 * m}" height="${pg.height - 2 * m}" fill="none" stroke="#38bdf8" stroke-width="${0.6 / S.zoom}" stroke-dasharray="${3 / S.zoom} ${2 / S.zoom}"/>`;
  }
  return s;
}
function renderPageDecor() {
  const pg = S.doc.page;
  const Z = S.zoom;
  S.ui.decor.innerHTML = `<svg width="${pg.width * Z}" height="${pg.height * Z}" viewBox="0 0 ${pg.width} ${pg.height}">${pageDecorSVG(false)}</svg>`;
  if (pg.showGrid && pg.gridSize > 0) {
    const g = pg.gridSize * Z;
    S.ui.paper.style.setProperty("--glc-grid", `${g}px`);
    S.ui.paper.classList.add("showgrid");
  } else S.ui.paper.classList.remove("showgrid");
}

function renderPaper(onlyIds) {
  const Z = S.zoom;
  const seen = new Set();
  S.doc.items.forEach((item, idx) => {
    if (onlyIds && !onlyIds.includes(item.id)) {
      seen.add(item.id);
      return;
    }
    seen.add(item.id);
    let node = S.ui.itemEls.get(item.id);
    if (!node) {
      node = el("div", { class: `${NS}-item ${NS}-t-${item.type}`, "data-id": item.id });
      if (item.type === "map") {
        node.appendChild(el("div", { class: `${NS}-mapbox` }));
        node.appendChild(el("div", { class: `${NS}-mapnote` }));
      }
      node.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      if (item.type === "map") node.appendChild(el("div", { class: `${NS}-shield` }));
      S.ui.items.appendChild(node);
      S.ui.itemEls.set(item.id, node);
    }
    Object.assign(node.style, {
      left: `${item.x * Z}px`,
      top: `${item.y * Z}px`,
      width: `${item.w * Z}px`,
      height: `${item.h * Z}px`,
      zIndex: String(idx + 1),
      transform: `${item.rot ? `rotate(${item.rot}deg)` : ""}${item.flipX || item.flipY ? ` scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})` : ""}`,
      opacity: String(item.opacity ?? 1),
      display: item.hidden ? "none" : "",
    });
    node.classList.toggle("locked", !!item.locked);
    applyFxPreview(node, item);
    node.classList.toggle("content", S.contentMode === item.id);
    const svg = node.querySelector("svg");
    svg.setAttribute("width", item.w * Z);
    svg.setAttribute("height", item.h * Z);
    svg.setAttribute("viewBox", `0 0 ${item.w} ${item.h}`);
    svg.setAttribute("overflow", "visible");
    svg.innerHTML = renderItem(item, { export: false });
    if (item.type === "map") {
      const box = node.querySelector(`.${NS}-mapbox`);
      box.style.background = item.props.background || "#fff";
      const note = node.querySelector(`.${NS}-mapnote`);
      if (!MapCtor() && item.props.source !== "snapshot") {
        note.textContent = "GeoLibre map not found — open the composer from inside GeoLibre.";
      } else note.textContent = "";
      if (item.props.source === "snapshot") destroyLiveMap(item.id);
      else if (!item.hidden) {
        ensureLiveMap(item, box).then((rec) => {
          if (!rec?.map) return;
          if (rec.map.loaded()) syncLiveMap(item);
          else rec.map.once("load", () => syncLiveMap(findItem(item.id) || item));
        });
        syncLiveMap(item);
      }
    }
  });
  if (!onlyIds) {
    for (const [id, node] of S.ui.itemEls) {
      if (!seen.has(id)) {
        node.remove();
        S.ui.itemEls.delete(id);
        destroyLiveMap(id);
      }
    }
  }
}
// Re-render SVG overlays (scale bars, insets, grids) after a map moved.
let overlayRaf = 0;
function scheduleOverlayRefresh() {
  if (overlayRaf) return;
  overlayRaf = requestAnimationFrame(() => {
    overlayRaf = 0;
    for (const item of S.doc.items) {
      const node = S.ui.itemEls.get(item.id);
      if (!node || item.hidden) continue;
      if (item.type === "image" || item.type === "shape") continue;
      node.querySelector("svg").innerHTML = renderItem(item, { export: false });
    }
    if (S.ui.liveScaleInput && document.activeElement !== S.ui.liveScaleInput) {
      const it = selectedItems()[0];
      if (it?.type === "map") S.ui.liveScaleInput.value = mapScale(it);
    }
  });
}

function renderSelection() {
  const host = S.ui.sel;
  host.innerHTML = "";
  const Z = S.zoom;
  const items = selectedItems();
  for (const item of items) {
    const box = el("div", { class: `${NS}-selbox ${item.locked ? "locked" : ""}`, "data-id": item.id });
    Object.assign(box.style, {
      left: `${item.x * Z}px`,
      top: `${item.y * Z}px`,
      width: `${item.w * Z}px`,
      height: `${item.h * Z}px`,
      transform: item.rot ? `rotate(${item.rot}deg)` : "",
    });
    if (items.length === 1 && !item.locked && S.contentMode !== item.id) {
      for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) box.appendChild(el("div", { class: `${NS}-handle h-${h}`, "data-handle": h }));
      box.appendChild(el("div", { class: `${NS}-rothandle`, title: "Rotate (Shift = 15° steps)" }));
      box.appendChild(el("div", { class: `${NS}-sizebadge` }, `${round(item.w, 1)} × ${round(item.h, 1)}`));
    }
    host.appendChild(box);
  }
  const info = items.length === 1 ? `${items[0].name} · ${round(items[0].w, 1)} × ${round(items[0].h, 1)} mm` : items.length ? `${items.length} items selected` : "";
  S.ui.selInfo.textContent = info;
}

function renderLayoutSelect() {
  const sel = S.ui.layoutSel;
  sel.innerHTML = "";
  const list = Object.values(S.library.layouts).sort((a, b) => a.name.localeCompare(b.name));
  for (const d of list) sel.appendChild(el("option", { value: d.id, selected: d.id === S.doc.id }, d.name));
}

function renderItemList() {
  const host = S.ui.itemList;
  host.innerHTML = "";
  const q = String(S.itemFilter || "").trim().toLowerCase();
  const items = [...S.doc.items].reverse().filter((i) => !q || i.name.toLowerCase().includes(q) || i.type.includes(q) || (ITEM_TYPES[i.type]?.label || "").toLowerCase().includes(q));
  if (S.ui.itemCount) S.ui.itemCount.textContent = items.length ? String(items.length) : "";
  if (!items.length) host.appendChild(el("div", { class: `${NS}-empty` }, "No items yet. Pick a tool on the left and draw it on the page."));
  for (const item of items) {
    const row = el("div", { class: `${NS}-li ${S.selection.includes(item.id) ? "sel" : ""} ${item.hidden ? "dim" : ""}`, "data-id": item.id });
    const vis = iconBtn(item.hidden ? "eyeoff" : "eye", item.hidden ? "Show" : "Hide", (e) => {
      e.stopPropagation();
      commit(() => (item.hidden = !item.hidden));
    });
    const lock = iconBtn(item.locked ? "lock" : "unlock", item.locked ? "Unlock" : "Lock", (e) => {
      e.stopPropagation();
      commit(() => (item.locked = !item.locked));
    });
    const name = el("span", { class: `${NS}-liname`, title: "Double-click to rename" }, item.name);
    name.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const input = el("input", { class: `${NS}-input`, value: item.name });
      name.replaceWith(input);
      input.focus();
      input.select();
      const done = () => commit(() => (item.name = input.value.trim() || item.name));
      input.addEventListener("blur", done);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
        if (ev.key === "Escape") renderItemList();
      });
    });
    vis.classList.toggle("on", !!item.hidden);
    lock.classList.toggle("on", !!item.locked);
    if (item.group) name.appendChild(el("span", { class: `${NS}-grptag`, title: "Grouped" }, "⧉"));
    row.append(el("span", { class: `${NS}-liicon`, html: icon(ITEM_TYPES[item.type].icon, 14) }), name, vis, lock);
    row.addEventListener("click", (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelect(item.id);
      else select([item.id]);
    });
    host.appendChild(row);
  }
}

function select(ids) {
  if (S.contentMode && !ids.includes(S.contentMode)) exitContentMode();
  S.selection = ids.filter((id) => findItem(id));
  if (S.selection.length) S.tab = "item";
  renderSelection();
  renderItemList();
  renderProps();
  drawRulers();
}
function toggleSelect(id) {
  if (S.selection.includes(id)) select(S.selection.filter((s) => s !== id));
  else select([...S.selection, id]);
}

// ---------------------------------------------------------------- content mode (pan map inside frame)
function enterContentMode(id) {
  const item = findItem(id);
  if (!item || item.type !== "map") return;
  if (item.props.source === "snapshot") {
    toast("This frame shows a captured GeoLibre view. Switch Content to “Live map” to pan it, or recapture after moving GeoLibre.", "warn");
    return;
  }
  pushHistory();
  S.contentMode = id;
  select([id]);
  renderPaper();
  S.ui.hint.textContent = "Map content mode: drag to pan, scroll to zoom, right-drag to rotate. Click outside the map or press Esc to finish.";
  toast("Map content mode on — Esc to finish");
}
function exitContentMode() {
  if (!S.contentMode) return;
  S.contentMode = null;
  renderPaper();
  renderSelection();
  renderProps();
  setTool(S.tool);
  saveLibrary();
}

// ---------------------------------------------------------------- pointer interactions
function onHoverMove(e) {
  const [x, y] = toMM(e);
  if (S.tool === "pen" && S.pen) drawPenPreview(penPoint(e));
  S.ui.pos.textContent = `x: ${round(x, 1)} mm   y: ${round(y, 1)} mm`;
}

function snapValue(v, candidates, thr) {
  let best = null;
  for (const c of candidates) {
    const d = Math.abs(v - c);
    if (d <= thr && (!best || d < best.d)) best = { d, c };
  }
  return best;
}
function snapTargets(excludeIds) {
  const pg = S.doc.page;
  const xs = [0, pg.width, pg.width / 2];
  const ys = [0, pg.height, pg.height / 2];
  if (pg.margin > 0) {
    xs.push(pg.margin, pg.width - pg.margin);
    ys.push(pg.margin, pg.height - pg.margin);
  }
  if (pg.showGuides !== false && pg.guides) {
    xs.push(...pg.guides.v);
    ys.push(...pg.guides.h);
  }
  for (const it of S.doc.items) {
    if (excludeIds.includes(it.id) || it.hidden) continue;
    xs.push(it.x, it.x + it.w, it.x + it.w / 2);
    ys.push(it.y, it.y + it.h, it.y + it.h / 2);
  }
  return { xs, ys };
}
function showGuides(gx, gy) {
  const host = S.ui.guides;
  host.innerHTML = "";
  const Z = S.zoom;
  for (const x of gx) host.appendChild(el("div", { class: `${NS}-guide v`, style: { left: `${x * Z}px` } }));
  for (const y of gy) host.appendChild(el("div", { class: `${NS}-guide h`, style: { top: `${y * Z}px` } }));
}
function snapPoint(x, y, exclude, { edgesX = [0], edgesY = [0] } = {}) {
  const pg = S.doc.page;
  const thr = 6 / S.zoom;
  const gx = [];
  const gy = [];
  let dx = null;
  let dy = null;
  if (pg.snapGuides) {
    const t = snapTargets(exclude);
    for (const off of edgesX) {
      const s = snapValue(x + off, t.xs, thr);
      if (s && (!dx || s.d < dx.d)) dx = { d: s.d, v: s.c - off, g: s.c };
    }
    for (const off of edgesY) {
      const s = snapValue(y + off, t.ys, thr);
      if (s && (!dy || s.d < dy.d)) dy = { d: s.d, v: s.c - off, g: s.c };
    }
  }
  if (dx) {
    x = dx.v;
    gx.push(dx.g);
  } else if (pg.snapGrid && pg.gridSize > 0) x = Math.round(x / pg.gridSize) * pg.gridSize;
  if (dy) {
    y = dy.v;
    gy.push(dy.g);
  } else if (pg.snapGrid && pg.gridSize > 0) y = Math.round(y / pg.gridSize) * pg.gridSize;
  return { x, y, gx, gy };
}

function onPointerDown(e) {
  if (S.inline && !e.target.closest(`.${NS}-inline`)) finishInlineEdit();
  if (e.target.closest(`.${NS}-inline`)) return;
  if (e.button === 2) return;
  closePopover();
  const target = e.target;
  // map content mode: let MapLibre handle events inside the active frame
  if (S.contentMode) {
    const inside = target.closest(`.${NS}-item[data-id="${S.contentMode}"]`);
    if (inside) return;
    exitContentMode();
  }
  if (S.tool === "pan" || e.button === 1 || S.spaceDown) return startPan(e);
  if (S.tool === "content") {
    const mapNode = target.closest(`.${NS}-t-map`);
    if (mapNode) {
      const it = findItem(mapNode.dataset.id);
      if (it?.props.source === "snapshot") toast("Captured frames can't be panned — recapture GeoLibre instead.", "warn");
      else if (it && !S.selection.includes(it.id)) select([it.id]);
    }
    return;
  }
  const ug = target.closest(`.${NS}-uguide`);
  if (ug && S.tool === "select") return startGuideDrag(e, ug.dataset.axis, Number(ug.dataset.i));
  const [mx, my] = toMM(e);
  if (S.tool === "pen") return penDown(e);
  if (S.tool !== "select") return startDraw(e, mx, my);
  if (target.closest(`.${NS}-rothandle`)) return startRotate(e);
  const handle = target.closest(`.${NS}-handle`);
  if (handle) return startResize(e, handle.dataset.handle);
  const node = target.closest(`.${NS}-item`) || target.closest(`.${NS}-selbox`);
  const id = node?.dataset.id;
  const item = id && findItem(id);
  if (item && !item.locked) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const members = groupMembers(id);
      if (S.selection.includes(id)) select(S.selection.filter((x) => !members.includes(x)));
      else select([...S.selection, ...members]);
      return;
    }
    if (!S.selection.includes(id)) select(groupMembers(id));
    return startMove(e, mx, my);
  }
  if (item && item.locked) {
    select([id]);
    return;
  }
  startMarquee(e, mx, my);
}

function capture(e, move, up) {
  const el0 = S.ui.canvas;
  el0.setPointerCapture?.(e.pointerId);
  const onMove = (ev) => move(ev);
  const onUp = (ev) => {
    el0.removeEventListener("pointermove", onMove);
    el0.removeEventListener("pointerup", onUp);
    el0.removeEventListener("pointercancel", onUp);
    el0.releasePointerCapture?.(e.pointerId);
    up(ev);
  };
  el0.addEventListener("pointermove", onMove);
  el0.addEventListener("pointerup", onUp);
  el0.addEventListener("pointercancel", onUp);
}

function startPan(e) {
  const sc = S.ui.scroll;
  const sx = e.clientX;
  const sy = e.clientY;
  const l = sc.scrollLeft;
  const t = sc.scrollTop;
  S.ui.canvas.classList.add("panning");
  capture(
    e,
    (ev) => {
      sc.scrollLeft = l - (ev.clientX - sx);
      sc.scrollTop = t - (ev.clientY - sy);
    },
    () => S.ui.canvas.classList.remove("panning"),
  );
}

function startMove(e, mx, my) {
  const items = selectedItems().filter((i) => !i.locked);
  if (!items.length) return;
  const start = items.map((i) => ({ i, x: i.x, y: i.y }));
  const bb = bboxOf(items);
  let moved = false;
  let snapshot = null;
  const ids = items.map((i) => i.id);
  capture(
    e,
    (ev) => {
      const [x, y] = toMM(ev);
      let dx = x - mx;
      let dy = y - my;
      if (!moved && Math.hypot(dx, dy) * S.zoom < 3) return;
      if (!moved) {
        snapshot = JSON.stringify(S.doc);
        moved = true;
      }
      if (ev.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      let nx = bb.x + dx;
      let ny = bb.y + dy;
      let gx = [];
      let gy = [];
      if (!ev.altKey) {
        const s = snapPoint(nx, ny, ids, { edgesX: [0, bb.w / 2, bb.w], edgesY: [0, bb.h / 2, bb.h] });
        nx = s.x;
        ny = s.y;
        gx = s.gx;
        gy = s.gy;
      }
      for (const st of start) {
        st.i.x = round(st.x + (nx - bb.x), 3);
        st.i.y = round(st.y + (ny - bb.y), 3);
      }
      showGuides(gx, gy);
      renderPaper(ids);
      renderSelection();
      drawRulers();
    },
    () => {
      showGuides([], []);
      if (moved) {
        S.history.push(snapshot);
        S.future = [];
        saveLibrary();
        renderProps();
        scheduleOverlayRefresh();
      }
    },
  );
}

function startResize(e, h) {
  const item = selectedItems()[0];
  if (!item) return;
  const o = { x: item.x, y: item.y, w: item.w, h: item.h };
  const ratio = o.w / o.h;
  const snapshot = JSON.stringify(S.doc);
  let changed = false;
  capture(
    e,
    (ev) => {
      let [x, y] = toMM(ev);
      if (!ev.altKey) {
        const s = snapPoint(x, y, [item.id]);
        x = s.x;
        y = s.y;
        showGuides(s.gx, s.gy);
      }
      let { x: nx, y: ny, w: nw, h: nh } = o;
      if (h.includes("e")) nw = Math.max(1, x - o.x);
      if (h.includes("s")) nh = Math.max(1, y - o.y);
      if (h.includes("w")) {
        nw = Math.max(1, o.x + o.w - x);
        nx = o.x + o.w - nw;
      }
      if (h.includes("n")) {
        nh = Math.max(1, o.y + o.h - y);
        ny = o.y + o.h - nh;
      }
      const keepRatio = ev.shiftKey || item.type === "north" || (item.type === "image" && !ev.ctrlKey && item.props.fit !== "fill" && false);
      if (keepRatio && h.length === 2) {
        if (nw / nh > ratio) nh = nw / ratio;
        else nw = nh * ratio;
        if (h.includes("w")) nx = o.x + o.w - nw;
        if (h.includes("n")) ny = o.y + o.h - nh;
      }
      Object.assign(item, { x: round(nx, 3), y: round(ny, 3), w: round(nw, 3), h: round(nh, 3) });
      changed = true;
      renderPaper([item.id, ...dependentsOf(item.id)]);
      renderSelection();
      drawRulers();
    },
    () => {
      showGuides([], []);
      if (changed) {
        S.history.push(snapshot);
        S.future = [];
        if (item.type === "map" && item.props.scaleLock) item.props.view.zoom = zoomForScale(item.props.scaleLock, item.props.view.center[1]);
        saveLibrary();
        renderAll();
      }
    },
  );
}
function dependentsOf(id) {
  return S.doc.items.filter((i) => i.id !== id && (i.type === "scalebar" || i.type === "north" || i.type === "text" || i.type === "table" || (i.type === "map" && i.props.overview?.source === id))).map((i) => i.id);
}

function startMarquee(e, mx, my) {
  const box = el("div", { class: `${NS}-marquee` });
  S.ui.guides.appendChild(box);
  const Z = S.zoom;
  let x2 = mx;
  let y2 = my;
  capture(
    e,
    (ev) => {
      [x2, y2] = toMM(ev);
      Object.assign(box.style, {
        left: `${Math.min(mx, x2) * Z}px`,
        top: `${Math.min(my, y2) * Z}px`,
        width: `${Math.abs(x2 - mx) * Z}px`,
        height: `${Math.abs(y2 - my) * Z}px`,
      });
    },
    (ev) => {
      box.remove();
      const r = { x1: Math.min(mx, x2), y1: Math.min(my, y2), x2: Math.max(mx, x2), y2: Math.max(my, y2) };
      if (r.x2 - r.x1 < 0.5 && r.y2 - r.y1 < 0.5) {
        if (!ev.shiftKey) select([]);
        S.tab = S.selection.length ? "item" : "page";
        renderProps();
        return;
      }
      const hits = S.doc.items.filter((i) => !i.hidden && !i.locked && i.x < r.x2 && i.x + i.w > r.x1 && i.y < r.y2 && i.y + i.h > r.y1).map((i) => i.id);
      select(ev.shiftKey ? [...new Set([...S.selection, ...hits])] : hits);
    },
  );
}

function startDraw(e, mx, my) {
  const box = el("div", { class: `${NS}-marquee draw` });
  S.ui.guides.appendChild(box);
  const Z = S.zoom;
  const s0 = snapPoint(mx, my, []);
  let x2 = s0.x;
  let y2 = s0.y;
  capture(
    e,
    (ev) => {
      const [x, y] = toMM(ev);
      const s = snapPoint(x, y, []);
      x2 = s.x;
      y2 = s.y;
      showGuides(s.gx, s.gy);
      Object.assign(box.style, {
        left: `${Math.min(s0.x, x2) * Z}px`,
        top: `${Math.min(s0.y, y2) * Z}px`,
        width: `${Math.abs(x2 - s0.x) * Z}px`,
        height: `${Math.abs(y2 - s0.y) * Z}px`,
      });
    },
    () => {
      box.remove();
      showGuides([], []);
      const w = Math.abs(x2 - s0.x);
      const h = Math.abs(y2 - s0.y);
      const rect = w > 2 && h > 2 ? { x: Math.min(s0.x, x2), y: Math.min(s0.y, y2), w, h } : { x: s0.x, y: s0.y };
      addItemFromTool(S.tool, rect, S.toolVariant);
      setTool("select");
    },
  );
}

function addItemFromTool(tool, rect, variant) {
  let item;
  const type = tool === "inset" ? "map" : tool === "title" ? "text" : tool;
  item = newItem(type, rect.x, rect.y);
  if (rect.w) {
    item.w = round(rect.w, 2);
    item.h = round(rect.h, 2);
  }
  if (tool === "title") {
    item.name = "Title";
    item.w = rect.w || 120;
    item.h = rect.h || 14;
    item.props.text = "{title}";
    item.props.font = font({ size: 20, bold: true });
    item.props.align = "center";
    item.props.textCase = "upper";
  }
  if (tool === "north" && variant) item.props.variant = variant;
  if (tool === "shape" && variant) {
    item.props.shape = variant;
    if (variant.startsWith("line")) {
      item.props.strokeWidth = 0.6;
      if (!rect.w) item.h = variant === "line-h" || variant === "arrow-line" ? 4 : item.h;
    }
  }
  if (tool === "scalebar" && variant) item.props.style = variant;
  if (tool === "marker" && variant) item.props.symbol = variant;
  if (type === "map") {
    viewFromGeoLibre(item);
    if (tool === "inset") {
      item.name = `Inset Map ${mapItems().length}`;
      if (!rect.w) {
        item.w = 50;
        item.h = 40;
      }
      item.props.basemap = "positron";
      const main = mapItems()[0];
      if (main) {
        item.props.overview.source = main.id;
        // zoom out so the locator box sits in context
        item.props.view.center = [...main.props.view.center];
        item.props.view.zoom = main.props.view.zoom - 4 + Math.log2(item.w / main.w);
      }
    }
  }
  if (type === "latex") loadMathJax().catch(() => {});
  if (type === "colorbar") {
    const src = colorbarSourceOptions().find(([id]) => id);
    if (src) {
      item.props.source = src[0];
      readColorbarFromLayer(item.props);
    }
  }
  if (type === "legend") {
    item.props.linkedMap = mapItems()[0]?.id || "";
    syncLegendEntries(item);
  }
  if (type === "image" && !rect.w) {
    item.w = 25;
    item.h = 25;
  }
  commit(() => S.doc.items.push(item));
  select([item.id]);
  if (type === "image") pickImage(item);
}

// Topmost layout item under the cursor (event targets are unreliable after pointer capture).
function itemNodeAt(x, y) {
  for (const n of document.elementsFromPoint(x, y)) {
    const node = n.closest?.(`.${NS}-item`);
    if (node && S.ui.items.contains(node)) return node;
  }
  return null;
}
function onDblClick(e) {
  if (S.tool === "pen") {
    // the double-click's second press already added a point
    if (S.pen?.pts.length > 2) S.pen.pts.pop();
    return finishPen(false);
  }
  const node = e.target.closest(`.${NS}-item`) || itemNodeAt(e.clientX, e.clientY);
  const item = node && findItem(node.dataset.id);
  if (!item) return;
  if (item.type === "map") enterContentMode(item.id);
  else if (item.type === "text") {
    select([item.id]);
    startInlineEdit(item);
  } else if (item.type === "table") {
    select([item.id]);
    setTimeout(() => S.ui.props.querySelector("textarea")?.focus(), 30);
  } else if (item.type === "image") pickImage(item);
}

// ---------------------------------------------------------------- keyboard
function onKey(e) {
  if (!S.open) return;
  const t = e.target;
  const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  if (e.key === " " && !typing) {
    if (e.type === "keydown") {
      S.spaceDown = true;
      S.ui.canvas.classList.add("space");
    } else {
      S.spaceDown = false;
      S.ui.canvas.classList.remove("space");
    }
    e.preventDefault();
    return;
  }
  if (e.type !== "keydown") return;
  if (typing) {
    if (e.key === "Escape") t.blur();
    return;
  }
  const ctrl = e.ctrlKey || e.metaKey;
  if (S.tool === "pen" && S.pen) {
    if (e.key === "Enter") finishPen(false);
    else if (e.key === "Escape") {
      S.pen = null;
      drawPenPreview();
      setTool("select");
    } else if (e.key === "Backspace") {
      S.pen.pts.pop();
      drawPenPreview();
    } else return;
    e.preventDefault();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "g") {
    e.preventDefault();
    return e.shiftKey ? ungroupSelection() : groupSelection();
  }
  const k = e.key.toLowerCase();
  if (k === "escape") {
    if (S.contentMode) exitContentMode();
    else if (S.ui.popover) closePopover();
    else if (S.tool !== "select") setTool("select");
    else select([]);
  } else if (ctrl && k === "z" && !e.shiftKey) undo();
  else if (ctrl && (k === "y" || (k === "z" && e.shiftKey))) redo();
  else if (ctrl && k === "d") duplicateSelection();
  else if (ctrl && k === "c") S.clipboard = JSON.stringify(selectedItems());
  else if (ctrl && k === "v") pasteClipboard();
  else if (ctrl && k === "a") select(S.doc.items.filter((i) => !i.hidden && !i.locked).map((i) => i.id));
  else if (ctrl && (k === "=" || k === "+")) setZoom(S.zoom * 1.2);
  else if (ctrl && k === "-") setZoom(S.zoom / 1.2);
  else if (ctrl && k === "0") fitPage();
  else if (e.shiftKey && (k === "2" || k === "@")) zoomToSelection();
  else if (e.shiftKey && (k === "1" || k === "!")) fitPage();
  else if (ctrl && k === "s") exportJSON();
  else if (k === "enter" && selectedItems().length === 1 && selectedItems()[0].type === "text") startInlineEdit(selectedItems()[0]);
  else if (k === "delete" || k === "backspace") deleteSelection();
  else if (k === "v") setTool("select");
  else if (k === "h") setTool("pan");
  else if (k === "c" && !ctrl) setTool("content");
  else if (k.startsWith("arrow")) {
    const items = selectedItems().filter((i) => !i.locked);
    if (!items.length) return;
    const d = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    commit(() => {
      for (const i of items) {
        if (k === "arrowleft") i.x = round(i.x - d, 3);
        if (k === "arrowright") i.x = round(i.x + d, 3);
        if (k === "arrowup") i.y = round(i.y - d, 3);
        if (k === "arrowdown") i.y = round(i.y + d, 3);
      }
    });
  } else return;
  e.preventDefault();
}

// ---------------------------------------------------------------- edit operations
function deleteSelection() {
  const ids = S.selection.filter((id) => !findItem(id)?.locked);
  if (!ids.length) return;
  commit(() => {
    S.doc.items = S.doc.items.filter((i) => !ids.includes(i.id));
    for (const it of S.doc.items) {
      if (ids.includes(it.props.linkedMap)) it.props.linkedMap = "";
      if (it.type === "map" && ids.includes(it.props.overview?.source)) it.props.overview.source = "";
    }
  });
  select([]);
}
function cloneItems(items, offset = 5) {
  const idMap = new Map();
  const out = items.map((i) => {
    const c = clone(i);
    c.id = uid(i.type);
    idMap.set(i.id, c.id);
    c.x += offset;
    c.y += offset;
    c.name = `${i.name} (copy)`;
    return c;
  });
  for (const c of out) {
    if (idMap.has(c.props.linkedMap)) c.props.linkedMap = idMap.get(c.props.linkedMap);
    if (c.type === "map" && idMap.has(c.props.overview?.source)) c.props.overview.source = idMap.get(c.props.overview.source);
  }
  return out;
}
function duplicateSelection() {
  const items = selectedItems();
  if (!items.length) return;
  const copies = cloneItems(items);
  commit(() => S.doc.items.push(...copies));
  select(copies.map((c) => c.id));
}
function pasteClipboard() {
  if (!S.clipboard) return;
  const items = JSON.parse(S.clipboard);
  if (!items.length) return;
  const copies = cloneItems(items);
  commit(() => S.doc.items.push(...copies));
  select(copies.map((c) => c.id));
}
function arrange(dir) {
  const ids = S.selection;
  if (!ids.length) return;
  commit(() => {
    const items = S.doc.items;
    if (dir === "top" || dir === "bottom") {
      const sel = items.filter((i) => ids.includes(i.id));
      const rest = items.filter((i) => !ids.includes(i.id));
      S.doc.items = dir === "top" ? [...rest, ...sel] : [...sel, ...rest];
    } else if (dir === "up") {
      for (let i = items.length - 2; i >= 0; i--) if (ids.includes(items[i].id) && !ids.includes(items[i + 1].id)) [items[i], items[i + 1]] = [items[i + 1], items[i]];
    } else {
      for (let i = 1; i < items.length; i++) if (ids.includes(items[i].id) && !ids.includes(items[i - 1].id)) [items[i], items[i - 1]] = [items[i - 1], items[i]];
    }
  });
}
function align(mode) {
  const items = selectedItems().filter((i) => !i.locked);
  if (!items.length) return;
  const pg = S.doc.page;
  const ref = items.length === 1 ? { x: 0, y: 0, w: pg.width, h: pg.height } : bboxOf(items);
  commit(() => {
    if (mode === "distH" || mode === "distV") {
      if (items.length < 3) return;
      const horiz = mode === "distH";
      const sorted = [...items].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y));
      const total = sorted.reduce((s, i) => s + (horiz ? i.w : i.h), 0);
      const span = horiz ? ref.w : ref.h;
      const gap = (span - total) / (sorted.length - 1);
      let pos = horiz ? ref.x : ref.y;
      for (const i of sorted) {
        if (horiz) i.x = round(pos, 3);
        else i.y = round(pos, 3);
        pos += (horiz ? i.w : i.h) + gap;
      }
      return;
    }
    const first = items[0];
    for (const i of items) {
      if (mode === "left") i.x = ref.x;
      if (mode === "right") i.x = round(ref.x + ref.w - i.w, 3);
      if (mode === "hcenter") i.x = round(ref.x + (ref.w - i.w) / 2, 3);
      if (mode === "top") i.y = ref.y;
      if (mode === "bottom") i.y = round(ref.y + ref.h - i.h, 3);
      if (mode === "vcenter") i.y = round(ref.y + (ref.h - i.h) / 2, 3);
      if (mode === "sameW") i.w = first.w;
      if (mode === "sameH") i.h = first.h;
    }
  });
}

function pickImage(item) {
  const input = el("input", { type: "file", accept: "image/*" });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        commit(() => {
          item.props.src = reader.result;
          // keep the logo's aspect ratio
          const ar = img.naturalWidth / img.naturalHeight;
          if (ar > 0) item.h = round(item.w / ar, 2);
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

// ---------------------------------------------------------------- layouts (manager)
function switchLayout(id) {
  if (!S.library.layouts[id]) return;
  exitContentMode();
  destroyAllLiveMaps();
  for (const n of S.ui.itemEls.values()) n.remove();
  S.ui.itemEls.clear();
  S.doc = S.library.layouts[id];
  S.library.active = id;
  S.selection = [];
  S.history = [];
  S.future = [];
  saveLibrary();
  renderAll();
  fitPage();
}
function newLayout(doc) {
  const d = doc || newDoc(`Layout ${Object.keys(S.library.layouts).length + 1}`);
  S.library.layouts[d.id] = d;
  switchLayout(d.id);
}
function duplicateLayout() {
  const d = clone(S.doc);
  d.id = uid("lay");
  d.name = `${S.doc.name} (copy)`;
  newLayout(d);
}
function renameLayout() {
  const name = prompt("Layout name:", S.doc.name);
  if (!name) return;
  S.doc.name = name.trim();
  saveLibrary();
  renderLayoutSelect();
}
function deleteLayout() {
  const ids = Object.keys(S.library.layouts);
  if (!confirm(`Delete layout "${S.doc.name}"? This cannot be undone.`)) return;
  delete S.library.layouts[S.doc.id];
  if (ids.length <= 1) {
    const d = newDoc();
    S.library.layouts[d.id] = d;
  }
  switchLayout(Object.keys(S.library.layouts)[0]);
}
function exportJSON() {
  const blob = new Blob([JSON.stringify({ format: "geolibre-layout", version: 1, layout: S.doc }, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${safeName(S.doc.name)}.layout.json`);
  toast("Layout saved to a .json file");
}
function importJSON() {
  const input = el("input", { type: "file", accept: ".json,application/json" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const doc = data.layout || data;
      if (!doc.page || !Array.isArray(doc.items)) throw new Error("Not a layout file");
      doc.id = uid("lay");
      newLayout(doc);
      toast(`Layout "${doc.name}" loaded`);
    } catch (e) {
      toast(`Could not open: ${e.message}`, "warn");
    }
  });
  input.click();
}
// ---------------------------------------------------------------- guides, context menu, groups, pen, rotation, templates

// ---- zoom readout + slider
function updateZoomUI() {
  const pct = Math.round((S.zoom / PX96) * 100);
  if (S.ui.zoomLbl) S.ui.zoomLbl.textContent = `${pct}%`;
  if (S.ui.zoomSlider && document.activeElement !== S.ui.zoomSlider) S.ui.zoomSlider.value = String(Math.round(Math.log2(pct / 100) * 100));
}
function buildZoomSlider() {
  // logarithmic slider: −300 … +300 → 12.5 % … 800 %
  const r = el("input", { type: "range", class: `${NS}-zoomslider`, min: -300, max: 300, step: 5, title: "Canvas zoom" });
  r.addEventListener("input", () => setZoom(PX96 * 2 ** (Number(r.value) / 100)));
  S.ui.zoomSlider = r;
  return r;
}

// ---- view toggles in the status bar (grid / guides / snapping)
function viewToggle(kind, label) {
  const b = el("button", { type: "button", class: `${NS}-vtog`, "data-kind": kind, title: `Show / hide ${label.toLowerCase()}` }, label);
  b.addEventListener("click", () => {
    const pg = S.doc.page;
    if (kind === "grid") pg.showGrid = !pg.showGrid;
    if (kind === "guides") pg.showGuides = pg.showGuides === false;
    if (kind === "snap") pg.snapGrid = pg.snapGuides = !(pg.snapGrid || pg.snapGuides);
    saveLibrary();
    renderPageDecor();
    renderGuides();
    updateViewToggles();
    if (S.tab === "page") renderProps();
  });
  return b;
}
function updateViewToggles() {
  const pg = S.doc?.page;
  if (!pg || !S.ui.root) return;
  for (const b of S.ui.root.querySelectorAll(`.${NS}-vtog`)) {
    const k = b.dataset.kind;
    b.classList.toggle("active", k === "grid" ? !!pg.showGrid : k === "guides" ? pg.showGuides !== false : !!(pg.snapGrid || pg.snapGuides));
  }
}

// ---- ruler guides (drag out of a ruler, drag back to remove)
function pageGuides() {
  const pg = S.doc.page;
  if (!pg.guides) pg.guides = { v: [], h: [] };
  return pg.guides;
}
function renderGuides() {
  const host = S.ui.uguides;
  if (!host) return;
  updateViewToggles();
  host.innerHTML = "";
  if (S.doc.page.showGuides === false) return;
  const g = pageGuides();
  const Z = S.zoom;
  g.v.forEach((x, i) => host.appendChild(el("div", { class: `${NS}-uguide v`, "data-axis": "v", "data-i": i, style: { left: `${x * Z}px` }, title: `${round(x, 1)} mm — drag back to the ruler to remove` })));
  g.h.forEach((y, i) => host.appendChild(el("div", { class: `${NS}-uguide h`, "data-axis": "h", "data-i": i, style: { top: `${y * Z}px` }, title: `${round(y, 1)} mm — drag back to the ruler to remove` })));
}
function startGuideDrag(e, axis, index) {
  const g = pageGuides();
  pushHistory();
  if (index == null) {
    g[axis].push(0);
    index = g[axis].length - 1;
  }
  S.doc.page.showGuides = true;
  const target = e.currentTarget || S.ui.canvas;
  target.setPointerCapture?.(e.pointerId);
  const move = (ev) => {
    const [x, y] = toMM(ev);
    let v = axis === "v" ? x : y;
    if (S.doc.page.snapGrid && S.doc.page.gridSize > 0 && !ev.altKey) v = Math.round(v / (S.doc.page.gridSize / 2)) * (S.doc.page.gridSize / 2);
    g[axis][index] = round(v, 2);
    renderGuides();
    S.ui.pos.textContent = `${axis === "v" ? "x" : "y"} ${round(v, 1)} mm`;
  };
  const up = (ev) => {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.releasePointerCapture?.(ev.pointerId);
    // dropped back onto a ruler (or far outside the page) → remove
    const r = S.ui.scroll.getBoundingClientRect();
    const [x, y] = toMM(ev);
    const pg = S.doc.page;
    const offRuler = axis === "v" ? ev.clientX < r.left : ev.clientY < r.top;
    const offPage = axis === "v" ? x < -20 || x > pg.width + 20 : y < -20 || y > pg.height + 20;
    if (offRuler || offPage) g[axis].splice(index, 1);
    saveLibrary();
    renderGuides();
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  move(e);
}
function bindRulerGuides() {
  S.ui.rTop.addEventListener("pointerdown", (e) => startGuideDrag(e, "h"));
  S.ui.rLeft.addEventListener("pointerdown", (e) => startGuideDrag(e, "v"));
  S.ui.rTop.title = "Drag down to add a horizontal guide";
  S.ui.rLeft.title = "Drag right to add a vertical guide";
}

// ---- groups
function groupMembers(id) {
  const it = findItem(id);
  if (!it?.group) return [id];
  return S.doc.items.filter((i) => i.group === it.group).map((i) => i.id);
}
function groupSelection() {
  const items = selectedItems();
  if (items.length < 2) return toast("Select two or more items to group them", "warn");
  const gid = uid("grp");
  commit(() => items.forEach((i) => (i.group = gid)));
  toast(`Grouped ${items.length} items`);
}
function ungroupSelection() {
  const items = selectedItems().filter((i) => i.group);
  if (!items.length) return;
  commit(() => items.forEach((i) => delete i.group));
  toast("Ungrouped");
}

// ---- context menu
function menuItem(label, onClick, { kbd, iconName, disabled, danger } = {}) {
  const b = el("button", { type: "button", class: `${NS}-menuitem ${danger ? "danger" : ""}`, disabled: !!disabled, html: `${iconName ? icon(iconName, 15) : `<span class="${NS}-mi-sp"></span>`}<span>${esc(label)}</span>${kbd ? `<kbd>${esc(kbd)}</kbd>` : ""}` });
  b.addEventListener("click", () => {
    closePopover();
    onClick();
  });
  return b;
}
function openContextMenu(e) {
  e.preventDefault();
  if (S.tool === "pen") return finishPen(false);
  const node = itemNodeAt(e.clientX, e.clientY);
  const id = node?.dataset.id;
  if (id && !S.selection.includes(id)) select(groupMembers(id));
  const items = selectedItems();
  const anchor = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }), closest: () => null, contains: () => false };
  const m = el("div", { class: `${NS}-menu ${NS}-ctx` });
  if (items.length) {
    const one = items.length === 1 ? items[0] : null;
    const allLocked = items.every((i) => i.locked);
    m.append(
      one ? menuItem("Rename…", () => {
        const n = prompt("Item name:", one.name);
        if (n && n.trim()) commit(() => (one.name = n.trim()));
      }, { iconName: "rename" }) : null,
      menuItem("Copy", () => (S.clipboard = JSON.stringify(selectedItems())), { kbd: "Ctrl+C", iconName: "copy" }),
      menuItem("Duplicate", duplicateSelection, { kbd: "Ctrl+D", iconName: "copy" }),
      menuItem("Paste", pasteClipboard, { kbd: "Ctrl+V", disabled: !S.clipboard }),
      el("div", { class: `${NS}-msep` }),
      menuItem("Bring to front", () => arrange("top"), { iconName: "top" }),
      menuItem("Send to back", () => arrange("bottom"), { iconName: "bottom" }),
      el("div", { class: `${NS}-msep` }),
      items.length > 1 ? menuItem("Group", groupSelection, { kbd: "Ctrl+G" }) : null,
      items.some((i) => i.group) ? menuItem("Ungroup", ungroupSelection, { kbd: "Ctrl+Shift+G" }) : null,
      menuItem(allLocked ? "Unlock" : "Lock", () => commit(() => items.forEach((i) => (i.locked = !allLocked))), { iconName: allLocked ? "unlock" : "lock" }),
      menuItem("Hide", () => commit(() => items.forEach((i) => (i.hidden = true))), { iconName: "eyeoff" }),
      one?.type === "map" ? menuItem("Pan map content", () => enterContentMode(one.id), { iconName: "pan" }) : null,
      one?.type === "map" ? menuItem("Match GeoLibre view", () => commit(() => viewFromGeoLibre(one))) : null,
      el("div", { class: `${NS}-msep` }),
      menuItem("Delete", deleteSelection, { kbd: "Del", iconName: "trash", danger: true }),
    );
  } else {
    m.append(
      menuItem("Paste", pasteClipboard, { kbd: "Ctrl+V", disabled: !S.clipboard }),
      menuItem("Select all", () => select(S.doc.items.filter((i) => !i.hidden && !i.locked).map((i) => i.id)), { kbd: "Ctrl+A" }),
      el("div", { class: `${NS}-msep` }),
      menuItem(S.doc.page.showGuides === false ? "Show guides" : "Hide guides", () => {
        S.doc.page.showGuides = S.doc.page.showGuides === false;
        renderGuides();
        saveLibrary();
      }),
      menuItem("Clear guides", () => commit(() => (S.doc.page.guides = { v: [], h: [] }))),
      menuItem("Page settings", () => setTab("page")),
    );
  }
  for (const c of [...m.children]) if (!c) c.remove();
  popoverAt(anchor, m, `${NS}-ctxpop`);
  const pop = S.ui.popover;
  const rr = S.ui.root.getBoundingClientRect();
  pop.style.left = `${Math.min(e.clientX - rr.left, rr.width - pop.offsetWidth - 6)}px`;
  pop.style.top = `${Math.min(e.clientY - rr.top, rr.height - pop.offsetHeight - 6)}px`;
}

// ---- rotation handle
function startRotate(e) {
  const item = selectedItems()[0];
  if (!item) return;
  const box = S.ui.sel.querySelector(`.${NS}-selbox`);
  const r = box.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
  const rot0 = item.rot || 0;
  const snapshot = JSON.stringify(S.doc);
  let changed = false;
  capture(
    e,
    (ev) => {
      let deg = rot0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
      deg = ((deg + 540) % 360) - 180;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      item.rot = round(deg, 1);
      changed = true;
      renderPaper([item.id]);
      renderSelection();
      S.ui.pos.textContent = `rotation ${item.rot}°`;
    },
    () => {
      if (!changed) return;
      S.history.push(snapshot);
      S.future = [];
      saveLibrary();
      renderProps();
    },
  );
}

// ---- user templates (saved layouts to start new ones from)
const TPL_KEY = "glc:templates:v1";
function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TPL_KEY) || "{}");
  } catch {
    return {};
  }
}
function storeTemplates(t) {
  try {
    localStorage.setItem(TPL_KEY, JSON.stringify(t));
    return true;
  } catch {
    toast("Could not store the template — remove large images or save it as a file instead.", "warn");
    return false;
  }
}
function saveAsTemplate() {
  const name = prompt("Template name:", S.doc.name);
  if (!name) return;
  const t = loadTemplates();
  const tpl = clone(S.doc);
  tpl.name = name.trim();
  const id = uid("tpl");
  t[id] = { id, name: tpl.name, saved: Date.now(), page: `${tpl.page.size} ${tpl.page.orientation}`, doc: tpl };
  if (storeTemplates(t)) toast(`Saved template “${tpl.name}”`);
}
function layoutFromTemplate(id) {
  const t = loadTemplates()[id];
  if (!t) return;
  const doc = clone(t.doc);
  doc.id = uid("lay");
  doc.name = t.name;
  newLayout(doc);
  // frame the template's maps on what GeoLibre shows now
  const maps = doc.items.filter((i) => i.type === "map" && i.props.source !== "snapshot");
  const main = maps.find((m) => !m.props.overview?.source) || maps[0];
  for (const m of maps) {
    if (m === main || !m.props.overview?.source) viewFromGeoLibre(m);
    else if (main) {
      m.props.view.center = [...main.props.view.center];
      m.props.view.zoom = main.props.view.zoom - 3.5 + Math.log2(m.w / main.w);
    }
  }
  for (const l of doc.items.filter((i) => i.type === "legend" && i.props.autoSync)) syncLegendEntries(l);
  saveLibrary();
  renderAll();
  toast(`New layout from template “${t.name}”`);
}
function deleteTemplate(id) {
  const t = loadTemplates();
  if (!t[id] || !confirm(`Delete template “${t[id].name}”?`)) return;
  delete t[id];
  storeTemplates(t);
}
function exportTemplateFile(id) {
  const t = loadTemplates()[id];
  if (!t) return;
  downloadBlob(new Blob([JSON.stringify({ format: "geolibre-layout-template", version: 1, name: t.name, layout: t.doc }, null, 2)], { type: "application/json" }), `${safeName(t.name)}.layout-template.json`);
}
function importTemplateFile() {
  const input = el("input", { type: "file", accept: ".json,application/json" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const doc = data.layout || data;
      if (!doc.page || !Array.isArray(doc.items)) throw new Error("Not a layout file");
      const t = loadTemplates();
      const id = uid("tpl");
      t[id] = { id, name: data.name || doc.name || "Imported template", saved: Date.now(), page: `${doc.page.size} ${doc.page.orientation}`, doc };
      if (storeTemplates(t)) toast(`Template “${t[id].name}” imported`);
    } catch (e) {
      toast(`Could not import: ${e.message}`, "warn");
    }
  });
  input.click();
}
function openNewMenu(anchor) {
  const m = el("div", { class: `${NS}-menu ${NS}-newmenu` });
  m.append(menuItem("Blank layout", () => newLayout(), { iconName: "plus" }));
  m.append(menuItem("Duplicate this layout", duplicateLayout, { iconName: "copy" }));
  const list = Object.values(loadTemplates()).sort((a, b) => b.saved - a.saved);
  m.append(el("div", { class: `${NS}-msep` }), el("div", { class: `${NS}-mhead` }, "My templates"));
  if (!list.length) m.append(el("div", { class: `${NS}-mnote` }, "No templates yet. Design a layout, then use “Save as template”."));
  for (const t of list) {
    const row = el("div", { class: `${NS}-tplrow` });
    const open = el("button", { type: "button", class: `${NS}-menuitem`, html: `${icon("layout", 15)}<span>${esc(t.name)}</span><small>${esc(t.page || "")}</small>` });
    open.addEventListener("click", () => {
      closePopover();
      layoutFromTemplate(t.id);
    });
    row.append(
      open,
      iconBtn("download", "Save template file", () => exportTemplateFile(t.id)),
      iconBtn("trash", "Delete template", () => {
        deleteTemplate(t.id);
        openNewMenu(anchor);
      }),
    );
    m.append(row);
  }
  m.append(
    el("div", { class: `${NS}-msep` }),
    menuItem("Save this layout as template…", saveAsTemplate, { iconName: "save" }),
    menuItem("Import template file…", importTemplateFile, { iconName: "open" }),
  );
  popoverAt(anchor, m);
}

// ---- zoom a map frame to a layer
function layerBounds(id) {
  try {
    const feats = S.app?.getLayerFeatures?.(id) || [];
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    const walk = (c) => {
      if (typeof c[0] === "number") {
        w = Math.min(w, c[0]);
        e = Math.max(e, c[0]);
        s = Math.min(s, c[1]);
        n = Math.max(n, c[1]);
      } else c.forEach(walk);
    };
    for (const f of feats) {
      const g = f.geometry;
      if (!g) continue;
      if (g.type === "GeometryCollection") g.geometries.forEach((x) => x.coordinates && walk(x.coordinates));
      else if (g.coordinates) walk(g.coordinates);
    }
    return Number.isFinite(w) ? { west: w, south: s, east: e, north: n } : null;
  } catch {
    return null;
  }
}
function zoomMapToLayer(item, layerId) {
  const b = layerBounds(layerId);
  if (!b) return toast("That layer has no readable features (rasters and tile layers can't be measured).", "warn");
  const padW = (b.east - b.west) * 0.06 || 0.01;
  const padH = (b.north - b.south) * 0.06 || 0.01;
  const bb = { west: b.west - padW, east: b.east + padW, south: b.south - padH, north: b.north + padH };
  commit(() => {
    item.props.view.center = [(bb.west + bb.east) / 2, (bb.south + bb.north) / 2];
    item.props.view.bearing = 0;
    item.props.view.zoom = zoomForBounds(bb, item.w, item.h);
    if (item.props.scaleLock) item.props.scaleLock = mapScale(item);
  });
}

// ---- installed (local) fonts
const LOCAL_FONT_KEY = "glc:local-fonts";
const COMMON_FONTS = [
  "Arial", "Arial Narrow", "Bahnschrift", "Calibri", "Cambria", "Cambria Math", "Candara", "Century Gothic", "Consolas", "Constantia", "Corbel",
  "Courier New", "Franklin Gothic Medium", "Gabriola", "Garamond", "Georgia", "Gill Sans MT", "Impact", "Lucida Console", "Lucida Sans Unicode",
  "Palatino Linotype", "Segoe Print", "Segoe Script", "Segoe UI", "Segoe UI Semibold", "Sitka Text", "Sylfaen", "Tahoma", "Times New Roman",
  "Trebuchet MS", "Verdana", "Book Antiqua", "Bookman Old Style", "Century Schoolbook", "Rockwell", "Tw Cen MT", "Myriad Pro", "Minion Pro",
  "Helvetica", "Helvetica Neue", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Source Sans Pro", "Noto Sans", "Noto Serif",
  "DejaVu Sans", "Liberation Sans", "Liberation Serif", "Ubuntu",
];
function fontInstalled(name) {
  const ctx = measureCtx();
  const sample = "mmmmmmmmmmlliWWQ@#";
  return ["monospace", "serif", "sans-serif"].some((base) => {
    ctx.font = `72px ${base}`;
    const w0 = ctx.measureText(sample).width;
    ctx.font = `72px "${name}", ${base}`;
    return ctx.measureText(sample).width !== w0;
  });
}
function knownFonts() {
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_FONT_KEY) || "[]");
  } catch {}
  return [...new Set([...FONTS, ...local])].sort((a, b) => a.localeCompare(b));
}
async function loadInstalledFonts() {
  let families = [];
  if (typeof window.queryLocalFonts === "function") {
    try {
      const fonts = await window.queryLocalFonts();
      families = [...new Set(fonts.map((f) => f.family))];
    } catch (e) {
      console.warn("[Layout Composer] queryLocalFonts", e);
    }
  }
  if (!families.length) families = COMMON_FONTS.filter(fontInstalled);
  try {
    localStorage.setItem(LOCAL_FONT_KEY, JSON.stringify(families));
  } catch {}
  toast(`${families.length} installed fonts available`);
  renderProps();
}

// ---- collapsible docks (left: items, right: properties)
const DOCK_KEY = "glc:docks";
function applyDocks() {
  let d = {};
  try {
    d = JSON.parse(localStorage.getItem(DOCK_KEY) || "{}");
  } catch {}
  if (d.left == null) d.left = window.innerWidth >= 1100;
  if (d.right == null) d.right = window.innerWidth >= 900;
  S.ui.root.classList.toggle("hide-left", !d.left);
  S.ui.root.classList.toggle("hide-right", !d.right);
  for (const b of S.ui.root.querySelectorAll(`.${NS}-docktog`)) {
    const side = b.title.includes("Items") ? "left" : "right";
    b.classList.toggle("on", !!d[side]);
  }
  return d;
}
function toggleDock(side) {
  const d = applyDocks();
  d[side] = !d[side];
  try {
    localStorage.setItem(DOCK_KEY, JSON.stringify(d));
  } catch {}
  applyDocks();
  requestAnimationFrame(() => {
    drawRulers();
    fitPage();
  });
}
// ---------------------------------------------------------------- draw tools
// Polyline / polygon: click points. Bézier pen: click for a corner, drag for a
// smooth node. Freehand: drag. Shared keys: Shift = 45° steps, Enter or
// double-click = finish, click the first point = close, Backspace = undo point,
// Esc = cancel.
const DRAW_MODES = [
  { id: "polyline", name: "Polyline", icon: "M3 18L9 8l5 7 7-11", hint: "Click to add points · double-click or Enter to finish" },
  { id: "polygon", name: "Polygon", icon: "M5 19L3 9l8-6 9 5-3 11z", hint: "Click to add corners · click the first point or press Enter to close" },
  { id: "bezier", name: "Bézier pen", icon: "M3 19C6 6 18 18 21 5M3 19h.01M21 5h.01M9 9l-3 6M15 15l3-6", hint: "Click for a corner, click-drag for a curve · Enter to finish, click the first point to close" },
  { id: "freehand", name: "Freehand", icon: "M3 17c3-6 5 2 8-3s4-7 7-3 2 6 3 4", hint: "Drag to draw · release to finish" },
  { id: "arrowline", name: "Arrow line", icon: "M4 19L19 4M19 4h-7M19 4v7", hint: "Click points · the line ends with an arrow" },
];

function drawThumb(m) {
  return `<svg width="40" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${m.icon}"/></svg>`;
}
function drawMode() {
  return S.toolVariant || "polyline";
}

function penPoint(e) {
  const [x, y] = toMM(e);
  const s = e.altKey ? { x, y } : snapPoint(x, y, []);
  let px = s.x;
  let py = s.y;
  const last = S.pen?.pts[S.pen.pts.length - 1];
  if (last && e.shiftKey) {
    const a = Math.round(Math.atan2(py - last[1], px - last[0]) / (Math.PI / 4)) * (Math.PI / 4);
    const d = Math.hypot(px - last[0], py - last[1]);
    px = last[0] + d * Math.cos(a);
    py = last[1] + d * Math.sin(a);
  }
  return [round(px, 2), round(py, 2)];
}

function penDown(e) {
  const mode = drawMode();
  if (mode === "freehand") return startFreehand(e);
  if (!S.pen) S.pen = { pts: [], handles: [] };
  const pt = penPoint(e);
  const first = S.pen.pts[0];
  if (first && S.pen.pts.length >= 3 && Math.hypot(pt[0] - first[0], pt[1] - first[1]) * S.zoom < 9) return finishPen(true);
  const last = S.pen.pts[S.pen.pts.length - 1];
  if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 0.05) return;
  S.pen.pts.push(pt);
  S.pen.handles.push(null);
  drawPenPreview(pt);
  if (mode === "bezier") {
    // drag out a symmetric handle for a smooth node
    const idx = S.pen.pts.length - 1;
    capture(
      e,
      (ev) => {
        const [x, y] = toMM(ev);
        const h = [x - pt[0], y - pt[1]];
        S.pen.handles[idx] = Math.hypot(h[0], h[1]) * S.zoom > 3 ? [round(h[0], 3), round(h[1], 3)] : null;
        drawPenPreview();
      },
      () => drawPenPreview(),
    );
  }
}

function startFreehand(e) {
  S.pen = { pts: [penPoint(e)], handles: [] };
  capture(
    e,
    (ev) => {
      const [x, y] = toMM(ev);
      const last = S.pen.pts[S.pen.pts.length - 1];
      if (Math.hypot(x - last[0], y - last[1]) * S.zoom > 2.5) S.pen.pts.push([round(x, 2), round(y, 2)]);
      drawPenPreview();
    },
    () => {
      const pts = simplifyPath(S.pen.pts, 0.35 / Math.max(S.zoom / PX96, 0.4));
      S.pen.pts = pts;
      S.pen.handles = pts.map(() => null);
      S.pen.smooth = true;
      finishPen(false);
    },
  );
}

// Ramer–Douglas–Peucker
function simplifyPath(pts, tol) {
  if (pts.length < 3) return pts;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l, 0, 1);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  let max = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplifyPath(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplifyPath(pts.slice(idx), tol)];
}

// Path data for points + optional symmetric handles (out-handle offset per node).
function bezierD(pts, handles, closed) {
  const P = (q) => `${round(q[0], 3)},${round(q[1], 3)}`;
  const n = pts.length;
  let d = `M${P(pts[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ha = handles?.[i];
    const hb = handles?.[(i + 1) % n];
    if (!ha && !hb) d += `L${P(b)}`;
    else {
      const c1 = ha ? [a[0] + ha[0], a[1] + ha[1]] : a;
      const c2 = hb ? [b[0] - hb[0], b[1] - hb[1]] : b;
      d += `C${P(c1)} ${P(c2)} ${P(b)}`;
    }
  }
  return d + (closed ? "Z" : "");
}

function drawPenPreview(cursor) {
  let svgHost = S.ui.guides.querySelector(`.${NS}-penprev`);
  if (!S.pen) {
    svgHost?.remove();
    return;
  }
  if (!svgHost) {
    svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgHost.setAttribute("class", `${NS}-penprev`);
    S.ui.guides.appendChild(svgHost);
  }
  const pg = S.doc.page;
  const Z = S.zoom;
  svgHost.setAttribute("width", pg.width * Z);
  svgHost.setAttribute("height", pg.height * Z);
  svgHost.setAttribute("viewBox", `0 0 ${pg.width} ${pg.height}`);
  const pts = cursor ? [...S.pen.pts, cursor] : S.pen.pts;
  const hs = cursor ? [...S.pen.handles, null] : S.pen.handles;
  const sw = 1.5 / Z;
  let html = pts.length > 1 ? `<path d="${S.pen.smooth ? pathD(pts, false, true) : bezierD(pts, hs, false)}" fill="none" stroke="#0d99ff" stroke-width="${sw}"/>` : "";
  S.pen.handles.forEach((h, i) => {
    if (!h) return;
    const p = S.pen.pts[i];
    html += `<line x1="${p[0] - h[0]}" y1="${p[1] - h[1]}" x2="${p[0] + h[0]}" y2="${p[1] + h[1]}" stroke="#0d99ff" stroke-width="${sw * 0.7}"/>`;
    html += `<circle cx="${p[0] + h[0]}" cy="${p[1] + h[1]}" r="${2.5 / Z}" fill="#0d99ff"/><circle cx="${p[0] - h[0]}" cy="${p[1] - h[1]}" r="${2.5 / Z}" fill="#0d99ff"/>`;
  });
  if (drawMode() !== "freehand") {
    S.pen.pts.forEach(([x, y], i) => {
      html += `<rect x="${x - 3 / Z}" y="${y - 3 / Z}" width="${6 / Z}" height="${6 / Z}" fill="${i === 0 ? "#0d99ff" : "#fff"}" stroke="#0d99ff" stroke-width="${sw * 0.8}"/>`;
    });
  }
  svgHost.innerHTML = html;
}

function finishPen(closed) {
  const mode = drawMode();
  const pts = S.pen?.pts || [];
  const handles = S.pen?.handles || [];
  const smooth = !!S.pen?.smooth;
  S.pen = null;
  drawPenPreview();
  if (pts.length < 2) {
    setTool("select");
    return;
  }
  if (mode === "polygon" && pts.length >= 3) closed = true;
  // bounds include Bézier handles so curves stay inside the box
  const all = [...pts];
  handles.forEach((h, i) => h && all.push([pts[i][0] + h[0], pts[i][1] + h[1]], [pts[i][0] - h[0], pts[i][1] - h[1]]));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(0.5, Math.max(...xs) - x0);
  const h = Math.max(0.5, Math.max(...ys) - y0);
  const item = newItem("path", x0, y0);
  item.w = round(w, 3);
  item.h = round(h, 3);
  item.props.points = pts.map(([x, y]) => [round((x - x0) / w, 5), round((y - y0) / h, 5)]);
  if (handles.some(Boolean)) item.props.handles = handles.map((hh) => (hh ? [round(hh[0] / w, 5), round(hh[1] / h, 5)] : null));
  item.props.closed = closed;
  item.props.smooth = smooth;
  if (closed) item.props.fill = "#93c5fd";
  if (mode === "arrowline") item.props.arrowEnd = true;
  const count = S.doc.items.filter((i) => i.type === "path").length + 1;
  item.name = `${closed ? "Polygon" : mode === "freehand" ? "Freehand" : mode === "bezier" ? "Curve" : "Line"} ${count}`;
  commit(() => S.doc.items.push(item));
  setTool("select");
  select([item.id]);
}

// path renderer with Bézier handles
const basePathRenderer = RENDERERS.path;
RENDERERS.path = function pathWithHandles(item, ctx) {
  const p = item.props;
  if (!p.handles || !p.handles.some(Boolean)) return basePathRenderer(item, ctx);
  const pts = p.points.map(([u, v]) => [u * item.w, v * item.h]);
  const hs = p.handles.map((h) => (h ? [h[0] * item.w, h[1] * item.h] : null));
  const sw = Math.max(0.05, p.strokeWidth || 0);
  const paint = p.closed ? fillPaint(item, p) : { defs: "", attr: `fill="none"` };
  let out = paint.defs ? `<defs>${paint.defs}</defs>` : "";
  const stroke = p.strokeWidth > 0 ? strokeAttrs(p.stroke, sw, p.strokeStyle) : `stroke="none"`;
  out += `<path d="${bezierD(pts, hs, p.closed)}" ${paint.attr} ${stroke} stroke-linejoin="round" stroke-linecap="round"/>`;
  if (!p.closed) {
    const size = Math.max(sw * 4, 1.6);
    const n = pts.length;
    const endFrom = hs[n - 1] ? [pts[n - 1][0] - hs[n - 1][0], pts[n - 1][1] - hs[n - 1][1]] : pts[n - 2];
    const startFrom = hs[0] ? [pts[0][0] + hs[0][0], pts[0][1] + hs[0][1]] : pts[1];
    if (p.arrowEnd) out += arrowHead(pts[n - 1], endFrom, size, p.stroke);
    if (p.arrowStart) out += arrowHead(pts[0], startFrom, size, p.stroke);
  }
  return out;
};
// ---------------------------------------------------------------- Canva-style ease of use
// One click adds an item at the centre of the view; double-click edits text in
// place; ready-made text presets.

// Centre of what is visible on the canvas, in page mm.
function viewCenterMM() {
  const sc = S.ui.scroll;
  const x = (sc.scrollLeft + sc.clientWidth / 2 - CANVAS_PAD) / S.zoom;
  const y = (sc.scrollTop + sc.clientHeight / 2 - CANVAS_PAD) / S.zoom;
  const pg = S.doc.page;
  return [clamp(x, 0, pg.width), clamp(y, 0, pg.height)];
}

// Add an item of `tool` (rail / menu ids) centred in the view, then select it.
function addAtCenter(tool, variant, after) {
  const type = { inset: "map", title: "text", heading: "text", subheading: "text", body: "text", caption: "text", maplabel: "text", callout: "text" }[tool] || tool;
  const def = ITEM_TYPES[type];
  if (!def) return;
  const [cx, cy] = viewCenterMM();
  const pg = S.doc.page;
  // size relative to the page so items are usable on A4 and on large sheets alike
  const k = clamp(Math.min(pg.width, pg.height) / 210, 0.6, 3);
  let [w, h] = def.size.map((v) => round(v * k, 1));
  if (type === "map" && tool === "map") [w, h] = [round(pg.width * 0.6, 1), round(pg.height * 0.6, 1)];
  w = Math.min(w, pg.width);
  h = Math.min(h, pg.height);
  const fx = (v, size, max) => round(clamp(v - size / 2, 0, Math.max(0, max - size)), 1);
  addItemFromTool(TEXT_PRESETS[tool] ? "text" : tool, { x: fx(cx, w, pg.width), y: fx(cy, h, pg.height), w, h }, variant);
  const item = S.doc.items.at(-1);
  if (!item) return;
  const preset = TEXT_PRESETS[tool];
  if (preset) {
    commit(() => {
      Object.assign(item, { name: preset.name });
      item.props = deepMerge(item.props, clone(preset.props));
      item.props.font = { ...item.props.font, ...preset.props.font, size: round((preset.props.font?.size || item.props.font.size) * Math.sqrt(k), 1) };
      const lh = item.props.font.size * PT * (item.props.lineHeight || 1.2);
      item.h = round(Math.max(lh + 2 * (item.props.padding || 0) + 1, preset.h ? preset.h * k : 0), 1);
      if (preset.w) item.w = round(preset.w * k, 1);
      item.x = fx(cx, item.w, pg.width);
      item.y = fx(cy, item.h, pg.height);
    });
  }
  setTool("select");
  select([item.id]);
  after?.(item);
  return item;
}

const TEXT_PRESETS = {
  heading: { name: "Heading", w: 140, props: { text: "Add a heading", font: { size: 26, bold: true }, align: "center", valign: "middle" } },
  subheading: { name: "Subheading", w: 120, props: { text: "Add a subheading", font: { size: 15, bold: true, color: "#333333" }, align: "center", valign: "middle" } },
  body: { name: "Body text", w: 90, h: 24, props: { text: "Add a little bit of body text. Double-click to edit it on the page.", font: { size: 10 }, align: "left", valign: "top", wrap: true } },
  caption: { name: "Caption", w: 80, props: { text: "Caption — source, date or note", font: { size: 8, italic: true, color: "#555555" }, align: "left", valign: "middle" } },
  maplabel: { name: "Map label", w: 50, props: { text: "LABEL", font: { size: 9, bold: true, color: "#1f2937", spacing: 20 }, align: "center", valign: "middle", halo: true, haloColor: "#ffffff", haloWidth: 0.8 } },
  callout: { name: "Callout", w: 70, h: 20, props: { text: "Callout text", font: { size: 10, color: "#ffffff", bold: true }, align: "center", valign: "middle", padding: 3, background: "#0d99ff", border: { show: false, radius: 4 } } },
};

// ---------------------------------------------------------------- inline text editing
function startInlineEdit(item) {
  if (!item || item.type !== "text" || item.locked) return;
  finishInlineEdit();
  const node = S.ui.itemEls.get(item.id);
  if (!node) return;
  const p = item.props;
  const Z = S.zoom;
  const ta = el("textarea", { class: `${NS}-inline`, spellcheck: "false" });
  ta.value = p.text || "";
  Object.assign(ta.style, {
    left: `${item.x * Z}px`,
    top: `${item.y * Z}px`,
    width: `${Math.max(item.w * Z, 40)}px`,
    height: `${Math.max(item.h * Z, 20)}px`,
    transform: item.rot ? `rotate(${item.rot}deg)` : "",
    fontFamily: `"${p.font.family}", Arial, sans-serif`,
    fontSize: `${p.font.size * PT * Z}px`,
    fontWeight: p.font.bold ? "700" : "400",
    fontStyle: p.font.italic ? "italic" : "normal",
    color: p.font.color,
    textAlign: p.align,
    lineHeight: String(p.lineHeight || 1.2),
    padding: `${(p.padding || 0) * Z}px`,
    background: p.background || "rgba(255,255,255,0.85)",
  });
  S.ui.paper.appendChild(ta);
  node.style.visibility = "hidden";
  S.inline = { item, ta, node, before: p.text };
  ta.focus();
  ta.select();
  ta.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      ta.value = S.inline.before;
      finishInlineEdit();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) finishInlineEdit();
  });
  ta.addEventListener("input", () => {
    // grow the box while typing
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, item.h * Z)}px`;
  });
  ta.addEventListener("blur", () => finishInlineEdit());
}
function finishInlineEdit() {
  const ed = S.inline;
  if (!ed) return;
  S.inline = null;
  const { item, ta, node, before } = ed;
  const text = ta.value;
  const needH = (ta.scrollHeight / S.zoom);
  ta.remove();
  node.style.visibility = "";
  if (text !== before) {
    commit(() => {
      item.props.text = text;
      if (needH > item.h + 0.5) item.h = round(needH, 1);
    });
  }
}
// ---------------------------------------------------------------- property panel
function refreshCanvas() {
  renderPageDecor();
  renderPaper();
  renderSelection();
  drawRulers();
}
// Live edit with one undo step per burst of typing/dragging.
function liveSet(obj, path, value, after) {
  if (!S.editing) {
    pushHistory();
    S.editing = true;
  }
  clearTimeout(S.editTimer);
  S.editTimer = setTimeout(() => (S.editing = false), 800);
  setPath(obj, path, value);
  saveLibrary();
  if (after) after();
  else refreshCanvas();
}

function section(title, children, open = true) {
  const d = el("details", { class: `${NS}-sec`, open });
  d.appendChild(el("summary", {}, title));
  const body = el("div", { class: `${NS}-secbody` });
  for (const c of children.flat()) if (c) body.appendChild(c);
  d.appendChild(body);
  return d;
}
function row(label, ...controls) {
  return el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, label), el("span", { class: `${NS}-pctl` }, ...controls));
}
function fNum(obj, path, { min, max, step = 0.1, unit, after, onSet } = {}) {
  const input = el("input", { type: "number", class: `${NS}-input`, value: round(getPath(obj, path) ?? 0, 3), step, min, max });
  input.addEventListener("input", () => {
    let v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    if (onSet) onSet(v);
    else liveSet(obj, path, v, after);
  });
  return unit ? el("span", { class: `${NS}-unitwrap` }, input, el("span", { class: `${NS}-unit` }, unit)) : input;
}
function fText(obj, path, { after, placeholder } = {}) {
  const input = el("input", { type: "text", class: `${NS}-input`, value: getPath(obj, path) ?? "", placeholder });
  input.addEventListener("input", () => liveSet(obj, path, input.value, after));
  return input;
}
function fArea(obj, path, { rows = 3, after } = {}) {
  const ta = el("textarea", { class: `${NS}-input ${NS}-area`, rows });
  ta.value = getPath(obj, path) ?? "";
  ta.addEventListener("input", () => liveSet(obj, path, ta.value, after));
  return ta;
}
function fColor(obj, path, { allowNone = false, after } = {}) {
  const val = getPath(obj, path);
  const sw = el("button", { type: "button", class: `${NS}-swatch`, title: "Open color wheel" });
  const paint = (c) => {
    sw.style.setProperty("--c", c || "transparent");
    sw.classList.toggle("none", !c);
  };
  paint(val);
  const hex = el("input", { type: "text", class: `${NS}-input ${NS}-hex`, value: val || "", placeholder: allowNone ? "None" : "#000000", spellcheck: "false" });
  sw.addEventListener("click", () =>
    openColorWheel(sw, getPath(obj, path) || "#ffffff", (c) => {
      hex.value = c.toUpperCase();
      paint(c);
      if (chk) chk.checked = false;
      liveSet(obj, path, c, after);
    }),
  );
  hex.addEventListener("change", () => {
    const v = hex.value.trim();
    if (!v && allowNone) {
      paint("");
      return liveSet(obj, path, "", after);
    }
    if (/^#?[0-9a-f]{3,8}$/i.test(v) || /^(rgb|hsl)a?\(/.test(v)) {
      const c = v.startsWith("#") || /^(rgb|hsl)/.test(v) ? v : `#${v}`;
      paint(c);
      liveSet(obj, path, c, after);
    }
  });
  let chk = null;
  const wrap = el("span", { class: `${NS}-colorwrap` }, sw, hex);
  if (allowNone) {
    chk = el("input", { type: "checkbox", checked: !val, title: "No color (transparent)" });
    chk.addEventListener("change", () => {
      const c = chk.checked ? "" : normalizeHex(hex.value || "#ffffff");
      hex.value = c.toUpperCase();
      paint(c);
      liveSet(obj, path, c, after);
    });
    wrap.appendChild(el("label", { class: `${NS}-nonechk`, title: "No color" }, chk, "None"));
  }
  return wrap;
}
function normalizeHex(c) {
  if (typeof c !== "string") return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
  try {
    const ctx = measureCtx();
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    const v = ctx.fillStyle;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  } catch {}
  return "#000000";
}
function fSelect(obj, path, options, { after, onSet } = {}) {
  const cur = getPath(obj, path);
  const s = el("select", { class: `${NS}-input` });
  for (const [v, label] of options) s.appendChild(el("option", { value: v, selected: String(v) === String(cur) }, label));
  s.addEventListener("change", () => {
    const raw = s.value;
    const v = typeof cur === "number" || (options.length && typeof options[0][0] === "number") ? parseFloat(raw) : raw;
    if (onSet) onSet(v);
    else liveSet(obj, path, v, after);
  });
  return s;
}
function fCheck(obj, path, label, { after, onSet } = {}) {
  const c = el("input", { type: "checkbox", checked: !!getPath(obj, path) });
  c.addEventListener("change", () => (onSet ? onSet(c.checked) : liveSet(obj, path, c.checked, after)));
  return el("label", { class: `${NS}-check` }, c, el("span", {}, label));
}
function fRange(obj, path, min, max, step, { after } = {}) {
  const v = getPath(obj, path) ?? 0;
  const out = el("span", { class: `${NS}-rangeval` }, String(round(v, 2)));
  const r = el("input", { type: "range", class: `${NS}-range`, min, max, step, value: v });
  r.addEventListener("input", () => {
    out.textContent = r.value;
    liveSet(obj, path, parseFloat(r.value), after);
  });
  return el("span", { class: `${NS}-rangewrap` }, r, out);
}
function fSeg(obj, path, options, { after } = {}) {
  const cur = getPath(obj, path);
  const wrap = el("span", { class: `${NS}-seg` });
  for (const [v, label, title] of options) {
    const b = el("button", { type: "button", class: String(v) === String(cur) ? "active" : "", title: title || label, html: label });
    b.addEventListener("click", () => {
      for (const x of wrap.children) x.classList.remove("active");
      b.classList.add("active");
      liveSet(obj, path, v, after);
    });
    wrap.appendChild(b);
  }
  return wrap;
}
function fFont(obj, path, { after } = {}) {
  const f = getPath(obj, path);
  const fam = el("select", { class: `${NS}-input ${NS}-fam` });
  const all = knownFonts();
  const fams = all.includes(f.family) ? all : [f.family, ...all];
  for (const n of fams) fam.appendChild(el("option", { value: n, selected: n === f.family, style: { fontFamily: `"${n}"` } }, n));
  fam.appendChild(el("option", { value: "__load" }, "＋ Load installed fonts…"));
  fam.addEventListener("change", () => {
    if (fam.value === "__load") {
      fam.value = f.family;
      return loadInstalledFonts();
    }
    liveSet(obj, `${path}.family`, fam.value, after);
  });
  const size = el("input", { type: "number", class: `${NS}-input ${NS}-fsize`, value: f.size, min: 2, max: 400, step: 0.5, title: "Size (pt)" });
  size.addEventListener("input", () => {
    const v = parseFloat(size.value);
    if (v > 0) liveSet(obj, `${path}.size`, v, after);
  });
  const tog = (key, label, title) => {
    const b = el("button", { type: "button", class: `${NS}-tog ${f[key] ? "active" : ""}`, title, html: label });
    b.addEventListener("click", () => {
      b.classList.toggle("active");
      liveSet(obj, `${path}.${key}`, b.classList.contains("active"), after);
    });
    return b;
  };
  return el("div", { class: `${NS}-font` },
    fam,
    el("div", { class: `${NS}-fontrow` }, size, el("span", { class: `${NS}-unit` }, "pt"), tog("bold", "<b>B</b>", "Width"), tog("italic", "<i>I</i>", "Italic"), fColor(obj, `${path}.color`, { after })),
  );
}
function mapOptions(exclude, allowEmpty = true, emptyLabel = "First map (automatic)") {
  const opts = allowEmpty ? [["", emptyLabel]] : [];
  for (const m of mapItems()) if (m.id !== exclude) opts.push([m.id, m.name]);
  return opts;
}
// Frame shape rows for map items: preset shapes or an image (its alpha / silhouette) as a mask.
function mapFrameShapeRows(item) {
  const p = item.props;
  const P = (k) => `props.${k}`;
  const shape = p.frameShape || "rect";
  const pickMask = () => {
    const input = el("input", { type: "file", accept: "image/png,image/svg+xml,image/webp,image/gif" });
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => commit(() => {
        p.frameShape = "image";
        p.frameImage = fr.result;
      });
      fr.readAsDataURL(file);
    });
    input.click();
  };
  const rows = [
    row("Shape", fSelect(item, P("frameShape"), MAP_FRAME_SHAPES, {
      after: () => {
        if (p.frameShape === "image" && !p.frameImage) pickMask();
        renderProps();
      },
    })),
  ];
  if (shape === "rounded") rows.push(row("Corner radius", fNum(item, P("frameRadius"), { min: 0, step: 0.5, unit: "mm" })));
  if (shape === "circle" || shape === "star" || shape === "pentagon" || shape === "hexagon" || shape === "octagon") {
    rows.push(btn("Make it regular (equal width & height)", () => commit(() => {
      const s = Math.min(item.w, item.h);
      item.w = item.h = round(s, 1);
    }), { iconName: "fit" }));
  }
  if (shape === "image") {
    rows.push(btn(p.frameImage ? "Replace mask image…" : "Choose mask image…", pickMask, { iconName: "image" }));
    rows.push(el("p", { class: `${NS}-muted` }, "The map shows where the image is opaque — use a PNG/SVG silhouette (e.g. a province outline or a logo) with a transparent background."));
  }
  if (shape !== "rect" && shape !== "rounded") rows.push(el("p", { class: `${NS}-muted` }, "Grid frame ticks and labels are drawn only on rectangular frames."));
  return rows;
}

function btn(label, onClick, { primary = false, iconName, title } = {}) {
  return el("button", { type: "button", class: `${NS}-btn ${primary ? `${NS}-primary` : ""}`, title: title || label, html: `${iconName ? icon(iconName) : ""}<span>${esc(label)}</span>`, onclick: onClick });
}

function fillControls(item) {
  const p = item.props;
  const P = (path) => `props.${path}`;
  const rer = () => {
    refreshCanvas();
    renderProps();
  };
  if (!p.fillType) p.fillType = "solid";
  return [
    row("Type", fSeg(item, P("fillType"), [["solid", "Solid"], ["gradient", "Gradient"], ["pattern", "Hatch"]], { after: rer })),
    row(p.fillType === "gradient" ? "From" : p.fillType === "pattern" ? "Background" : "Color", fColor(item, P("fill"), { allowNone: true })),
    p.fillType === "gradient" ? row("To", fColor(item, P("fill2"))) : null,
    p.fillType === "gradient" ? row("Angle", fNum(item, P("gradientAngle"), { min: 0, max: 360, step: 15, unit: "°" })) : null,
    p.fillType === "pattern" ? row("Pattern", fSelect(item, P("pattern"), Object.entries(FILL_PATTERNS))) : null,
    p.fillType === "pattern" ? el("div", { class: `${NS}-grid2` }, row("Line color", fColor(item, P("patternColor"))), row("Spacing", fNum(item, P("patternSpacing"), { min: 0.6, step: 0.2, unit: "mm" }))) : null,
    p.fillType === "pattern" ? el("div", { class: `${NS}-grid2` }, row("Line width", fNum(item, P("patternWidth"), { min: 0.05, step: 0.05, unit: "mm" })), row("", fCheck(item, P("patternBg"), "Fill behind"))) : null,
    row("Opacity", fRange(item, P("fillOpacity"), 0, 1, 0.05)),
  ];
}

function colormapPicker(item) {
  const p = item.props;
  const swatch = (name) => (name === "custom" ? `linear-gradient(90deg, ${colorbarColors({ ...p, colormap: "custom" }).join(", ")})` : colormapGradientCss(name, p.reverse));
  const btnEl = el("button", { type: "button", class: `${NS}-cmapbtn` });
  const paint = () => {
    btnEl.innerHTML = `<span class="${NS}-cmapsw" style="background:${swatch(p.colormap)}"></span><span>${esc(p.colormap === "custom" ? "Custom colors" : COLORMAP_LABELS[p.colormap] || p.colormap)}</span>`;
  };
  paint();
  btnEl.addEventListener("click", () => {
    const grid = el("div", { class: `${NS}-cmapgrid` });
    for (const name of [...Object.keys(COLORMAPS), "custom"]) {
      const b = el("button", { type: "button", class: `${NS}-cmapopt ${p.colormap === name ? "active" : ""}`, html: `<span class="${NS}-cmapsw" style="background:${swatch(name)}"></span><small>${esc(name === "custom" ? "Custom" : COLORMAP_LABELS[name])}</small>` });
      b.addEventListener("click", () => {
        closePopover();
        commit(() => (p.colormap = name));
      });
      grid.appendChild(b);
    }
    popoverAt(btnEl, el("div", {}, el("div", { class: `${NS}-ptitle` }, "Colormap"), grid), `${NS}-cmappop`);
  });
  return btnEl;
}

function renderProps() {
  const host = S.ui.props;
  if (!host || !S.doc) return;
  const scrollTop = host.scrollTop;
  host.innerHTML = "";
  S.ui.liveScaleInput = null;
  for (const t of S.ui.tabs.children) t.classList.toggle("active", t.dataset.tab === S.tab);
  if (S.tab === "page") host.append(...pageProps());
  else if (S.tab === "vars") host.append(...varProps());
  else {
    const items = selectedItems();
    if (!items.length) host.append(emptyState());
    else if (items.length > 1) {
      host.append(
        el("div", { class: `${NS}-propshead` },
          el("div", { class: `${NS}-ptype`, html: `${icon("select", 15)}<span>${items.length} items selected</span>` }),
          selectionBar(items.length),
        ),
        el("div", { class: `${NS}-emptycard` }, el("p", {}, "Drag to move them together. Align, distribute and match sizes with the bar above; group them from the right-click menu.")),
      );
    } else {
      host.append(...itemProps(items[0]));
      groupPropSections(host, items[0]);
    }
  }
  host.scrollTop = scrollTop;
  renderQuickBar();
}

// ---- property groups: the sections of an item are sorted into tabs
// (Content · Style · Grid · Arrange) so long panels stay short and tidy.
const PROP_GROUPS = [
  ["content", "Content", /^(content|map view|data|text$|formula|table content|entries|legend|image|icon|symbols?|drawing|shape|latex|settings)/i],
  ["style", "Style", /^(style|frame|fill|background|halo|bar$|ticks|title|table style|scale bar style|north arrow style|text effects|adjust|stroke|line|markers?)/i],
  ["grid", "Grid", /^(coordinate grid|grid|overview)/i],
  ["arrange", "Arrange", /^(position|effects)/i],
];
const SECTION_ICONS = [
  [/^content|^data/i, "sync"], [/^map view/i, "zin"], [/^frame/i, "inset"], [/^coordinate grid|^grid/i, "table"],
  [/^overview/i, "map"], [/^position/i, "ruler"], [/^effects|text effects/i, "fx"], [/^text|^formula|^latex/i, "text"],
  [/^fill|^shape|^style/i, "shape"], [/^background|^halo/i, "layout"], [/^title/i, "title"], [/^ticks|^bar/i, "colorbar"],
  [/^entries|^legend/i, "list"], [/^image|^adjust/i, "image"], [/^icon|^symbol/i, "marker"], [/^table/i, "table"],
  [/^drawing/i, "pen"], [/^scale bar/i, "scalebar"], [/^north/i, "north"], [/^settings/i, "vars"],
];
function groupPropSections(host, item) {
  const secs = [...host.querySelectorAll(`:scope > details.${NS}-sec`)];
  const groupOf = (title) => (PROP_GROUPS.find(([, , re]) => re.test(title)) || ["style"])[0];
  for (const d of secs) {
    const sum = d.querySelector("summary");
    const title = sum.textContent.trim();
    d.dataset.group = groupOf(title);
    const ic = SECTION_ICONS.find(([re]) => re.test(title));
    if (ic && !sum.querySelector("svg")) sum.insertAdjacentHTML("afterbegin", icon(ic[1], 14));
  }
  const present = PROP_GROUPS.filter(([id]) => secs.some((d) => d.dataset.group === id));
  const top = el("div", { class: `${NS}-propshead` });
  const head = host.querySelector(`:scope > .${NS}-ptype`);
  if (head) {
    head.replaceWith(top);
    top.appendChild(head);
  } else host.prepend(top);
  top.appendChild(selectionBar(1));
  if (present.length < 2) return;
  S.ui.propGroup = S.ui.propGroup || {};
  let cur = S.ui.propGroup[item.type];
  if (cur !== "all" && !present.some(([id]) => id === cur)) cur = present[0][0];
  const bar = el("div", { class: `${NS}-ptabs`, role: "tablist" });
  const apply = () => {
    for (const d of secs) d.hidden = cur !== "all" && d.dataset.group !== cur;
    for (const b of bar.children) b.classList.toggle("active", b.dataset.g === cur);
  };
  for (const [id, label] of [...present, ["all", "All"]]) {
    const n = id === "all" ? secs.length : secs.filter((d) => d.dataset.group === id).length;
    bar.appendChild(el("button", {
      type: "button", role: "tab", "data-g": id, title: `${label} (${n})`,
      onclick: () => {
        cur = S.ui.propGroup[item.type] = id;
        apply();
        host.scrollTop = 0;
      },
    }, label));
  }
  top.appendChild(bar);
  apply();
}

function imageAdjustSection(item) {
  const p = item.props;
  if (!p.adjust) p.adjust = {};
  const a = p.adjust;
  const sl = (key, label, min, max, step = 1) => row(label, fRange(a, key, min, max, step, { after: () => refreshCanvas() }));
  for (const [k, v] of Object.entries({ brightness: 0, contrast: 0, saturation: 0, grayscale: 0, sepia: 0, hue: 0, blur: 0 })) if (a[k] == null) a[k] = v;
  const presets = [
    ["Original", {}],
    ["Mono", { grayscale: 100, contrast: 10 }],
    ["Vivid", { saturation: 45, contrast: 12 }],
    ["Warm", { sepia: 30, saturation: 10 }],
    ["Faded", { contrast: -25, brightness: 8, saturation: -20 }],
    ["Dramatic", { contrast: 40, brightness: -6 }],
  ];
  const presetRow = el("div", { class: `${NS}-chips` }, ...presets.map(([n, v]) => el("button", { type: "button", class: `${NS}-chip`, onclick: () => commit(() => (p.adjust = { brightness: 0, contrast: 0, saturation: 0, grayscale: 0, sepia: 0, hue: 0, blur: 0, ...v })) }, n)));
  return section("Adjust", [presetRow, sl("brightness", "Brightness", -100, 100), sl("contrast", "Contrast", -100, 100), sl("saturation", "Saturation", -100, 100), sl("grayscale", "Grayscale", 0, 100), sl("sepia", "Sepia", 0, 100), sl("hue", "Hue", -180, 180), sl("blur", "Blur", 0, 5, 0.1)], false);
}

function emptyState() {
  const tip = (k, t) => el("li", {}, el("kbd", {}, k), el("span", {}, t));
  return el("div", { class: `${NS}-emptycard` },
    el("div", { class: `${NS}-emptyicon`, html: icon("select", 22) }),
    el("b", {}, "Nothing selected"),
    el("p", {}, "Add items from the top bar or the left toolbar; they appear in the middle of the view. Select an item to edit it here. Paper size, margins and guides are on the Page tab."),
    el("div", { class: `${NS}-keyshead` }, "Shortcuts"),
    el("ul", { class: `${NS}-keys` },
      tip("Double-click", "edit text, or pan a map's content"),
      tip("Ctrl + scroll", "zoom the canvas"),
      tip("Space + drag", "pan the canvas"),
      tip("Arrows", "nudge 1 mm (Shift 10 mm)"),
      tip("Alt + drag", "move without snapping"),
      tip("Ctrl + D", "duplicate"),
    ),
  );
}

function commonProps(item) {
  const after = () => {
    renderItemList();
    refreshCanvas();
  };
  const fx = itemFx(item);
  const fxAfter = () => {
    refreshCanvas();
    renderProps();
  };
  const effects = section("Effects", [
    fCheck(fx, "shadow.on", "Drop shadow", { after: fxAfter }),
    fx.shadow.on ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(fx, "shadow.color", { after: refreshCanvas })), row("Opacity", fRange(fx, "shadow.opacity", 0, 1, 0.05, { after: refreshCanvas }))) : null,
    fx.shadow.on ? el("div", { class: `${NS}-grid3` }, row("Blur", fNum(fx, "shadow.blur", { min: 0, step: 0.2, unit: "mm", after: refreshCanvas })), row("X", fNum(fx, "shadow.dx", { step: 0.2, unit: "mm", after: refreshCanvas })), row("Y", fNum(fx, "shadow.dy", { step: 0.2, unit: "mm", after: refreshCanvas }))) : null,
    fCheck(fx, "glass.on", "Frosted glass (blurs the map behind)", { after: fxAfter }),
    fx.glass.on ? el("div", { class: `${NS}-grid2` }, row("Blur", fNum(fx, "glass.blur", { min: 0, step: 0.5, unit: "mm", after: refreshCanvas })), row("Radius", fNum(fx, "glass.radius", { min: 0, step: 0.5, unit: "mm", after: refreshCanvas }))) : null,
    fx.glass.on ? el("div", { class: `${NS}-grid2` }, row("Tint", fColor(fx, "glass.tint", { after: refreshCanvas })), row("Tint opacity", fRange(fx, "glass.opacity", 0, 1, 0.05, { after: refreshCanvas }))) : null,
    fx.glass.on ? fCheck(fx, "glass.border", "Light edge", { after: refreshCanvas }) : null,
  ], fx.shadow.on || fx.glass.on);
  return [effects, section("Position & Size", [
    row("Name", fText(item, "name", { after: () => renderItemList() })),
    el("div", { class: `${NS}-grid2` }, row("X", fNum(item, "x", { unit: "mm", after })), row("Y", fNum(item, "y", { unit: "mm", after }))),
    el("div", { class: `${NS}-grid2` }, row("Width", fNum(item, "w", { min: 1, unit: "mm", after })), row("Height", fNum(item, "h", { min: 1, unit: "mm", after }))),
    el("div", { class: `${NS}-grid2` }, row("Rotation", fNum(item, "rot", { min: -360, max: 360, step: 1, unit: "°", after })), row("Opacity", fRange(item, "opacity", 0, 1, 0.05, { after }))),
    el("div", { class: `${NS}-btnrow` },
      btn("Flip H", () => commit(() => (item.flipX = !item.flipX)), { iconName: "flipH", title: "Flip horizontally" }),
      btn("Flip V", () => commit(() => (item.flipY = !item.flipY)), { iconName: "flipV", title: "Flip vertically" }),
      btn("Center", () => commit(() => {
        item.x = round((S.doc.page.width - item.w) / 2, 2);
        item.y = round((S.doc.page.height - item.h) / 2, 2);
      }), { iconName: "alC", title: "Center on page" }),
    ),
    el("div", { class: `${NS}-row` }, fCheck(item, "locked", "Lock position", { after: () => { renderItemList(); renderSelection(); refreshCanvas(); } }), fCheck(item, "hidden", "Hide", { after })),
  ])];
}

function itemProps(item) {
  const p = item.props;
  const out = [];
  const typeLabel = el("div", { class: `${NS}-ptype`, html: `${icon(ITEM_TYPES[item.type].icon, 15)}<span>${esc(ITEM_TYPES[item.type].label)}</span>` });
  out.push(typeLabel);
  const P = (path) => `props.${path}`;
  switch (item.type) {
    case "map": {
      const setScale = (v) => {
        if (!(v > 0)) return;
        liveSet(item, P("view.zoom"), zoomForScale(v, p.view.center[1]), () => {
          if (p.scaleLock) p.scaleLock = v;
          refreshCanvas();
          scheduleOverlayRefresh();
        });
      };
      const scaleInput = el("input", { type: "number", class: `${NS}-input`, value: mapScale(item), step: 500, min: 1 });
      scaleInput.addEventListener("change", () => setScale(parseFloat(scaleInput.value)));
      S.ui.liveScaleInput = scaleInput;
      const presets = el("select", { class: `${NS}-input ${NS}-sm` }, el("option", { value: "" }, "Preset…"), ...PRESET_SCALES.map((s) => el("option", { value: s }, `1 : ${fmtNumber(s)}`)));
      presets.addEventListener("change", () => {
        if (!presets.value) return;
        scaleInput.value = presets.value;
        setScale(parseFloat(presets.value));
      });
      const snapshot = p.source === "snapshot";
      const capture = async () => {
        pushHistory();
        try {
          await captureGeoLibre(item);
          saveLibrary();
          renderAll();
          toast("Captured the current GeoLibre view");
        } catch (e) {
          S.history.pop();
          toast(`Capture failed: ${e.message}`, "warn");
        }
      };
      const contentSec = section("Content", [
        row("Source", fSeg(item, P("source"), [["live", "Live map", "Live MapLibre map, redrawn at print resolution"], ["snapshot", "Capture", "Capture of what GeoLibre draws now (includes COG / raster layers)"]], {
          after: () => {
            if (p.source === "snapshot" && !p.snapshot?.src) return capture();
            refreshCanvas();
            renderProps();
          },
        })),
        el("p", { class: `${NS}-muted` }, snapshot
          ? "Shows exactly what GeoLibre draws, including raster layers. Move GeoLibre to the area you want, then recapture. Resolution follows your screen."
          : "Redraws vector layers and the basemap at print resolution. Raster (COG) layers drawn by GeoLibre are not included — use “GeoLibre capture” for those."),
        snapshot ? btn("Recapture GeoLibre view", capture, { iconName: "camera", primary: true }) : null,
      ]);
      out.push(contentSec);
      if (snapshot) {
        out.push(
          section("Map View", [
            row("Scale  1 :", el("span", { class: `${NS}-readonly` }, fmtNumber(mapScale(item)))),
            el("p", { class: `${NS}-muted` }, "Scale and extent come from the capture; resize the frame to crop it."),
            row("Background", fColor(item, P("background"))),
          ]),
          section("Frame", [
            ...mapFrameShapeRows(item),
            fCheck(item, P("frame.show"), "Show frame"),
            el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("frame.color"))), row("Width", fNum(item, P("frame.width"), { min: 0, step: 0.05, unit: "mm" }))),
          ]),
          gridSection(item),
        );
        break;
      }
      const hist = viewHistory.get(item.id);
      out.push(
        section("Map View", [
          el("div", { class: `${NS}-mapnav` },
            iconBtn("zin", "Zoom map in", () => zoomMapBy(item, 2)),
            iconBtn("zout", "Zoom map out", () => zoomMapBy(item, 0.5)),
            iconBtn("fitlayers", "Fit all layers", () => fitAllLayers(item)),
            iconBtn("undo", "Previous extent", () => stepMapView(item, -1), hist?.back.length ? "" : `${NS}-dim`),
            iconBtn("redo", "Next extent", () => stepMapView(item, 1), hist?.fwd.length ? "" : `${NS}-dim`),
            iconBtn("movecontent", "Move content tool (C)", () => setTool(S.tool === "content" ? "select" : "content"), S.tool === "content" ? `${NS}-on` : ""),
          ),
          el("div", { class: `${NS}-btnrow` },
            btn("Match GeoLibre view", () => commit(() => viewFromGeoLibre(item) || toast("GeoLibre map not found", "warn")), { iconName: "sync", title: "Set this frame's extent to the current GeoLibre map view" }),
            btn(S.contentMode === item.id ? "Done panning" : "Pan map content", () => (S.contentMode === item.id ? exitContentMode() : enterContentMode(item.id)), { iconName: "pan", primary: S.contentMode === item.id }),
          ),
          row("Scale  1 :", scaleInput, presets),
          fCheck(item, P("scaleLock"), "Lock scale (zoom stays fixed when panning/resizing)", { onSet: (on) => commit(() => (p.scaleLock = on ? mapScale(item) : 0)) }),
          el("div", { class: `${NS}-grid2` },
            row("Longitude", fNum(item, P("view.center.0"), { step: 0.0001, after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
            row("Latitude", fNum(item, P("view.center.1"), { step: 0.0001, after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
          ),
          (() => {
            const opts = glLayers().filter((l) => !/cog|raster|tile|xyz|wms/i.test(String(l.type || "")));
            if (!opts.length || !S.app?.getLayerFeatures) return null;
            const sel = el("select", { class: `${NS}-input` }, el("option", { value: "" }, "Zoom to layer…"), ...opts.map((l) => el("option", { value: l.id }, l.name || l.id)));
            sel.addEventListener("change", () => sel.value && zoomMapToLayer(item, sel.value));
            return row("Extent", sel);
          })(),
          row("Map rotation", fNum(item, P("view.bearing"), { step: 1, min: -180, max: 360, unit: "°", after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
          row("Basemap", fSelect(item, P("basemap"), Object.entries(BASEMAP_STYLES), { after: () => refreshCanvas() })),
          row("Background", fColor(item, P("background"))),
          btn("Reload layers from GeoLibre", () => {
            S.styleEpoch = (S.styleEpoch || 0) + 1;
            refreshCanvas();
            toast("Map layers reloaded");
          }, { iconName: "refresh", title: "Fetch the latest style & layers from GeoLibre" }),
        ]),
        section("Frame", [
          ...mapFrameShapeRows(item),
          fCheck(item, P("frame.show"), "Show frame"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("frame.color"))), row("Width", fNum(item, P("frame.width"), { min: 0, step: 0.05, unit: "mm" }))),
        ]),
        gridSection(item),
        section("Overview / Locator", [
          el("p", { class: `${NS}-muted` }, "For inset maps: show another map's extent on this map."),
          row("Show extent of", fSelect(item, P("overview.source"), mapOptions(item.id, true, "— none —"))),
          row("Marker", fSelect(item, P("overview.marker"), [["rect", "Extent box"], ["point", "Location point"], ["cross", "Box + crosshair"]])),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("overview.color"))), row("Width", fNum(item, P("overview.width"), { min: 0, step: 0.1, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Fill", fColor(item, P("overview.fill"))), row("Opacity", fRange(item, P("overview.fillOpacity"), 0, 1, 0.05))),
        ], !!p.overview.source),
      );
      break;
    }
    case "legend": {
      const entriesBox = el("div", { class: `${NS}-entries` });
      const drawEntries = () => {
        entriesBox.innerHTML = "";
        (p.entries || []).forEach((e, i) => {
          const r = el("div", { class: `${NS}-entry ${e.kind === "group" ? "group" : ""}` });
          const vis = el("input", { type: "checkbox", checked: !e.hidden, title: "Show" });
          vis.addEventListener("change", () => liveSet(e, "hidden", !vis.checked));
          const sw = e.kind === "group" ? el("span", { class: `${NS}-swg`, html: icon("list", 13) }) : el("span", { class: `${NS}-sw`, html: `<svg width="22" height="14" viewBox="0 0 ${p.patchW} ${p.patchH}">${legendPatch(e.patch, 0, 0, p.patchW, p.patchH)}</svg>` });
          const lab = el("input", { type: "text", class: `${NS}-input`, value: e.label ?? "" });
          lab.addEventListener("input", () => {
            e.userLabel = true;
            liveSet(e, "label", lab.value);
          });
          const col = e.patch && e.kind !== "group" ? el("input", { type: "color", class: `${NS}-color ${NS}-sm`, value: normalizeHex(e.patch.type === "line" ? e.patch.stroke : e.patch.fill), title: "Symbol color" }) : null;
          col?.addEventListener("input", () => {
            liveSet(e.patch, e.patch.type === "line" ? "stroke" : "fill", col.value);
            sw.innerHTML = `<svg width="22" height="14" viewBox="0 0 ${p.patchW} ${p.patchH}">${legendPatch(e.patch, 0, 0, p.patchW, p.patchH)}</svg>`;
          });
          const up = iconBtn("up", "Move up", () => {
            if (i === 0) return;
            commit(() => ([p.entries[i - 1], p.entries[i]] = [p.entries[i], p.entries[i - 1]]));
          });
          const dn = iconBtn("down", "Move down", () => {
            if (i >= p.entries.length - 1) return;
            commit(() => ([p.entries[i + 1], p.entries[i]] = [p.entries[i], p.entries[i + 1]]));
          });
          const del = iconBtn("trash", "Delete entry", () => commit(() => p.entries.splice(i, 1)));
          r.append(vis, sw, lab, col || el("span"), up, dn, del);
          entriesBox.appendChild(r);
        });
      };
      drawEntries();
      const addManual = el("select", { class: `${NS}-input` }, el("option", { value: "" }, "+ Add manual entry…"), el("option", { value: "fill" }, "Polygon"), el("option", { value: "line" }, "Line"), el("option", { value: "point" }, "Point"), el("option", { value: "group" }, "Group heading"));
      addManual.addEventListener("change", () => {
        const t = addManual.value;
        if (!t) return;
        commit(() =>
          p.entries.push(
            t === "group"
              ? { key: uid("man"), kind: "group", label: "Group", manual: true }
              : { key: uid("man"), kind: "item", label: "New entry", manual: true, userLabel: true, patch: t === "line" ? { type: "line", stroke: "#2563eb", strokeWidth: 0.6 } : t === "point" ? { type: "point", fill: "#dc2626", stroke: "#ffffff", strokeWidth: 0.2, radius: 1.3 } : { type: "fill", fill: "#86efac", stroke: "#166534", strokeWidth: 0.25 } },
          ),
        );
      });
      out.push(
        section("Legend", [
          el("div", { class: `${NS}-btnrow` },
            btn("Sync from map", () => commit(() => {
              const n = syncLegendEntries(item);
              toast(n ? `${n} legend entries from GeoLibre layers` : "No readable layers — add manual entries", n ? "info" : "warn");
            }), { iconName: "sync", primary: true }),
            btn("Fit height", () => commit(() => (item.h = round(S.legendCache.get(item.id) || item.h, 2))), { title: "Fit the box height to the legend content" }),
          ),
          row("Title", fText(item, P("title"))),
          row("Title font", fFont(item, P("titleFont"))),
          row("Title alignment", fSeg(item, P("titleAlign"), [["left", "Left"], ["center", "Center"]])),
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
        ]),
        section("Entries", [
          entriesBox,
          addManual,
          fCheck(item, P("showGroups"), "Show group headings (classified layer names)"),
          fCheck(item, P("autoSync"), "Auto-sync when the composer opens"),
          fCheck(item, P("autoHeight"), "Box height follows content", { after: () => { refreshCanvas(); renderSelection(); } }),
        ]),
        section("Layout", [
          el("div", { class: `${NS}-grid2` }, row("Columns", fNum(item, P("columns"), { min: 1, max: 8, step: 1 })), row("Column gap", fNum(item, P("colGap"), { min: 0, step: 0.5, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Symbol width", fNum(item, P("patchW"), { min: 1, step: 0.5, unit: "mm" })), row("Symbol height", fNum(item, P("patchH"), { min: 1, step: 0.5, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Row gap", fNum(item, P("rowGap"), { min: 0, step: 0.2, unit: "mm" })), row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" }))),
          row("Group font", fFont(item, P("groupFont"))),
          row("Entry font", fFont(item, P("itemFont"))),
        ], false),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Background opacity", fRange(item, P("bgOpacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Corner radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" })),
        ], false),
      );
      break;
    }
    case "colorbar": {
      const sources = colorbarSourceOptions();
      const read = () =>
        commit(() => {
          const msg = readColorbarFromLayer(p);
          toast(msg, /no stored|not found|not in the list|RGB composite/.test(msg) ? "warn" : "info");
        });
      out.push(
        section("Data", [
          row("Values from", fSelect(item, P("source"), sources, { after: () => { if (p.source) read(); else renderProps(); } })),
          p.source ? btn("Re-read from layer", read, { iconName: "sync" }) : null,
          el("div", { class: `${NS}-grid2` },
            row("Minimum", fNum(item, P("vmin"), { step: 0.1 })),
            row("Maximum", fNum(item, P("vmax"), { step: 0.1 })),
          ),
          row("Colormap", colormapPicker(item)),
          p.colormap === "custom" ? row("Colors", fArea(item, P("customColors"), { rows: 2 })) : null,
          p.colormap === "custom" ? el("p", { class: `${NS}-muted` }, "Colors from low to high, separated by commas, e.g. #2c7bb6, #ffffbf, #d7191c") : null,
          el("div", { class: `${NS}-grid2` },
            row("Classes", fNum(item, P("bins"), { min: 0, max: 50, step: 1 })),
            row("", fCheck(item, P("reverse"), "Reverse")),
          ),
          el("p", { class: `${NS}-muted` }, "Classes 0 = continuous gradient; 2 or more = discrete steps."),
        ]),
        section("Bar", [
          row("Orientation", fSeg(item, P("orientation"), [["horizontal", "Horizontal"], ["vertical", "Vertical"]], {
            after: () => {
              const [w, h] = [item.w, item.h];
              if ((p.orientation === "vertical") === (w > h)) Object.assign(item, { w: h, h: w });
              refreshCanvas();
              renderSelection();
            },
          })),
          row("Ends", fSeg(item, P("extend"), [["neither", "Flat"], ["min", "Min"], ["max", "Max"], ["both", "Both"]])),
          p.extend !== "neither" ? row("End shape", fSeg(item, P("extendShape"), [["triangle", "Pointed"], ["rect", "Square"]])) : null,
          p.extend !== "neither" ? row("End length", fRange(item, P("extendFrac"), 0.02, 0.25, 0.01)) : null,
          row("Thickness", fNum(item, P("thickness"), { min: 0.5, step: 0.25, unit: "mm" })),
          fCheck(item, P("outline"), "Outline"),
          p.outline ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("outlineColor"))), row("Width", fNum(item, P("outlineWidth"), { min: 0.05, step: 0.05, unit: "mm" }))) : null,
        ]),
        section("Ticks & Labels", [
          row("Placement", fSeg(item, P("tickMode"), [["linear", "Even"], ["nice", "Rounded"], ["custom", "Custom"]])),
          p.tickMode !== "custom" ? row("Number of ticks", fNum(item, P("tickCount"), { min: 2, max: 30, step: 1 })) : null,
          p.tickMode === "custom" ? row("Values", fText(item, P("customTicks"), { placeholder: "e.g. 0, 0.25, 0.5, 1" })) : null,
          el("p", { class: `${NS}-muted` }, p.tickMode === "linear" ? "Even: ticks from min to max inclusive (like numpy.linspace)." : p.tickMode === "nice" ? "Rounded: about that many ticks at round numbers inside the range." : "Only values inside min–max are drawn."),
          el("div", { class: `${NS}-grid2` },
            row("Decimals", fSelect(item, P("decimals"), [[-1, "Auto"], [0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]])),
            row("", fCheck(item, P("thousands"), "1,000 separator")),
          ),
          el("div", { class: `${NS}-grid2` }, row("Prefix", fText(item, P("prefix"))), row("Suffix", fText(item, P("suffix"), { placeholder: "e.g.  m, °C, %" }))),
          row("Side", fSeg(item, P("tickSide"), p.orientation === "vertical" ? [["after", "Right"], ["before", "Left"]] : [["after", "Below"], ["before", "Above"]])),
          row("Tick marks", fSeg(item, P("tickDir"), [["out", "Out"], ["in", "In"], ["both", "Both"], ["none", "None"]])),
          p.tickDir !== "none" ? el("div", { class: `${NS}-grid2` }, row("Length", fNum(item, P("tickLen"), { min: 0.2, step: 0.1, unit: "mm" })), row("Width", fNum(item, P("tickWidth"), { min: 0.05, step: 0.05, unit: "mm" }))) : null,
          p.tickDir !== "none" ? row("Tick color", fColor(item, P("tickColor"))) : null,
          row("Label font", fFont(item, P("tickFont"))),
        ]),
        section("Title", [
          row("Text", fText(item, P("title"), { placeholder: "e.g. Elevation (m)" })),
          row("Position", fSeg(item, P("titlePos"), [["before", p.orientation === "vertical" ? "Top" : "Above"], ["after", p.orientation === "vertical" ? "Bottom" : "Below"], ["side", "Side"]])),
          p.titlePos !== "side" ? row("Align", fSeg(item, P("titleAlign"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])) : null,
          row("Font", fFont(item, P("titleFont"))),
        ]),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" })),
          fCheck(item, P("border.show"), "Border"),
          p.border.show ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))) : null,
        ], false),
      );
      break;
    }
    case "scalebar":
      out.push(
        section("Scale Bar Style", [galleryGrid("scalebar", p.style, (id) => commit(() => (p.style = id)))]),
        section("Settings", [
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
          row("Units", fSelect(item, P("units"), [["auto", "Auto"], ["km", "Kilometers"], ["m", "Meters"], ["mi", "Miles"], ["nmi", "Nautical miles"]])),
          p.style === "dual" ? row("Second unit", fSelect(item, P("dualUnit"), [["papercm", "Centimeters on paper"], ["km", "Kilometers"], ["m", "Meters"], ["mi", "Miles"], ["nmi", "Nautical miles"]])) : null,
          p.style === "dual" ? row("Second label", fText(item, P("dualLabel"), { placeholder: "cm (auto)" })) : null,
          el("div", { class: `${NS}-grid2` }, row("Segments", fNum(item, P("segments"), { min: 1, max: 12, step: 1 })), row("Value/segment", fNum(item, P("segmentValue"), { min: 0, step: 0.5 }))),
          el("p", { class: `${NS}-muted` }, "Value/segment 0 = fit the box width automatically."),
          fCheck(item, P("leftSegments"), "Subdivided left segment (classic)"),
          row("Unit label", fText(item, P("unitLabel"), { placeholder: "km / m (auto)" })),
          el("div", { class: `${NS}-grid2` }, row("Bar height", fNum(item, P("barHeight"), { min: 0.3, step: 0.1, unit: "mm" })), row("Line width", fNum(item, P("lineWidth"), { min: 0.05, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Color 1", fColor(item, P("color1"))), row("Color 2", fColor(item, P("color2")))),
          row("Font", fFont(item, P("font"))),
          fCheck(item, P("showNumeric"), "Also show numeric scale below"),
          row("Numeric prefix", fText(item, P("numericPrefix"))),
          row("Align (numeric)", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
        ]),
      );
      break;
    case "north":
      out.push(
        section("North Arrow Style", [galleryGrid("north", p.variant, (id) => commit(() => (p.variant = id)))]),
        section("Settings", [
          el("div", { class: `${NS}-grid2` }, row("Primary color", fColor(item, P("color1"))), row("Secondary color", fColor(item, P("color2")))),
          row("Letter", fSelect(item, P("label"), [["N", "N"], ["U", "U (Indonesian)"], ["", "No letter"]])),
          row("Letter font", fSelect(item, P("fontFamily"), knownFonts().map((f) => [f, f]))),
          fCheck(item, P("rotateWithMap"), "Follow map rotation"),
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
          row("Extra rotation", fNum(item, P("rotation"), { step: 1, unit: "°" })),
        ]),
      );
      break;
    case "text":
      out.push(
        section("Text", [
          (S.ui.textArea = fArea(item, P("text"), { rows: 4 })),
          el("p", { class: `${NS}-muted` }, "Wrap math in $…$ for LaTeX, e.g. Area ($km^2$) or $\\mathrm{Mg\\,ha^{-1}}$."),
          el("div", { class: `${NS}-chips` },
            el("span", { class: `${NS}-muted` }, "Insert:"),
            ...["{title}", "{date}", "{year}", "{scale}", "{projection}", "{author}", "{organization}", "{source}"].map((v) =>
              el("button", { type: "button", class: `${NS}-chip`, onclick: () => commit(() => (p.text = `${p.text || ""}${v}`)) }, v),
            ),
          ),
          row("Font", fFont(item, P("font"))),
          row("Align", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
          row("Vertical", fSeg(item, P("valign"), [["top", "Top"], ["middle", "Center"], ["bottom", "Bottom"]])),
          row("Letter", fSelect(item, P("textCase"), [["none", "As typed"], ["upper", "UPPERCASE"], ["lower", "lowercase"], ["title", "Title Case"]])),
          el("div", { class: `${NS}-grid2` }, row("Line spacing", fNum(item, P("lineHeight"), { min: 0.6, max: 4, step: 0.05 })), row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" }))),
          row("Letter spacing", fNum(item, P("font.spacing"), { min: -5, max: 50, step: 0.5 })),
          fCheck(item, P("wrap"), "Wrap text automatically"),
          btn("Fit height to text", () => commit(() => {
            const pad = p.padding || 0;
            const lines = wrapText(applyCase(resolveVars(p.text, item), p.textCase), p.font, p.wrap ? item.w - pad * 2 : 0);
            item.h = round(lines.length * p.font.size * PT * p.lineHeight + pad * 2 + 0.6, 2);
          })),
        ]),
        section("LaTeX & Symbols", [templateButtons(S.ui.textArea, { mathWrap: true }), symbolCatalog(S.ui.textArea, { mathWrap: true })], false),
        section("Text effects", [
          row("Effect", fSelect(item, P("effect"), Object.entries(TEXT_EFFECTS), { after: () => { refreshCanvas(); renderProps(); } })),
          p.effect && p.effect !== "none" && p.effect !== "lift" && p.effect !== "hollow" ? row("Effect color", fColor(item, P("effectColor"))) : null,
          p.effect && p.effect !== "none" && p.effect !== "highlight" ? row("Strength", fRange(item, P("effectStrength"), 0, 100, 5)) : null,
          row("Decoration", fSeg(item, P("decoration"), [["none", "None"], ["underline", "<u>U</u>"], ["line-through", "<s>S</s>"], ["overline", "<span style='text-decoration:overline'>O</span>"]])),
        ], !!(p.effect && p.effect !== "none")),
        section("Halo, Background & Border", [
          fCheck(item, P("halo"), "Text halo / outline"),
          el("div", { class: `${NS}-grid2` }, row("Halo color", fColor(item, P("haloColor"))), row("Halo width", fNum(item, P("haloWidth"), { min: 0, step: 0.1, unit: "mm" }))),
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Background opacity", fRange(item, P("bgOpacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Style", fSelect(item, P("border.style"), Object.entries(BORDER_STYLES))), row("Radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" }))),
        ], false),
      );
      break;
    case "image":
      out.push(
        section("Image", [
          p.src ? el("img", { src: p.src, class: `${NS}-imgprev` }) : el("p", { class: `${NS}-muted` }, "No image yet."),
          el("div", { class: `${NS}-btnrow` }, btn("Choose image…", () => pickImage(item), { iconName: "image", primary: true }), p.src ? btn("Remove", () => commit(() => (p.src = ""))) : null),
          row("Fit", fSelect(item, P("fit"), [["contain", "Contain (keep ratio)"], ["cover", "Cover (crop)"], ["fill", "Stretch"]])),
          row("Mask", fSelect(item, P("mask"), [["none", "Rectangle"], ["circle", "Circle / ellipse"], ["hexagon", "Hexagon"], ["star", "Star"], ["heart", "Heart"], ["blob", "Blob"]])),
          row("Opacity", fRange(item, P("opacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Corner radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" })),
        ]),
        imageAdjustSection(item),
      );
      break;
    case "__image_adjust__":
      break;
    case "shape":
      out.push(
        section("Shape", [galleryGrid("shape", p.shape, (id) => commit(() => (p.shape = id)))]),
        section("Fill", fillControls(item)),
        section("Style", [
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("stroke"))), row("Width", fNum(item, P("strokeWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Line style", fSelect(item, P("strokeStyle"), Object.entries(BORDER_STYLES))),
          p.shape === "rounded" ? row("Corner radius", fNum(item, P("radius"), { min: 0, step: 0.5, unit: "mm" })) : null,
          fCheck(item, P("shadow"), "Drop shadow"),
        ]),
      );
      break;
    case "latex": {
      const ta = fArea(item, P("tex"), { rows: 3, after: () => refreshCanvas() });
      ta.classList.add(`${NS}-mono`);
      ta.addEventListener("change", () => rememberFormula(p.tex));
      const recent = recentFormulas();
      out.push(
        section("Formula", [
          ta,
          el("p", { class: `${NS}-muted` }, MATH.ready ? "Any MathJax LaTeX works, e.g. \\frac{a}{b}, x^{2}, \\sum_{i=1}^{n}." : "Loading MathJax… the formula appears as soon as it is ready."),
          templateButtons(ta),
          recent.length
            ? el("div", { class: `${NS}-chips` }, el("span", { class: `${NS}-muted` }, "Recent:"), ...recent.map((r) => el("button", { type: "button", class: `${NS}-chip`, title: r, onclick: () => commit(() => (p.tex = r)) }, r.length > 18 ? `${r.slice(0, 18)}…` : r)))
            : null,
          row("Size", fNum(item, P("size"), { min: 4, max: 200, step: 1, unit: "pt" })),
          row("Color", fColor(item, P("color"))),
          row("Style", fSeg(item, P("display"), [[true, "Display"], [false, "Inline"]])),
          row("Align", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
          row("Vertical", fSeg(item, P("valign"), [["top", "Top"], ["middle", "Center"], ["bottom", "Bottom"]])),
          btn("Fit box to formula", () => commit(() => {
            const w = S.mathWidth?.get(item.id);
            const h = S.legendCache.get(item.id);
            if (w) item.w = round(w, 2);
            if (h) item.h = round(h, 2);
          })),
        ]),
        section("Symbols", [symbolCatalog(ta)], true),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          fCheck(item, P("border.show"), "Border"),
          p.border.show ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))) : null,
        ], false),
      );
      break;
    }
    case "icon":
      out.push(
        section("Icon", [
          el("p", { class: `${NS}-muted` }, `${ICON_SET_LABELS[p.set] || p.set} · ${p.name} (CC0)`),
          row("Color", fColor(item, P("color"))),
          row("Label", fText(item, P("label"), { placeholder: "Optional label" })),
          p.label ? row("Font", fFont(item, P("font"))) : null,
          btn("Replace from catalog…", (e) => openCatalog(e.currentTarget), { iconName: "library" }),
        ]),
      );
      break;
    case "marker":
      out.push(
        section("Symbol", [galleryGrid("marker", p.symbol, (id) => commit(() => (p.symbol = id)))]),
        section("Style", [
          el("div", { class: `${NS}-grid2` }, row("Fill", fColor(item, P("fill"))), row("Outline", fColor(item, P("stroke")))),
          row("Size", fNum(item, P("size"), { min: 1, step: 0.5, unit: "mm" })),
          row("Label", fText(item, P("label"), { placeholder: "Leave empty for symbol only" })),
          row("Position", fSeg(item, P("labelPos"), [["right", "Right"], ["left", "Left"], ["top", "Top"], ["bottom", "Bottom"]])),
          row("Font", fFont(item, P("font"))),
          fCheck(item, P("halo"), "Label halo"),
        ]),
      );
      break;
    case "path":
      out.push(
        section("Drawing", [
          el("div", { class: `${NS}-row ${NS}-wrap` },
            fCheck(item, P("closed"), "Closed (polygon)", { after: () => { refreshCanvas(); renderProps(); } }),
            fCheck(item, P("smooth"), "Smooth curve"),
          ),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("stroke"))), row("Width", fNum(item, P("strokeWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Line style", fSelect(item, P("strokeStyle"), Object.entries(BORDER_STYLES))),
          !p.closed ? el("div", { class: `${NS}-row ${NS}-wrap` }, fCheck(item, P("arrowStart"), "Arrow at start"), fCheck(item, P("arrowEnd"), "Arrow at end")) : null,
          el("p", { class: `${NS}-muted` }, `${p.points.length} points. Resize the box to scale the drawing.`),
        ]),
        p.closed ? section("Fill", fillControls(item)) : null,
      );
      break;
    case "table": {
      const ta = el("textarea", { class: `${NS}-input ${NS}-area`, rows: Math.min(10, Math.max(4, p.rows.length + 1)) });
      ta.value = p.rows.map((r) => r.join(" | ")).join("\n");
      ta.addEventListener("input", () => liveSet(item, P("rows"), ta.value.split("\n").map((l) => l.split("|").map((c) => c.trim()))));
      out.push(
        section("Table Content", [
          el("p", { class: `${NS}-muted` }, "One line per table row; separate columns with | . Variables such as {date} are supported."),
          ta,
          row("Column widths", fText(item, P("colWidths"), { placeholder: "e.g. 35,65" })),
          fCheck(item, P("header"), "First row = column headers"),
          btn("Fit height", () => commit(() => (item.h = round(S.legendCache.get(item.id) || item.h, 2)))),
        ]),
        section("Table Style", [
          row("Font", fFont(item, P("font"))),
          row("Title font", fFont(item, P("headerFont"))),
          row("Header background", fColor(item, P("headerBg"), { allowNone: true })),
          row("Background", fColor(item, P("background"), { allowNone: true })),
          fCheck(item, P("zebra"), "Alternating rows"),
          row("Alternate color", fColor(item, P("zebraColor"))),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("borderColor"))), row("Width", fNum(item, P("borderWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-row` }, fCheck(item, P("outerBorder"), "Outer border"), fCheck(item, P("innerBorder"), "Inner lines")),
          row("Padding", fNum(item, P("padding"), { min: 0, step: 0.2, unit: "mm" })),
          row("Align", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
        ], false),
      );
      break;
    }
  }
  out.push(...commonProps(item));
  return out;
}

function gridSection(item) {
  const p = item.props;
  const g = p.grid;
  const P = (path) => `props.grid.${path}`;
  const geoIntervals = [
    [0, "Auto"],
    [1 / 3600, '1"'], [5 / 3600, '5"'], [10 / 3600, '10"'], [15 / 3600, '15"'], [30 / 3600, '30"'],
    [1 / 60, "1'"], [2 / 60, "2'"], [5 / 60, "5'"], [10 / 60, "10'"], [15 / 60, "15'"], [30 / 60, "30'"],
    [1, "1°"], [2, "2°"], [5, "5°"], [10, "10°"], [15, "15°"], [30, "30°"],
  ];
  const utmIntervals = [[0, "Auto"], ...[100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000].map((v) => [v, `${fmtNumber(v)} m`])];
  const rerender = () => {
    refreshCanvas();
    renderProps();
  };
  return section("Coordinate Grid / Graticule", [
    fCheck(item, P("show"), "Show coordinate grid"),
    row("System", fSelect(item, P("type"), [["dms", "Degrees Minutes Seconds (DMS)"], ["dm", "Degrees Minutes (DM)"], ["dd", "Decimal degrees (DD)"], ["utm", "UTM (meters)"]], { after: () => { g.interval = 0; rerender(); } })),
    row("Interval", fSelect(item, P("interval"), g.type === "utm" ? utmIntervals : geoIntervals)),
    g.type === "utm" ? row("UTM zone", fNum(item, P("zone"), { min: 0, max: 60, step: 1 })) : null,
    g.type === "utm" ? row("Label units", fSeg(item, P("utmUnit"), [["m", "Meters"], ["km", "Kilometers"]])) : null,
    g.type === "utm" ? el("p", { class: `${NS}-muted` }, `Zone 0 = automatic (zone ${UTM.zoneOf(p.view.center[0])}${p.view.center[1] < 0 ? "S" : "N"}).`) : null,
    row("Hemisphere labels", fSeg(item, P("lang"), [["en", "E/W, N/S"], ["id", "BT/LS (ID)"]])),
    g.type === "dd" ? row("Decimals", fNum(item, P("decimals"), { min: 0, max: 6, step: 1 })) : null,
    el("div", { class: `${NS}-sub` }, "Grid lines"),
    row("Style", fSelect(item, P("style"), [["lines", "Solid"], ["cross", "Crosses (+)"], ["dots", "Point"], ["none", "No lines (labels only)"]])),
    el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("color"))), row("Width", fNum(item, P("width"), { min: 0.05, step: 0.05, unit: "mm" }))),
    el("div", { class: `${NS}-grid2` }, row("Line", fSelect(item, P("dash"), Object.entries(BORDER_STYLES))), row("Opacity", fRange(item, P("opacity"), 0, 1, 0.05))),
    g.style === "cross" ? row("Cross size", fNum(item, P("crossSize"), { min: 0.5, step: 0.5, unit: "mm" })) : null,
    el("div", { class: `${NS}-sub` }, "Grid frame"),
    row("Frame style", fSelect(item, P("frameStyle"), [["none", "Plain"], ["zebra", "Zebra (black-white)"], ["ticks-in", "Ticks inside"], ["ticks-out", "Ticks outside"], ["ticks-cross", "Ticks inside + outside"]], { after: rerender })),
    g.frameStyle === "zebra" ? el("div", { class: `${NS}-grid2` }, row("Zebra width", fNum(item, P("zebraWidth"), { min: 0.3, step: 0.1, unit: "mm" })), row("Color", fColor(item, P("zebraColor")))) : null,
    g.frameStyle.startsWith("ticks") ? row("Tick length", fNum(item, P("tickLen"), { min: 0.3, step: 0.1, unit: "mm" })) : null,
    el("div", { class: `${NS}-sub` }, "Coordinate labels"),
    el("div", { class: `${NS}-row ${NS}-wrap` }, fCheck(item, P("labels.top"), "Top"), fCheck(item, P("labels.bottom"), "Bottom"), fCheck(item, P("labels.left"), "Left"), fCheck(item, P("labels.right"), "Right")),
    row("Position", fSeg(item, P("labelPos"), [["outside", "Outside"], ["inside", "Inside"]])),
    fCheck(item, P("rotateSide"), "Vertical left/right labels"),
    row("Label offset", fNum(item, P("gap"), { min: 0, step: 0.2, unit: "mm" })),
    row("Label font", fFont(item, P("font"))),
  ], g.show);
}

function pageProps() {
  const pg = S.doc.page;
  if (!pg.border) pg.border = { show: false, color: "#000000", width: 0.6, double: false, inset: 5, gap: 1.2 };
  const refit = () => {
    renderAll();
    fitPage();
  };
  const unit = pg.unit || "mm";
  const step = PAGE_UNITS[unit].step;
  const dimInput = (key) => {
    const input = el("input", { type: "number", class: `${NS}-input`, value: round(toUnit(pg[key], pg), unit === "px" || unit === "mm" || unit === "pt" ? 0 : 3), step, min: 0 });
    input.addEventListener("change", () => {
      const v = parseFloat(input.value);
      if (!(v > 0)) return;
      commit(() => {
        pg[key] = round(fromUnit(v, pg), 3);
        pg.size = "custom";
      });
      fitPage();
    });
    return el("span", { class: `${NS}-unitwrap` }, input, el("span", { class: `${NS}-unit` }, unit));
  };
  const sizeBtn = el("button", { type: "button", class: `${NS}-cmapbtn`, title: "Choose from the page size catalog" }, el("span", {}, paperLabel(pg)));
  sizeBtn.addEventListener("click", () => openPaperCatalog(sizeBtn, () => fitPage()));
  const swap = () =>
    commit(() => {
      [pg.width, pg.height] = [pg.height, pg.width];
      pg.orientation = pg.width >= pg.height ? "landscape" : "portrait";
    });
  return [
    section("Page Size", [
      row("Size", sizeBtn),
      row("Orientation", fSeg(pg, "orientation", [["portrait", "Portrait"], ["landscape", "Landscape"]], {
        after: () => {
          if ((pg.orientation === "landscape") !== pg.width >= pg.height) [pg.width, pg.height] = [pg.height, pg.width];
          refit();
        },
      })),
      row("Units", fSeg(pg, "unit", [["mm", "mm"], ["cm", "cm"], ["in", "in"], ["pt", "pt"], ["px", "px"]], { after: () => renderProps() })),
      el("div", { class: `${NS}-grid2` }, row("Width", dimInput("width")), row("Height", dimInput("height"))),
      unit === "px" ? row("Pixels per inch", fNum(pg, "pxDpi", { min: 36, max: 600, step: 1, after: () => { S.exportDpi = pg.pxDpi; renderProps(); } })) : null,
      unit === "px" ? el("p", { class: `${NS}-muted` }, `Exports at ${pg.pxDpi || 96} dpi give exactly ${Math.round(toUnit(pg.width, pg))} × ${Math.round(toUnit(pg.height, pg))} px.`) : null,
      btn("Swap width and height", swap, { iconName: "refresh" }),
      row("Paper color", fColor(pg, "background")),
    ]),
    section("Page Border (Neatline)", [
      fCheck(pg, "border.show", "Show page border"),
      fCheck(pg, "border.double", "Double line"),
      el("div", { class: `${NS}-grid2` }, row("Color", fColor(pg, "border.color")), row("Width", fNum(pg, "border.width", { min: 0.05, step: 0.05, unit: "mm" }))),
      el("div", { class: `${NS}-grid2` }, row("Inset", fNum(pg, "border.inset", { min: 0, step: 0.5, unit: "mm" })), row("Double gap", fNum(pg, "border.gap", { min: 0.2, step: 0.1, unit: "mm" }))),
    ]),
    section("Guides & Snapping", [
      el("div", { class: `${NS}-grid2` }, row("Margin", fNum(pg, "margin", { min: 0, step: 1, unit: "mm" })), row("Grid", fNum(pg, "gridSize", { min: 0.5, step: 0.5, unit: "mm" }))),
      fCheck(pg, "showMargin", "Show margin guides (not printed)"),
      fCheck(pg, "showGrid", "Show canvas grid"),
      fCheck(pg, "showGuides", "Show guides", { after: () => { renderGuides(); } }),
      el("p", { class: `${NS}-muted` }, `Drag from a ruler to add a guide; drag it back onto the ruler to remove it. ${(pg.guides?.v.length || 0) + (pg.guides?.h.length || 0)} guide(s) on this page.`),
      btn("Clear all guides", () => commit(() => (pg.guides = { v: [], h: [] })), { iconName: "trash" }),
      fCheck(pg, "snapGrid", "Snap to grid"),
      fCheck(pg, "snapGuides", "Smart snap to item & page edges/centers"),
      el("p", { class: `${NS}-muted` }, "Hold Alt while dragging to disable snapping temporarily. Shift = lock direction / keep proportions."),
    ]),
  ];
}

function varProps() {
  const vars = S.doc.vars || (S.doc.vars = {});
  const list = el("div", {});
  for (const key of Object.keys(vars)) {
    const del = iconBtn("trash", "Delete variable", () => {
      commit(() => delete vars[key]);
    });
    list.appendChild(el("div", { class: `${NS}-varrow` }, el("code", {}, `{${key}}`), fText(vars, key, { after: () => refreshCanvas() }), del));
  }
  const nameIn = el("input", { class: `${NS}-input`, placeholder: "variable_name" });
  const add = btn("Add", () => {
    const k = nameIn.value.trim().toLowerCase().replace(/[^\w]/g, "_");
    if (!k) return;
    commit(() => (vars[k] = ""));
  }, { iconName: "plus" });
  return [
    section("Layout Variables", [
      el("p", { class: `${NS}-muted` }, "Fill these once and use them in any text or table by typing {name}. Built-in: {date}, {year}, {scale}, {scale:Map Name}."),
      list,
      el("div", { class: `${NS}-varrow` }, nameIn, add),
    ]),
  ];
}
// ---------------------------------------------------------------- color wheel picker
// Round HSV wheel (hue around, saturation outward) + brightness slider, hex,
// eyedropper, cartographic quick palette and recently used colors.
const RECENT_COLORS_KEY = "glc:recent-colors";
const QUICK_PALETTE = [
  "#000000", "#404040", "#808080", "#bfbfbf", "#ffffff",
  "#e31a1c", "#fd8d3c", "#fecc5c", "#ffffb2", "#8c510a",
  "#006d2c", "#31a354", "#74c476", "#c7e9c0", "#b8e186",
  "#08519c", "#3182bd", "#6baed6", "#c6dbef", "#a6cee3",
  "#54278f", "#756bb1", "#de2d26", "#f768a1", "#00a6a6",
];

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function rgbToHsv([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
function recentColors() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || "[]");
  } catch {
    return [];
  }
}
function rememberColor(c) {
  if (!c) return;
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify([c, ...recentColors().filter((x) => x !== c)].slice(0, 12)));
  } catch {}
}

function openColorWheel(anchor, value, onPick) {
  const SIZE = 184;
  const dpr = window.devicePixelRatio || 1;
  let [h, s, v] = rgbToHsv(hexToRgb(normalizeHex(value || "#ffffff")));
  const wheel = el("canvas", { class: `${NS}-wheel`, width: SIZE * dpr, height: SIZE * dpr, style: { width: `${SIZE}px`, height: `${SIZE}px` } });
  const knob = el("div", { class: `${NS}-wheelknob` });
  const wheelWrap = el("div", { class: `${NS}-wheelwrap`, style: { width: `${SIZE}px`, height: `${SIZE}px` } }, wheel, knob);
  const val = el("input", { type: "range", class: `${NS}-valslider`, min: 0, max: 100, step: 1, title: "Brightness" });
  const hex = el("input", { class: `${NS}-input ${NS}-hexbig`, maxlength: 7, spellcheck: "false" });
  const preview = el("span", { class: `${NS}-cprev` });
  const ctx = wheel.getContext("2d");
  const drawWheel = () => {
    const img = ctx.createImageData(SIZE * dpr, SIZE * dpr);
    const R = (SIZE * dpr) / 2;
    for (let y = 0; y < SIZE * dpr; y++) {
      for (let x = 0; x < SIZE * dpr; x++) {
        const dx = x - R + 0.5;
        const dy = y - R + 0.5;
        const d = Math.hypot(dx, dy);
        const i = (y * SIZE * dpr + x) * 4;
        if (d > R) continue;
        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + 90) % 360;
        const [r, g, b] = hsvToRgb(hue, d / R, 1);
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = d > R - 1 ? Math.round((R - d) * 255) : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
  const current = () => rgbToHex(hsvToRgb(h, s, v));
  const sync = (emit = true) => {
    const c = current();
    const a = ((h - 90) * Math.PI) / 180;
    knob.style.left = `${SIZE / 2 + Math.cos(a) * s * (SIZE / 2)}px`;
    knob.style.top = `${SIZE / 2 + Math.sin(a) * s * (SIZE / 2)}px`;
    knob.style.background = c;
    val.value = String(Math.round(v * 100));
    val.style.background = `linear-gradient(90deg, #000, ${rgbToHex(hsvToRgb(h, s, 1))})`;
    if (document.activeElement !== hex) hex.value = c.toUpperCase();
    preview.style.background = c;
    if (emit) onPick(c);
  };
  const pickAt = (ev) => {
    const r = wheel.getBoundingClientRect();
    const dx = ev.clientX - r.left - SIZE / 2;
    const dy = ev.clientY - r.top - SIZE / 2;
    h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360 + 90) % 360;
    s = Math.min(1, Math.hypot(dx, dy) / (SIZE / 2));
    sync();
  };
  wheelWrap.addEventListener("pointerdown", (ev) => {
    wheelWrap.setPointerCapture(ev.pointerId);
    pickAt(ev);
    const mv = (e2) => pickAt(e2);
    const up = () => {
      wheelWrap.removeEventListener("pointermove", mv);
      wheelWrap.removeEventListener("pointerup", up);
      rememberColor(current());
    };
    wheelWrap.addEventListener("pointermove", mv);
    wheelWrap.addEventListener("pointerup", up);
  });
  val.addEventListener("input", () => {
    v = Number(val.value) / 100;
    sync();
  });
  val.addEventListener("change", () => rememberColor(current()));
  hex.addEventListener("change", () => {
    const t = hex.value.trim();
    if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(t)) return;
    [h, s, v] = rgbToHsv(hexToRgb(normalizeHex(t.startsWith("#") ? t : `#${t}`)));
    drawWheel();
    sync();
    rememberColor(current());
  });
  const setColor = (c) => {
    [h, s, v] = rgbToHsv(hexToRgb(normalizeHex(c)));
    drawWheel();
    sync();
    rememberColor(c);
  };
  const swatchRow = (colors) =>
    el("div", { class: `${NS}-cswatches` }, ...colors.map((c) => {
      const b = el("button", { type: "button", class: `${NS}-cswatch`, title: c, style: { background: c } });
      b.addEventListener("click", () => setColor(c));
      return b;
    }));
  const tools = el("div", { class: `${NS}-crow` }, preview, hex);
  if (window.EyeDropper) {
    const eye = iconBtn("eyedrop", "Pick a color from the screen", async () => {
      try {
        const res = await new window.EyeDropper().open();
        setColor(res.sRGBHex);
      } catch {}
    });
    tools.appendChild(eye);
  }
  const recent = recentColors();
  const body = el("div", { class: `${NS}-cpicker` },
    wheelWrap,
    el("div", { class: `${NS}-crow` }, el("span", { class: `${NS}-unit` }, "Brightness"), val),
    tools,
    el("div", { class: `${NS}-mhead` }, "Palette"),
    swatchRow(QUICK_PALETTE),
    recent.length ? el("div", { class: `${NS}-mhead` }, "Recent") : null,
    recent.length ? swatchRow(recent) : null,
  );
  drawWheel();
  sync(false);
  const pop = popoverAt(anchor, body, `${NS}-cpop`);
  return pop;
}

// ---------------------------------------------------------------- quick text bar (top bar, contextual)
// Shown while a text-bearing item is selected: font, size, bold, italic, color,
// alignment, super/subscript (LaTeX) and letter case — like a word processor.
function quickFontPath(item) {
  return { text: "props.font", legend: "props.itemFont", table: "props.font", colorbar: "props.tickFont", marker: "props.font", scalebar: "props.font", icon: "props.font" }[item.type] || null;
}
function renderQuickBar() {
  const host = S.ui.quick;
  if (!host) return;
  host.innerHTML = "";
  const items = selectedItems();
  const item = items.length === 1 ? items[0] : null;
  const isShape = item && (item.type === "shape" || item.type === "path");
  const fp = item && ["text", "table"].includes(item.type) ? quickFontPath(item) : null;
  host.style.display = fp || isShape ? "" : "none";
  if (isShape) {
    host.append(...shapeQuickTools(item));
    return;
  }
  if (!fp) return;
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const f = getPath(item, fp);
  const fam = el("select", { class: `${NS}-input ${NS}-qfam`, title: "Font" });
  const all = knownFonts();
  for (const n of all.includes(f.family) ? all : [f.family, ...all]) fam.appendChild(el("option", { value: n, selected: n === f.family, style: { fontFamily: `"${n}"` } }, n));
  fam.appendChild(el("option", { value: "__load" }, "＋ Load installed fonts…"));
  fam.addEventListener("change", () => {
    if (fam.value === "__load") return loadInstalledFonts().then(renderQuickBar);
    liveSet(item, `${fp}.family`, fam.value, rerender);
  });
  const size = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: f.size, min: 2, max: 400, step: 0.5, title: "Font size (pt)" });
  size.addEventListener("input", () => {
    const v = parseFloat(size.value);
    if (v > 0) liveSet(item, `${fp}.size`, v, () => refreshCanvas());
  });
  const tog = (key, html, title) => {
    const b = el("button", { type: "button", class: `${NS}-qbtn ${f[key] ? "active" : ""}`, title, html });
    b.addEventListener("click", () => liveSet(item, `${fp}.${key}`, !getPath(item, `${fp}.${key}`), rerender));
    return b;
  };
  const parts = [el("span", { class: `${NS}-qlabel` }, ITEM_TYPES[item.type].label), fam, size, tog("bold", "<b>B</b>", "Bold"), tog("italic", "<i>I</i>", "Italic")];
  if (item.type === "text") {
    const u = el("button", { type: "button", class: `${NS}-qbtn ${item.props.decoration === "underline" ? "active" : ""}`, title: "Underline", html: "<u>U</u>" });
    u.addEventListener("click", () => liveSet(item, "props.decoration", item.props.decoration === "underline" ? "none" : "underline", rerender));
    parts.push(u);
  }
  parts.push(fColor(item, `${fp}.color`, { after: () => refreshCanvas() }));
  if (item.type === "text" || item.type === "table") {
    const alignKey = "props.align";
    for (const [v, ic] of [["left", "alL"], ["center", "alC"], ["right", "alR"]]) {
      const b = iconBtn(ic, `Align ${v}`, () => liveSet(item, alignKey, v, rerender), `${NS}-qbtn ${getPath(item, alignKey) === v ? "active" : ""}`);
      parts.push(b);
    }
  }
  if (item.type === "text") {
    const wrapMath = (tpl) => () => {
      const ta = S.ui.textArea;
      if (ta && document.body.contains(ta)) insertAtCaret(ta, tpl);
      else commit(() => (item.props.text = `${item.props.text || ""}${tpl.replace("|", "2")}`));
    };
    parts.push(
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Superscript (LaTeX $^{}$)", html: "x<sup>2</sup>", onclick: wrapMath("$^{|}$") }),
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Subscript (LaTeX $_{}$)", html: "x<sub>2</sub>", onclick: wrapMath("$_{|}$") }),
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Insert formula $…$", html: "∑", onclick: wrapMath("$|$") }),
    );
    const ef = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Text effect" }, ...Object.entries(TEXT_EFFECTS).map(([v, l]) => el("option", { value: v, selected: (item.props.effect || "none") === v }, l)));
    ef.addEventListener("change", () => liveSet(item, "props.effect", ef.value, rerender));
    parts.push(ef);
    const cs = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Letter case" }, ...[["none", "Aa"], ["upper", "AA"], ["lower", "aa"], ["title", "Ab"]].map(([v, l]) => el("option", { value: v, selected: item.props.textCase === v }, l)));
    cs.addEventListener("change", () => liveSet(item, "props.textCase", cs.value, rerender));
    parts.push(cs);
  }
  parts.push(...commonQuickActions(item));
  host.append(...parts);
}

// ---------------------------------------------------------------- map view tools (quick bar for map frames)
const viewHistory = new Map(); // itemId -> { back: [], fwd: [] }
function setMapView(item, view, { record = true } = {}) {
  const h = viewHistory.get(item.id) || { back: [], fwd: [] };
  if (record) {
    h.back.push(clone(item.props.view));
    if (h.back.length > 50) h.back.shift();
    h.fwd = [];
  }
  viewHistory.set(item.id, h);
  commit(() => {
    item.props.view = { ...item.props.view, ...view };
    if (item.props.scaleLock) item.props.scaleLock = mapScale(item);
  });
  scheduleOverlayRefresh();
}
function stepMapView(item, dir) {
  const h = viewHistory.get(item.id);
  if (!h) return;
  const from = dir < 0 ? h.back : h.fwd;
  const to = dir < 0 ? h.fwd : h.back;
  if (!from.length) return;
  to.push(clone(item.props.view));
  const v = from.pop();
  commit(() => (item.props.view = v));
}
function zoomMapBy(item, factor) {
  if (item.props.source === "snapshot") return toast("Captured frames have a fixed extent.", "warn");
  const z = item.props.view.zoom + Math.log2(factor);
  item.props.scaleLock = 0;
  setMapView(item, { zoom: z });
}
function fitAllLayers(item) {
  let b = null;
  for (const l of glLayers()) {
    if (l.visible === false) continue;
    const lb = layerBounds(l.id);
    if (!lb) continue;
    b = b ? { west: Math.min(b.west, lb.west), south: Math.min(b.south, lb.south), east: Math.max(b.east, lb.east), north: Math.max(b.north, lb.north) } : lb;
  }
  if (!b) return toast("No layer extents available — use Match GeoLibre view instead.", "warn");
  const pw = (b.east - b.west) * 0.05 || 0.01;
  const ph = (b.north - b.south) * 0.05 || 0.01;
  const bb = { west: b.west - pw, east: b.east + pw, south: b.south - ph, north: b.north + ph };
  item.props.scaleLock = 0;
  setMapView(item, { center: [(bb.west + bb.east) / 2, (bb.south + bb.north) / 2], zoom: zoomForBounds(bb, item.w, item.h), bearing: 0 });
}
function mapQuickTools(item) {
  const h = viewHistory.get(item.id);
  const live = item.props.source !== "snapshot";
  const parts = [
    el("span", { class: `${NS}-qlabel` }, "Map view"),
    iconBtn("zin", "Zoom map in", () => zoomMapBy(item, 2), `${NS}-qbtn`),
    iconBtn("zout", "Zoom map out", () => zoomMapBy(item, 0.5), `${NS}-qbtn`),
    iconBtn("fitlayers", "Fit all layers", () => fitAllLayers(item), `${NS}-qbtn`),
    iconBtn("sync", "Match GeoLibre view", () => commit(() => viewFromGeoLibre(item)), `${NS}-qbtn`),
    iconBtn("undo", "Previous extent", () => stepMapView(item, -1), `${NS}-qbtn ${h?.back.length ? "" : "dim"}`),
    iconBtn("redo", "Next extent", () => stepMapView(item, 1), `${NS}-qbtn ${h?.fwd.length ? "" : "dim"}`),
  ];
  const opts = glLayers().filter((l) => layerBounds(l.id));
  if (opts.length) {
    const sel = el("select", { class: `${NS}-input ${NS}-qfam`, title: "Zoom to layer" }, el("option", { value: "" }, "Zoom to layer…"), ...opts.map((l) => el("option", { value: l.id }, l.name || l.id)));
    sel.addEventListener("change", () => {
      if (!sel.value) return;
      const b = layerBounds(sel.value);
      const pw = (b.east - b.west) * 0.06 || 0.01;
      const ph = (b.north - b.south) * 0.06 || 0.01;
      const bb = { west: b.west - pw, east: b.east + pw, south: b.south - ph, north: b.north + ph };
      item.props.scaleLock = 0;
      setMapView(item, { center: [(bb.west + bb.east) / 2, (bb.south + bb.north) / 2], zoom: zoomForBounds(bb, item.w, item.h), bearing: 0 });
    });
    parts.push(sel);
  }
  const scale = el("input", { type: "number", class: `${NS}-input ${NS}-qscale`, value: mapScale(item), step: 1000, min: 1, title: "Scale 1 : n" });
  scale.addEventListener("change", () => {
    const v = parseFloat(scale.value);
    if (v > 0) setMapView(item, { zoom: zoomForScale(v, item.props.view.center[1]) });
  });
  parts.push(el("span", { class: `${NS}-qlabel` }, "1 :"), scale);
  parts.push(el("button", { type: "button", class: `${NS}-qbtn ${S.tool === "content" ? "active" : ""}`, title: "Move content tool (C)", html: icon("movecontent", 15), onclick: () => setTool(S.tool === "content" ? "select" : "content") }));
  if (!live) parts.forEach((p) => p.tagName === "BUTTON" && p.title !== "Move content tool (C)" && p.title !== "Match GeoLibre view" && (p.disabled = true));
  return parts;
}
function zoomToSelection() {
  const items = selectedItems();
  if (!items.length) return fitPage();
  const b = bboxOf(items);
  const sc = S.ui.scroll;
  const z = clamp(Math.min((sc.clientWidth - 80) / Math.max(b.w, 1), (sc.clientHeight - 80) / Math.max(b.h, 1)), 0.4, 30);
  S.zoom = z;
  layoutCanvas();
  sc.scrollLeft = CANVAS_PAD + (b.x + b.w / 2) * z - sc.clientWidth / 2;
  sc.scrollTop = CANVAS_PAD + (b.y + b.h / 2) * z - sc.clientHeight / 2;
  renderAll({ props: false });
}

// shape / drawing quick tools: fill, outline, width, line style, opacity, shadow
function shapeQuickTools(item) {
  const p = item.props;
  const rer = () => {
    refreshCanvas();
    renderProps();
  };
  const closedPath = item.type === "path" ? p.closed : true;
  const parts = [el("span", { class: `${NS}-qlabel` }, ITEM_TYPES[item.type].label)];
  if (closedPath) parts.push(el("span", { class: `${NS}-qtag` }, "Fill"), fColor(item, "props.fill", { allowNone: true, after: rer }));
  parts.push(el("span", { class: `${NS}-qtag` }, "Line"), fColor(item, "props.stroke", { after: rer }));
  const w = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: p.strokeWidth, min: 0, step: 0.05, title: "Line width (mm)" });
  w.addEventListener("input", () => {
    const v = parseFloat(w.value);
    if (v >= 0) liveSet(item, "props.strokeWidth", v, () => refreshCanvas());
  });
  parts.push(w);
  const st = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Line style" }, ...Object.entries(BORDER_STYLES).map(([v, l]) => el("option", { value: v, selected: p.strokeStyle === v }, l)));
  st.addEventListener("change", () => liveSet(item, "props.strokeStyle", st.value, rer));
  parts.push(st);
  const op = el("input", { type: "range", class: `${NS}-range ${NS}-qop`, min: 0, max: 1, step: 0.05, value: item.opacity ?? 1, title: "Opacity" });
  op.addEventListener("input", () => liveSet(item, "opacity", parseFloat(op.value), () => refreshCanvas()));
  parts.push(el("span", { class: `${NS}-qtag` }, "Opacity"), op);
  const fx = itemFx(item);
  const sh = el("button", { type: "button", class: `${NS}-qbtn ${fx.shadow.on ? "active" : ""}`, title: "Drop shadow", html: icon("fx", 15) });
  sh.addEventListener("click", () => liveSet(fx, "shadow.on", !fx.shadow.on, rer));
  parts.push(sh, ...commonQuickActions(item));
  return parts;
}

// flip / duplicate / lock / delete buttons shared by the floating toolbars
function commonQuickActions(item) {
  return [
    el("span", { class: `${NS}-qsep` }),
    iconBtn("flipH", "Flip horizontally", () => commit(() => (item.flipX = !item.flipX)), `${NS}-qbtn`),
    iconBtn("flipV", "Flip vertically", () => commit(() => (item.flipY = !item.flipY)), `${NS}-qbtn`),
    iconBtn("copy", "Duplicate (Ctrl+D)", () => duplicateSelection(), `${NS}-qbtn`),
    iconBtn(item.locked ? "lock" : "unlock", item.locked ? "Unlock" : "Lock", () => commit(() => (item.locked = !item.locked)), `${NS}-qbtn`),
    iconBtn("trash", "Delete", () => deleteSelection(), `${NS}-qbtn`),
  ];
}
// ---------------------------------------------------------------- page size catalog + units
// Sizes are stored in millimetres; pixel sizes convert at the page's px-per-inch.
const PAGE_UNITS = {
  mm: { label: "mm", perMm: 1, step: 1 },
  cm: { label: "cm", perMm: 0.1, step: 0.1 },
  in: { label: "in", perMm: 1 / 25.4, step: 0.05 },
  pt: { label: "pt", perMm: 72 / 25.4, step: 1 },
  px: { label: "px", perMm: null, step: 1 },
};
const PAPER_CATALOG = [
  { group: "ISO A", unit: "mm", sizes: [["A0", 841, 1189], ["A1", 594, 841], ["A2", 420, 594], ["A3", 297, 420], ["A4", 210, 297], ["A5", 148, 210], ["A6", 105, 148]] },
  { group: "ISO B", unit: "mm", sizes: [["B0", 1000, 1414], ["B1", 707, 1000], ["B2", 500, 707], ["B3", 353, 500], ["B4", 250, 353], ["B5", 176, 250]] },
  { group: "North America", unit: "in", sizes: [["Letter", 8.5, 11], ["Legal", 8.5, 14], ["Tabloid / Ledger", 11, 17], ["ANSI C", 17, 22], ["ANSI D", 22, 34], ["ANSI E", 34, 44], ["Arch D", 24, 36]] },
  { group: "Indonesia", unit: "mm", sizes: [["F4 / Folio", 215, 330], ["KLHK 1:500.000 (min.)", 900, 510, "Tabel 1 SK 399/2024"], ["KLHK 1:250.000 (min.)", 800, 600, "Tabel 1 SK 399/2024"], ["KLHK 1:50.000 / 1:25.000 (min.)", 420, 297, "Tabel 1 SK 399/2024"], ["KLHK 1:10.000 (min.)", 297, 210, "Tabel 1 SK 399/2024"]] },
  { group: "Posters", unit: "in", sizes: [["Poster 11 × 17 in", 11, 17], ["Poster 18 × 24 in", 18, 24], ["Poster 24 × 36 in", 24, 36], ["Poster 27 × 40 in", 27, 40]] },
  { group: "Photo prints", unit: "in", sizes: [["4 × 6 in", 4, 6], ["5 × 7 in", 5, 7], ["8 × 10 in", 8, 10], ["11 × 14 in", 11, 14]] },
  { group: "Presentation", unit: "px", sizes: [["Slide 16:9 (1920 × 1080)", 1920, 1080], ["Slide 4:3 (1024 × 768)", 1024, 768], ["Slide 16:10 (1920 × 1200)", 1920, 1200], ["4K UHD (3840 × 2160)", 3840, 2160]] },
  { group: "Social media", unit: "px", sizes: [
    ["Instagram post (1:1)", 1080, 1080], ["Instagram portrait (4:5)", 1080, 1350], ["Instagram / Facebook story", 1080, 1920], ["TikTok / Reels", 1080, 1920],
    ["Facebook post", 1200, 630], ["Facebook cover", 820, 312], ["X (Twitter) post", 1600, 900], ["X (Twitter) header", 1500, 500],
    ["LinkedIn post", 1200, 627], ["LinkedIn banner", 1584, 396], ["YouTube thumbnail", 1280, 720], ["YouTube banner", 2560, 1440],
    ["Pinterest pin", 1000, 1500], ["WhatsApp status", 1080, 1920],
  ] },
];
function pxPerMm(pg) {
  return (pg.pxDpi || 96) / 25.4;
}
function toUnit(mm, pg) {
  const u = pg.unit || "mm";
  if (u === "px") return mm * pxPerMm(pg);
  return mm * PAGE_UNITS[u].perMm;
}
function fromUnit(v, pg) {
  const u = pg.unit || "mm";
  if (u === "px") return v / pxPerMm(pg);
  return v / PAGE_UNITS[u].perMm;
}
function sizeToMm(w, h, unit, pg) {
  if (unit === "px") return [w / pxPerMm(pg), h / pxPerMm(pg)];
  return [w / PAGE_UNITS[unit].perMm, h / PAGE_UNITS[unit].perMm];
}
function applyPaper(pg, name, w, h, unit) {
  const [mw, mh] = sizeToMm(w, h, unit, pg);
  const land = pg.orientation === "landscape";
  // social / screen sizes keep their native orientation
  const fixed = unit === "px";
  pg.width = round(fixed ? mw : land ? Math.max(mw, mh) : Math.min(mw, mh), 3);
  pg.height = round(fixed ? mh : land ? Math.min(mw, mh) : Math.max(mw, mh), 3);
  if (fixed) pg.orientation = mw >= mh ? "landscape" : "portrait";
  pg.size = name;
  pg.unit = unit;
  if (unit === "px") S.exportDpi = pg.pxDpi || 96;
}
function paperLabel(pg) {
  const u = pg.unit || "mm";
  const f = (v) => round(toUnit(v, pg), u === "px" || u === "mm" || u === "pt" ? 0 : 2);
  return `${pg.size === "custom" ? "Custom" : pg.size} · ${f(pg.width)} × ${f(pg.height)} ${u}`;
}
function openPaperCatalog(anchor, after) {
  const pg = S.doc.page;
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search sizes (A4, story, poster…)" });
  const body = el("div", { class: `${NS}-catbody` });
  const draw = () => {
    body.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    for (const g of PAPER_CATALOG) {
      const rows = g.sizes.filter(([n]) => !q || n.toLowerCase().includes(q) || g.group.toLowerCase().includes(q));
      if (!rows.length) continue;
      const det = el("details", { class: `${NS}-catgrp`, open: true }, el("summary", {}, g.group, el("small", {}, g.unit)));
      for (const [name, w, h, note] of rows) {
        const ratio = w / h;
        const thumbW = ratio >= 1 ? 22 : 22 * ratio;
        const thumbH = ratio >= 1 ? 22 / ratio : 22;
        const b = el("button", { type: "button", class: `${NS}-catrow ${pg.size === name ? "active" : ""}` });
        b.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26"><rect x="${(26 - thumbW) / 2}" y="${(26 - thumbH) / 2}" width="${thumbW}" height="${thumbH}" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><span>${esc(name)}</span><small>${w} × ${h} ${g.unit}${note ? ` · ${esc(note)}` : ""}</small>`;
        b.addEventListener("click", () => {
          closePopover();
          commit(() => applyPaper(pg, name, w, h, g.unit));
          after?.();
        });
        det.appendChild(b);
      }
      body.appendChild(det);
    }
  };
  search.addEventListener("input", draw);
  draw();
  popoverAt(anchor, el("div", { class: `${NS}-catalog` }, el("div", { class: `${NS}-ptitle` }, "Page size"), search, body), `${NS}-catpop`);
  setTimeout(() => search.focus(), 30);
}
// ---------------------------------------------------------------- export
function composePageSVG(mapImages, { background = "page" } = {}) {
  const pg = S.doc.page;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pg.width}mm" height="${pg.height}mm" viewBox="0 0 ${pg.width} ${pg.height}">`;
  s += pageDecorSVG(true, background);
  S.doc.items.forEach((item, index) => {
    if (item.hidden) return;
    const fx = fxExportParts(item, index, mapImages);
    if (fx.defs) s += `<defs>${fx.defs}</defs>`;
    s += fx.backdrop;
    const flip = item.flipX || item.flipY ? ` translate(${item.flipX ? item.w : 0} ${item.flipY ? item.h : 0}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1})` : "";
    const t = `translate(${item.x} ${item.y})${item.rot ? ` rotate(${item.rot} ${item.w / 2} ${item.h / 2})` : ""}${flip}`;
    s += `<g${fx.filterAttr} opacity="${item.opacity ?? 1}"><g transform="${t}"><svg x="0" y="0" width="${item.w}" height="${item.h}" viewBox="0 0 ${item.w} ${item.h}" overflow="visible">`;
    s += renderItem(item, { export: true, mapImages });
    s += `</svg></g></g>`;
  });
  return `${s}</svg>`;
}

function rasterize(svg, dpi, background) {
  const pg = S.doc.page;
  const W = Math.round((pg.width / 25.4) * dpi);
  const H = Math.round((pg.height / 25.4) * dpi);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext("2d");
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);
        resolve(cv);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Page SVG failed to render"));
    };
    img.src = url;
  });
}

let jsPdfPromise = null;
function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPdfPromise) {
    jsPdfPromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      sc.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("jsPDF is not available")));
      sc.onerror = () => {
        jsPdfPromise = null;
        reject(new Error("Could not load the PDF library (check your internet connection)"));
      };
      document.head.appendChild(sc);
    });
  }
  return jsPdfPromise;
}

function progressModal(text) {
  const m = el("div", { class: `${NS}-modal` }, el("div", { class: `${NS}-modalcard` }, el("div", { class: `${NS}-spinner` }), el("div", { class: `${NS}-modaltext` }, text)));
  S.ui.root.appendChild(m);
  return {
    set: (t) => (m.querySelector(`.${NS}-modaltext`).textContent = t),
    close: () => m.remove(),
  };
}

async function exportLayout(fmt) {
  if (!S.doc) return;
  exitContentMode();
  const dpi = S.exportDpi || 300;
  const pg = S.doc.page;
  const px = (pg.width / 25.4) * dpi * ((pg.height / 25.4) * dpi);
  if (fmt !== "svg" && px > 160e6) {
    if (!confirm(`${pg.size} at ${dpi} dpi is very large (${Math.round(px / 1e6)} megapixels) and may fail. Continue?`)) return;
  }
  const maps = S.doc.items.filter((i) => i.type === "map" && !i.hidden && i.props.source !== "snapshot");
  const prog = progressModal("Preparing export…");
  const bg = S.exportBg || "page";
  try {
    const mapImages = new Map();
    let n = 0;
    for (const m of maps) {
      n += 1;
      prog.set(`Rendering map ${n}/${maps.length} (${m.name}) at ${fmt === "svg" ? 200 : dpi} dpi…`);
      const img = await renderMapImage(m, fmt === "svg" ? 200 : dpi);
      if (img) mapImages.set(m.id, img);
      else toast(`Map "${m.name}" failed to render`, "warn");
    }
    if (S.doc.items.some((i) => !i.hidden && (i.type === "latex" || JSON.stringify(i.props).includes("$")))) {
      prog.set("Typesetting formulas…");
      await loadMathJax().catch(() => {});
    }
    prog.set("Composing page…");
    const svg = composePageSVG(mapImages, { background: bg });
    const base = safeName(S.exportName || S.doc.name);
    if (fmt === "vpdf") {
      prog.set("Building vector PDF…");
      await saveVectorPdf(svg, base);
    } else if (fmt === "svg") {
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${base}.svg`);
    } else {
      const canvas = await rasterize(svg, dpi, fmt === "png" && bg === "transparent" ? null : "#ffffff");
      if (fmt === "geopdf") {
        prog.set("Georeferencing PDF…");
        const JsPDF = await loadJsPDF();
        const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
        pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "GeoLibre Layout Composer" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pg.width, pg.height, undefined, "FAST");
        const frames = geoFrames();
        if (!frames.length) throw new Error("GeoPDF needs at least one visible, unrotated map frame");
        downloadBlob(new Blob([geoRegister(pdf.output("arraybuffer"), frames)], { type: "application/pdf" }), `${base}_geo.pdf`);
      } else if (fmt === "pdf") {
        prog.set("Creating PDF…");
        const JsPDF = await loadJsPDF();
        const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
        pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "GeoLibre Layout Composer" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pg.width, pg.height, undefined, "FAST");
        pdf.save(`${base}.pdf`);
      } else {
        prog.set("Saving image…");
        const blob = await new Promise((r) => canvas.toBlob(r, fmt === "jpg" ? "image/jpeg" : "image/png", 0.95));
        if (!blob) throw new Error("Canvas too large for this browser — lower the DPI");
        downloadBlob(blob, `${base}.${fmt}`);
      }
    }
    toast(`${{ vpdf: "Vector PDF", geopdf: "GeoPDF" }[fmt] || fmt.toUpperCase()} export finished`);
  } catch (e) {
    console.error("[Layout Composer] export failed", e);
    toast(`Export failed: ${e.message}`, "warn");
  } finally {
    prog.close();
  }
}

function projectName() {
  try {
    const snap = S.app?.getProjectSnapshot?.();
    return snap?.name || snap?.project?.name || "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- vector PDF (svg2pdf)
const SVG2PDF_URL = "https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js";
let svg2pdfPromise = null;
function loadSvg2pdf() {
  if (window.svg2pdf?.svg2pdf) return Promise.resolve(window.svg2pdf.svg2pdf);
  if (!svg2pdfPromise) {
    svg2pdfPromise = loadJsPDF().then(
      () =>
        new Promise((resolve, reject) => {
          const sc = document.createElement("script");
          sc.src = SVG2PDF_URL;
          sc.onload = () => (window.svg2pdf?.svg2pdf ? resolve(window.svg2pdf.svg2pdf) : reject(new Error("svg2pdf not available")));
          sc.onerror = () => {
            svg2pdfPromise = null;
            reject(new Error("Could not load the vector PDF library (check the internet connection)"));
          };
          document.head.appendChild(sc);
        }),
    );
  }
  return svg2pdfPromise;
}
async function saveVectorPdf(svgText, base) {
  const pg = S.doc.page;
  const svg2pdf = await loadSvg2pdf();
  const JsPDF = await loadJsPDF();
  const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
  pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "GeoLibre Layout Composer" });
  // svg2pdf measures text with the live DOM, so mount the page off-screen
  const holder = el("div", { style: { position: "fixed", left: "-30000px", top: "0" } });
  holder.innerHTML = svgText;
  document.body.appendChild(holder);
  try {
    await svg2pdf(holder.firstElementChild, pdf, { x: 0, y: 0, width: pg.width, height: pg.height });
  } finally {
    holder.remove();
  }
  pdf.save(`${base}.pdf`);
}

// ---------------------------------------------------------------- GeoPDF
// ISO 32000 geospatial PDF: each map frame becomes a /Viewport with a
// /Measure /GEO dictionary (WGS 84 corners), appended as an incremental update.
// Ported from GIS Consultant Studio (MIT, same author) and extended to several frames.
const GEO_WKT = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
function geoFrames() {
  const pg = S.doc.page;
  const k = 72 / 25.4;
  return S.doc.items
    .filter((i) => i.type === "map" && !i.hidden && !i.rot)
    .map((item) => {
      if (item.props.source === "snapshot" && item.props.snapshot) syncSnapshotView(item);
      const g = mapGeom(item);
      // lower-left, upper-left, upper-right, lower-right (matches /LPTS)
      const pts = [
        [0, item.h],
        [0, 0],
        [item.w, 0],
        [item.w, item.h],
      ].map(([x, y]) => g.unproject(x, y));
      return {
        name: item.name,
        bbox: [item.x * k, (pg.height - item.y - item.h) * k, (item.x + item.w) * k, (pg.height - item.y) * k],
        gpts: pts.map(([lng, lat]) => `${round(lat, 7)} ${round(lng, 7)}`).join(" "),
      };
    });
}
function geoRegister(buf, frames) {
  const latin1 = (u8, from = 0) => {
    let s = "";
    for (let i = from; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 8192, u8.length)));
    return s;
  };
  const ascii = (s) => {
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  };
  const n = (v) => String(Math.round(v * 1e6) / 1e6);
  const u8 = new Uint8Array(buf);
  const tail = latin1(u8, Math.max(0, u8.length - 2048));
  const all = latin1(u8);
  const sx = tail.match(/startxref\s+(\d+)/g);
  const prev = +sx[sx.length - 1].match(/\d+/)[0];
  const size = +all.match(/\/Size\s+(\d+)/g).pop().match(/\d+/)[0];
  const root = all.match(/\/Root\s+(\d+\s+\d+\s+R)/)[1];
  const m = all.match(/(\d+) 0 obj\s*<<\s*\/Type\s*\/Page\b([\s\S]*?)>>\s*endobj/);
  if (!m) throw new Error("Could not find the PDF page");
  const num = m[1];
  const dict = m[2];
  const esc2 = (t) => String(t).replace(/[()\\]/g, "");
  const vps = frames
    .map(
      (f) =>
        `<< /Type /Viewport /Name (${esc2(f.name)}) /BBox [${f.bbox.map(n).join(" ")}] /Measure << /Type /Measure /Subtype /GEO ` +
        `/Bounds [0 0 0 1 1 1 1 0] /LPTS [0 0 0 1 1 1 1 0] /GPTS [${f.gpts}] /GCS << /Type /GEOGCS /WKT (${GEO_WKT}) >> >> >>`,
    )
    .join(" ");
  const obj = `\n${num} 0 obj\n<< /Type /Page${dict}\n/VP [${vps}]\n>>\nendobj\n`;
  const objOff = u8.length;
  const xrefOff = objOff + obj.length;
  const xref = `xref\n${num} 1\n${String(objOff + 1).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${size} /Root ${root} /Prev ${prev} >>\nstartxref\n${xrefOff}\n%%EOF\n`;
  const out = new Uint8Array(u8.length + obj.length + xref.length);
  out.set(u8, 0);
  out.set(ascii(obj), u8.length);
  out.set(ascii(xref), u8.length + obj.length);
  return out;
}
// ---------------------------------------------------------------- open / close
function ensureLibrary() {
  if (S.library) return;
  S.library = loadLibrary() || { active: null, layouts: {} };
  if (!Object.keys(S.library.layouts).length) {
    const d = newDoc("Layout 1");
    const pn = projectName();
    if (pn) d.vars.title = pn;
    S.library.layouts[d.id] = d;
    S.library.active = d.id;
  }
  // upgrade older documents
  for (const d of Object.values(S.library.layouts)) {
    d.page.border = d.page.border || { show: false, color: "#000000", width: 0.6, double: false, inset: 5, gap: 1.2 };
    d.vars = d.vars || {};
    if (d.page.showGuides == null) d.page.showGuides = true;
    d.page.guides = d.page.guides || { v: [], h: [] };
    for (const it of d.items || []) if (it.type === "map" && !it.props.source) it.props.source = "live";
    for (const [oldKey, newKey] of Object.entries(VAR_ALIASES)) {
      if (oldKey in d.vars && !(newKey in d.vars)) d.vars[newKey] = d.vars[oldKey];
      delete d.vars[oldKey];
    }
  }
}

function refreshAutoLegends() {
  if (!mainMap()) return;
  for (const l of S.doc.items.filter((i) => i.type === "legend" && i.props.autoSync)) {
    try {
      syncLegendEntries(l);
    } catch (e) {
      console.warn("[Layout Composer] legend", e);
    }
  }
}

function openComposer() {
  ensureLibrary();
  if (!S.root) S.root = buildShell();
  if (!S.open) {
    document.body.appendChild(S.root);
    S.open = true;
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
  }
  S.doc = S.library.layouts[S.library.active] || Object.values(S.library.layouts)[0];
  S.library.active = S.doc.id;
  S.styleEpoch = (S.styleEpoch || 0) + 1; // pick up layer changes made since last time
  refreshAutoLegends();
  // GeoLibre still loading its layers: refresh legends and frames once it is ready
  const m = mainMap();
  if (m && !m.isStyleLoaded?.()) {
    m.once("idle", () => {
      if (!S.open) return;
      S.styleEpoch = (S.styleEpoch || 0) + 1;
      refreshAutoLegends();
      renderAll();
    });
  }
  applyDocks();
  setTool("select");
  renderAll();
  requestAnimationFrame(() => fitPage());
  S.root.focus({ preventScroll: true });
}

function closeComposer() {
  if (!S.open) return;
  exitContentMode();
  closePopover();
  destroyAllLiveMaps();
  for (const n of S.ui.itemEls.values()) n.remove();
  S.ui.itemEls.clear();
  S.root.remove();
  S.open = false;
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("keyup", onKey, true);
  saveLibrary();
}

// ---------------------------------------------------------------- GeoLibre plugin
const launcherControl = {
  _el: null,
  onAdd() {
    const c = el("div", { class: `maplibregl-ctrl maplibregl-ctrl-group ${NS}-launcher` });
    const b = el("button", {
      type: "button",
      title: "Open Layout Composer (design print map layouts)",
      "aria-label": "Open Layout Composer",
      html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="5.5" y="5.5" width="10" height="9"/><path d="M18 6.5v3M17 8.5l1-2 1 2M5.5 17.5h6M14 17.5h4"/></svg>`,
      onclick: () => openComposer(),
    });
    c.appendChild(b);
    this._el = c;
    return c;
  },
  onRemove() {
    this._el?.remove();
    this._el = null;
  },
};

export const plugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  activate(app) {
    S.app = app;
    try {
      app.addMapControl?.(launcherControl, "top-right");
    } catch (e) {
      console.warn("[Layout Composer] map control", e);
    }
    const dispose = app.registerToolbarMenu?.({
      id: `${PLUGIN_ID}-menu`,
      label: "Layout",
      items: [
        { id: "open", label: "Open Layout Composer", onSelect: () => openComposer() }
      ],
    });
    if (typeof dispose === "function") S.disposers.push(dispose);
    window.GeoLibreLayoutComposer = { open: openComposer, close: closeComposer, version: PLUGIN_VERSION, _state: S, _debug: { legendFromMap, glLayers, mainMap, composePageSVG, renderMapImage, rasterize, addItemFromTool, select, renderAll, loadMathJax, geoFrames, geoRegister, saveVectorPdf, findItem } };
  },
  deactivate(app) {
    closeComposer();
    for (const d of S.disposers.splice(0)) {
      try {
        d();
      } catch (e) {
        console.error("[Layout Composer] cleanup", e);
      }
    }
    try {
      app.removeMapControl?.(launcherControl);
    } catch {}
    S.root = null;
    S.ui = {};
    S.app = null;
    delete window.GeoLibreLayoutComposer;
  },
};

export default plugin;
