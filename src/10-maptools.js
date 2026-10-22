// ---------------------------------------------------------------- Map Tools (Data View)
// The workflows of "ArcGIS Pro Map Fundamentals" for GeoLibre's map, as one
// "Map Tools" menu: coordinates in DD / DMS / DDM / UTM / MGRS, go to a
// coordinate, zoom to scale or layer, points / lines / polygons from typed
// coordinates, CSV and text (WKT, GeoJSON), add to an existing layer, move or
// delete selected features, map chips with a world file, image footprints, and
// right-click coordinate copy. Cartography only: no analysis tools.

const MT = { settingsKey: "glc:mt-settings", marker: null, cursorEl: null, ctxBound: null };
const MT_FORMATS = [["mgrs", "MGRS"], ["dd", "Decimal degrees (DD)"], ["dms", "Degrees minutes seconds (DMS)"], ["ddm", "Degrees decimal minutes (DDM)"], ["utm", "UTM"]];
const MT_UNITS = { m: ["Meters", 1], km: ["Kilometers", 1000], mi: ["Miles", 1609.344], nmi: ["Nautical miles", 1852], ft: ["Feet", 0.3048], yd: ["Yards", 0.9144] };
function mtSettings() {
  try {
    return { format: "mgrs", precision: 5, decimals: 6, template: "{coord}", rightClick: true, cursor: false, ...JSON.parse(localStorage.getItem(MT.settingsKey) || "{}") };
  } catch {
    return { format: "mgrs", precision: 5, decimals: 6, template: "{coord}", rightClick: true, cursor: false };
  }
}
function mtSaveSettings(patch) {
  try {
    localStorage.setItem(MT.settingsKey, JSON.stringify({ ...mtSettings(), ...patch }));
  } catch {}
}

// ---------------------------------------------------------------- coordinates
const MGRS_BANDS = "CDEFGHJKLMNPQRSTUVWXX";
const MGRS_COLS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const MGRS_ROWS = "ABCDEFGHJKLMNPQRSTUV";
function utmZoneFor(lng, lat) {
  let z = UTM.zoneOf(lng);
  // Norway and Svalbard exceptions
  if (lat >= 56 && lat < 64 && lng >= 3 && lng < 12) z = 32;
  if (lat >= 72 && lat < 84) {
    if (lng >= 0 && lng < 9) z = 31;
    else if (lng >= 9 && lng < 21) z = 33;
    else if (lng >= 21 && lng < 33) z = 35;
    else if (lng >= 33 && lng < 42) z = 37;
  }
  return z;
}
function toMGRS(lng, lat, digits = 5) {
  if (lat < -80 || lat > 84) return "Outside MGRS (UPS zone)";
  const zone = utmZoneFor(lng, lat);
  const band = MGRS_BANDS[Math.floor((lat + 80) / 8)];
  const [E, N] = UTM.forward(lng, lat, zone, lat < 0);
  const col = MGRS_COLS[(zone - 1) % 3][Math.floor(E / 100000) - 1];
  const row = MGRS_ROWS[(Math.floor(N / 100000) + (zone % 2 === 0 ? 5 : 0)) % 20];
  const d = clamp(Math.round(digits), 1, 5);
  const e = String(Math.floor((E % 100000) / 10 ** (5 - d))).padStart(d, "0");
  const n = String(Math.floor((N % 100000) / 10 ** (5 - d))).padStart(d, "0");
  return `${zone}${band} ${col}${row} ${e} ${n}`;
}
function fromMGRS(text) {
  const m = String(text).toUpperCase().replace(/\s+/g, "").match(/^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d*)$/);
  if (!m || m[5].length % 2) return null;
  const zone = +m[1];
  if (zone < 1 || zone > 60) return null;
  const half = m[5].length / 2;
  const scale = 10 ** (5 - half);
  const e = half ? +m[5].slice(0, half) * scale : 0;
  const n = half ? +m[5].slice(half) * scale : 0;
  const colIdx = MGRS_COLS[(zone - 1) % 3].indexOf(m[3]);
  const rowIdx = MGRS_ROWS.indexOf(m[4]);
  if (colIdx < 0 || rowIdx < 0) return null;
  const E = (colIdx + 1) * 100000 + e + scale / 2 * (half ? 1 : 0);
  let row100k = ((rowIdx - (zone % 2 === 0 ? 5 : 0) + 20) % 20) * 100000;
  const bandLat = -80 + MGRS_BANDS.indexOf(m[2]) * 8;
  const south = bandLat < 0;
  const lng0 = (zone - 1) * 6 - 180 + 3;
  const minN = UTM.forward(lng0, bandLat, zone, south)[1];
  let N = row100k + n + scale / 2 * (half ? 1 : 0);
  while (N < minN - 100000) N += 2000000;
  return UTM.inverse(E, N, zone, south);
}
function fmtDMS(v, pos, neg, sec = 1) {
  const s = v < 0 ? neg : pos;
  const a = Math.abs(v);
  let d = Math.floor(a);
  let m = Math.floor((a - d) * 60);
  let x = round(((a - d) * 60 - m) * 60, sec);
  if (x >= 60) { x = 0; m += 1; }
  if (m >= 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, "0")}'${x.toFixed(sec).padStart(sec + 3, "0")}"${s}`;
}
function fmtDDM(v, pos, neg) {
  const s = v < 0 ? neg : pos;
  const a = Math.abs(v);
  const d = Math.floor(a);
  return `${d}°${((a - d) * 60).toFixed(4).padStart(7, "0")}'${s}`;
}
function formatCoord(lng, lat, fmt, st = mtSettings()) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return "";
  if (fmt === "dd") return `${lat.toFixed(st.decimals)}, ${lng.toFixed(st.decimals)}`;
  if (fmt === "dms") return `${fmtDMS(lat, "N", "S")} ${fmtDMS(lng, "E", "W")}`;
  if (fmt === "ddm") return `${fmtDDM(lat, "N", "S")} ${fmtDDM(lng, "E", "W")}`;
  if (fmt === "utm") {
    const z = utmZoneFor(lng, lat);
    const [E, N] = UTM.forward(lng, lat, z, lat < 0);
    return `${z}${MGRS_BANDS[Math.floor((lat + 80) / 8)] || ""} ${Math.round(E)}mE ${Math.round(N)}mN`;
  }
  return toMGRS(lng, lat, st.precision);
}
// one angle: 6.98, -6.98, 6°58'48"S, 6 58 48 S, 6°58.8'S, LS/BT (Indonesian) too
function parseAngle(t) {
  let s = String(t).trim().toUpperCase().replace(/,/g, ".");
  let sign = 1;
  if (/[SW]|LS|BB/.test(s)) sign = -1;
  s = s.replace(/LS|LU|BT|BB|[NSEW]/g, " ").replace(/[°º'"′″:]/g, " ").trim();
  if (s.startsWith("-")) {
    sign *= -1;
    s = s.slice(1);
  }
  const p = s.split(/\s+/).filter(Boolean).map(Number);
  if (!p.length || p.some((x) => !Number.isFinite(x))) return null;
  return sign * (p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600);
}
// Any coordinate the user may type or paste → [lng, lat], or null.
function parseCoord(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const mg = fromMGRS(s);
  if (mg) return mg;
  // UTM: 49M 712345 9234567, 49 S 712345E 9234567N, 49S 712345mE 9234567mN
  const u = s.toUpperCase().match(/^(\d{1,2})\s*([C-X])?\s+(\d+(?:\.\d+)?)\s*M?E?[,\s]+(\d+(?:\.\d+)?)\s*M?N?$/);
  if (u) {
    const zone = +u[1];
    const south = u[2] ? u[2] < "N" : false;
    return UTM.inverse(+u[3], +u[4], zone, south);
  }
  // two angles: split on a comma / semicolon / tab, or between the hemisphere letters
  let parts = s.split(/\s*[;,\t]\s*(?=[-+\d])/);
  if (parts.length !== 2) {
    const h = s.toUpperCase().match(/^(.*?(?:[NS]|LU|LS))\s*(.+)$/);
    if (h) parts = [h[1], h[2]];
  }
  if (parts.length !== 2) parts = s.split(/\s+/).length === 2 ? s.split(/\s+/) : parts;
  if (parts.length !== 2) return null;
  let a = parseAngle(parts[0]);
  let b = parseAngle(parts[1]);
  if (a == null || b == null) return null;
  const firstIsLng = /[EW]|BT|BB/i.test(parts[0]) || (!/[NS]|LU|LS/i.test(parts[0]) && Math.abs(a) > 90);
  const [lng, lat] = firstIsLng ? [a, b] : [b, a];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

// ---------------------------------------------------------------- geodesy (WGS 84, Vincenty direct)
function geoDestination(lng, lat, bearing, dist) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const r = Math.PI / 180;
  const al1 = bearing * r;
  const sA1 = Math.sin(al1);
  const cA1 = Math.cos(al1);
  const tanU1 = (1 - f) * Math.tan(lat * r);
  const cU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
  const sU1 = tanU1 * cU1;
  const s1 = Math.atan2(tanU1, cA1);
  const sA = cU1 * sA1;
  const c2A = 1 - sA * sA;
  const u2 = (c2A * (a * a - b * b)) / (b * b);
  const A = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const B = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  let sg = dist / (b * A);
  let sgP;
  let c2sm;
  let ssg;
  let csg;
  let it = 0;
  do {
    c2sm = Math.cos(2 * s1 + sg);
    ssg = Math.sin(sg);
    csg = Math.cos(sg);
    const dS = B * ssg * (c2sm + (B / 4) * (csg * (-1 + 2 * c2sm * c2sm) - (B / 6) * c2sm * (-3 + 4 * ssg * ssg) * (-3 + 4 * c2sm * c2sm)));
    sgP = sg;
    sg = dist / (b * A) + dS;
  } while (Math.abs(sg - sgP) > 1e-12 && ++it < 100);
  const x = sU1 * ssg - cU1 * csg * cA1;
  const lat2 = Math.atan2(sU1 * csg + cU1 * ssg * cA1, (1 - f) * Math.sqrt(sA * sA + x * x));
  const lam = Math.atan2(ssg * sA1, cU1 * csg - sU1 * ssg * cA1);
  const C = (f / 16) * c2A * (4 + f * (4 - 3 * c2A));
  const L = lam - (1 - C) * f * sA * (sg + C * ssg * (c2sm + C * csg * (-1 + 2 * c2sm * c2sm)));
  let lng2 = lng + L / r;
  lng2 = ((lng2 + 540) % 360) - 180;
  return [round(lng2, 8), round(lat2 / r, 8)];
}
// ---------------------------------------------------------------- host helpers
function mtApp() {
  return S.app;
}
// layers that can take features: GeoJSON / vector by type, or (type unknown) ones holding features
function mtVectorLayers() {
  return (glLayers() || []).filter((l) => {
    const t = String(l.type || "");
    if (/geojson|vector|feature|wfs|csv|shp|gpkg|kml|gpx/i.test(t)) return true;
    if (/raster|cog|tif|xyz|tile|wms|wmts|image|zarr|dem|terrain/i.test(t)) return false;
    try {
      return (mtApp()?.getLayerFeatures?.(l.id) || []).length > 0;
    } catch {
      return false;
    }
  });
}
function mtFC(features) {
  return { type: "FeatureCollection", features };
}
function mtBBox(features) {
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
  for (const f of features) if (f?.geometry?.coordinates) walk(f.geometry.coordinates);
  return Number.isFinite(w) ? [w, s, e, n] : null;
}
function mtFit(features) {
  const b = mtBBox(features);
  if (!b) return;
  const m = mainMap();
  if (b[0] === b[2] && b[1] === b[3]) m?.flyTo({ center: [b[0], b[1]], zoom: Math.max(m.getZoom(), 13) });
  else if (mtApp()?.fitBounds) mtApp().fitBounds(b);
  else m?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60 });
}
// add to a new layer ("__new") or append to an existing GeoJSON layer
function mtAddFeatures(target, features, newName) {
  const app = mtApp();
  if (!features.length) return mtToast("Nothing to add.", "warn");
  if (target === "__new" || !target) {
    const id = app.addGeoJsonLayer(newName || "Map Tools", mtFC(features));
    mtToast(`${features.length} feature${features.length > 1 ? "s" : ""} added to the new layer "${newName}".`);
    mtFit(features);
    return id;
  }
  const cur = app.getLayerFeatures?.(target) || [];
  const ok = app.updateGeoJsonLayer?.(target, mtFC([...cur, ...features]));
  if (!ok) return mtToast("That layer cannot take new features (not a GeoJSON layer, or open in the editor).", "warn");
  mtToast(`${features.length} feature${features.length > 1 ? "s" : ""} added.`);
  mtFit(features);
  return target;
}
function mtReplaceFeatures(layerId, keep, add = []) {
  const ok = mtApp().updateGeoJsonLayer?.(layerId, mtFC([...keep, ...add]));
  if (!ok) mtToast("This layer cannot be changed (not a GeoJSON layer, or open in the editor).", "warn");
  return ok;
}
// a selected feature and a layer feature are the same when their ids match, or
// (no id) their geometry does — the host may add its own fields to a selection
const mtSame = (a, b) => (a?.id != null && b?.id != null ? a.id === b.id : JSON.stringify(a?.geometry) === JSON.stringify(b?.geometry));
function mtSelection() {
  const app = mtApp();
  const layerId = app.getSelectedLayerId?.() || null;
  const feats = app.getSelectedFeatures?.() || [];
  return { layerId, feats };
}

