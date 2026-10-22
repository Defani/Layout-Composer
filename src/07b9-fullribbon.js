// ---------------------------------------------------------------- full Format ribbon
// Every item's Format tab runs to the end of the bar, like Word: groups made for
// its type (text box, legend, scale bar, north arrow, color bar, marker, …) and,
// for every item, Position & Size, Effects, Arrange, Align and Item.

// one control from a small spec, bound to item[path]
function rbCtl(item, s, rerender) {
  const get = () => getPath(item, s.path);
  const set = (v, live = false) => liveSet(item, s.path, v, live ? () => refreshCanvas() : rerender);
  const title = s.title || s.label || "";
  if (s.k === "num") {
    const i = el("input", { type: "number", class: `${NS}-input`, value: round(get() ?? 0, 3), step: s.step ?? 0.1, min: s.min, max: s.max, title, style: { width: `${s.w || 54}px` } });
    i.addEventListener("change", () => {
      let v = parseFloat(i.value);
      if (!Number.isFinite(v)) return;
      if (s.min != null) v = Math.max(s.min, v);
      if (s.max != null) v = Math.min(s.max, v);
      set(s.scale ? v / s.scale : v);
    });
    if (s.scale) i.value = round((get() ?? 0) * s.scale, 2);
    return s.unit ? el("span", { class: `${NS}-unitwrap ${NS}-runit` }, i, el("span", { class: `${NS}-unit` }, s.unit)) : i;
  }
  if (s.k === "sel") {
    const cur = get();
    const sel = el("select", { class: `${NS}-input ${NS}-qcase`, title }, ...s.opts.map(([v, l]) => el("option", { value: v, selected: String(cur) === String(v) }, l)));
    sel.addEventListener("change", () => set(typeof s.opts[0][0] === "number" ? parseFloat(sel.value) : sel.value));
    return sel;
  }
  if (s.k === "tog") {
    const on = s.on ? s.on(get()) : !!get();
    return el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${on ? "active" : ""}`, title, onclick: () => set(s.flip ? s.flip(get()) : !get()) }, s.label);
  }
  if (s.k === "color") {
    const cur = get();
    const b = el("button", { type: "button", class: `${NS}-qbtn`, title, html: `<span class="${NS}-cswatch ${cur ? "" : `${NS}-cnone`}" style="background:${cur || "transparent"}"></span>` });
    b.addEventListener("click", () => openColorWheel(b, get() || "#ffffff", (c) => liveSet(item, s.path, c, () => refreshCanvas())));
    if (!s.none) return b;
    return el("span", { class: `${NS}-split` }, b, el("button", { type: "button", class: `${NS}-qbtn ${NS}-qcaret`, title: "No color", html: "∅", onclick: () => set("") }));
  }
  if (s.k === "text") {
    const i = el("input", { type: "text", class: `${NS}-input`, value: get() ?? "", placeholder: s.placeholder || "", title, style: { width: `${s.w || 120}px` } });
    i.addEventListener("change", () => set(i.value));
    return i;
  }
  if (s.k === "tag") return el("span", { class: `${NS}-qtag` }, s.label);
  if (s.k === "node") return s.node;
  return null;
}
// a group from two rows of specs
function rbGroup(item, caption, row1, row2, rerender) {
  const mk = (row) => el("div", { class: `${NS}-rrow` }, ...row.map((s) => rbCtl(item, s, rerender)).filter(Boolean));
  return el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, mk(row1), mk(row2 || [])), el("div", { class: `${NS}-rcap` }, caption));
}
const RB_ALIGN = [["left", "Left"], ["center", "Center"], ["right", "Right"]];
const RB_VALIGN = [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]];

// groups made for each item type (shown after the type's own Format groups)
function typeRibbonGroups(item) {
  const p = item.props;
  const re = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const G = (caption, r1, r2) => rbGroup(item, caption, r1, r2, re);
  const P = (k) => `props.${k}`;
  switch (item.type) {
    case "text":
      return [
        G("Text Box",
          [{ k: "tag", label: "Fill" }, { k: "color", path: P("background"), none: true, title: "Box fill" }, { k: "tog", path: P("border.show"), label: "Border" }, { k: "color", path: P("border.color"), title: "Border color" }, { k: "num", path: P("border.width"), unit: "mm", step: 0.05, min: 0, title: "Border width" }],
          [{ k: "sel", path: P("autoSize"), opts: [["height", "Fit height"], ["width", "Fit width"], ["fixed", "Fixed box"]], title: "Box size" }, { k: "tog", path: P("wrap"), label: "Wrap" }, { k: "sel", path: P("valign"), opts: RB_VALIGN, title: "Vertical alignment" }, { k: "num", path: P("padding"), unit: "mm", step: 0.5, min: 0, title: "Inner margin" }]),
        G("Character",
          [{ k: "tag", label: "Spacing" }, { k: "num", path: P("font.spacing"), unit: "", step: 0.5, title: "Letter spacing", w: 48 }, { k: "tog", path: P("font.smallCaps"), label: "Small caps" }],
          [{ k: "tog", path: P("halo"), label: "Halo" }, { k: "color", path: P("haloColor"), title: "Halo color" }, { k: "num", path: P("haloWidth"), unit: "mm", step: 0.1, min: 0, title: "Halo width" }]),
      ];
    case "legend":
      return [
        G("Legend",
          [{ k: "text", path: P("title"), placeholder: "Title", title: "Legend title", w: 110 }, { k: "sel", path: P("titleAlign"), opts: [["left", "Left"], ["center", "Center"]], title: "Title alignment" }],
          [{ k: "tag", label: "Columns" }, { k: "num", path: P("columns"), step: 1, min: 1, max: 8, title: "Columns", w: 44 }, { k: "tog", path: P("showGroups"), label: "Groups" }, { k: "tog", path: P("autoSync"), label: "Auto-sync" }]),
        G("Symbols",
          [{ k: "tag", label: "Patch" }, { k: "num", path: P("patchW"), unit: "mm", step: 0.5, min: 1, title: "Patch width" }, { k: "num", path: P("patchH"), unit: "mm", step: 0.5, min: 1, title: "Patch height" }],
          [{ k: "tag", label: "Gaps" }, { k: "num", path: P("rowGap"), unit: "mm", step: 0.2, min: 0, title: "Row gap" }, { k: "num", path: P("colGap"), unit: "mm", step: 0.5, min: 0, title: "Column gap" }]),
        G("Fonts",
          [{ k: "tag", label: "Title" }, { k: "num", path: P("titleFont.size"), unit: "pt", step: 0.5, min: 3, title: "Title size", w: 48 }, { k: "tog", path: P("titleFont.bold"), label: "B" }],
          [{ k: "tag", label: "Items" }, { k: "num", path: P("itemFont.size"), unit: "pt", step: 0.5, min: 3, title: "Item size", w: 48 }, { k: "color", path: P("itemFont.color"), title: "Item color" }]),
        G("Box",
          [{ k: "tag", label: "Fill" }, { k: "color", path: P("background"), none: true }, { k: "tog", path: P("border.show"), label: "Border" }],
          [{ k: "num", path: P("padding"), unit: "mm", step: 0.5, min: 0, title: "Padding" }, { k: "tog", path: P("autoHeight"), label: "Fit height" }]),
      ];
    case "scalebar":
      return [
        G("Scale Bar",
          [{ k: "sel", path: P("style"), opts: SCALEBAR_STYLES.map((s) => [s.id, s.name]), title: "Style" }, { k: "sel", path: P("units"), opts: [["auto", "Auto units"], ["km", "km"], ["m", "m"], ["mi", "mi"], ["nmi", "nmi"]], title: "Units" }],
          [{ k: "tag", label: "Segments" }, { k: "num", path: P("segments"), step: 1, min: 1, max: 12, title: "Segments", w: 44 }, { k: "num", path: P("segmentValue"), step: 0.5, min: 0, title: "Value per segment (0 = auto)", w: 56 }]),
        G("Bar",
          [{ k: "color", path: P("color1"), title: "Dark color" }, { k: "color", path: P("color2"), title: "Light color" }, { k: "num", path: P("barHeight"), unit: "mm", step: 0.2, min: 0.3, title: "Bar height" }],
          [{ k: "tag", label: "Line" }, { k: "num", path: P("lineWidth"), unit: "mm", step: 0.05, min: 0, title: "Line width" }, { k: "tog", path: P("showNumeric"), label: "1 : n" }]),
        G("Labels",
          [{ k: "num", path: P("font.size"), unit: "pt", step: 0.5, min: 3, title: "Label size", w: 48 }, { k: "color", path: P("font.color"), title: "Label color" }],
          [{ k: "text", path: P("unitLabel"), placeholder: "Unit text", title: "Unit label (empty = automatic)", w: 80 }, { k: "sel", path: P("locale"), opts: [["en", "1,000"], ["id", "1.000"]], title: "Number format" }]),
      ];
    case "north": {
      const gal = el("button", { type: "button", class: `${NS}-rbig`, title: "North arrow style", html: `${icon("north", 18)}<span>Style ▾</span>` });
      gal.addEventListener("click", () => popoverAt(gal, el("div", {}, el("div", { class: `${NS}-ptitle` }, "North arrow"), galleryGrid("north", p.variant, (id) => {
        closePopover();
        commit(() => (p.variant = id));
      })), `${NS}-galpop`));
      return [
        el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrow ${NS}-rbigrow` }, gal), el("div", { class: `${NS}-rcap` }, "Arrow")),
        G("Colors", [{ k: "tag", label: "Ink" }, { k: "color", path: P("color1") }], [{ k: "tag", label: "Paper" }, { k: "color", path: P("color2") }]),
        G("Letter",
          [{ k: "sel", path: P("label"), opts: [["N", "N"], ["U", "U"], ["", "None"]], title: "Letter" }, { k: "num", path: P("labelScale"), step: 0.1, min: 0.5, max: 2.5, title: "Letter size (× the style's own)", w: 50 }],
          [{ k: "tog", path: P("rotateWithMap"), label: "Follow map" }, { k: "num", path: P("rotation"), unit: "°", step: 1, title: "Extra rotation" }]),
      ];
    }
    case "colorbar": {
      const cmap = colormapPicker(item);
      cmap.classList.add(`${NS}-rbcmap`);
      return [
        G("Colors", [{ k: "node", node: cmap }], [{ k: "tog", path: P("reverse"), label: "Reverse" }, { k: "tag", label: "Classes" }, { k: "num", path: P("bins"), step: 1, min: 0, max: 20, title: "Classes (0 = continuous)", w: 44 }]),
        G("Values",
          [{ k: "tag", label: "Min" }, { k: "num", path: P("vmin"), step: 0.1, title: "Minimum", w: 62 }, { k: "tag", label: "Max" }, { k: "num", path: P("vmax"), step: 0.1, title: "Maximum", w: 62 }],
          [{ k: "tag", label: "Ticks" }, { k: "num", path: P("tickCount"), step: 1, min: 2, max: 15, title: "Tick count", w: 44 }, { k: "sel", path: P("extend"), opts: [["neither", "No ends"], ["both", "Both ends"], ["min", "Min end"], ["max", "Max end"]], title: "Extensions" }]),
        G("Bar",
          [{ k: "sel", path: P("orientation"), opts: [["horizontal", "Horizontal"], ["vertical", "Vertical"]], title: "Orientation" }, { k: "num", path: P("thickness"), unit: "mm", step: 0.5, min: 0.5, title: "Thickness" }],
          [{ k: "tog", path: P("outline"), label: "Outline" }, { k: "text", path: P("title"), placeholder: "Title", title: "Title", w: 90 }]),
      ];
    }
    case "latex":
      return [G("Formula",
        [{ k: "text", path: P("tex"), placeholder: "LaTeX", title: "Formula", w: 160 }],
        [{ k: "num", path: P("size"), unit: "pt", step: 1, min: 4, title: "Size", w: 48 }, { k: "color", path: P("color"), title: "Color" }, { k: "sel", path: P("align"), opts: RB_ALIGN, title: "Alignment" }, { k: "tog", path: P("display"), label: "Display" }]),
      G("Box", [{ k: "tag", label: "Fill" }, { k: "color", path: P("background"), none: true }], [{ k: "tog", path: P("border.show"), label: "Border" }, { k: "num", path: P("padding"), unit: "mm", step: 0.5, min: 0 }])];
    case "marker":
      return [G("Symbol",
        [{ k: "sel", path: P("symbol"), opts: MARKER_SYMBOLS.map((m) => [m.id, m.name]), title: "Symbol" }, { k: "num", path: P("size"), unit: "mm", step: 0.5, min: 1, title: "Size" }],
        [{ k: "tag", label: "Fill" }, { k: "color", path: P("fill") }, { k: "tag", label: "Line" }, { k: "color", path: P("stroke") }]),
      G("Label",
        [{ k: "text", path: P("label"), placeholder: "Label", w: 110 }, { k: "sel", path: P("labelPos"), opts: [["right", "Right"], ["left", "Left"], ["top", "Top"], ["bottom", "Bottom"]], title: "Label position" }],
        [{ k: "tog", path: P("halo"), label: "Halo" }, { k: "color", path: P("haloColor"), title: "Halo color" }])];
    case "icon":
      return [G("Icon",
        [{ k: "tag", label: "Color" }, { k: "color", path: P("color") }],
        [{ k: "text", path: P("label"), placeholder: "Label", w: 100 }, { k: "sel", path: P("labelPos"), opts: [["right", "Right"], ["left", "Left"]], title: "Label position" }])];
    case "shape":
      return [G("Fill Type",
        [{ k: "sel", path: P("fillType"), opts: [["solid", "Solid"], ["gradient", "Gradient"], ["pattern", "Hatch"]], title: "Fill type" }, { k: "color", path: P("fill2"), title: "Second color" }],
        [{ k: "tag", label: "Corners" }, { k: "num", path: P("radius"), unit: "mm", step: 0.5, min: 0, title: "Corner radius" }])];
    case "image":
    case "html":
    case "mermaid":
    case "chart":
      return [G("Box", [{ k: "tag", label: "Border" }, { k: "tog", path: P("border.show"), label: "Show" }], [{ k: "color", path: P("border.color"), title: "Border color" }, { k: "num", path: P("border.width"), unit: "mm", step: 0.05, min: 0, title: "Border width" }])];
    default:
      return [];
  }
}

