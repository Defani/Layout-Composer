// ---------------------------------------------------------------- panels for data items and map layers
const SORT_OPTS = [["value-desc", "Largest first"], ["value-asc", "Smallest first"], ["label", "A to Z"], ["none", "Data order"]];
const LOCALE_OPTS = [["en-US", "1,234.56"], ["id-ID", "1.234,56"], ["fr-FR", "1 234,56"]];

function fieldOptions(layerId, { numeric = false, empty = "" } = {}) {
  const opts = empty ? [["", empty]] : [];
  for (const f of layerFields(layerId)) if (!numeric || f.numeric) opts.push([f.name, f.name]);
  return opts;
}
// Data source rows shared by tables and charts.
function dataSourceSection(item, { forChart = false } = {}) {
  const p = item.props;
  const P = (k) => `props.${k}`;
  const redo = () => {
    refreshCanvas();
    renderProps();
  };
  if (!p.filter) p.filter = { field: "", op: "=", value: "" };
  const layers = dataLayerOptions();
  const rows = [
    row("Layer", fSelect(item, P("layer"), layers, {
      after: () => {
        autoGroupField(p);
        redo();
      },
    })),
  ];
  if (layers.length < 2) rows.push(el("p", { class: `${NS}-muted` }, "No vector layer in the GeoLibre project yet."));
  if (p.layer) {
    const isRows = !forChart && p.mode === "rows";
    if (!isRows) rows.push(row(forChart ? "Category" : "Group by", fSelect(item, P("group"), fieldOptions(p.layer, { empty: forChart ? "— choose a field —" : "No grouping (one total)" }), { after: redo })));
    rows.push(row("Value", fSelect(item, P("valueMode"), isRows ? [["none", "No computed column"], ...VALUE_MODES.filter(([k]) => /area|length/.test(k))] : VALUE_MODES, { after: redo })));
    if (!isRows && (p.valueMode === "sum" || p.valueMode === "mean")) rows.push(row("Field", fSelect(item, P("valueField"), fieldOptions(p.layer, { numeric: true, empty: "— numeric field —" }), { after: redo })));
    rows.push(
      el("div", { class: `${NS}-grid3` },
        row("Filter", fSelect(item, P("filter.field"), fieldOptions(p.layer, { empty: "No filter" }), { after: redo })),
        row("", fSelect(item, P("filter.op"), FILTER_OPS)),
        row("", fText(item, P("filter.value"), { placeholder: "value" })),
      ),
    );
    rows.push(row("Sort", fSelect(item, P("sort"), SORT_OPTS)));
    if (!isRows) rows.push(el("div", { class: `${NS}-grid2` }, row("Show top", fNum(item, P("topN"), { min: 0, max: 50, step: 1 })), row("Rest as", fText(item, P("otherLabel")))));
    rows.push(el("div", { class: `${NS}-grid2` }, row("Decimals", fNum(item, P("decimals"), { min: 0, max: 6, step: 1 })), row("Number format", fSelect(item, P("locale"), LOCALE_OPTS))));
    const agg = aggregate(p);
    rows.push(el("p", { class: `${NS}-muted` }, `${agg.featureCount} feature${agg.featureCount === 1 ? "" : "s"} used${p.valueMode !== "count" && !isRows ? `, total ${fmtData(agg.total, p)}${VALUE_UNITS[p.valueMode] ? ` ${VALUE_UNITS[p.valueMode]}` : ""}` : ""}. Area and length are measured on the ellipsoid.`));
    rows.push(btn("Refresh from layer", () => refreshCanvas(), { iconName: "sync" }));
  }
  return section("Data", rows);
}

