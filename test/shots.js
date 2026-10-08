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
  const data = await fetch("../examples/kawasan-hutan-aceh-klhk.layout.json").then((r) => r.json());
  const doc = data.layout;
  localStorage.setItem("glc:layouts:v1", JSON.stringify({ active: doc.id, layouts: { [doc.id]: doc } }));
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
  Object.assign(cb.props, { vmin: -0.2, vmax: 0.85, colormap: "rdylgn", extend: "both", title: "NDVI ($\\rho_{NIR}-\\rho_{Red}$)", tickCount: 6 });
  const cb2 = A("colorbar", 255, 40, 30, 90);
  Object.assign(cb2.props, { orientation: "vertical", vmin: 0, vmax: 3000, colormap: "terrain", extend: "max", extendShape: "rect", bins: 6, title: "Elevation (m)" });
  A("latex", 170, 40, 75, 22).props.tex = "\\frac{NIR-Red}{NIR+Red}";
  A("text", 170, 64, 80, 10).props.text = "Biomass ($Mg\\,ha^{-1}$)";
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
  Object.assign(t.props, { text: "Frosted glass card" });
  t.props.font.size = 14;
  t.props.font.bold = true;
  A("marker", 60, 80, 45, 9, "capital").props.label = "Ibu kota";
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
  Object.assign(cb.props, { source: "dem-srtm", vmin: 12.5, vmax: 2875, colormap: "terrain", extend: "max", tickMode: "nice", title: "DEM SRTM (m)" });
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
  m.props.hiddenLayers = ["titik-sampel"];
  A("legend", 10, 125, 70, 60);
  const t = A("attrtable", 168, 10, 118, 30);
  Object.assign(t.props, { showCount: true });
  const c = A("chart", 168, 62, 60, 60, "donut");
  Object.assign(c.props, { title: "Share of area", legendValues: "percent", showLegend: false });
  const b = A("chart", 232, 62, 56, 60, "hbar");
  Object.assign(b.props, { group: "desa", valueMode: "sum", valueField: "kode", labels: "value", decimals: 0, colorMode: "palette", palette: "viridis", title: "Sum of code per village" });
  const b2 = A("chart", 90, 128, 196, 60, "bar");
  Object.assign(b2.props, { group: "desa", valueMode: "count", labels: "value", colorMode: "palette", palette: "plasma", title: "Features per village" });
  D.renderAll();
  return { c, t, m };
}

async function run() {
  if (!shot) return;
  document.documentElement.classList.toggle("dark", shot.endsWith("-dark"));
  const klhk = location.pathname.endsWith("klhk.html");
  if (klhk) await loadExample();
  else localStorage.removeItem("glc:layouts:v1");
  localStorage.setItem("glc:docks", JSON.stringify({ left: true, right: true }));
  await waitFor(() => window.__app && window.GeoLibreLayoutComposer && window.__app.getMap().isStyleLoaded());
  await sleep(1500);
  const G = window.GeoLibreLayoutComposer;
  const S = G._state;
  const D = G._debug;
  G.open();
  await sleep(1200);
  let staged = {};
  if (!klhk) staged = shot.startsWith("frames") ? buildFrames(G) : shot.startsWith("data") || shot.startsWith("chart") || shot.startsWith("layers") ? buildData(G) : buildFeatures(G);
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
  if (name === "templates") byTitle("New layout / templates").click();
  await sleep(2500);
  document.title = "READY";
}
run();
