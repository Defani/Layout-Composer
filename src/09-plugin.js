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
  ensureDocFonts();
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
    window.LayoutComposer = window.GeoLibreLayoutComposer = { open: openComposer, close: closeComposer, version: PLUGIN_VERSION, _state: S, _debug: { embeddedFontCss, docFontFamilies, ensureFont, layoutToQpt, qptToLayout, aggregate, legendFromMap, glLayers, mainMap, composePageSVG, renderMapImage, rasterize, addItemFromTool, select, renderAll, loadMathJax, geoFrames, geoRegister, saveVectorPdf, findItem } };
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
    delete window.LayoutComposer;
    delete window.GeoLibreLayoutComposer;
  },
};

export default plugin;