// Position & Size, Effects, Arrange, Align and Item: on every Format tab
function commonRibbonGroups(item) {
  const re = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const pos = rbGroup(item, "Position & Size",
    [{ k: "tag", label: "X" }, { k: "num", path: "x", unit: "mm", step: 0.5, w: 56 }, { k: "tag", label: "Y" }, { k: "num", path: "y", unit: "mm", step: 0.5, w: 56 }, { k: "tag", label: "∠" }, { k: "num", path: "rot", unit: "°", step: 1, w: 46 }],
    [{ k: "tag", label: "W" }, { k: "num", path: "w", unit: "mm", step: 0.5, min: 1, w: 56 }, { k: "tag", label: "H" }, { k: "num", path: "h", unit: "mm", step: 0.5, min: 1, w: 56 }],
    re);
  const fx = itemFx(item);
  const op = el("input", { type: "number", class: `${NS}-input`, value: Math.round((item.opacity ?? 1) * 100), min: 0, max: 100, step: 5, title: "Opacity (%)", style: { width: "50px" } });
  op.addEventListener("change", () => liveSet(item, "opacity", clamp((parseFloat(op.value) || 0) / 100, 0, 1), re));
  const tog = (label, on, fn, title) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${on ? "active" : ""}`, title, onclick: fn }, label);
  const effects = el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` },
    el("div", { class: `${NS}-rrow` }, el("span", { class: `${NS}-qtag` }, "Opacity"), el("span", { class: `${NS}-unitwrap ${NS}-runit` }, op, el("span", { class: `${NS}-unit` }, "%"))),
    el("div", { class: `${NS}-rrow` },
      tog("Shadow", fx.shadow.on, () => liveSet(fx, "shadow.on", !fx.shadow.on, re), "Drop shadow"),
      tog("Glass", fx.glass.on, () => liveSet(fx, "glass.on", !fx.glass.on, re), "Frosted glass (blurs the map behind)")),
  ), el("div", { class: `${NS}-rcap` }, "Effects"));
  const b = (ic, title, fn) => iconBtn(ic, title, fn, `${NS}-qbtn`);
  const two = (caption, r1, r2) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, el("div", { class: `${NS}-rrow` }, ...r1), el("div", { class: `${NS}-rrow` }, ...r2)), el("div", { class: `${NS}-rcap` }, caption));
  const arrangeG = two("Arrange",
    [b("top", "Bring to front", () => arrange("top")), b("up", "Bring forward", () => arrange("up")), b("flipH", "Flip horizontally", () => commit(() => (item.flipX = !item.flipX)))],
    [b("bottom", "Send to back", () => arrange("bottom")), b("down", "Send backward", () => arrange("down")), b("flipV", "Flip vertically", () => commit(() => (item.flipY = !item.flipY)))]);
  const alignG = two("Align to Page",
    [b("alL", "Align left", () => align("left")), b("alC", "Center horizontally", () => align("hcenter")), b("alR", "Align right", () => align("right"))],
    [b("alT", "Align top", () => align("top")), b("alM", "Center vertically", () => align("vcenter")), b("alB", "Align bottom", () => align("bottom"))]);
  const itemG = two("Item",
    [b("copy", "Duplicate (Ctrl+D)", () => duplicateSelection()), b(item.locked ? "lock" : "unlock", item.locked ? "Unlock" : "Lock", () => commit(() => (item.locked = !item.locked)))],
    [b("trash", "Delete", () => deleteSelection()), b("dockright", "All properties (side panel)", () => {
      if (S.ui.root.classList.contains("hide-right")) toggleDock("right");
      setTab("item");
    })]);
  return [pos, effects, arrangeG, alignG, itemG];
}
function itemTailGroups(item) {
  return [...typeRibbonGroups(item), ...extraTypeGroups(item), ...commonRibbonGroups(item)];
}

