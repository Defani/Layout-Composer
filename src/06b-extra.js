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
  downloadBlob(new Blob([JSON.stringify({ format: "layout-composer-template", version: 1, name: t.name, layout: t.doc }, null, 2)], { type: "application/json" }), `${safeName(t.name)}.layout-template.json`);
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