function attrTableProps(item) {
  const p = item.props;
  const P = (k) => `props.${k}`;
  const redo = () => {
    refreshCanvas();
    renderProps();
  };
  const content = [
    row("Show", fSeg(item, P("mode"), [["summary", "Summary"], ["rows", "Feature list"]], { after: redo })),
  ];
  if (p.mode === "rows") {
    const cols = new Set(p.columns || []);
    const box = el("div", { class: `${NS}-checklist` });
    for (const f of layerFields(p.layer)) {
      const c = el("input", { type: "checkbox", checked: cols.has(f.name) });
      c.addEventListener("change", () => commit(() => {
        const set = new Set(p.columns || []);
        if (c.checked) set.add(f.name);
        else set.delete(f.name);
        // keep the layer's field order
        p.columns = layerFields(p.layer).map((x) => x.name).filter((n) => set.has(n));
      }));
      box.appendChild(el("label", { class: `${NS}-check` }, c, el("span", {}, f.name)));
    }
    content.push(el("div", { class: `${NS}-plabel` }, "Columns (none = first four)"), box);
    content.push(row("Max rows", fNum(item, P("maxRows"), { min: 1, max: 500, step: 1 })));
    content.push(row("Value header", fText(item, P("valueHeader"), { placeholder: "automatic" })));
  } else {
    content.push(
      el("div", { class: `${NS}-grid2` },
        row("Class header", fText(item, P("groupHeader"), { placeholder: p.group || "Class" })),
        row("Value header", fText(item, P("valueHeader"), { placeholder: "automatic" })),
      ),
      fCheck(item, P("showCount"), "Count column"),
      fCheck(item, P("showPercent"), "Percent column"),
    );
  }
  content.push(fCheck(item, P("showTotal"), "Total row"), fCheck(item, P("header"), "Header row"), fCheck(item, P("autoHeight"), "Fit height to rows"));
  return [
    dataSourceSection(item),
    section("Table Content", content),
    section("Table Style", [
      row("Text", fFont(item, P("font"))),
      row("Header", fFont(item, P("headerFont"))),
      el("div", { class: `${NS}-grid2` }, row("Header fill", fColor(item, P("headerBg"), { allowNone: true })), row("Total fill", fColor(item, P("footerBg"), { allowNone: true }))),
      fCheck(item, P("zebra"), "Striped rows"),
      p.zebra ? row("Stripe color", fColor(item, P("zebraColor"))) : null,
      el("div", { class: `${NS}-grid2` }, row("Lines", fColor(item, P("borderColor"))), row("Width", fNum(item, P("borderWidth"), { min: 0, step: 0.05, unit: "mm" }))),
      fCheck(item, P("innerBorder"), "Inner lines"),
      fCheck(item, P("outerBorder"), "Outer border"),
      el("div", { class: `${NS}-grid2` }, row("Padding", fNum(item, P("padding"), { min: 0, step: 0.2, unit: "mm" })), row("Background", fColor(item, P("background"), { allowNone: true }))),
      row("Column widths", fText(item, P("colWidths"), { placeholder: "e.g. 50,25,25" })),
    ], false),
  ];
}

function chartProps(item) {
  const p = item.props;
  const P = (k) => `props.${k}`;
  const redo = () => {
    refreshCanvas();
    renderProps();
  };
  const round_ = p.kind === "pie" || p.kind === "donut";
  return [
    dataSourceSection(item, { forChart: true }),
    section("Chart", [
      row("Type", fSeg(item, P("kind"), CHART_KINDS, { after: redo })),
      row("Title", fText(item, P("title"), { placeholder: "optional, e.g. Area by function (ha)" })),
      row("Labels", fSelect(item, P("labels"), [["percent", "Percent"], ["value", "Value"], ["label", "Class name"], ["none", "None"]])),
      round_ ? fCheck(item, P("showLegend"), "Legend beside the chart", { after: redo }) : null,
      round_ && p.showLegend ? row("Legend values", fSelect(item, P("legendValues"), [["value", "Value"], ["percent", "Percent"], ["none", "None"]])) : null,
      p.kind === "donut" ? row("Hole", fRange(item, P("hole"), 0.2, 0.85, 0.05)) : null,
      p.kind === "donut" ? row("Center", fSelect(item, P("centerText"), [["total", "Total"], ["none", "Empty"]])) : null,
      !round_ ? fCheck(item, P("gridlines"), "Grid lines") : null,
    ]),
    section("Colors", [
      row("Colors", fSeg(item, P("colorMode"), [["layer", "Layer", "Use the layer's class colors from GeoLibre"], ["palette", "Palette"], ["single", "One color"]], { after: redo })),
      p.colorMode === "palette" ? row("Palette", fSelect(item, P("palette"), Object.entries(COLORMAP_LABELS))) : null,
      p.colorMode === "palette" ? fCheck(item, P("paletteReverse"), "Reverse") : null,
      p.colorMode === "single" ? row("Color", fColor(item, P("color"))) : null,
      round_ ? row("Slice outline", fColor(item, P("sliceStroke"), { allowNone: true })) : null,
    ]),
    section("Style", [
      row("Text", fFont(item, P("font"))),
      row("Title", fFont(item, P("titleFont"))),
      el("div", { class: `${NS}-grid2` }, row("Background", fColor(item, P("background"), { allowNone: true })), row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" }))),
      fCheck(item, P("border.show"), "Border"),
    ], false),
  ];
}

// Which GeoLibre layers a map frame shows.
// The frame's layers in its own order. Layers not in the saved order go last.
function frameLayerOrder(item) {
  const ids = glLayers().map((l) => l.id);
  const saved = (item.props.layerOrder || []).filter((id) => ids.includes(id));
  return [...saved, ...ids.filter((id) => !saved.includes(id))];
}

function setFrameLayer(item, id, on) {
  commit(() => {
    const h = new Set(item.props.hiddenLayers || []);
    if (on) h.delete(id);
    else h.add(id);
    item.props.hiddenLayers = [...h];
    // legends linked to this map follow its layers
    for (const lg of S.doc.items) if (lg.type === "legend" && linkedMapOf(lg)?.id === item.id) syncLegendEntries(lg);
  });
}

function moveFrameLayer(item, fromId, toId) {
  if (!fromId || fromId === toId) return;
  commit(() => {
    const order = frameLayerOrder(item).filter((id) => id !== fromId);
    order.splice(order.indexOf(toId), 0, fromId);
    item.props.layerOrder = order;
  });
}

// Zoom the frame to a GeoLibre layer's extent (the same view as the Map Frame ribbon).
function zoomFrameToLayer(item, id) {
  const b = layerBounds(id);
  if (!b) return toast("That layer has no extent.", "warn");
  const pw = (b.east - b.west) * 0.06 || 0.01;
  const ph = (b.north - b.south) * 0.06 || 0.01;
  const bb = { west: b.west - pw, east: b.east + pw, south: b.south - ph, north: b.north + ph };
  item.props.scaleLock = 0;
  setMapView(item, { center: [(bb.west + bb.east) / 2, (bb.south + bb.north) / 2], zoom: zoomForBounds(bb, item.w, item.h), bearing: 0 });
}

function openLayerMenu(e, item, id) {
  e.preventDefault();
  const anchor = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }), closest: () => null, contains: () => false };
  const ids = glLayers().map((l) => l.id);
  const m = el("div", { class: `${NS}-menu ${NS}-ctx` },
    menuItem("Zoom to layer", () => zoomFrameToLayer(item, id)),
    el("div", { class: `${NS}-msep` }),
    menuItem("Show only this layer", () => commit(() => (item.props.hiddenLayers = ids.filter((x) => x !== id)))),
    menuItem("Show all layers", () => commit(() => (item.props.hiddenLayers = []))),
  );
  popoverAt(anchor, m, `${NS}-ctxpop`);
}