// ---------------------------------------------------------------- UI (works in Data View, composer closed)
function mtRoot() {
  let r = document.querySelector(`.${NS}-mtroot`);
  if (!r) {
    r = el("div", { class: `${NS}-root ${NS}-mtroot` });
    document.body.appendChild(r);
  }
  return r;
}
// copy text, falling back to a hidden text box when the clipboard API is refused
// (e.g. the window is not focused); always tells the user what happened
function mtClip(text) {
  const fallback = () => {
    const ta = el("textarea", { style: { position: "fixed", left: "-9999px", top: "0" } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    mtToast(ok ? `Copied: ${text}` : `Copy this: ${text}`, ok ? "info" : "warn");
  };
  if (!navigator.clipboard?.writeText) return fallback();
  navigator.clipboard.writeText(text).then(() => mtToast(`Copied: ${text}`), fallback);
}
function mtToast(msg, kind = "info") {
  const r = mtRoot();
  let box = r.querySelector(`.${NS}-mttoasts`);
  if (!box) r.appendChild((box = el("div", { class: `${NS}-mttoasts` })));
  const t = el("div", { class: `${NS}-mttoast ${kind}` }, msg);
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === "warn" ? 6000 : 3500);
}
function mtField(label, ctl, hint) {
  return el("label", { class: `${NS}-dlgfield` }, el("span", {}, label), ctl, hint ? el("small", { class: `${NS}-muted` }, hint) : null);
}
function mtInput(value = "", attrs = {}) {
  return el("input", { class: `${NS}-input`, value, spellcheck: "false", ...attrs });
}
function mtSelect(opts, value) {
  return el("select", { class: `${NS}-input` }, ...opts.map(([v, l]) => el("option", { value: v, selected: String(v) === String(value) }, l)));
}
function mtArea(value = "", rows = 6, placeholder = "") {
  const t = el("textarea", { class: `${NS}-input ${NS}-code`, rows, spellcheck: "false", placeholder });
  t.value = value;
  return t;
}
// existingOnly: "add to an existing layer" — the selected layer first, no "new layer"
function mtTargetSelect(defaultNew, existingOnly = false) {
  const layers = mtVectorLayers().map((l) => [l.id, `Add to: ${l.name || l.id}`]);
  const opts = existingOnly && layers.length ? layers : [["__new", `New layer: ${defaultNew}`], ...layers];
  const selected = mtApp()?.getSelectedLayerId?.();
  return mtSelect(opts, existingOnly && layers.some(([id]) => id === selected) ? selected : opts[0][0]);
}
function mtUnits(value = "km") {
  return mtSelect(Object.entries(MT_UNITS).map(([k, [l]]) => [k, l]), value);
}
// a dialog: onOk returns false to stay open
function mtDialog({ title, sub, body, ok = "OK", onOk, wide = false }) {
  const r = mtRoot();
  r.querySelector(`.${NS}-modal`)?.remove();
  const overlay = el("div", { class: `${NS}-modal` });
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener("keydown", onKey, true);
  const run = async () => {
    try {
      if ((await onOk?.()) !== false) close();
    } catch (e) {
      mtToast(String(e?.message || e), "warn");
    }
  };
  overlay.appendChild(el("div", { class: `${NS}-dlg ${wide ? `${NS}-dlgwide2` : ""}`, role: "dialog", "aria-label": title },
    el("div", { class: `${NS}-dlghead` }, el("div", {}, el("div", { class: `${NS}-dlgtitle` }, title), sub ? el("div", { class: `${NS}-dlgsub` }, sub) : null), iconBtn("close", "Close (Esc)", close)),
    el("div", { class: `${NS}-dlgbody ${NS}-mtbody` }, ...body),
    el("div", { class: `${NS}-dlgfoot` },
      el("button", { type: "button", class: `${NS}-btn`, onclick: close }, onOk ? "Cancel" : "Close"),
      onOk ? el("button", { type: "button", class: `${NS}-btn primary`, onclick: run }, ok) : null,
    ),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  r.appendChild(overlay);
  overlay.querySelector("input, textarea, select")?.focus();
  return close;
}
// lines of "coordinate ; name" → [{c:[lng,lat], name}]; throws on the first bad line
function mtParseLines(text) {
  const out = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return out.push(null); // blank line = break between parts
    const [coord, ...rest] = line.split(/\s*[|;]\s*(?=[^\d\s-]|$)|\s*\|\s*/);
    const c = parseCoord(coord);
    if (!c) throw new Error(`Line ${i + 1}: "${coord.trim()}" is not a coordinate (DD, DMS, DDM, UTM or MGRS).`);
    out.push({ c, name: rest.join(" ").trim() });
  });
  return out;
}
const mtCenterHere = () => {
  const c = mainMap()?.getCenter();
  return c ? formatCoord(c.lng, c.lat, mtSettings().format) : "";
};

// ---------------------------------------------------------------- navigate
function mtGoTo() {
  const inp = mtInput(mtCenterHere(), { placeholder: "e.g. 49M BM 12345 67890 · 6°58'S 108°35'E · -6.98, 108.59" });
  const zoom = mtInput("15", { type: "number", min: 1, max: 22 });
  mtDialog({
    title: "Go to coordinate",
    sub: "MGRS, UTM, DD, DMS or DDM — typed or pasted",
    body: [mtField("Coordinate", inp), mtField("Zoom level", zoom)],
    ok: "Go",
    onOk: () => {
      const c = parseCoord(inp.value);
      if (!c) throw new Error("That is not a coordinate this tool can read.");
      const m = mainMap();
      m.flyTo({ center: c, zoom: parseFloat(zoom.value) || 15 });
      mtMark(c);
      mtToast(`${formatCoord(c[0], c[1], "dd")} · ${toMGRS(c[0], c[1])}`);
    },
  });
}
function mtMark(c) {
  const Ctor = MapCtor?.();
  MT.marker?.remove();
  if (!Ctor?.Marker) return;
  MT.marker = new Ctor.Marker({ color: "#e11d48" }).setLngLat(c).addTo(mainMap());
  setTimeout(() => {
    MT.marker?.remove();
    MT.marker = null;
  }, 15000);
}
function mtZoomScale() {
  const m = mainMap();
  const cur = m ? Math.round((EARTH_CIRC * Math.cos((m.getCenter().lat * Math.PI) / 180)) / (WORLD * 2 ** m.getZoom()) * 1000 * PX96) : 50000;
  const inp = mtInput(String(cur), { type: "number", min: 1, step: 1000 });
  const pre = mtSelect([["", "Round scales…"], ...[1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000].map((s) => [s, `1 : ${fmtNumber(s)}`])], "");
  pre.addEventListener("change", () => pre.value && (inp.value = pre.value));
  mtDialog({
    title: "Zoom to scale",
    sub: "Screen scale at 96 dpi, at the map centre",
    body: [mtField("Scale 1 :", inp), pre],
    ok: "Zoom",
    onOk: () => {
      const v = parseFloat(inp.value);
      if (!(v > 0)) throw new Error("Type a scale such as 50000.");
      m.easeTo({ zoom: zoomForScale(v, m.getCenter().lat) });
    },
  });
}
function mtZoomLayer() {
  const layers = (glLayers() || []).filter((l) => layerBounds(l.id));
  if (!layers.length) return mtToast("No layer with features to zoom to.", "warn");
  const sel = mtSelect(layers.map((l) => [l.id, l.name || l.id]), mtApp().getSelectedLayerId?.() || layers[0].id);
  mtDialog({
    title: "Zoom to layer",
    body: [mtField("Layer", sel)],
    ok: "Zoom",
    onOk: () => {
      const b = layerBounds(sel.value);
      if (b) mtApp().fitBounds ? mtApp().fitBounds([b.west, b.south, b.east, b.north]) : mainMap().fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 40 });
    },
  });
}

