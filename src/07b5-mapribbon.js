// ---------------------------------------------------------------- map frame ribbon
// A selected map frame gets two contextual tabs (like Table Design / Layout):
// Map Frame (view, scale, basemap, frame, rotation) and Grid (system, interval,
// lines, grid frame, labels) — every everyday setting without the side panel.

const SCALE_PRESETS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];

function mapRibbon(item, part) {
  const p = item.props;
  const g = p.grid;
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const set = (path, v) => liveSet(item, path, v, rerender);
  const btn = (html, title, onClick, active = false) => el("button", { type: "button", class: `${NS}-qbtn ${active ? "active" : ""}`, title, "aria-label": title, html, onclick: onClick });
  const txt = (label, title, onClick, active = false) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${active ? "active" : ""}`, title, onclick: onClick }, label);
  const tag = (t) => el("span", { class: `${NS}-qtag` }, t);
  const sel = (path, opts, title, after = rerender) => {
    const cur = getPath(item, path);
    const s = el("select", { class: `${NS}-input ${NS}-qcase`, title }, ...opts.map(([v, l]) => el("option", { value: v, selected: String(cur) === String(v) }, l)));
    s.addEventListener("change", () => liveSet(item, path, typeof opts[0][0] === "number" ? parseFloat(s.value) : s.value, after));
    return s;
  };
  const num = (path, title, { min = 0, step = 0.1, unit = "mm", w = 56 } = {}) => {
    const i = el("input", { type: "number", class: `${NS}-input`, value: round(getPath(item, path) ?? 0, 3), min, step, title, style: { width: `${w}px` } });
    i.addEventListener("change", () => {
      const v = parseFloat(i.value);
      if (Number.isFinite(v)) set(path, Math.max(min, v));
    });
    return el("span", { class: `${NS}-unitwrap ${NS}-runit` }, i, el("span", { class: `${NS}-unit` }, unit));
  };
  const color = (path, title) => {
    const b = el("button", { type: "button", class: `${NS}-qbtn`, title, html: `<span class="${NS}-cswatch" style="background:${getPath(item, path) || "transparent"}"></span>` });
    b.addEventListener("click", () => openColorWheel(b, getPath(item, path) || "#000000", (c) => liveSet(item, path, c, () => refreshCanvas())));
    return b;
  };
  const check = (path, label) => {
    const c = el("input", { type: "checkbox", checked: !!getPath(item, path) });
    c.addEventListener("change", () => set(path, c.checked));
    return el("label", { class: `${NS}-rcheck` }, c, label);
  };
  const rowOf = (...c) => el("div", { class: `${NS}-rrow` }, ...c.filter(Boolean));
  const group = (caption, ...rows) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, ...rows), el("div", { class: `${NS}-rcap` }, caption));

  if (part === "frame") {
    // ---- view (zoom, extents, layers): the existing map tools
    const view = ribbonGroup("Map view", mapQuickTools(item).filter((n) => !n.classList?.contains(`${NS}-qscale`) && n.textContent !== "1 :"));
    // ---- scale: type it, pick a round one, or lock it
    const scale = el("input", { type: "number", class: `${NS}-input ${NS}-qscale`, value: mapScale(item), step: 1000, min: 1, title: "Scale 1 : n" });
    scale.addEventListener("change", () => {
      const v = parseFloat(scale.value);
      if (v > 0) setMapView(item, { zoom: zoomForScale(v, p.view.center[1]) });
    });
    const presets = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Round scales" }, el("option", { value: "" }, "Round…"), ...SCALE_PRESETS.map((s) => el("option", { value: s }, `1 : ${fmtScale(s, { locale: "id" })}`)));
    presets.addEventListener("change", () => {
      const v = parseFloat(presets.value);
      if (v > 0) {
        if (p.scaleLock) p.scaleLock = v;
        setMapView(item, { zoom: zoomForScale(v, p.view.center[1]) });
      }
    });
    const lockC = el("input", { type: "checkbox", checked: !!p.scaleLock });
    lockC.addEventListener("change", () => commit(() => (p.scaleLock = lockC.checked ? mapScale(item) : 0)));
    const scaleG = group("Scale", rowOf(tag("1 :"), scale), rowOf(presets, el("label", { class: `${NS}-rcheck`, title: "Keep this scale when the frame is resized" }, lockC, "Lock")));
    // ---- basemap and background
    const baseG = group("Basemap", rowOf(basemapPicker(item)), rowOf(tag("Background"), color("props.background", "Background color")));
    // ---- frame (neatline)
    const frameG = group("Frame",
      rowOf(check("props.frame.show", "Border"), color("props.frame.color", "Border color"), num("props.frame.width", "Border width", { step: 0.05 })),
      rowOf(tag("Shape"), sel("props.frameShape", MAP_FRAME_SHAPES.filter(([v]) => v !== "image"), "Frame shape")),
    );
    // ---- rotation
    const rot = el("input", { type: "number", class: `${NS}-input`, value: round(p.view.bearing || 0, 1), step: 1, min: -180, max: 360, title: "Map rotation (°)", style: { width: "56px" } });
    rot.addEventListener("change", () => setMapView(item, { bearing: parseFloat(rot.value) || 0 }));
    const rotG = group("Rotation", rowOf(el("span", { class: `${NS}-unitwrap ${NS}-runit` }, rot, el("span", { class: `${NS}-unit` }, "°"))), rowOf(txt("North up", "Rotation 0°", () => setMapView(item, { bearing: 0 }))));
    return [view, scaleG, baseG, frameG, rotG];
  }

  // ---- Grid tab
  const sys = sel("props.grid.type", [["dms", "DMS"], ["dm", "DM"], ["dd", "Decimal °"], ["utm", "UTM (m)"]], "Coordinate system", () => {
    g.interval = 0;
    rerender();
  });
  const interval = gridIntervalRow(item, rerender);
  interval.classList.add(`${NS}-rinterval`);
  const gridG = group("Grid", rowOf(check("props.grid.show", "Show"), sys, sel("props.grid.lang", [["en", "E/W N/S"], ["id", "BT/LS"]], "Hemisphere labels")), rowOf(interval));
  const linesG = group("Lines",
    rowOf(sel("props.grid.style", [["lines", "Lines"], ["cross", "Crosses"], ["dots", "Points"], ["none", "Labels only"]], "Grid lines"), color("props.grid.color", "Line color"), num("props.grid.width", "Line width", { min: 0.05, step: 0.05 })),
    rowOf(sel("props.grid.dash", Object.entries(BORDER_STYLES), "Line style"), tag("Opacity"), num("props.grid.opacity", "Opacity (0–1)", { min: 0, step: 0.05, unit: "", w: 46 })),
  );
  const fs = g.frameStyle || "none";
  const frameG = group("Grid frame",
    rowOf(sel("props.grid.frameStyle", [["none", "Plain"], ["zebra", "Zebra"], ["ticks-in", "Ticks in"], ["ticks-out", "Ticks out"], ["ticks-cross", "Double ticks"]], "Grid frame")),
    rowOf(fs === "zebra" ? num("props.grid.zebraWidth", "Zebra width", { min: 0.3, step: 0.1 }) : fs.startsWith("ticks") ? num("props.grid.tickLen", "Tick length", { min: 0.3, step: 0.1 }) : tag("—"), fs === "zebra" ? color("props.grid.zebraColor", "Zebra color") : null),
  );
  const f = g.font;
  const lab = (side, l) => txt(l, `Labels on the ${side}`, () => set(`props.grid.labels.${side}`, !g.labels[side]), !!g.labels[side]);
  const labelsG = group("Labels",
    rowOf(lab("top", "Top"), lab("bottom", "Bottom"), lab("left", "Left"), lab("right", "Right"), sel("props.grid.labelPos", [["outside", "Outside"], ["inside", "Inside"]], "Label position")),
    rowOf(
      fontPicker(f.family, (n) => set("props.grid.font.family", n), { cls: `${NS}-qfam ${NS}-qfam-s` }),
      num("props.grid.font.size", "Label size", { min: 2, step: 0.5, unit: "pt", w: 48 }),
      btn("<b>B</b>", "Bold labels", () => set("props.grid.font.bold", !f.bold), !!f.bold),
      color("props.grid.font.color", "Label color"),
      txt("⟂", "Vertical left/right labels", () => set("props.grid.rotateSide", !g.rotateSide), !!g.rotateSide),
      g.type === "dd" ? num("props.grid.decimals", "Decimals", { min: 0, step: 1, unit: "dp", w: 40 }) : null,
    ),
  );
  return [gridG, linesG, frameG, labelsG];
}
