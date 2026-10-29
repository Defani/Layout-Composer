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
  // color bars linked to a raster / graduated layer follow its range and colormap
  for (const c of S.doc.items.filter((i) => i.type === "colorbar" && i.props.source && i.props.follow !== false)) {
    try {
      readColorbarFromLayer(c.props);
    } catch (e) {
      console.warn("[Layout Composer] color bar", e);
    }
  }
}

function openComposer(container) {
  ensureLibrary();
  if (!S.root) S.root = buildShell();
  // Embedded (GeoLibre Layout View): live inside the host's workspace and keep
  // the current layout across Data View / Layout View switches.
  const host = container || S.embedHost || document.body;
  S.root.classList.toggle(`${NS}-embedded`, host !== document.body);
  if (S.open && S.root.parentNode !== host) host.appendChild(S.root);
  if (S.embedded && S.open) return;
  if (S.embedded && S.doc) {
    if (!S.open) {
      host.appendChild(S.root);
      S.open = true;
      window.addEventListener("keydown", onKey, true);
      window.addEventListener("keyup", onKey, true);
    }
    S.styleEpoch = (S.styleEpoch || 0) + 1;
    refreshAutoLegends();
    applyDocks();
    applySelFrame();
    renderAll();
    requestAnimationFrame(() => fitPage());
    return;
  }
  if (!S.open) {
    host.appendChild(S.root);
    S.open = true;
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
  }
  // Every open starts on a blank page: reuse an empty layout or add one.
  // Earlier layouts stay in the library (the layout menu).
  let blank = Object.values(S.library.layouts).find((l) => !l.items.length);
  if (!blank) {
    blank = newDoc(`Layout ${Object.keys(S.library.layouts).length + 1}`);
    S.library.layouts[blank.id] = blank;
  }
  if (S.doc !== blank) {
    for (const n of S.ui.itemEls?.values?.() || []) n.remove();
    S.ui.itemEls?.clear?.();
  }
  S.doc = blank;
  S.library.active = S.doc.id;
  S.selection = [];
  S.history = [];
  S.future = [];
  aiNewSession();
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
  applySelFrame();
  setTool("select");
  renderAll();
  ensureDocFonts();
  connectAiChat();
  requestAnimationFrame(() => fitPage());
  S.root.focus({ preventScroll: true });
  // first time in Layout View: the guided tour
  if (!tourDone("layout")) setTimeout(() => S.open && startTour("layout"), 900);
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
/**
 * Built-in mode for a modified GeoLibre (Layout View): no map launcher button,
 * no "Layout" toolbar menu; the host mounts the composer into its workspace
 * with `window.LayoutComposer.mount(element)` and hides it with `unmount()`.
 */
/** The map frame host commands act on: the selected one, else the first on the page. */
function targetMapFrame() {
  return selectedItems().find((i) => i.type === "map") || mapItems()[0] || null;
}

/**
 * Map-frame commands for the host's ribbon (ArcGIS Pro "Map Frame" tools):
 * activate (pan/zoom inside), fit, match the GeoLibre view, zoom, extents,
 * zoom to a layer and set the scale. Returns the frame's scale, or null.
 */
function mapFrameCommand(action, arg) {
  const item = targetMapFrame();
  if (!item) {
    toast("Add a map frame first (Map Frame).", "warn");
    return null;
  }
  if (!S.selection.includes(item.id) && action !== "scaleOf") select([item.id]);
  switch (action) {
    case "activate":
      if (S.contentMode === item.id) exitContentMode();
      else enterContentMode(item.id);
      break;
    case "fit": fitAllLayers(item); break;
    case "match": commit(() => viewFromGeoLibre(item) || toast("GeoLibre map not found", "warn")); break;
    case "zin": zoomMapBy(item, 2); break;
    case "zout": zoomMapBy(item, 0.5); break;
    case "prev": stepMapView(item, -1); break;
    case "next": stepMapView(item, 1); break;
    case "north": setMapView(item, { bearing: 0 }); break;
    case "layer": {
      const b = layerBounds(arg);
      if (!b) { toast("That layer has no extent.", "warn"); break; }
      const pw = (b.east - b.west) * 0.06 || 0.01;
      const ph = (b.north - b.south) * 0.06 || 0.01;
      const bb = { west: b.west - pw, east: b.east + pw, south: b.south - ph, north: b.north + ph };
      item.props.scaleLock = 0;
      setMapView(item, { center: [(bb.west + bb.east) / 2, (bb.south + bb.north) / 2], zoom: zoomForBounds(bb, item.w, item.h), bearing: 0 });
      break;
    }
    case "scale":
      if (arg > 0) { item.props.scaleLock = 0; setMapView(item, { zoom: zoomForScale(arg, item.props.view.center[1]) }); }
      break;
    case "lockScale":
      commit(() => (item.props.scaleLock = item.props.scaleLock ? 0 : mapScale(item)));
      break;
    default: break;
  }
  return mapScale(item);
}

/** Layers with an extent, for the host's "Zoom to layer" list. */
function mapFrameLayers() {
  return glLayers().filter((l) => layerBounds(l.id)).map((l) => ({ id: l.id, name: l.name || l.id }));
}

export function activateEmbedded(app) {
  S.embedded = true;
  plugin.activate(app, { embedded: true });
  window.LayoutComposer.mount = (element) => {
    S.embedHost = element;
    openComposer(element);
  };
  window.LayoutComposer.unmount = () => closeComposer();
  window.LayoutComposer.mapFrame = mapFrameCommand;
  window.LayoutComposer.mapFrameLayers = mapFrameLayers;
  window.LayoutComposer.hasMapFrame = () => !!targetMapFrame();
  window.LayoutComposer.activeFrame = () => S.contentMode || null;
  return window.LayoutComposer;
}

// General (registry) build: the launcher button among the map controls and a
// "Layout" menu, as in 1.8.2, so GeoLibre's own icons keep their positions.
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

function activateGeneral(app, options) {
  if (!options.embedded) {
    try {
      app.addMapControl?.(launcherControl, "top-right");
      S.disposers.push(() => app.removeMapControl?.(launcherControl));
    } catch (e) {
      console.warn("[Layout Composer] map control", e);
    }
    const dispose = app.registerToolbarMenu?.({
      id: `${PLUGIN_ID}-menu`,
      label: "Layout",
      items: [
        { id: "open", label: "Open Layout Composer", onSelect: () => openComposer() },
        { id: "tour", label: "Take the Tour", onSelect: () => (S.open ? startTour("layout", true) : openComposer()) },
      ],
    });
    if (typeof dispose === "function") S.disposers.push(dispose);
  }
  window.LayoutComposer = window.GeoLibreLayoutComposer = { open: openComposer, close: closeComposer, version: PLUGIN_VERSION, _state: S, _debug: { embeddedFontCss, docFontFamilies, ensureFont, layoutToQpt, qptToLayout, aggregate, legendFromMap, glLayers, mainMap, composePageSVG, renderMapImage, rasterize, addItemFromTool, select, renderAll, loadMathJax, geoFrames, geoRegister, saveVectorPdf, findItem } };
}

export const plugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  activate(app, options = {}) {
    S.app = app;
    // LC_GENERAL is set at build time; the minifier drops the branch not taken
    if (LC_GENERAL) activateGeneral(app, options);
    else {
    // One menu in GeoLibre's menu bar, like a native one, headed by the plugin's
    // own icon: open the composer, the Map Tools (ArcGIS Pro "Map Fundamentals"
    // workflows), the Map Tools ribbon and the tours. No extra button on the map.
    const dispose = options.embedded ? null : app.registerToolbarMenu?.({
      id: `${PLUGIN_ID}-menu`,
      label: PLUGIN_NAME,
      icon: LC_MENU_ICON,
      items: [
        { id: "open", label: "Open Layout Composer", icon: menuIcon(MT_ICONS.layout), onSelect: () => openComposer() },
        { id: "close", label: "Back to the Map", icon: menuIcon(MT_ICONS.layer), onSelect: () => closeComposer() },
        { type: "separator", id: "s1" },
        { type: "submenu", id: "maptools", label: "Map Tools", icon: menuIcon(MT_ICONS.goto), items: mapToolsMenu().items },
        { id: "maptools-ribbon", label: "Map Tools Ribbon (show / hide)", icon: menuIcon(MT_ICONS.extent), onSelect: () => mtToggleDock() },
        { type: "separator", id: "s2" },
        { id: "tour", label: "Take the Tour", icon: menuIcon(`<path d="${ICON_PATHS.help}"/>`), onSelect: () => {
          if (S.open) return startTour("layout", true);
          if (!mtDockState().open) mtToggleDock();
          setTimeout(() => startTour("data", true), 200);
        } },
      ],
    });
    if (typeof dispose === "function") S.disposers.push(dispose);
    // right-click coordinate copy and cursor readout, once GeoLibre's map exists
    let tries = 0;
    const bind = () => {
      if (!mainMap()) return ++tries < 40 && setTimeout(bind, 500);
      mtBindMap();
      mtRenderDock();
      // first time: a short tour of the Map Tools ribbon
      if (mtDockState().open && !tourDone("data")) setTimeout(() => !S.open && startTour("data"), 1500);
    };
    bind();
    S.disposers.push(() => {
      const b = MT.ctxBound;
      if (b) {
        b.map.off("contextmenu", b.ctx);
        b.map.off("mousemove", b.move);
      }
      MT.ctxBound = null;
      MT.cursorEl?.remove();
      MT.marker?.remove();
      document.querySelector(`.${NS}-mtroot`)?.remove();
      document.querySelector(`.${NS}-mtdock`)?.remove();
      document.querySelector(`.${NS}-mtdock-on`)?.classList.remove(`${NS}-mtdock-on`);
    });
    window.LayoutComposer = window.GeoLibreLayoutComposer = { open: openComposer, close: closeComposer, version: PLUGIN_VERSION, ai: aiApi(), _state: S, mapTools: { parseCoord, formatCoord, toMGRS, fromMGRS, geoDestination }, _debug: { embeddedFontCss, docFontFamilies, ensureFont, layoutToQpt, qptToLayout, aggregate, legendFromMap, glLayers, mainMap, composePageSVG, renderMapImage, rasterize, addItemFromTool, select, renderAll, loadMathJax, geoFrames, geoRegister, saveVectorPdf, findItem, mtCreate, mtGoTo, mapToolsMenu } };
    }
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
    S.root = null;
    S.ui = {};
    S.app = null;
    delete window.LayoutComposer;
    delete window.GeoLibreLayoutComposer;
  },
};

export default plugin;
