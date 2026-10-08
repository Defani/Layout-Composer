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
