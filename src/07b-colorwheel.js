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
  const keep = host.scrollLeft;
  renderQuickBarGroups();
  // when the groups do not fit (narrow windows): ‹ › buttons at the edges and
  // the mouse wheel scrolls the ribbon sideways — never a scrollbar
  if (host.scrollWidth > host.clientWidth + 2) {
    const step = () => Math.max(160, host.clientWidth * 0.6);
    const l = el("button", { type: "button", class: `${NS}-rscroll left`, title: "More on the left", html: icon("chevron", 14), onclick: () => host.scrollBy({ left: -step(), behavior: "smooth" }) });
    const r = el("button", { type: "button", class: `${NS}-rscroll right`, title: "More on the right", html: icon("chevron", 14), onclick: () => host.scrollBy({ left: step(), behavior: "smooth" }) });
    host.prepend(l);
    host.append(r);
    host.scrollLeft = keep;
    const sync = () => {
      l.hidden = host.scrollLeft < 2;
      r.hidden = host.scrollLeft + host.clientWidth >= host.scrollWidth - 2;
    };
    host.onscroll = sync;
    sync();
  } else host.onscroll = null;
  if (!host.dataset.wheel) {
    host.dataset.wheel = "1";
    window.addEventListener("resize", debounce(() => S.open && renderQuickBar(), 150));
    host.addEventListener("wheel", (e) => {
      if (host.scrollWidth <= host.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      host.scrollLeft += e.deltaY;
    }, { passive: false });
  }
}
function renderQuickBarGroups() {
  const host = S.ui.quick;
  host.innerHTML = "";
  const items = selectedItems();
  const item = items.length === 1 ? items[0] : null;
  const isShape = item && (item.type === "shape" || item.type === "path");
  const fp = item ? quickFontPath(item) : null;
  host.style.display = "";
  renderStatusPageTools();
  renderSeriesNav();
  // Insert tab: shown with nothing selected, or when picked while the selection
  // stays the same; selecting something else brings Format back
  const selKey = S.selection.join(",");
  if ((S.ribbonTab === "insert" || S.ribbonTab === "maptools") && items.length && S.ribbonSel !== selKey) S.ribbonTab = "format";
  // a table gets Word's two contextual tabs: Table Design (Format) and Table Layout
  const isTable = item?.type === "table";
  const isMap = item?.type === "map";
  if (S.ribbonTab === "layout2" && !isTable && !isMap) S.ribbonTab = "format";
  const tab = S.ribbonTab === "maptools" ? "maptools" : !items.length && S.ribbonTab !== "format" ? "insert" : S.ribbonTab || "format";
  for (const b of S.ui.root.querySelectorAll(`.${NS}-rtab`)) {
    b.classList.toggle("active", b.dataset.rtab === tab);
    if (b.dataset.rtab === "format") b.textContent = isTable ? "Table Design" : isMap ? "Map Frame" : "Format";
    if (b.dataset.rtab === "layout2") {
      b.hidden = !isTable && !isMap;
      b.textContent = isMap ? "Grid" : "Table Layout";
    }
  }
  if (isMap && tab !== "insert") {
    host.append(...mapRibbon(item, tab === "layout2" ? "grid" : "frame"), ...(tab === "layout2" ? [] : [seriesRibbonGroup()]), ...itemTailGroups(item));
    return;
  }
  if (isTable) {
    if (tab === "layout2") {
      host.append(...textRibbon(item, fp), ...tableRibbon(item, "layout"), ...itemTailGroups(item));
      return;
    }
    if (tab === "format") {
      host.append(...tableRibbon(item, "design"), ...itemTailGroups(item));
      return;
    }
  }
  if (tab === "insert") {
    host.append(...insertRibbon());
    return;
  }
  // every Map Tools group (they act on GeoLibre's map and its layers)
  if (tab === "maptools") {
    // "Layout View" is where we already are
    host.append(...mtGroups().filter((g) => g.querySelector(`.${NS}-rcap`)?.textContent !== "Layout"));
    return;
  }
  // Word-style dock: every element gets its settings as captioned two-row groups
  if (!items.length) {
    host.append(...dimGroup("text"));
    return;
  }
  if (!item) {
    host.append(...multiRibbonGroups(items));
    return;
  }
  // type groups + Position & Size, Effects, Arrange, Align, Item: the bar runs to the end
  const arrange = itemTailGroups(item);
  if (isShape) {
    host.append(ribbonGroup(ITEM_TYPES[item.type].label, shapeQuickTools(item)), ...arrange);
    return;
  }
  if (item.type === "map") {
    host.append(ribbonGroup("Map view", mapQuickTools(item)), ribbonGroup("Grid", gridRibbonTools(item)), ...arrange);
    return;
  }
  if (!fp) {
    if (item.type === "html" || item.type === "mermaid") host.append(...codeItemRibbon(item));
    if (item.type === "image") host.append(...imageRibbon(item));
    if (item.type === "chart") host.append(...chartRibbon(item));
    host.append(...arrange);
    return;
  }
  host.append(...textRibbon(item, fp), ...arrange);
}

