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
function mapLayersSection(item) {
  const p = item.props;
  const hidden = new Set(p.hiddenLayers || []);
  const list = el("div", { class: `${NS}-checklist` });
  const layers = glLayers();
  for (const l of layers) {
    const c = el("input", { type: "checkbox", checked: !hidden.has(l.id) });
    c.addEventListener("change", () => commit(() => {
      const h = new Set(p.hiddenLayers || []);
      if (c.checked) h.delete(l.id);
      else h.add(l.id);
      p.hiddenLayers = [...h];
      // legends linked to this map follow its layers
      for (const lg of S.doc.items) if (lg.type === "legend" && linkedMapOf(lg)?.id === item.id) syncLegendEntries(lg);
    }));
    list.appendChild(el("label", { class: `${NS}-check` }, c, el("span", {}, l.name || l.id), l.visible === false ? el("small", { class: `${NS}-muted` }, " hidden in GeoLibre") : null));
  }
  return section("Layers", [
    layers.length ? list : el("p", { class: `${NS}-muted` }, "No layers in the GeoLibre project."),
    el("div", { class: `${NS}-grid2` },
      btn("Show all", () => commit(() => (p.hiddenLayers = [])), {}),
      btn("Hide all", () => commit(() => (p.hiddenLayers = layers.map((l) => l.id))), {}),
    ),
    el("p", { class: `${NS}-muted` }, "Each map frame can show its own set of layers, e.g. an inset with only the boundary. Linked legends follow."),
  ], (p.hiddenLayers || []).length > 0);
}
