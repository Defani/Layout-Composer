// ---------------------------------------------------------------- GeoLibre basemap control
// The basemap list of GeoLibre's basemap control (maplibre-gl-basemap-control,
// DEFAULT_BASEMAPS), bundled as vendor/basemap-control.js and started as an ES
// module from a Blob URL on first use. The control resolves each basemap on a
// hidden map, with the provider keys the user typed in the picker, and the
// resulting style is used by the frame. Keys stay in this browser only.
let basemapControlLib = null;
let basemapControlLoad = null;
function loadBasemapControl() {
  if (!basemapControlLoad) {
    basemapControlLoad = (async () => {
      const code = typeof VENDOR_SRC !== "undefined" ? VENDOR_SRC.basemap : null;
      if (!code) throw new Error("The basemap control is not bundled in this build");
      const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      try {
        basemapControlLib = await import(/* @vite-ignore */ url);
      } finally {
        URL.revokeObjectURL(url);
      }
      return basemapControlLib;
    })().catch((e) => {
      basemapControlLoad = null;
      throw e;
    });
  }
  return basemapControlLoad;
}
/** GeoLibre's basemaps as [kind, name, group] entries; `ctrl:<id>` kinds. */
function geolibreBasemapEntries() {
  return (basemapControlLib?.DEFAULT_BASEMAPS || []).map((b) => [`ctrl:${b.id}`, b.name, b.category || b.provider || "Basemaps"]);
}
function geolibreBasemap(kind) {
  if (!String(kind).startsWith("ctrl:")) return null;
  return basemapControlLib?.DEFAULT_BASEMAPS?.find((b) => b.id === kind.slice(5)) || null;
}

// Provider keys, named as in GeoLibre's basemap control panel (PANEL_CREDENTIAL_FIELDS).
const BASEMAP_KEY_FIELDS = [
  ["carto", "Carto", "cartoApiKey"],
  ["maptiler", "MapTiler", "mapTilerApiKey"],
  ["mapbox", "Mapbox token", "mapboxAccessToken"],
  ["protomaps", "Protomaps", "protomapsApiKey"],
  ["stadia", "Stadia Maps", "stadiaApiKey"],
  ["tianditu", "Tianditu", "tiandituApiKey"],
  ["tomtom", "TomTom", "tomtomApiKey"],
  ["here", "HERE", "hereApiKey"],
  ["google", "Google Maps", "googleMapsApiKey"],
  ["amazon", "Amazon Location", "amazonApiKey"],
];
const BASEMAP_KEYS_STORE = "layout-composer:basemap-keys";
function basemapKeys() {
  try {
    return JSON.parse(window.localStorage.getItem(BASEMAP_KEYS_STORE)) || {};
  } catch {
    return {};
  }
}
function saveBasemapKey(name, value) {
  const keys = basemapKeys();
  if (value) keys[name] = value;
  else delete keys[name];
  try {
    window.localStorage.setItem(BASEMAP_KEYS_STORE, JSON.stringify(keys));
  } catch {
    /* storage unavailable: the keys last for this session only */
  }
}

/** Resolve one GeoLibre basemap to a full style with the control, on a hidden map. */
async function resolveWithControl(id, keys) {
  const Ctor = MapCtor();
  if (!Ctor) throw new Error("no map constructor");
  const lib = await loadBasemapControl();
  const options = { includeDefaultBasemaps: true, collapsed: true };
  for (const [name, , option] of BASEMAP_KEY_FIELDS) if (keys[name]) options[option] = keys[name];
  const host = el("div", { style: { position: "fixed", left: "-20000px", top: "0", width: "400px", height: "300px" } });
  document.body.appendChild(host);
  let map = null;
  let ctrl = null;
  try {
    map = new Ctor({ container: host, style: { version: 8, sources: {}, layers: [] }, interactive: false, attributionControl: false, fadeDuration: 0 });
    ctrl = new lib.BasemapControl(options);
    ctrl.onAdd(map);
    await ctrl.setBasemap(id);
    for (let t = 0; t < 80 && !(map.isStyleLoaded() && map.getStyle()?.layers?.length); t++) await new Promise((r) => setTimeout(r, 100));
    const style = map.getStyle();
    if (!style?.layers?.length) throw new Error(`basemap ${id} has no style`);
    return clone(style);
  } finally {
    try {
      ctrl?.onRemove();
    } catch {}
    try {
      map?.remove();
    } catch {}
    host.remove();
  }
}

const ctrlStyles = new Map();
/** The style of a GeoLibre basemap for a frame, or null (with a message) when it cannot load. */
async function geolibreBaseStyle(kind) {
  const g = geolibreBasemap(kind);
  const keys = basemapKeys();
  const cacheKey = `${g.id}|${JSON.stringify(keys)}`;
  if (!ctrlStyles.has(cacheKey)) {
    ctrlStyles.set(
      cacheKey,
      resolveWithControl(g.id, keys).catch((e) => {
        ctrlStyles.delete(cacheKey);
        throw e;
      }),
    );
  }
  try {
    return await ctrlStyles.get(cacheKey);
  } catch (e) {
    console.warn("[Layout Composer] basemap failed to load", e);
    toast(`Basemap ${g.name} could not load. It may need an API key (Basemap > API keys).`, "warn");
    return null;
  }
}