// ---------------------------------------------------------------- create features
function mtCreate(kind, existing = false) {
  const names = { point: "Points", line: "Lines", polygon: "Polygons" };
  const help = {
    point: "One point per line: coordinate, then | and an optional name.\n49M BM 12345 67890 | Post 1\n6°58'48\"S 108°35'24\"E | Post 2\n-6.98, 108.59",
    line: "One vertex per line, in order. A blank line starts a new line feature.",
    polygon: "One vertex per line, in order (it is closed for you). A blank line starts a new polygon.",
  };
  const ta = mtArea("", 9, help[kind]);
  const name = mtInput(`${names[kind]} (Map Tools)`);
  const target = mtTargetSelect(names[kind], existing);
  if (existing && target.value === "__new") mtToast("No layer that can take features yet: they go to a new layer.", "warn");
  const curve = el("input", { type: "checkbox" });
  mtDialog({
    title: `${existing ? "Add" : "Create"} ${kind === "line" ? "lines / polylines" : `${kind}s`} from coordinates`,
    sub: "DD, DMS, DDM, UTM or MGRS — any mix",
    wide: true,
    body: [
      mtField("Coordinates", ta),
      el("div", { class: `${NS}-grid2` }, mtField("Put them in", target), mtField("New layer name", name)),
      kind === "line" ? el("label", { class: `${NS}-check` }, curve, el("span", {}, "Follow the earth's curve (geodesic segments)")) : null,
      el("button", { type: "button", class: `${NS}-btn`, onclick: () => (ta.value += `${ta.value && !ta.value.endsWith("\n") ? "\n" : ""}${mtCenterHere()}\n`) }, "Insert the map centre"),
    ],
    ok: existing ? "Add" : "Create",
    onOk: () => {
      const rows = mtParseLines(ta.value);
      const feats = [];
      if (kind === "point") {
        rows.filter(Boolean).forEach((r, i) => feats.push({ type: "Feature", properties: { name: r.name || `Point ${i + 1}`, mgrs: toMGRS(r.c[0], r.c[1]) }, geometry: { type: "Point", coordinates: r.c } }));
      } else {
        const parts = [];
        let cur = [];
        for (const r of rows) {
          if (!r) {
            if (cur.length) parts.push(cur);
            cur = [];
          } else cur.push(r);
        }
        if (cur.length) parts.push(cur);
        parts.forEach((p, i) => {
          let coords = p.map((r) => r.c);
          const label = p.find((r) => r.name)?.name || `${kind === "line" ? "Line" : "Polygon"} ${i + 1}`;
          if (kind === "line") {
            if (coords.length < 2) throw new Error(`${label}: a line needs at least two points.`);
            if (curve.checked) coords = mtGeodesicLine(coords);
            feats.push({ type: "Feature", properties: { name: label }, geometry: { type: "LineString", coordinates: coords } });
          } else {
            if (coords.length < 3) throw new Error(`${label}: a polygon needs at least three points.`);
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) coords = [...coords, first];
            feats.push({ type: "Feature", properties: { name: label }, geometry: { type: "Polygon", coordinates: [coords] } });
          }
        });
      }
      mtAddFeatures(target.value, feats, name.value.trim() || names[kind]);
    },
  });
}
// densify each segment along the great circle (inverse via small steps on the sphere)
function mtGeodesicLine(coords) {
  const r = Math.PI / 180;
  const out = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const [l1, p1] = coords[i - 1].map((v) => v * r);
    const [l2, p2] = coords[i].map((v) => v * r);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    const n = Math.max(1, Math.ceil(d / (r * 0.5)));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      const A = Math.sin((1 - f) * d) / Math.sin(d || 1);
      const B = Math.sin(f * d) / Math.sin(d || 1);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      const z = A * Math.sin(p1) + B * Math.sin(p2);
      out.push(d ? [round(Math.atan2(y, x) / r, 8), round(Math.atan2(z, Math.hypot(x, y)) / r, 8)] : coords[i]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- import CSV / spreadsheet / text
function mtSplitRow(line, sep) {
  if (sep !== ",") return line.split(sep);
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
function mtParseTable(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return null;
  const head = lines[0];
  const sep = head.includes("\t") ? "\t" : (head.match(/;/g) || []).length > (head.match(/,/g) || []).length ? ";" : ",";
  const cols = mtSplitRow(head, sep).map((c) => c.trim());
  const rows = lines.slice(1).map((l) => mtSplitRow(l, sep).map((c) => c.trim()));
  return { cols, rows };
}
function mtImportTable() {
  const ta = mtArea("", 8, "Paste rows copied from Excel / Google Sheets, or open a CSV / TSV file.\nThe first row holds the column names.");
  const file = el("input", { type: "file", accept: ".csv,.tsv,.txt", style: { display: "none" } });
  const xCol = mtSelect([], "");
  const yCol = mtSelect([], "");
  const cCol = mtSelect([], "");
  const mode = mtSelect([["xy", "X (longitude / easting) and Y (latitude / northing) columns"], ["one", "One column with the whole coordinate (MGRS, DMS, …)"], ["utm", "UTM: zone, easting and northing columns"]], "xy");
  const zone = mtInput("49", { placeholder: "UTM zone, e.g. 49" });
  const hemi = mtSelect([["S", "South"], ["N", "North"]], "S");
  const name = mtInput("Imported points");
  const target = mtTargetSelect("Imported points");
  const status = el("p", { class: `${NS}-muted` }, "");
  let table = null;
  const refresh = () => {
    table = mtParseTable(ta.value);
    const opts = table ? table.cols.map((c, i) => [i, c || `Column ${i + 1}`]) : [];
    for (const [s, guess] of [[xCol, /^(x|lon|lng|long|longitude|bujur|easting|e)$/i], [yCol, /^(y|lat|latitude|lintang|northing|n)$/i], [cCol, /(mgrs|coord|koordinat|location|lokasi)/i]]) {
      s.replaceChildren(...opts.map(([v, l]) => el("option", { value: v }, l)));
      const g = opts.find(([, l]) => guess.test(l));
      if (g) s.value = g[0];
    }
    status.textContent = table ? `${table.rows.length} rows, ${table.cols.length} columns` : "";
  };
  ta.addEventListener("input", refresh);
  file.addEventListener("change", () => {
    const f = file.files?.[0];
    if (!f) return;
    f.text().then((t) => {
      ta.value = t;
      name.value = f.name.replace(/\.[^.]+$/, "");
      refresh();
    });
  });
  mtDialog({
    title: "Import points from a table",
    sub: "CSV, TSV or rows pasted from a spreadsheet — the other columns become attributes",
    wide: true,
    body: [
      el("div", { class: `${NS}-btnrow` }, el("button", { type: "button", class: `${NS}-btn`, onclick: () => file.click() }, "Open CSV / TSV file…"), file, status),
      ta,
      mtField("Coordinates are in", mode),
      el("div", { class: `${NS}-grid2` }, mtField("X / Easting column", xCol), mtField("Y / Northing column", yCol)),
      mtField("Coordinate column", cCol),
      el("div", { class: `${NS}-grid2` }, mtField("UTM zone", zone), mtField("Hemisphere", hemi)),
      el("div", { class: `${NS}-grid2` }, mtField("Put them in", target), mtField("New layer name", name)),
    ],
    ok: "Import",
    onOk: () => {
      if (!table?.rows.length) throw new Error("Paste or open a table first.");
      const feats = [];
      const bad = [];
      table.rows.forEach((r, i) => {
        let c = null;
        if (mode.value === "one") c = parseCoord(r[+cCol.value]);
        else if (mode.value === "utm") {
          const E = parseFloat(r[+xCol.value]);
          const N = parseFloat(r[+yCol.value]);
          if (Number.isFinite(E) && Number.isFinite(N)) c = UTM.inverse(E, N, parseInt(zone.value, 10) || 49, hemi.value === "S");
        } else {
          const x = parseAngle(r[+xCol.value]);
          const y = parseAngle(r[+yCol.value]);
          if (x != null && y != null && Math.abs(y) <= 90 && Math.abs(x) <= 180) c = [x, y];
        }
        if (!c) return bad.push(i + 2);
        const props = {};
        table.cols.forEach((k, j) => {
          const v = r[j];
          props[k || `col${j + 1}`] = v !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
        });
        feats.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: c } });
      });
      if (!feats.length) throw new Error("No row had a readable coordinate — check the columns.");
      mtAddFeatures(target.value, feats, name.value.trim() || "Imported points");
      if (bad.length) mtToast(`${bad.length} row(s) skipped (no coordinate): ${bad.slice(0, 8).join(", ")}${bad.length > 8 ? "…" : ""}`, "warn");
    },
  });
}
// WKT (POINT, LINESTRING, POLYGON, MULTI…), GeoJSON, or coordinate lists
function mtParseWKT(text) {
  const feats = [];
  const re = /(MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|POINT|LINESTRING|POLYGON)\s*Z?M?\s*(\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))/gi;
  const pts = (s) => s.trim().replace(/^\(|\)$/g, "").split(",").map((p) => p.trim().split(/\s+/).slice(0, 2).map(Number));
  const rings = (s) => (s.trim().slice(1, -1).match(/\([^()]*\)/g) || []).map(pts);
  let m;
  while ((m = re.exec(text))) {
    const t = m[1].toUpperCase();
    const body = m[2];
    let g = null;
    if (t === "POINT") g = { type: "Point", coordinates: pts(body)[0] };
    else if (t === "LINESTRING") g = { type: "LineString", coordinates: pts(body) };
    else if (t === "POLYGON") g = { type: "Polygon", coordinates: rings(body) };
    else if (t === "MULTIPOINT") g = { type: "MultiPoint", coordinates: body.slice(1, -1).replace(/[()]/g, "").split(",").map((p) => p.trim().split(/\s+/).slice(0, 2).map(Number)) };
    else if (t === "MULTILINESTRING") g = { type: "MultiLineString", coordinates: rings(body) };
    else if (t === "MULTIPOLYGON") g = { type: "MultiPolygon", coordinates: (body.slice(1, -1).match(/\((?:[^()]|\([^()]*\))*\)/g) || []).map(rings) };
    if (g) feats.push({ type: "Feature", properties: { name: `${t[0]}${t.slice(1).toLowerCase()} ${feats.length + 1}` }, geometry: g });
  }
  return feats;
}
function mtImportText() {
  const ta = mtArea("", 10, "WKT:  POLYGON((108.5 -7.0, 108.6 -7.0, 108.6 -6.9, 108.5 -7.0))\nGeoJSON: a Feature, FeatureCollection or geometry\nor a list of coordinates (one per line, any format)");
  const as = mtSelect([["auto", "Detect (WKT, GeoJSON, or list)"], ["line", "List → one line"], ["polygon", "List → one polygon"], ["point", "List → points"]], "auto");
  const name = mtInput("Imported features");
  const target = mtTargetSelect("Imported features");
  mtDialog({
    title: "Import lines / polygons from text",
    sub: "Well-known text, GeoJSON or plain coordinate lists",
    wide: true,
    body: [ta, mtField("Read as", as), el("div", { class: `${NS}-grid2` }, mtField("Put them in", target), mtField("New layer name", name))],
    ok: "Import",
    onOk: () => {
      const s = ta.value.trim();
      let feats = [];
      if (as.value === "auto" && /^[{[]/.test(s)) {
        const j = JSON.parse(s);
        feats = j.type === "FeatureCollection" ? j.features : j.type === "Feature" ? [j] : [{ type: "Feature", properties: {}, geometry: j }];
      } else if (as.value === "auto" && /\b(POINT|LINESTRING|POLYGON)/i.test(s)) feats = mtParseWKT(s);
      else {
        const rows = mtParseLines(s).filter(Boolean);
        const coords = rows.map((r) => r.c);
        const kind = as.value === "auto" ? (coords.length > 2 && coords[0].join() === coords[coords.length - 1].join() ? "polygon" : "line") : as.value;
        if (kind === "point") feats = rows.map((r, i) => ({ type: "Feature", properties: { name: r.name || `Point ${i + 1}` }, geometry: { type: "Point", coordinates: r.c } }));
        else if (kind === "polygon") feats = [{ type: "Feature", properties: { name: "Polygon" }, geometry: { type: "Polygon", coordinates: [coords[0].join() === coords[coords.length - 1].join() ? coords : [...coords, coords[0]]] } }];
        else feats = [{ type: "Feature", properties: { name: "Line" }, geometry: { type: "LineString", coordinates: coords } }];
      }
      if (!feats.length) throw new Error("Nothing readable in the text.");
      mtAddFeatures(target.value, feats, name.value.trim() || "Imported features");
    },
  });
}

// ---------------------------------------------------------------- edit selected features
function mtMapCoords(g, fn) {
  const m = (c) => (typeof c[0] === "number" ? fn(c) : c.map(m));
  return { ...g, coordinates: m(g.coordinates) };
}
function mtMoveSelected() {
  const { layerId, feats } = mtSelection();
  if (!layerId || !feats.length) return mtToast("Select the feature(s) to move on the map first.", "warn");
  const how = mtSelect([["offset", "Move by a distance and direction"], ["to", "Move so the centre lands on a coordinate"]], "offset");
  const dist = mtInput("100", { type: "number", step: "any" });
  const unit = mtUnits("m");
  const brg = mtInput("0", { type: "number", step: "any" });
  const to = mtInput(mtCenterHere());
  mtDialog({
    title: `Move ${feats.length} selected feature${feats.length > 1 ? "s" : ""}`,
    body: [mtField("How", how), el("div", { class: `${NS}-grid3` }, mtField("Distance", dist), mtField("Units", unit), mtField("Direction (° from north)", brg)), mtField("New centre coordinate", to)],
    ok: "Move",
    onOk: () => {
      const all = mtApp().getLayerFeatures(layerId) || [];
      const b = mtBBox(feats);
      const cx = (b[0] + b[2]) / 2;
      const cy = (b[1] + b[3]) / 2;
      let target;
      if (how.value === "to") {
        target = parseCoord(to.value);
        if (!target) throw new Error("The new centre is not a coordinate.");
      } else target = geoDestination(cx, cy, parseFloat(brg.value) || 0, (parseFloat(dist.value) || 0) * MT_UNITS[unit.value][1]);
      const dx = target[0] - cx;
      const dy = target[1] - cy;
      const moved = [];
      const keep = all.filter((f) => {
        const hit = feats.some((s) => mtSame(s, f));
        if (hit) moved.push({ ...f, geometry: mtMapCoords(f.geometry, (c) => [round(c[0] + dx, 8), round(c[1] + dy, 8), ...c.slice(2)]) });
        return !hit;
      });
      if (!moved.length) throw new Error("The selected features were not found in the layer.");
      if (mtReplaceFeatures(layerId, keep, moved)) mtToast(`${moved.length} feature(s) moved.`);
    },
  });
}
function mtDeleteSelected() {
  const { layerId, feats } = mtSelection();
  if (!layerId || !feats.length) return mtToast("Select the feature(s) to delete on the map first.", "warn");
  mtDialog({
    title: `Delete ${feats.length} selected feature${feats.length > 1 ? "s" : ""}?`,
    body: [el("p", {}, "They are removed from the layer. Undo it with GeoLibre's undo, or re-import them.")],
    ok: "Delete",
    onOk: () => {
      const all = mtApp().getLayerFeatures(layerId) || [];
      const keep = all.filter((f) => !feats.some((s) => mtSame(s, f)));
      if (mtReplaceFeatures(layerId, keep)) mtToast(`${all.length - keep.length} feature(s) deleted.`);
    },
  });
}

// ---------------------------------------------------------------- map chips (PNG + world file)
async function mtCapture(bbox, outW, outH) {
  const m = mainMap();
  const before = { center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
  m.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 0, bearing: 0, pitch: 0, animate: false });
  // a chip larger than the screen: render the map at a higher pixel ratio for a while (sharp, not upscaled)
  const prevRatio = m.getPixelRatio?.();
  const cssW = Math.max(1, m.project([bbox[2], bbox[1]]).x - m.project([bbox[0], bbox[3]]).x);
  const want = clamp(outW / cssW, 1, 4);
  if (m.setPixelRatio && prevRatio && want > prevRatio + 0.05) m.setPixelRatio(want);
  // wait for the map to settle, but never hang on an "idle" that does not come
  const settle = (fn) => Promise.race([new Promise(fn), new Promise((res) => setTimeout(res, 6000))]);
  await settle((res) => (m.loaded() && m.areTilesLoaded?.() ? setTimeout(res, 150) : m.once("idle", res)));
  await settle((res) => {
    m.once("idle", res);
    m.triggerRepaint();
  });
  const url = await new Promise((res) => {
    m.once("render", () => res(m.getCanvas().toDataURL("image/png")));
    m.triggerRepaint();
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const canvas = m.getCanvas();
  const k = canvas.width / canvas.clientWidth;
  const a = m.project([bbox[0], bbox[3]]);
  const b = m.project([bbox[2], bbox[1]]);
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  out.getContext("2d").drawImage(img, a.x * k, a.y * k, (b.x - a.x) * k, (b.y - a.y) * k, 0, 0, outW, outH);
  if (m.setPixelRatio && prevRatio && m.getPixelRatio() !== prevRatio) m.setPixelRatio(prevRatio);
  m.jumpTo(before);
  return out;
}
function mtWorldFile(bbox, w, h) {
  const R = 6378137;
  const mx = (lng) => (lng * Math.PI * R) / 180;
  const my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const x0 = mx(bbox[0]);
  const x1 = mx(bbox[2]);
  const y0 = my(bbox[1]);
  const y1 = my(bbox[3]);
  const A = (x1 - x0) / w;
  const E = -(y1 - y0) / h;
  return [A, 0, 0, E, x0 + A / 2, y1 + E / 2].map((v) => v.toFixed(10)).join("\n") + "\n";
}
function mtChip(kind) {
  let poly = null;
  if (kind === "polygon") {
    const { feats } = mtSelection();
    poly = feats.find((f) => /Polygon/.test(f?.geometry?.type || ""));
    if (!poly) return mtToast("Select a polygon on the map first.", "warn");
  }
  const center = mtInput(mtCenterHere());
  const wkm = mtInput("2", { type: "number", step: "any", min: 0 });
  const hkm = mtInput("2", { type: "number", step: "any", min: 0 });
  const unit = mtUnits("km");
  const px = mtInput("1024", { type: "number", min: 64, max: 8192, step: 64 });
  const name = mtInput("map-chip");
  mtDialog({
    title: kind === "polygon" ? "Map chip from the selected polygon" : "Map chip around a point",
    sub: "Saves the map area as PNG with a .pgw world file (EPSG:3857, Web Mercator)",
    body: [
      kind === "point" ? mtField("Centre coordinate", center) : el("p", { class: `${NS}-muted` }, "The chip covers the polygon's extent."),
      kind === "point" ? el("div", { class: `${NS}-grid3` }, mtField("Width", wkm), mtField("Height", hkm), mtField("Units", unit)) : null,
      el("div", { class: `${NS}-grid2` }, mtField("Image width (px)", px), mtField("File name", name)),
    ],
    ok: "Save chip",
    onOk: async () => {
      let bbox;
      if (poly) bbox = mtBBox([poly]);
      else {
        const c = parseCoord(center.value);
        if (!c) throw new Error("The centre is not a coordinate.");
        const f = MT_UNITS[unit.value][1];
        const hw = ((parseFloat(wkm.value) || 1) * f) / 2;
        const hh = ((parseFloat(hkm.value) || 1) * f) / 2;
        const e = geoDestination(c[0], c[1], 90, hw)[0];
        const w = geoDestination(c[0], c[1], 270, hw)[0];
        const n = geoDestination(c[0], c[1], 0, hh)[1];
        const s = geoDestination(c[0], c[1], 180, hh)[1];
        bbox = [w, s, e, n];
      }
      const R = 6378137;
      const my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
      const W = clamp(parseInt(px.value, 10) || 1024, 64, 8192);
      const ratio = (my(bbox[3]) - my(bbox[1])) / (((bbox[2] - bbox[0]) * Math.PI * R) / 180);
      const H = Math.max(1, Math.round(W * ratio));
      mtToast("Rendering the chip…");
      const cv = await mtCapture(bbox, W, H);
      const base = (name.value.trim() || "map-chip").replace(/[^\w.-]+/g, "_");
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      downloadBlob(blob, `${base}.png`);
      setTimeout(() => downloadBlob(new Blob([mtWorldFile(bbox, W, H)], { type: "text/plain" }), `${base}.pgw`), 600);
    },
  });
}

// ---------------------------------------------------------------- imagery: footprints, overlap at a point
function mtRasterExtents() {
  const out = [];
  const m = mainMap();
  let style = null;
  try {
    style = m?.getStyle();
  } catch {}
  for (const l of allProjectLayers()) {
    if (!isDataRaster(l) && !isTileLayer(l)) continue;
    const md = l.metadata || {};
    let b = md.bounds || md.bbox || l.bounds || l.source?.bounds || md.rasterState?.bounds;
    if (!b && style) {
      for (const sl of styleLayersFor(style, l.id)) {
        const src = style.sources?.[sl.source];
        if (src?.bounds) b = src.bounds;
        else if (src?.coordinates) {
          const xs = src.coordinates.map((c) => c[0]);
          const ys = src.coordinates.map((c) => c[1]);
          b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        }
        if (b) break;
      }
    }
    if (Array.isArray(b) && b.length >= 4 && b.every(Number.isFinite) && !(b[0] <= -179 && b[2] >= 179)) out.push({ id: l.id, name: l.name || l.id, b });
  }
  return out;
}
function mtFootprints() {
  const ext = mtRasterExtents();
  if (!ext.length) return mtToast("No raster / image layer with a known extent in the project.", "warn");
  const feats = ext.map((e) => ({ type: "Feature", properties: { name: e.name, layer_id: e.id }, geometry: { type: "Polygon", coordinates: [[[e.b[0], e.b[1]], [e.b[2], e.b[1]], [e.b[2], e.b[3]], [e.b[0], e.b[3]], [e.b[0], e.b[1]]]] } }));
  mtAddFeatures("__new", feats, "Image footprints (map catalog)");
}
function mtOverlapAt() {
  const inp = mtInput(mtCenterHere());
  mtDialog({
    title: "Images covering a point",
    sub: "Which raster / image layers overlap here (top of the list = drawn on top)",
    body: [mtField("Coordinate", inp)],
    ok: "Find",
    onOk: () => {
      const c = parseCoord(inp.value);
      if (!c) throw new Error("That is not a coordinate.");
      const hits = mtRasterExtents().filter((e) => c[0] >= e.b[0] && c[0] <= e.b[2] && c[1] >= e.b[1] && c[1] <= e.b[3]);
      mtDialog({ title: `${hits.length} image layer${hits.length === 1 ? "" : "s"} here`, body: [hits.length ? el("ol", { class: `${NS}-mtlist` }, ...hits.reverse().map((h) => el("li", {}, h.name))) : el("p", {}, "No image covers this point.")] });
      return false;
    },
  });
}

// ---------------------------------------------------------------- coordinates: converter, settings, right-click copy, cursor readout
function mtConverter() {
  const inp = mtInput(mtCenterHere(), { placeholder: "any format" });
  const outBox = el("div", { class: `${NS}-mtconv` });
  const draw = () => {
    const c = parseCoord(inp.value);
    outBox.replaceChildren(...(c ? MT_FORMATS.map(([f, l]) => {
      const v = formatCoord(c[0], c[1], f);
      return el("div", { class: `${NS}-mtconvrow` }, el("span", {}, l), el("code", {}, v), el("button", { type: "button", class: `${NS}-btn`, onclick: () => mtClip(v) }, "Copy"));
    }) : [el("p", { class: `${NS}-muted` }, "Type a coordinate in any format.")]));
  };
  inp.addEventListener("input", draw);
  draw();
  mtDialog({ title: "Coordinate conversion", sub: "Type or paste once, read it in every format", wide: true, body: [mtField("Coordinate", inp), outBox] });
}
function mtSettingsDialog() {
  const st = mtSettings();
  const fmt = mtSelect(MT_FORMATS, st.format);
  const prec = mtSelect([[1, "10 km (1 digit)"], [2, "1 km (2)"], [3, "100 m (3)"], [4, "10 m (4)"], [5, "1 m (5)"]], st.precision);
  const dec = mtInput(String(st.decimals), { type: "number", min: 0, max: 9 });
  const tpl = mtInput(st.template, { placeholder: "{coord}" });
  const rc = el("input", { type: "checkbox", checked: st.rightClick });
  const cur = el("input", { type: "checkbox", checked: st.cursor });
  mtDialog({
    title: "Coordinate settings",
    sub: "Used by every Map Tools box, the right-click copy and the cursor readout",
    body: [
      mtField("Default coordinate format", fmt),
      el("div", { class: `${NS}-grid2` }, mtField("MGRS precision", prec), mtField("Decimal places (DD)", dec)),
      mtField("Copied text", tpl, "Use {coord}, {mgrs}, {dd}, {dms}, {ddm}, {utm}, {lat}, {lng} — e.g. \"Grid {mgrs} ({dd})\""),
      el("label", { class: `${NS}-check` }, rc, el("span", {}, "Right-click on the map copies the coordinate")),
      el("label", { class: `${NS}-check` }, cur, el("span", {}, "Show the cursor coordinate on the map")),
    ],
    ok: "Save",
    onOk: () => {
      mtSaveSettings({ format: fmt.value, precision: +prec.value, decimals: clamp(parseInt(dec.value, 10) || 6, 0, 9), template: tpl.value || "{coord}", rightClick: rc.checked, cursor: cur.checked });
      mtBindMap();
      mtToast("Coordinate settings saved.");
    },
  });
}
function mtCopyText(lng, lat) {
  const st = mtSettings();
  const vals = { coord: formatCoord(lng, lat, st.format, st), mgrs: toMGRS(lng, lat, st.precision), dd: formatCoord(lng, lat, "dd", st), dms: formatCoord(lng, lat, "dms", st), ddm: formatCoord(lng, lat, "ddm", st), utm: formatCoord(lng, lat, "utm", st), lat: lat.toFixed(st.decimals), lng: lng.toFixed(st.decimals) };
  return String(st.template || "{coord}").replace(/\{(\w+)\}/g, (m, k) => vals[k] ?? m);
}
// right-click copy + cursor readout, (re)bound to GeoLibre's map
function mtBindMap() {
  const m = mainMap();
  if (!m) return;
  const st = mtSettings();
  if (MT.ctxBound && MT.ctxBound.map === m) {
    m.off("contextmenu", MT.ctxBound.ctx);
    m.off("mousemove", MT.ctxBound.move);
  }
  const ctx = (e) => {
    if (!mtSettings().rightClick) return;
    mtClip(mtCopyText(e.lngLat.lng, e.lngLat.lat));
  };
  const move = (e) => {
    if (!MT.cursorEl) return;
    MT.cursorEl.textContent = formatCoord(e.lngLat.lng, e.lngLat.lat, mtSettings().format);
  };
  m.on("contextmenu", ctx);
  m.on("mousemove", move);
  MT.ctxBound = { map: m, ctx, move };
  MT.cursorEl?.remove();
  MT.cursorEl = null;
  if (st.cursor) {
    MT.cursorEl = el("div", { class: `${NS}-mtcursor` }, "—");
    m.getContainer().appendChild(MT.cursorEl);
  }
}

// ---------------------------------------------------------------- the GeoLibre menu
function mapToolsMenu() {
  const ic = (k) => (MT_ICONS[k] ? menuIcon(MT_ICONS[k]) : undefined);
  const a = (id, label, fn, k) => ({ id, label, icon: ic(k), onSelect: () => {
    try {
      fn();
    } catch (e) {
      mtToast(String(e?.message || e), "warn");
    }
  } });
  const sep = (id) => ({ type: "separator", id });
  const sub = (id, label, items, k) => ({ type: "submenu", id, label, icon: ic(k), items });
  return {
    id: `${PLUGIN_ID}-maptools`,
    label: "Map Tools",
    items: [
      sub("nav", "Navigate", [a("goto", "Go to Coordinate (MGRS, UTM, DD, DMS)…", mtGoTo, "goto"), a("scale", "Zoom to Scale…", mtZoomScale, "scale"), a("layer", "Zoom to Layer…", mtZoomLayer, "layer")], "goto"),
      sub("create", "Create Features", [
        a("pts", "Points from Coordinates…", () => mtCreate("point"), "point"),
        a("lines", "Lines / Polylines from Coordinates…", () => mtCreate("line"), "line"),
        a("polys", "Polygons from Coordinates…", () => mtCreate("polygon"), "polygon"),
        sep("c1"),
        a("csv", "Import Points from CSV / Spreadsheet…", mtImportTable, "table"),
        a("text", "Import Lines / Polygons from Text (WKT, GeoJSON)…", mtImportText, "wkt"),
      ], "point"),
      sub("edit", "Edit Features", [
        a("addp", "Add Points to Existing Layer…", () => mtCreate("point", true), "addto"),
        a("addl", "Add Lines to Existing Layer…", () => mtCreate("line", true), "addto"),
        a("adda", "Add Polygons to Existing Layer…", () => mtCreate("polygon", true), "addto"),
        sep("e1"),
        a("move", "Move Selected Features…", mtMoveSelected, "move"),
        a("del", "Delete Selected Features…", mtDeleteSelected, "trash"),
      ], "move"),
      sub("chips", "Map Chips", [a("chp", "Chip around a Point…", () => mtChip("point"), "chip"), a("chg", "Chip from Selected Polygon…", () => mtChip("polygon"), "chippoly")], "chip"),
      sub("img", "Imagery", [a("fp", "Image Footprints (Map Catalog)", mtFootprints, "footprint"), a("ov", "Images Covering a Point…", mtOverlapAt, "overlap")], "footprint"),
      sep("m1"),
      a("cat", "Category Colors (layer symbology)…", () => openCategoryColors(), "palette"),
      a("conv", "Coordinate Conversion…", mtConverter, "convert"),
      a("cset", "Coordinate Settings…", mtSettingsDialog, "settings"),
    ],
  };
}

// ---------------------------------------------------------------- Map Tools ribbon (ArcGIS Pro style)
// The same tools as large buttons in tabs: docked across the top of GeoLibre's
// map in the Data View, and as a "Map Tools" tab of the composer's ribbon.
const MT_ICONS = {
  goto: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  scale: '<path d="M3 15h18v4H3z"/><path d="M7 15v-3M11 15v-4M15 15v-3M19 15v-4"/>',
  layer: '<path d="M12 3 2 8l10 5 10-5z"/><path d="m2 13 10 5 10-5"/>',
  extent: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8" y="8" width="8" height="8"/>',
  point: '<path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  line: '<path d="M4 18 9 9l5 6 6-10"/><circle cx="4" cy="18" r="1.6" fill="currentColor"/><circle cx="20" cy="5" r="1.6" fill="currentColor"/>',
  polygon: '<path d="M5 8l7-5 7 6-2 10H7z"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16"/>',
  wkt: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/><path d="M13.5 5l-3 14"/>',
  addto: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M19 14v6M16 17h6"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chip: '<rect x="4" y="4" width="16" height="16"/><path d="M4 15l5-5 4 4 3-3 4 4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  chippoly: '<path d="M5 8l6-4 8 5-2 10H7z"/><path d="M8 15l3-3 3 3 2-2"/>',
  footprint: '<rect x="3" y="5" width="11" height="9"/><rect x="9" y="9" width="12" height="10" stroke-dasharray="2 2"/>',
  overlap: '<rect x="3" y="4" width="12" height="10"/><rect x="9" y="10" width="12" height="10"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  convert: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  // a gear (cog), not a sun
  settings: '<path d="M10.3 2.5h3.4l.5 2.6a7.5 7.5 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.6 7.6 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.5 7.5 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.5 7.5 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.6 7.6 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.5 7.5 0 0 1 1.9-1.1z"/><circle cx="12" cy="12" r="3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  cursor: '<path d="M5 3l12 7-5 1.5L9.5 17z"/><path d="M14 17h7M14 20h5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.4-.7-2.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="10" cy="7" r="1.3" fill="currentColor"/><circle cx="15" cy="7.5" r="1.3" fill="currentColor"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="6" y="6" width="8" height="7"/><path d="M16.5 6v3M6 16h6M15 16h3"/>',
};
// Icons for GeoLibre's menus, which take an image (URL or data URI), not markup:
// a mid grey reads on both the light and the dark theme.
function menuIcon(inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner.replace(/currentColor/g, "#64748b")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
// Layout Composer's own icon at the head of its menu: a page holding a map frame
const LC_MENU_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#0d99ff"/><rect x="5" y="5" width="14" height="14" rx="1.2" fill="#ffffff"/><rect x="6.8" y="6.8" width="7.2" height="6.2" fill="#7cc4ff"/><path d="M8 11.8l2-2.2 1.6 1.4 1.6-1.6" fill="none" stroke="#0d99ff" stroke-width="0.9" stroke-linejoin="round"/><path d="M15.8 7.2v4.4M7 15.4h4.2M13.2 15.4h3.6" stroke="#0d99ff" stroke-width="1.3" stroke-linecap="round"/></svg>')}`;
const mtIcon = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${MT_ICONS[k] || ""}</svg>`;
function mtFitAll() {
  let b = null;
  for (const l of glLayers() || []) {
    if (l.visible === false) continue;
    const lb = layerBounds(l.id);
    if (lb) b = b ? { west: Math.min(b.west, lb.west), south: Math.min(b.south, lb.south), east: Math.max(b.east, lb.east), north: Math.max(b.north, lb.north) } : lb;
  }
  if (!b) return mtToast("No layer with features to zoom to.", "warn");
  mtApp()?.fitBounds ? mtApp().fitBounds([b.west, b.south, b.east, b.north]) : mainMap()?.fitBounds([[b.west, b.south], [b.east, b.north]], { padding: 40 });
}
function mtCopyCenter() {
  const c = mainMap()?.getCenter();
  if (!c) return;
  mtClip(mtCopyText(c.lng, c.lat));
}
function mtToggleCursor() {
  mtSaveSettings({ cursor: !mtSettings().cursor });
  mtBindMap();
  mtRenderDock();
}
// tabs → groups → buttons [icon, label, title, action, isOn?]
function mtTabs() {
  return [
    ["map", "Map", [
      ["Navigate", [["goto", "Go To XY", "Go to a coordinate (MGRS, UTM, DD, DMS)", mtGoTo], ["scale", "Scale", "Zoom to a scale", mtZoomScale], ["layer", "To Layer", "Zoom to a layer", mtZoomLayer], ["extent", "Full Extent", "Zoom to all visible layers", mtFitAll]]],
      ["Coordinates", [["convert", "Convert", "Coordinate conversion", mtConverter], ["copy", "Copy Centre", "Copy the map centre coordinate", mtCopyCenter], ["cursor", "Readout", "Show the cursor coordinate on the map", mtToggleCursor, () => mtSettings().cursor], ["settings", "Settings", "Coordinate format, precision, copied text, right-click copy", mtSettingsDialog]]],
      ["Symbology", [["palette", "Category Colors", "Colour a layer by class: Distinct 200, KLHK, Plotly, Tableau, ColorBrewer", () => openCategoryColors()]]],
      ["Imagery", [["footprint", "Footprints", "Image footprints as a map-catalog layer", mtFootprints], ["overlap", "At a Point", "Images covering a point", mtOverlapAt]]],
    ]],
    ["create", "Create", [
      ["Features", [["point", "Points", "Points from coordinates", () => mtCreate("point")], ["line", "Lines", "Lines / polylines from coordinates", () => mtCreate("line")], ["polygon", "Polygons", "Polygons from coordinates", () => mtCreate("polygon")]]],
      ["Import", [["table", "CSV / Excel", "Points from CSV, TSV or pasted spreadsheet rows", mtImportTable], ["wkt", "WKT / GeoJSON", "Lines and polygons from text", mtImportText]]],
    ]],
    ["edit", "Edit", [
      ["Add to Existing Layer", [["point", "Points", "Add points to an existing layer", () => mtCreate("point", true)], ["line", "Lines", "Add lines to an existing layer", () => mtCreate("line", true)], ["polygon", "Polygons", "Add polygons to an existing layer", () => mtCreate("polygon", true)]]],
      ["Selection", [["move", "Move", "Move the selected features", mtMoveSelected], ["trash", "Delete", "Delete the selected features", mtDeleteSelected]]],
    ]],
    ["share", "Share", [
      ["Map Chips", [["chip", "By Point", "Map chip around a point (PNG + world file)", () => mtChip("point")], ["chippoly", "By Polygon", "Map chip from the selected polygon", () => mtChip("polygon")]]],
      ["Layout", [["layout", "Layout Composer", "Open the layout composer", () => openComposer()]]],
    ]],
  ];
}
function mtRun(fn) {
  try {
    const r = fn();
    if (r?.catch) r.catch((e) => mtToast(String(e?.message || e), "warn"));
  } catch (e) {
    mtToast(String(e?.message || e), "warn");
  }
}
// captioned groups of large buttons (used by the dock and by the composer tab)
function mtGroups(tabIds) {
  const out = [];
  for (const [id, , groups] of mtTabs()) {
    if (tabIds && !tabIds.includes(id)) continue;
    for (const [caption, buttons] of groups) {
      out.push(el("div", { class: `${NS}-rgroup` },
        el("div", { class: `${NS}-rrow ${NS}-rbigrow` }, ...buttons.map(([ic, label, title, fn, on]) =>
          el("button", { type: "button", class: `${NS}-rbig ${on?.() ? "active" : ""}`, title, html: `${mtIcon(ic, 19)}<span>${esc(label)}</span>`, onclick: () => mtRun(fn) }))),
        el("div", { class: `${NS}-rcap` }, caption)));
    }
  }
  return out;
}

// ---- the dock across the top of GeoLibre's map (Data View)
const MT_DOCK_KEY = "glc:mt-dock";
function mtDockState() {
  try {
    return { open: true, collapsed: false, tab: "map", ...JSON.parse(localStorage.getItem(MT_DOCK_KEY) || "{}") };
  } catch {
    return { open: true, collapsed: false, tab: "map" };
  }
}
function mtSaveDock(patch) {
  try {
    localStorage.setItem(MT_DOCK_KEY, JSON.stringify({ ...mtDockState(), ...patch }));
  } catch {}
}
function mtRenderDock() {
  const m = mainMap();
  if (!m) return;
  const box = m.getContainer();
  const st = mtDockState();
  let dock = box.querySelector(`:scope > .${NS}-mtdock`);
  if (!st.open) {
    dock?.remove();
    box.classList.remove(`${NS}-mtdock-on`);
    return;
  }
  if (!dock) {
    dock = el("div", { class: `${NS}-root ${NS}-mtdock`, role: "toolbar", "aria-label": "Map Tools" });
    // the map must not pan / zoom under the ribbon
    for (const ev of ["mousedown", "pointerdown", "wheel", "dblclick", "contextmenu", "touchstart"]) dock.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== "wheel" && ev !== "contextmenu" });
    box.appendChild(dock);
  }
  const tabs = el("div", { class: `${NS}-mtdocktabs`, role: "tablist" },
    el("span", { class: `${NS}-mtdocktitle` }, "Map Tools"),
    ...mtTabs().map(([id, label]) => el("button", { type: "button", role: "tab", class: `${NS}-rtab ${st.tab === id && !st.collapsed ? "active" : ""}`, onclick: () => mtSaveDock(st.tab === id ? { collapsed: !st.collapsed } : { tab: id, collapsed: false }) || mtRenderDock() }, label)),
    el("span", { style: { flex: "1" } }),
    el("button", { type: "button", class: `${NS}-qbtn`, title: st.collapsed ? "Show the ribbon" : "Collapse the ribbon (click a tab to open it)", html: `<span style="display:inline-block;transform:rotate(${st.collapsed ? 0 : 180}deg)">${icon("chevron", 12)}</span>`, onclick: () => mtSaveDock({ collapsed: !st.collapsed }) || mtRenderDock() }),
    el("button", { type: "button", class: `${NS}-qbtn`, title: "Hide the Map Tools ribbon (the Layout Composer menu brings it back)", html: icon("close", 13), onclick: () => mtSaveDock({ open: false }) || mtRenderDock() }),
  );
  const body = st.collapsed ? null : el("div", { class: `${NS}-mtdockbody` }, ...mtGroups([st.tab]));
  dock.replaceChildren(tabs, ...(body ? [body] : []));
  box.classList.add(`${NS}-mtdock-on`);
  box.style.setProperty("--glc-mtdock-h", `${dock.offsetHeight}px`);
}
function mtToggleDock() {
  mtSaveDock({ open: !mtDockState().open, collapsed: false });
  mtRenderDock();
}
