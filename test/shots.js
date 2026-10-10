// Screenshot scenarios for the README: open a test page with ?shot=<name>.
// The page waits for the mock GeoLibre map, opens the composer and stages one view.
const params = new URLSearchParams(location.search);
const shot = params.get("shot");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (fn()) return true;
    } catch {}
    await sleep(200);
  }
  return false;
}

async function loadExample() {
  const data = await fetch("../examples/kelerengan-kuningan.layout.json").then((r) => r.json());
  const doc = data.layout || data;
  localStorage.setItem("glc:layouts:v1", JSON.stringify({ active: doc.id, layouts: { [doc.id]: doc } }));
  return doc.id;
}

// README shots show the released feature set: hide the AI chat and the KLHK templates.
function hideUnreleased() {
  localStorage.setItem("glc:aidock", "float");
  const st = document.createElement("style");
  st.textContent = ".glc-aitoggle, .glc-aichat, .glc-aicursor, .glc-klhkrow { display: none !important; }";
  document.head.append(st);
  new MutationObserver(() => {
    for (const h of document.querySelectorAll(".glc-mhead")) {
      if (/KLHK/.test(h.textContent)) {
        h.style.display = "none";
        if (h.previousElementSibling?.classList.contains("glc-msep")) h.previousElementSibling.style.display = "none";
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// NDVK0 raster in a scientific (matplotlib-like) figure: axes with ticks, vertical color bar.
function buildRaster(G) {
  const D = G._debug;
  const S = G._state;
  const A = (k, x, y, w, h, v) => {
    D.addItemFromTool(k, { x, y, w, h }, v);
    return S.doc.items.at(-1);
  };
  Object.assign(S.doc.page, { size: "custom", orientation: "portrait", width: 200, height: 215, margin: 0, showMargin: false });
  const f = (size) => ({ family: "DejaVu Sans", size, bold: false, italic: false, color: "#000000", spacing: 0 });
  const [w, s, e, n] = window.__bounds;
  const map = A("map", 28, 20, 126, 166);
  Object.assign(map.props, { basemap: "geolibre", background: "#ffffff" });
  map.props.view = { center: [(w + e) / 2, (s + n) / 2], zoom: 12.42, bearing: 0 };
  map.props.frame = { show: true, color: "#000000", width: 0.3 };
  Object.assign(map.props.grid, { show: true, type: "dd", decimals: 2, lang: "en", style: "none", frameStyle: "ticks-out", tickLen: 1.4, interval: 0.02, labels: { top: false, bottom: true, left: true, right: false }, labelPos: "outside", rotateSide: true, gap: 0.8, font: f(7) });
  const cb = A("colorbar", 160, 20, 16, 166);
  Object.assign(cb.props, { orientation: "vertical", vmin: -0.997, vmax: 0.037, colormap: "viridis", extend: "neither", title: "", tickCount: 6 });
  const t = A("text", 28, 8, 126, 9);
  Object.assign(t.props, { text: "NDVK0", align: "center", valign: "middle", font: f(11) });
  const x = A("text", 28, 196, 126, 6);
  Object.assign(x.props, { text: "Longitude", align: "center", font: f(8) });
  const y = A("text", 4, 98, 20, 6);
  Object.assign(y.props, { text: "Latitude", align: "center", font: f(8) });
  y.rot = -90;
  D.renderAll();
  return { cb, map };
}

function buildFeatures(G) {
  const D = G._debug;
  const S = G._state;
  const A = (k, x, y, w, h, v) => {
    D.addItemFromTool(k, { x, y, w, h }, v);
    return S.doc.items.at(-1);
  };
  const map = A("map", 10, 10, 150, 120);
  map.props.grid.show = true;
  map.props.grid.frameStyle = "zebra";
  const cb = A("colorbar", 170, 12, 115, 18);
  Object.assign(cb.props, { source: "ndvk0", vmin: -0.997, vmax: 0.037, colormap: "viridis", extend: "neither", title: "NDVK0", tickCount: 6 });
  const cb2 = A("colorbar", 255, 40, 30, 90);
  Object.assign(cb2.props, { source: "dem", orientation: "vertical", vmin: 25, vmax: 3078, colormap: "terrain", extend: "neither", bins: 6, title: "Elevasi (m)" });
  A("latex", 170, 40, 75, 22).props.tex = "\\frac{NIR-Red}{NIR+Red}";
  A("text", 170, 64, 80, 10).props.text = "Kelas lereng ($\\%$)";
  const sb = A("scalebar", 170, 78, 80, 14);
  sb.props.style = "dual";
  const sh = A("shape", 170, 100, 30, 24, "heart");
  Object.assign(sh.props, { fillType: "pattern", pattern: "x", fill: "#fde68a", patternBg: true });
  const sp = A("shape", 205, 100, 30, 24, "speech");
  Object.assign(sp.props, { fillType: "gradient", fill: "#0d99ff", fill2: "#a7f3d0" });
  const card = A("shape", 18, 18, 70, 24, "rounded");
  Object.assign(card.props, { fill: "", strokeWidth: 0 });
  card.fx = { shadow: { on: true, color: "#000000", opacity: 0.35, blur: 1.5, dx: 0.6, dy: 1 }, glass: { on: true, blur: 3, tint: "#ffffff", opacity: 0.4, radius: 3, border: true } };
  const t = A("text", 22, 22, 62, 16);
  Object.assign(t.props, { text: "Kabupaten Kuningan" });
  t.props.font.size = 14;
  t.props.font.bold = true;
  A("marker", 60, 80, 45, 9, "capital").props.label = "Kuningan";
  A("north", 130, 95, 20, 28, "rose-ring");
  A("legend", 10, 140, 150, 50);
  D.renderAll();
  return { cb, sh, map };
}

// Map frames in different shapes + a legend with raster / tile layers.
function buildFrames(G) {
  const D = G._debug;
  const S = G._state;
  const A = (k, x, y, w, h, v) => {
    D.addItemFromTool(k, { x, y, w, h }, v);
    return S.doc.items.at(-1);
  };
  const c = document.createElement("canvas");
  c.width = c.height = 240;
  const g = c.getContext("2d");
  g.beginPath();
  g.moveTo(120, 8); g.bezierCurveTo(215, 20, 235, 120, 175, 225); g.lineTo(40, 205); g.bezierCurveTo(-5, 120, 20, 30, 120, 8);
  g.fill();
  const m1 = A("map", 12, 14, 95, 95);
  Object.assign(m1.props, { frameShape: "circle" });
  m1.props.frame.width = 0.8;
  const m2 = A("map", 115, 14, 95, 95);
  Object.assign(m2.props, { frameShape: "hexagon" });
  m2.props.frame.width = 0.8;
  const m3 = A("map", 12, 118, 95, 80);
  Object.assign(m3.props, { frameShape: "image", frameImage: c.toDataURL() });
  const m4 = A("map", 115, 118, 95, 80);
  Object.assign(m4.props, { frameShape: "triangle" });
  m4.props.frame.width = 0.8;
  A("legend", 220, 14, 68, 110);
  const cb = A("colorbar", 220, 135, 68, 18);
  Object.assign(cb.props, { source: "dem", vmin: 25, vmax: 3078, colormap: "terrain", extend: "neither", tickMode: "nice", title: "Elevasi Mapzen Terrain (m)" });
  D.renderAll();
  return { m1, cb };
}

// Attribute table, charts and per-frame layers.
function buildData(G) {
  const D = G._debug;
  const S = G._state;
  const A = (k, x, y, w, h, v) => {
    D.addItemFromTool(k, { x, y, w, h }, v);
    return S.doc.items.at(-1);
  };
  const m = A("map", 10, 10, 150, 110);
  m.props.hiddenLayers = ["titik-kec"];
  A("legend", 10, 125, 70, 60);
  const t = A("attrtable", 168, 10, 118, 30);
  Object.assign(t.props, { layer: "kelerengan", group: "Keterangan", valueMode: "area", showCount: true, decimals: 1, locale: "id-ID" });
  const c = A("chart", 168, 62, 60, 60, "donut");
  Object.assign(c.props, { layer: "kelerengan", group: "Kelas_lere", valueMode: "area", title: "Luas kelas lereng", legendValues: "percent", showLegend: false, locale: "id-ID" });
  const b = A("chart", 232, 62, 56, 60, "hbar");
  Object.assign(b.props, { layer: "kelerengan", group: "Kelas_lere", valueMode: "area", sort: "value-desc", labels: "value", decimals: 0, title: "Luas kelas lereng (ha)", locale: "id-ID" });
  const b2 = A("chart", 90, 128, 196, 60, "bar");
  Object.assign(b2.props, { layer: "kecamatan", group: "kecamatan", valueMode: "area", topN: 0, labels: "none", decimals: 0, colorMode: "palette", palette: "plasma", title: "Luas per kecamatan (ha)", locale: "id-ID" });
  D.renderAll();
  return { c, t, m };
}

async function run() {
  if (!shot) return;
  document.documentElement.classList.toggle("dark", shot.endsWith("-dark"));
  const example = location.pathname.endsWith("example.html");
  const raster = location.pathname.endsWith("raster.html");
  const name0 = shot.replace(/-dark$/, "");
  if (name0 !== "ai") hideUnreleased();
  const exampleId = example ? await loadExample() : null;
  if (!example) localStorage.removeItem("glc:layouts:v1");
  localStorage.setItem("glc:docks", JSON.stringify({ left: true, right: true }));
  await waitFor(() => window.__app && window.LayoutComposer && window.__app.getMap().isStyleLoaded());
  await sleep(1500);
  const G = window.LayoutComposer;
  const S = G._state;
  const D = G._debug;
  G.open();
  await sleep(1200);
  if (exampleId) {
    await G.ai.switchLayout(exampleId);
    await sleep(1500);
  }
  let staged = {};
  if (raster) staged = buildRaster(G);
  else if (!example) staged = shot.startsWith("frames") ? buildFrames(G) : shot.startsWith("data") || shot.startsWith("chart") || shot.startsWith("layers") ? buildData(G) : buildFeatures(G);
  const q = (sel) => document.querySelector(sel);
  const byTitle = (t) => [...document.querySelectorAll("button")].find((b) => b.title === t);
  const name = shot.replace(/-dark$/, "");
  if (name === "text") D.select([S.doc.items.find((i) => i.type === "text").id]);
  if (name === "map") D.select([S.doc.items.find((i) => i.type === "map").id]);
  if (name === "colorbar") D.select([staged.cb.id]);
  if (name === "shape") D.select([staged.sh.id]);
  if (name === "north") byTitle("Add north arrow").click();
  if (name === "shapes") byTitle("Shape").click();
  if (name === "draw") byTitle("Draw").click();
  if (name === "symbols") byTitle("Symbols").click();
  if (name === "scalebars") byTitle("Scale bar").click();
  if (name === "icons") {
    byTitle("Symbols").click();
    await sleep(300);
    [...document.querySelectorAll(".glc-popover .glc-menuitem")].find((b) => b.textContent.includes("Icon catalog")).click();
  }
  if (name === "wheel") {
    D.select([staged.sh.id]);
    await sleep(300);
    q(".glc-props .glc-swatch").click();
  }
  if (name === "export") byTitle("Export").click();
  if (name === "paper") {
    q('.glc-tab[data-tab="page"]').click();
    await sleep(300);
    q(".glc-props .glc-cmapbtn").click();
  }
  if (name === "latex") D.select([S.doc.items.find((i) => i.type === "latex").id]);
  if (name === "context") {
    const n = q(".glc-t-shape");
    const r = n.getBoundingClientRect();
    n.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 2 }));
  }
  if (name === "frames") D.select([staged.m1.id]);
  if (name === "data") D.select([staged.t.id]);
  if (name === "chart") D.select([staged.c.id]);
  if (name === "layers") {
    D.select([staged.m.id]);
    await sleep(400);
    const sec = [...document.querySelectorAll(".glc-sec")].find((d) => d.querySelector("summary")?.textContent.trim() === "Layers");
    if (sec) {
      sec.open = true;
      sec.scrollIntoView({ block: "start" });
    }
  }
  if (name === "icons-google") {
    S.catalogTab = "google";
    byTitle("Symbols").click();
    await sleep(300);
    [...document.querySelectorAll(".glc-popover .glc-menuitem")].find((b) => b.textContent.includes("Icon catalog")).click();
  }
  if (name === "fonts") {
    const txt = S.doc.items.find((i) => i.type === "text");
    D.select([txt.id]);
    await sleep(400);
    S.fontTab = "google";
    document.querySelector(".glc-props .glc-fontbtn").click();
    await sleep(2500);
  }
  if (name === "position") {
    D.select([S.doc.items.find((i) => i.type === "map").id]);
    await sleep(300);
    [...document.querySelectorAll(".glc-ptabs button")].find((b) => b.textContent === "Arrange").click();
  }
  if (name === "grid") {
    const pg = S.doc.page;
    Object.assign(pg, { showGrid: true, gridSize: 5, gridSub: 5 });
    pg.layoutGrid = { show: true, cols: 6, colGutter: 5, rows: 0, rowGutter: 5, margin: 0, color: "#ff3b6b", opacity: 0.1, snap: true };
    pg.guides = { v: [148.5], h: [105] };
    D.select([]);
    D.renderAll();
    q('.glc-tab[data-tab="page"]').click();
    await sleep(300);
    const sec = [...document.querySelectorAll(".glc-sec")].find((d) => d.querySelector("summary")?.textContent.trim() === "Canvas grid");
    sec?.scrollIntoView({ block: "start" });
  }
  if (name === "progress") {
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) return;
      return orig.call(this);
    };
    S.exportDpi = 150;
    byTitle("Export").click();
    await sleep(300);
    [...document.querySelectorAll(".glc-dlgfoot button")].find((b) => /Export/.test(b.textContent)).click();
    await sleep(500);
    document.title = "READY";
    return;
  }
  if (name === "ai") {
    // a stand-in for the Live MCP Bridge chat hub
    const hist = [];
    const subs = new Set();
    let typing = false;
    const snap = () => ({ history: hist.slice(), listening: true, typing, queued: 0, connected: true, status: "connected" });
    const notify = () => subs.forEach((f) => f(snap()));
    window.__geolibreLive = {
      version: "mock",
      snapshot: snap,
      subscribe(fn) {
        subs.add(fn);
        fn(snap());
        return () => subs.delete(fn);
      },
      send(text, ctx) {
        hist.push({ role: "user", text, time: "10:02", state: "read", via: ctx.source });
        typing = true;
        notify();
        setTimeout(() => {
          typing = false;
          hist.push({ role: "bot", text: "Done: I added a **legend** under the map and linked it to *Map 1*. Want the title in bold and centred too?", status: "done", time: "10:02", via: ctx.source });
          notify();
        }, 500);
        return { id: "m1" };
      },
      renderChart() {},
      profile: { user: { name: "Defani", avatar: "" }, bot: { name: "Claude", avatar: "" } },
    };
    await sleep(3500);
    if (!q(".glc-aichat.open")) byTitle("Ask AI").click();
    await sleep(300);
    const ta = q(".glc-aiinput");
    ta.value = "Add a legend under the map";
    ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(900);
  }
  if (name === "templates") byTitle("New layout / templates").click();
  await sleep(2500);
  document.title = "READY";
}
run();
