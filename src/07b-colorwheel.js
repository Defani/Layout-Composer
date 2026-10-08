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
  host.innerHTML = "";
  const items = selectedItems();
  const item = items.length === 1 ? items[0] : null;
  const isShape = item && (item.type === "shape" || item.type === "path");
  const fp = item && ["text", "table"].includes(item.type) ? quickFontPath(item) : null;
  host.style.display = fp || isShape ? "" : "none";
  if (isShape) {
    host.append(...shapeQuickTools(item));
    return;
  }
  if (!fp) return;
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const f = getPath(item, fp);
  const fam = el("select", { class: `${NS}-input ${NS}-qfam`, title: "Font" });
  const all = knownFonts();
  for (const n of all.includes(f.family) ? all : [f.family, ...all]) fam.appendChild(el("option", { value: n, selected: n === f.family, style: { fontFamily: `"${n}"` } }, n));
  fam.appendChild(el("option", { value: "__load" }, "＋ Load installed fonts…"));
  fam.addEventListener("change", () => {
    if (fam.value === "__load") return loadInstalledFonts().then(renderQuickBar);
    liveSet(item, `${fp}.family`, fam.value, rerender);
  });
  const size = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: f.size, min: 2, max: 400, step: 0.5, title: "Font size (pt)" });
  size.addEventListener("input", () => {
    const v = parseFloat(size.value);
    if (v > 0) liveSet(item, `${fp}.size`, v, () => refreshCanvas());
  });
  const tog = (key, html, title) => {
    const b = el("button", { type: "button", class: `${NS}-qbtn ${f[key] ? "active" : ""}`, title, html });
    b.addEventListener("click", () => liveSet(item, `${fp}.${key}`, !getPath(item, `${fp}.${key}`), rerender));
    return b;
  };
  const parts = [el("span", { class: `${NS}-qlabel` }, ITEM_TYPES[item.type].label), fam, size, tog("bold", "<b>B</b>", "Bold"), tog("italic", "<i>I</i>", "Italic")];
  if (item.type === "text") {
    const u = el("button", { type: "button", class: `${NS}-qbtn ${item.props.decoration === "underline" ? "active" : ""}`, title: "Underline", html: "<u>U</u>" });
    u.addEventListener("click", () => liveSet(item, "props.decoration", item.props.decoration === "underline" ? "none" : "underline", rerender));
    parts.push(u);
  }
  parts.push(fColor(item, `${fp}.color`, { after: () => refreshCanvas() }));
  if (item.type === "text" || item.type === "table") {
    const alignKey = "props.align";
    for (const [v, ic] of [["left", "alL"], ["center", "alC"], ["right", "alR"]]) {
      const b = iconBtn(ic, `Align ${v}`, () => liveSet(item, alignKey, v, rerender), `${NS}-qbtn ${getPath(item, alignKey) === v ? "active" : ""}`);
      parts.push(b);
    }
  }
  if (item.type === "text") {
    const wrapMath = (tpl) => () => {
      const ta = S.ui.textArea;
      if (ta && document.body.contains(ta)) insertAtCaret(ta, tpl);
      else commit(() => (item.props.text = `${item.props.text || ""}${tpl.replace("|", "2")}`));
    };
    parts.push(
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Superscript (LaTeX $^{}$)", html: "x<sup>2</sup>", onclick: wrapMath("$^{|}$") }),
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Subscript (LaTeX $_{}$)", html: "x<sub>2</sub>", onclick: wrapMath("$_{|}$") }),
      el("button", { type: "button", class: `${NS}-qbtn`, title: "Insert formula $…$", html: "∑", onclick: wrapMath("$|$") }),
    );
    const ef = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Text effect" }, ...Object.entries(TEXT_EFFECTS).map(([v, l]) => el("option", { value: v, selected: (item.props.effect || "none") === v }, l)));
    ef.addEventListener("change", () => liveSet(item, "props.effect", ef.value, rerender));
    parts.push(ef);
    const cs = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Letter case" }, ...[["none", "Aa"], ["upper", "AA"], ["lower", "aa"], ["title", "Ab"]].map(([v, l]) => el("option", { value: v, selected: item.props.textCase === v }, l)));
    cs.addEventListener("change", () => liveSet(item, "props.textCase", cs.value, rerender));
    parts.push(cs);
  }
  parts.push(...commonQuickActions(item));
  host.append(...parts);
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
  parts.push(sh, ...commonQuickActions(item));
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
  ];
}