// several items selected: align, distribute, order, size and group
function multiRibbonGroups(items) {
  const b = (ic, title, fn) => iconBtn(ic, title, fn, `${NS}-qbtn`);
  const two = (caption, r1, r2) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, el("div", { class: `${NS}-rrow` }, ...r1), el("div", { class: `${NS}-rrow` }, ...r2)), el("div", { class: `${NS}-rcap` }, caption));
  const txt = (label, title, fn) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt`, title, onclick: fn }, label);
  return [
    two(`Align ${items.length} items`,
      [b("alL", "Align left edges", () => align("left")), b("alC", "Center horizontally", () => align("hcenter")), b("alR", "Align right edges", () => align("right"))],
      [b("alT", "Align top edges", () => align("top")), b("alM", "Center vertically", () => align("vcenter")), b("alB", "Align bottom edges", () => align("bottom"))]),
    two("Distribute", [b("disH", "Distribute horizontally (3 or more)", () => align("distH"))], [b("disV", "Distribute vertically (3 or more)", () => align("distV"))]),
    two("Size", [txt("Same width", "Match the width of the first selected item", () => align("sameW"))], [txt("Same height", "Match the height of the first selected item", () => align("sameH"))]),
    two("Arrange", [b("top", "Bring to front", () => arrange("top")), b("up", "Bring forward", () => arrange("up"))], [b("bottom", "Send to back", () => arrange("bottom")), b("down", "Send backward", () => arrange("down"))]),
    two("Group", [txt("Group", "Group (Ctrl+G)", () => groupSelection()), txt("Ungroup", "Ungroup (Ctrl+Shift+G)", () => ungroupSelection())], [b("copy", "Duplicate (Ctrl+D)", () => duplicateSelection()), b("trash", "Delete", () => deleteSelection())]),
  ];
}

// more groups for the types whose tab would otherwise end early
function extraTypeGroups(item) {
  const p = item.props;
  const re = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const G = (caption, r1, r2) => rbGroup(item, caption, r1, r2, re);
  const P = (k) => `props.${k}`;
  const chips = (caption, list, apply) => el("div", { class: `${NS}-rgroup` },
    el("div", { class: `${NS}-rchips` }, ...list.map(([label, val]) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt`, title: String(val).slice(0, 200), onclick: () => commit(() => apply(val)) }, label))),
    el("div", { class: `${NS}-rcap` }, caption));
  switch (item.type) {
    case "north": {
      const fam = fontPicker(p.fontFamily || "Arial", (n) => liveSet(item, P("fontFamily"), n, re), { cls: `${NS}-qfam ${NS}-qfam-s` });
      return [
        G("Letter Font", [{ k: "node", node: fam }], [{ k: "tag", label: "Size ×" }, { k: "num", path: P("labelScale"), step: 0.1, min: 0.5, max: 2.5, w: 50 }]),
        chips("Presets", [["KLHK (U)", { variant: "classic", label: "U", color1: "#000000", color2: "#ffffff" }], ["Standard (N)", { variant: "classic", label: "N" }], ["White on dark", { color1: "#ffffff", color2: "#111111" }], ["No letter", { label: "" }]], (v) => Object.assign(p, v)),
      ];
    }
    case "latex":
      return [chips("Formula Templates", [
        ["R²", "R^2 = 0.95"], ["Area km²", "A = 1\\,234\\ \\mathrm{km^2}"], ["Σ sum", "\\sum_{i=1}^{n} x_i"], ["Fraction", "\\frac{a}{b}"], ["± error", "\\bar{x} \\pm \\sigma"],
        ["NDVI", "\\mathrm{NDVI} = \\frac{NIR - Red}{NIR + Red}"], ["Slope %", "S = \\frac{\\Delta h}{d} \\times 100\\%"], ["Mg/ha", "\\mathrm{Mg\\,ha^{-1}}"],
      ], (v) => (p.tex = v))];
    case "html":
      return [chips("HTML Templates", [
        ["Note box", '<div style="border-left:4px solid #2563eb;background:#eff6ff;padding:6px 10px"><b>Note</b><br>Write the note here.</div>'],
        ["Two columns", '<div style="display:flex;gap:12px"><div style="flex:1"><b>Left</b><br>Text…</div><div style="flex:1"><b>Right</b><br>Text…</div></div>'],
        ["List", "<b>Key points</b><ul style=\"margin:4px 0 0 16px;padding:0\"><li>First</li><li>Second</li><li>Third</li></ul>"],
        ["Table", '<table style="border-collapse:collapse;width:100%"><tr><th style="border:1px solid #999;padding:2px 6px">Class</th><th style="border:1px solid #999;padding:2px 6px">Area (ha)</th></tr><tr><td style="border:1px solid #999;padding:2px 6px">Forest</td><td style="border:1px solid #999;padding:2px 6px;text-align:right">1,240</td></tr></table>'],
        ["Badge", '<span style="background:#16a34a;color:#fff;border-radius:999px;padding:2px 10px;font-weight:600">Verified</span>'],
      ], (v) => (p.html = v))];
    case "mermaid":
      return [chips("Diagram Templates", MERMAID_TEMPLATES, (v) => (p.code = v))];
    case "shape":
      return [G("Pattern & Gradient",
        [{ k: "sel", path: P("pattern"), opts: Object.entries(FILL_PATTERNS), title: "Hatch pattern" }, { k: "color", path: P("patternColor"), title: "Hatch color" }, { k: "num", path: P("patternSpacing"), unit: "mm", step: 0.5, min: 0.5, title: "Hatch spacing" }],
        [{ k: "tag", label: "Gradient" }, { k: "num", path: P("gradientAngle"), unit: "°", step: 15, title: "Gradient angle", w: 50 }, { k: "tog", path: P("patternBg"), label: "Hatch on fill" }])];
    case "image":
      if (!p.adjust) p.adjust = {};
      return [G("Adjust",
        [{ k: "tag", label: "Light" }, { k: "num", path: P("adjust.brightness"), step: 5, min: -100, max: 100, title: "Brightness", w: 50 }, { k: "tag", label: "Contrast" }, { k: "num", path: P("adjust.contrast"), step: 5, min: -100, max: 100, title: "Contrast", w: 50 }],
        [{ k: "tag", label: "Colour" }, { k: "num", path: P("adjust.saturation"), step: 5, min: -100, max: 100, title: "Saturation", w: 50 }, { k: "tog", path: P("adjust.grayscale"), label: "B&W", on: (v) => v > 0, flip: (v) => (v > 0 ? 0 : 100) }])];
    default:
      return [];
  }
}