function mapLayersSection(item) {
  const p = item.props;
  const hidden = new Set(p.hiddenLayers || []);
  const layers = glLayers();
  const byId = new Map(layers.map((l) => [l.id, l]));
  const list = el("div", { class: `${NS}-toc` });
  for (const id of frameLayerOrder(item)) {
    const l = byId.get(id);
    if (!l) continue;
    const c = el("input", { type: "checkbox", checked: !hidden.has(id) });
    c.addEventListener("change", () => setFrameLayer(item, id, c.checked));
    const row = el("div", { class: `${NS}-tocrow`, draggable: "true", title: "Drag to reorder · right-click for more" },
      el("span", { class: `${NS}-grip` }, "⠿"),
      c,
      el("span", { class: `${NS}-tocname` }, l.name || id),
      l.visible === false ? el("small", { class: `${NS}-muted` }, "hidden in GeoLibre") : null,
    );
    row.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      moveFrameLayer(item, e.dataTransfer.getData("text/plain"), id);
    });
    row.addEventListener("contextmenu", (e) => openLayerMenu(e, item, id));
    list.appendChild(row);
  }
  return section("Layers", [
    layers.length ? list : el("p", { class: `${NS}-muted` }, "No layers in the GeoLibre project."),
    el("div", { class: `${NS}-grid2` },
      btn("Show all", () => commit(() => (p.hiddenLayers = [])), {}),
      btn("Hide all", () => commit(() => (p.hiddenLayers = layers.map((l) => l.id))), {}),
    ),
    el("p", { class: `${NS}-muted` }, "Each map frame has its own layers, order and visibility, like a data frame in ArcMap. Right-click a layer to zoom to it."),
  ], (p.hiddenLayers || []).length > 0 || (p.layerOrder || []).length > 0);
}

// The layers of one map frame, listed under it in the Layers sidebar (drag to reorder,
// checkbox to show or hide, right-click to zoom to a layer).
function frameLayerRows(item) {
  const hidden = new Set(item.props.hiddenLayers || []);
  const byId = new Map(glLayers().map((l) => [l.id, l]));
  const wrap = el("div", { class: `${NS}-licontent` });
  for (const id of frameLayerOrder(item)) {
    const l = byId.get(id);
    if (!l) continue;
    const c = el("input", { type: "checkbox", checked: !hidden.has(id) });
    c.addEventListener("change", () => setFrameLayer(item, id, c.checked));
    const row = el("div", { class: `${NS}-tocrow`, draggable: "true", title: "Drag to reorder · right-click for more" },
      el("span", { class: `${NS}-grip` }, "⠿"),
      c,
      el("span", { class: `${NS}-tocname` }, l.name || id),
    );
    row.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      moveFrameLayer(item, e.dataTransfer.getData("text/plain"), id);
    });
    row.addEventListener("contextmenu", (e) => openLayerMenu(e, item, id));
    wrap.appendChild(row);
  }
  return wrap;
}