function setRibbonTab(id) {
  S.ribbonTab = id;
  S.ribbonSel = S.selection.join(",");
  renderQuickBar();
}

// The Insert tab: large buttons (icon over label) in captioned groups.
function insertRibbon() {
  const tool = (id) => TOOLS.find((t) => t.id === id);
  const menu = (id) => INSERT_MENUS.find((m) => m.id === id);
  const big = (iconName, label, title, onClick, active) => {
    const b = el("button", { type: "button", class: `${NS}-rbig ${active ? "active" : ""}`, title, html: `${icon(iconName, 22)}<span>${esc(label)}</span>` });
    b.addEventListener("click", () => onClick(b));
    return b;
  };
  const fromTool = (id) => {
    const t = tool(id);
    return big(t.icon, t.short, t.label, (b) => (t.gallery ? openToolGallery(t, b) : setTool(S.tool === t.id ? "select" : t.id)), S.tool === t.id);
  };
  const fromMenu = (id) => {
    const m = menu(id);
    return big(m.icon, m.label, m.label, (b) => runInsert(m, b), m.tools.includes(S.tool));
  };
  const grp = (caption, ...buttons) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrow ${NS}-rbigrow` }, ...buttons), el("div", { class: `${NS}-rcap` }, caption));
  return [
    grp("Map", fromTool("map"), fromTool("inset")),
    grp("Map elements", fromTool("legend"), fromTool("colorbar"), fromTool("north"), fromMenu("scalebar")),
    grp("Text", fromMenu("text"), fromMenu("latex"), fromMenu("table"), big("sigma", "Symbol", "Insert a symbol (Unicode, symbol fonts, special characters)", () => openSymbolDialog(), false)),
    grp("Code", big("code", "HTML", "HTML block (drag a box on the page, or click)", () => setTool(S.tool === "html" ? "select" : "html"), S.tool === "html"), big("flow", "Mermaid", "Mermaid diagram: flowchart, gantt, pie… (drag a box, or click)", () => setTool(S.tool === "mermaid" ? "select" : "mermaid"), S.tool === "mermaid")),
    grp("Data", fromMenu("data")),
    grp("Graphics", fromMenu("draw"), fromMenu("shape"), fromMenu("image"), fromMenu("symbols")),
  ];
}

// A flat list of ribbon controls as a Word group: two rows and a caption. A
// leading label becomes the caption; separators are dropped.
function ribbonGroup(caption, parts) {
  const list = parts.filter((n) => n && !n.classList?.contains(`${NS}-qsep`));
  if (list[0]?.classList?.contains(`${NS}-qlabel`)) list.shift();
  // split by approximate width so both rows end up about as long
  const width = (n) => (n.matches?.("select, input, .glc-fontbtn, .glc-colorwrap, .glc-unitwrap, .glc-range") ? 90 : n.classList?.contains(`${NS}-qtxt`) ? 60 : n.classList?.contains(`${NS}-qtag`) ? 30 : 28);
  const total = list.reduce((a, n) => a + width(n), 0);
  const r1 = el("div", { class: `${NS}-rrow` });
  const r2 = el("div", { class: `${NS}-rrow` });
  let acc = 0;
  for (const n of list) {
    // a tag stays with the control after it
    (acc < total / 2 ? r1 : r2).appendChild(n);
    acc += width(n);
  }
  return el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, r1, r2), el("div", { class: `${NS}-rcap` }, caption));
}

// The text and shape groups stay on the ribbon like in Office: greyed out
// until an item they apply to is selected.
function dimGroup(kind) {
  const probe = newItem(kind, 0, 0);
  const dim = (g) => {
    g.classList.add(`${NS}-qdim`);
    g.title = kind === "text" ? "Select a text item to format it" : "Select a shape to format it";
    g.querySelectorAll("button, input, select").forEach((c) => (c.disabled = true));
    return g;
  };
  if (kind === "text") return textRibbon(probe, "props.font").map(dim);
  return dim(ribbonGroup("Shape", shapeQuickTools(probe)));
}

// Page orientation and border sit in the status bar, next to grid / guides / snap.
function renderStatusPageTools() {
  const host = S.ui.root?.querySelector(`.${NS}-pagetools`);
  if (!host || !S.doc) return;
  const pg = S.doc.page;
  host.innerHTML = "";
  host.append(
    el("span", { class: `${NS}-pagesize` }, `${fmtNumber(round(pg.width, 1))} × ${fmtNumber(round(pg.height, 1))} mm`),
    el("button", { type: "button", class: `${NS}-vtog ${pg.width < pg.height ? "active" : ""}`, onclick: () => commit(() => pg.width > pg.height && ([pg.width, pg.height] = [pg.height, pg.width])) }, "Portrait"),
    el("button", { type: "button", class: `${NS}-vtog ${pg.width > pg.height ? "active" : ""}`, onclick: () => commit(() => pg.width < pg.height && ([pg.width, pg.height] = [pg.height, pg.width])) }, "Landscape"),
    el("button", { type: "button", class: `${NS}-vtog ${pg.border?.show ? "active" : ""}`, title: "Page border (neatline)", onclick: () => commit(() => (pg.border.show = !pg.border.show)) }, "Border"),
  );
}

// ---------------------------------------------------------------- ribbon groups for the page, several items and map grids
function ribbonToggle(label, on, onClick, title) {
  return el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${on ? "active" : ""}`, title: title || label, onclick: onClick }, label);
}
function arrangeRibbonTools() {
  return [
    iconBtn("alL", "Align left", () => align("left"), `${NS}-qbtn`),
    iconBtn("alC", "Center horizontally", () => align("hcenter"), `${NS}-qbtn`),
    iconBtn("alR", "Align right", () => align("right"), `${NS}-qbtn`),
    iconBtn("alT", "Align top", () => align("top"), `${NS}-qbtn`),
    iconBtn("alM", "Center vertically", () => align("vcenter"), `${NS}-qbtn`),
    iconBtn("alB", "Align bottom", () => align("bottom"), `${NS}-qbtn`),
    iconBtn("disH", "Distribute horizontally", () => align("distH"), `${NS}-qbtn`),
    iconBtn("disV", "Distribute vertically", () => align("distV"), `${NS}-qbtn`),
    iconBtn("copy", "Duplicate", () => duplicateSelection(), `${NS}-qbtn`),
    iconBtn("trash", "Delete", () => deleteSelection(), `${NS}-qbtn`),
  ];
}
function gridRibbonTools(item) {
  const g = item.props.grid;
  const set = (path, v) => liveSet(item, `props.grid.${path}`, v, () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  });
  const sel = (path, opts, title) => {
    const s = el("select", { class: `${NS}-input ${NS}-qcase`, title }, ...opts.map(([v, l]) => el("option", { value: v, selected: String(getPath(item, `props.grid.${path}`)) === String(v) }, l)));
    s.addEventListener("change", () => set(path, s.value));
    return s;
  };
  return [
    el("span", { class: `${NS}-qlabel` }, "Grid"),
    ribbonToggle("Show", !!g.show, () => set("show", !g.show), "Show coordinate grid"),
    sel("type", [["dms", "DMS"], ["dm", "DM"], ["dd", "DD"], ["utm", "UTM"]], "Coordinate system"),
    sel("style", [["lines", "Lines"], ["cross", "Crosses"], ["dots", "Points"], ["none", "Labels only"]], "Grid lines"),
    sel("frameStyle", [["none", "Plain frame"], ["zebra", "Zebra"], ["ticks-in", "Ticks in"], ["ticks-out", "Ticks out"], ["ticks-cross", "Double tick"]], "Grid frame"),
    sel("lang", [["en", "E/W N/S"], ["id", "BT/LS"]], "Hemisphere labels"),
  ];
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
  parts.push(sh);
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
    // every remaining setting of the item, in the side panel
    iconBtn("dockright", "All properties (side panel)", () => {
      if (S.ui.root.classList.contains("hide-right")) toggleDock("right");
      setTab("item");
    }, `${NS}-qbtn`),
  ];
}
