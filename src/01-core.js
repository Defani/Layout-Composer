// Layout Composer — a QGIS-style print layout designer for GeoLibre.
// Built from src/*.js by build.sh into one self-contained ES module.
//
// Every layout item is described in millimetres on the page and rendered to an
// SVG fragment (map items additionally host a live MapLibre instance). The same
// SVG drives the on-screen preview and the PNG/PDF/SVG export, so what you see
// is what gets printed.

const PLUGIN_ID = "layout-composer";
const PLUGIN_NAME = "Layout Composer";
const PLUGIN_VERSION = "1.8.1";
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
  ctx.font = `${font.italic ? "italic " : ""}${font.smallCaps ? "small-caps " : ""}${fontWeight(font)} 100px "${font.family || "Arial"}"`;
  const str = String(text);
  const px = ctx.measureText(str).width;
  // letter-spacing is added after every character (see fontAttrs)
  return (px / 100) * (font.size || 10) * PT + str.length * (font.spacing || 0) * PT * 0.1;
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
// Numeric weight of a font object (100…900); `bold` is kept for older layouts.
function fontWeight(f) {
  return f.weight || (f.bold ? 700 : 400);
}
function fontAttrs(f) {
  const w = fontWeight(f);
  return [
    `font-family="${esc(f.family || "Arial")}, Arial, sans-serif"`,
    `font-size="${round((f.size || 10) * PT, 3)}"`,
    w !== 400 ? `font-weight="${w}"` : "",
    f.italic ? `font-style="italic"` : "",
    f.smallCaps ? `font-variant="small-caps"` : "",
    `fill="${esc(f.color || "#000")}"`,
    f.opacity != null && f.opacity < 1 ? `fill-opacity="${f.opacity}"` : "",
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
