// ---------------------------------------------------------------- property panel
function refreshCanvas() {
  renderPageDecor();
  renderPaper();
  renderSelection();
  drawRulers();
}
// Live edit with one undo step per burst of typing/dragging.
function liveSet(obj, path, value, after) {
  if (!S.editing) {
    pushHistory();
    S.editing = true;
  }
  clearTimeout(S.editTimer);
  S.editTimer = setTimeout(() => (S.editing = false), 800);
  setPath(obj, path, value);
  saveLibrary();
  if (after) after();
  else refreshCanvas();
}

function section(title, children, open = true) {
  const d = el("details", { class: `${NS}-sec`, open });
  d.appendChild(el("summary", {}, title));
  const body = el("div", { class: `${NS}-secbody` });
  for (const c of children.flat()) if (c) body.appendChild(c);
  d.appendChild(body);
  return d;
}
function row(label, ...controls) {
  return el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, label), el("span", { class: `${NS}-pctl` }, ...controls));
}
function fNum(obj, path, { min, max, step = 0.1, unit, after, onSet } = {}) {
  const input = el("input", { type: "number", class: `${NS}-input`, value: round(getPath(obj, path) ?? 0, 3), step, min, max });
  input.addEventListener("input", () => {
    let v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    if (onSet) onSet(v);
    else liveSet(obj, path, v, after);
  });
  return unit ? el("span", { class: `${NS}-unitwrap` }, input, el("span", { class: `${NS}-unit` }, unit)) : input;
}
function fText(obj, path, { after, placeholder } = {}) {
  const input = el("input", { type: "text", class: `${NS}-input`, value: getPath(obj, path) ?? "", placeholder });
  input.addEventListener("input", () => liveSet(obj, path, input.value, after));
  return input;
}
function fArea(obj, path, { rows = 3, after } = {}) {
  const ta = el("textarea", { class: `${NS}-input ${NS}-area`, rows });
  ta.value = getPath(obj, path) ?? "";
  ta.addEventListener("input", () => liveSet(obj, path, ta.value, after));
  return ta;
}
function fColor(obj, path, { allowNone = false, after } = {}) {
  const val = getPath(obj, path);
  const sw = el("button", { type: "button", class: `${NS}-swatch`, title: "Open color wheel" });
  const paint = (c) => {
    sw.style.setProperty("--c", c || "transparent");
    sw.classList.toggle("none", !c);
  };
  paint(val);
  const hex = el("input", { type: "text", class: `${NS}-input ${NS}-hex`, value: val || "", placeholder: allowNone ? "None" : "#000000", spellcheck: "false" });
  sw.addEventListener("click", () =>
    openColorWheel(sw, getPath(obj, path) || "#ffffff", (c) => {
      hex.value = c.toUpperCase();
      paint(c);
      if (chk) chk.checked = false;
      liveSet(obj, path, c, after);
    }),
  );
  hex.addEventListener("change", () => {
    const v = hex.value.trim();
    if (!v && allowNone) {
      paint("");
      return liveSet(obj, path, "", after);
    }
    if (/^#?[0-9a-f]{3,8}$/i.test(v) || /^(rgb|hsl)a?\(/.test(v)) {
      const c = v.startsWith("#") || /^(rgb|hsl)/.test(v) ? v : `#${v}`;
      paint(c);
      liveSet(obj, path, c, after);
    }
  });
  let chk = null;
  const wrap = el("span", { class: `${NS}-colorwrap` }, sw, hex);
  if (allowNone) {
    chk = el("input", { type: "checkbox", checked: !val, title: "No color (transparent)" });
    chk.addEventListener("change", () => {
      const c = chk.checked ? "" : normalizeHex(hex.value || "#ffffff");
      hex.value = c.toUpperCase();
      paint(c);
      liveSet(obj, path, c, after);
    });
    wrap.appendChild(el("label", { class: `${NS}-nonechk`, title: "No color" }, chk, "None"));
  }
  return wrap;
}
function normalizeHex(c) {
  if (typeof c !== "string") return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
  try {
    const ctx = measureCtx();
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    const v = ctx.fillStyle;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  } catch {}
  return "#000000";
}
function fSelect(obj, path, options, { after, onSet } = {}) {
  const cur = getPath(obj, path);
  const s = el("select", { class: `${NS}-input` });
  for (const [v, label] of options) s.appendChild(el("option", { value: v, selected: String(v) === String(cur) }, label));
  s.addEventListener("change", () => {
    const raw = s.value;
    const v = typeof cur === "number" || (options.length && typeof options[0][0] === "number") ? parseFloat(raw) : raw;
    if (onSet) onSet(v);
    else liveSet(obj, path, v, after);
  });
  return s;
}
function fCheck(obj, path, label, { after, onSet } = {}) {
  const c = el("input", { type: "checkbox", checked: !!getPath(obj, path) });
  c.addEventListener("change", () => (onSet ? onSet(c.checked) : liveSet(obj, path, c.checked, after)));
  return el("label", { class: `${NS}-check` }, c, el("span", {}, label));
}
function fRange(obj, path, min, max, step, { after } = {}) {
  const v = getPath(obj, path) ?? 0;
  const out = el("span", { class: `${NS}-rangeval` }, String(round(v, 2)));
  const r = el("input", { type: "range", class: `${NS}-range`, min, max, step, value: v });
  r.addEventListener("input", () => {
    out.textContent = r.value;
    liveSet(obj, path, parseFloat(r.value), after);
  });
  return el("span", { class: `${NS}-rangewrap` }, r, out);
}
function fSeg(obj, path, options, { after } = {}) {
  const cur = getPath(obj, path);
  const wrap = el("span", { class: `${NS}-seg` });
  for (const [v, label, title] of options) {
    const b = el("button", { type: "button", class: String(v) === String(cur) ? "active" : "", title: title || label, html: label });
    b.addEventListener("click", () => {
      for (const x of wrap.children) x.classList.remove("active");
      b.classList.add("active");
      liveSet(obj, path, v, after);
    });
    wrap.appendChild(b);
  }
  return wrap;
}
function fFont(obj, path, { after } = {}) {
  const f = getPath(obj, path);
  const fam = fontPicker(f.family, (n) =>
    liveSet(obj, `${path}.family`, n, () => {
      if (after) after();
      else refreshCanvas();
      renderProps();
      renderQuickBar();
    }), { cls: `${NS}-fam` });
  const size = el("input", { type: "number", class: `${NS}-input ${NS}-fsize`, value: f.size, min: 2, max: 400, step: 0.5, title: "Size (pt)" });
  size.addEventListener("input", () => {
    const v = parseFloat(size.value);
    if (v > 0) liveSet(obj, `${path}.size`, v, after);
  });
  const tog = (key, label, title) => {
    const b = el("button", { type: "button", class: `${NS}-tog ${f[key] ? "active" : ""}`, title, html: label });
    b.addEventListener("click", () => {
      b.classList.toggle("active");
      liveSet(obj, `${path}.${key}`, b.classList.contains("active"), after);
    });
    return b;
  };
  return el("div", { class: `${NS}-font` },
    fam,
    el("div", { class: `${NS}-fontrow` }, size, el("span", { class: `${NS}-unit` }, "pt"), tog("bold", "<b>B</b>", "Width"), tog("italic", "<i>I</i>", "Italic"), fColor(obj, `${path}.color`, { after })),
  );
}
function mapOptions(exclude, allowEmpty = true, emptyLabel = "First map (automatic)") {
  const opts = allowEmpty ? [["", emptyLabel]] : [];
  for (const m of mapItems()) if (m.id !== exclude) opts.push([m.id, m.name]);
  return opts;
}
// Frame shape rows for map items: preset shapes or an image (its alpha / silhouette) as a mask.
function mapFrameShapeRows(item) {
  const p = item.props;
  const P = (k) => `props.${k}`;
  const shape = p.frameShape || "rect";
  const pickMask = () => {
    const input = el("input", { type: "file", accept: "image/png,image/svg+xml,image/webp,image/gif" });
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => commit(() => {
        p.frameShape = "image";
        p.frameImage = fr.result;
      });
      fr.readAsDataURL(file);
    });
    input.click();
  };
  const rows = [
    row("Shape", fSelect(item, P("frameShape"), MAP_FRAME_SHAPES, {
      after: () => {
        if (p.frameShape === "image" && !p.frameImage) pickMask();
        renderProps();
      },
    })),
  ];
  if (shape === "rounded") rows.push(row("Corner radius", fNum(item, P("frameRadius"), { min: 0, step: 0.5, unit: "mm" })));
  if (shape === "circle" || shape === "star" || shape === "pentagon" || shape === "hexagon" || shape === "octagon") {
    rows.push(btn("Make it regular (equal width & height)", () => commit(() => {
      const s = Math.min(item.w, item.h);
      item.w = item.h = round(s, 1);
    }), { iconName: "fit" }));
  }
  if (shape === "image") {
    rows.push(btn(p.frameImage ? "Replace mask image…" : "Choose mask image…", pickMask, { iconName: "image" }));
    rows.push(el("p", { class: `${NS}-muted` }, "The map shows where the image is opaque — use a PNG/SVG silhouette (e.g. a province outline or a logo) with a transparent background."));
  }
  if (shape !== "rect" && shape !== "rounded") rows.push(el("p", { class: `${NS}-muted` }, "Grid frame ticks and labels are drawn only on rectangular frames."));
  return rows;
}

// ---------------------------------------------------------------- typography (Figma-like detail)
const WEIGHT_NAMES = { 100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black" };
const ALIGN_ICONS = {
  left: "M4 6h16M4 10h10M4 14h16M4 18h10",
  center: "M4 6h16M7 10h10M4 14h16M7 18h10",
  right: "M4 6h16M10 10h10M4 14h16M10 18h10",
  justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
  top: "M5 4h14M12 8v12M8 12l4-4 4 4",
  middle: "M5 12h14M12 4v5M12 15v5M9 7l3 2 3-2M9 17l3-2 3 2",
  bottom: "M5 20h14M12 4v12M8 12l4 4 4-4",
};
const segIcon = (d, title) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="${title}"><path d="${d}"/></svg>`;
function typographyRows(item, path, { text = false } = {}) {
  const f = getPath(item, path);
  if (f.opacity == null) f.opacity = 1;
  const p = item.props;
  const redo = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const set = (k, v) => liveSet(item, `${path}.${k}`, v, redo);
  const gf = typeof GF !== "undefined" && GF.byFamily.get(f.family);
  const weights = gf?.weights?.length ? gf.weights : [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const cur = fontWeight(f);
  const wSel = el("select", { class: `${NS}-input` }, ...weights.map((w) => el("option", { value: w, selected: w === cur }, `${WEIGHT_NAMES[w] || w} ${w}`)));
  wSel.addEventListener("change", () => {
    const w = Number(wSel.value);
    liveSet(item, `${path}.weight`, w, () => {
      f.bold = w >= 600;
      redo();
    });
  });
  const size = el("input", { type: "number", class: `${NS}-input`, value: f.size, min: 1, max: 999, step: 0.5, title: "Size (pt)" });
  size.addEventListener("input", () => {
    const v = parseFloat(size.value);
    if (v > 0) liveSet(item, `${path}.size`, v, () => refreshCanvas());
  });
  const tog = (key, html, title, on) => {
    const b = el("button", { type: "button", class: `${NS}-tog ${on ? "active" : ""}`, title, html });
    b.addEventListener("click", () => set(key, !getPath(item, `${path}.${key}`)));
    return b;
  };
  const rows = [
    row("Font", fontPicker(f.family, (n) => set("family", n))),
    el("div", { class: `${NS}-grid2` },
      row("Weight", wSel),
      row("Size", el("span", { class: `${NS}-unitwrap` }, size, el("span", { class: `${NS}-unit` }, "pt"))),
    ),
    el("div", { class: `${NS}-grid2` },
      row("Color", fColor(item, `${path}.color`, { after: () => refreshCanvas() })),
      row("Opacity", fRange(item, `${path}.opacity`, 0, 1, 0.05, { after: () => refreshCanvas() })),
    ),
    row("Style", el("div", { class: `${NS}-togrow` },
      tog("italic", "<i>I</i>", "Italic", f.italic),
      tog("smallCaps", "<span style='font-variant:small-caps'>Sc</span>", "Small caps", f.smallCaps),
      ...(text ? [
        (() => {
          const b = el("button", { type: "button", class: `${NS}-tog ${p.decoration === "underline" ? "active" : ""}`, title: "Underline", html: "<u>U</u>" });
          b.addEventListener("click", () => liveSet(item, "props.decoration", p.decoration === "underline" ? "none" : "underline", redo));
          return b;
        })(),
        (() => {
          const b = el("button", { type: "button", class: `${NS}-tog ${p.decoration === "line-through" ? "active" : ""}`, title: "Strikethrough", html: "<s>S</s>" });
          b.addEventListener("click", () => liveSet(item, "props.decoration", p.decoration === "line-through" ? "none" : "line-through", redo));
          return b;
        })(),
      ] : []),
    )),
  ];
  if (!text) return rows;
  rows.push(
    row("Case", fSelect(item, "props.textCase", [["none", "As typed"], ["upper", "UPPERCASE"], ["lower", "lowercase"], ["title", "Title Case"]])),
    el("div", { class: `${NS}-grid2` },
      row("Line height", el("span", { class: `${NS}-unitwrap` }, fNum(item, "props.lineHeight", { min: 0.5, max: 5, step: 0.05 }), el("span", { class: `${NS}-unit` }, "×"))),
      row("Letter spacing", fNum(item, `${path}.spacing`, { min: -20, max: 100, step: 0.5, unit: "‰" })),
    ),
    el("div", { class: `${NS}-grid2` },
      row("Paragraph gap", fNum(item, "props.paraSpacing", { min: 0, max: 50, step: 0.25, unit: "mm" })),
      row("Padding", fNum(item, "props.padding", { min: 0, step: 0.25, unit: "mm" })),
    ),
    row("Align", fSeg(item, "props.align", ["left", "center", "right", "justify"].map((a) => [a, segIcon(ALIGN_ICONS[a], a), `Align ${a}`]))),
    row("Vertical", fSeg(item, "props.valign", [["top", segIcon(ALIGN_ICONS.top, "top"), "Top"], ["middle", segIcon(ALIGN_ICONS.middle, "middle"), "Middle"], ["bottom", segIcon(ALIGN_ICONS.bottom, "bottom"), "Bottom"]])),
    row("Resize", fSeg(item, "props.autoSize", [["fixed", "Fixed", "Fixed box"], ["height", "Auto H", "Height follows the text"], ["width", "Auto W", "Width and height follow the text (no wrapping)"]], { after: redo })),
    (p.autoSize || "fixed") !== "width" ? fCheck(item, "props.wrap", "Wrap lines to the box width") : null,
  );
  return rows.filter(Boolean);
}

function btn(label, onClick, { primary = false, iconName, title } = {}) {
  return el("button", { type: "button", class: `${NS}-btn ${primary ? `${NS}-primary` : ""}`, title: title || label, html: `${iconName ? icon(iconName) : ""}<span>${esc(label)}</span>`, onclick: onClick });
}

function fillControls(item) {
  const p = item.props;
  const P = (path) => `props.${path}`;
  const rer = () => {
    refreshCanvas();
    renderProps();
  };
  if (!p.fillType) p.fillType = "solid";
  return [
    row("Type", fSeg(item, P("fillType"), [["solid", "Solid"], ["gradient", "Gradient"], ["pattern", "Hatch"]], { after: rer })),
    row(p.fillType === "gradient" ? "From" : p.fillType === "pattern" ? "Background" : "Color", fColor(item, P("fill"), { allowNone: true })),
    p.fillType === "gradient" ? row("To", fColor(item, P("fill2"))) : null,
    p.fillType === "gradient" ? row("Angle", fNum(item, P("gradientAngle"), { min: 0, max: 360, step: 15, unit: "°" })) : null,
    p.fillType === "pattern" ? row("Pattern", fSelect(item, P("pattern"), Object.entries(FILL_PATTERNS))) : null,
    p.fillType === "pattern" ? el("div", { class: `${NS}-grid2` }, row("Line color", fColor(item, P("patternColor"))), row("Spacing", fNum(item, P("patternSpacing"), { min: 0.6, step: 0.2, unit: "mm" }))) : null,
    p.fillType === "pattern" ? el("div", { class: `${NS}-grid2` }, row("Line width", fNum(item, P("patternWidth"), { min: 0.05, step: 0.05, unit: "mm" })), row("", fCheck(item, P("patternBg"), "Fill behind"))) : null,
    row("Opacity", fRange(item, P("fillOpacity"), 0, 1, 0.05)),
  ];
}

function colormapPicker(item) {
  const p = item.props;
  const swatch = (name) => (name === "custom" ? `linear-gradient(90deg, ${colorbarColors({ ...p, colormap: "custom" }).join(", ")})` : colormapGradientCss(name, p.reverse));
  const btnEl = el("button", { type: "button", class: `${NS}-cmapbtn` });
  const paint = () => {
    btnEl.innerHTML = `<span class="${NS}-cmapsw" style="background:${swatch(p.colormap)}"></span><span>${esc(p.colormap === "custom" ? "Custom colors" : COLORMAP_LABELS[p.colormap] || p.colormap)}</span>`;
  };
  paint();
  btnEl.addEventListener("click", () => {
    const grid = el("div", { class: `${NS}-cmapgrid` });
    for (const name of [...Object.keys(COLORMAPS), "custom"]) {
      const b = el("button", { type: "button", class: `${NS}-cmapopt ${p.colormap === name ? "active" : ""}`, html: `<span class="${NS}-cmapsw" style="background:${swatch(name)}"></span><small>${esc(name === "custom" ? "Custom" : COLORMAP_LABELS[name])}</small>` });
      b.addEventListener("click", () => {
        closePopover();
        commit(() => (p.colormap = name));
      });
      grid.appendChild(b);
    }
    popoverAt(btnEl, el("div", {}, el("div", { class: `${NS}-ptitle` }, "Colormap"), grid), `${NS}-cmappop`);
  });
  return btnEl;
}

function renderProps() {
  const host = S.ui.props;
  if (!host || !S.doc) return;
  const scrollTop = host.scrollTop;
  host.innerHTML = "";
  S.ui.liveScaleInput = null;
  for (const t of S.ui.tabs.children) t.classList.toggle("active", t.dataset.tab === S.tab);
  if (S.tab === "page") host.append(...pageProps());
  else if (S.tab === "vars") host.append(...varProps());
  else {
    const items = selectedItems();
    if (!items.length) host.append(emptyState());
    else if (items.length > 1) {
      host.append(
        el("div", { class: `${NS}-propshead` },
          el("div", { class: `${NS}-ptype`, html: `${icon("select", 15)}<span>${items.length} items selected</span>` }),
          selectionBar(items.length),
        ),
        el("div", { class: `${NS}-emptycard` }, el("p", {}, "Drag to move them together. Align, distribute and match sizes with the bar above; group them from the right-click menu.")),
      );
    } else {
      host.append(...itemProps(items[0]));
      groupPropSections(host, items[0]);
    }
  }
  host.scrollTop = scrollTop;
  renderQuickBar();
}

// ---- property groups: the sections of an item are sorted into tabs
// (Content · Style · Grid · Arrange) so long panels stay short and tidy.
const PROP_GROUPS = [
  ["content", "Content", /^(content|map view|layers|data|chart$|text$|formula|table content|entries|legend|image|icon|symbols?|drawing|shape|latex|settings)/i],
  ["style", "Style", /^(style|frame|fill|background|halo|bar$|ticks|title|table style|scale bar style|north arrow style|text effects|adjust|stroke|line|markers?)/i],
  ["grid", "Grid", /^(coordinate grid|grid|overview)/i],
  ["arrange", "Arrange", /^(position|effects)/i],
];
const SECTION_ICONS = [
  [/^content|^data/i, "sync"], [/^map view/i, "zin"], [/^frame/i, "inset"], [/^coordinate grid|^grid/i, "table"],
  [/^overview/i, "map"], [/^position/i, "ruler"], [/^effects|text effects/i, "fx"], [/^text|^formula|^latex/i, "text"],
  [/^fill|^shape|^style/i, "shape"], [/^background|^halo/i, "layout"], [/^title/i, "title"], [/^ticks|^bar/i, "colorbar"],
  [/^entries|^legend/i, "list"], [/^image|^adjust/i, "image"], [/^icon|^symbol/i, "marker"], [/^table/i, "table"],
  [/^drawing/i, "pen"], [/^layers/i, "layers"], [/^chart|^colors/i, "chart"], [/^scale bar/i, "scalebar"], [/^north/i, "north"], [/^settings/i, "vars"],
];
function groupPropSections(host, item) {
  const secs = [...host.querySelectorAll(`:scope > details.${NS}-sec`)];
  const groupOf = (title) => (PROP_GROUPS.find(([, , re]) => re.test(title)) || ["style"])[0];
  for (const d of secs) {
    const sum = d.querySelector("summary");
    const title = sum.textContent.trim();
    d.dataset.group = groupOf(title);
    const ic = SECTION_ICONS.find(([re]) => re.test(title));
    if (ic && !sum.querySelector("svg")) sum.insertAdjacentHTML("afterbegin", icon(ic[1], 14));
  }
  const present = PROP_GROUPS.filter(([id]) => secs.some((d) => d.dataset.group === id));
  const top = el("div", { class: `${NS}-propshead` });
  const head = host.querySelector(`:scope > .${NS}-ptype`);
  if (head) {
    head.replaceWith(top);
    top.appendChild(head);
  } else host.prepend(top);
  top.appendChild(selectionBar(1));
  if (present.length < 2) return;
  S.ui.propGroup = S.ui.propGroup || {};
  let cur = S.ui.propGroup[item.type];
  if (cur !== "all" && !present.some(([id]) => id === cur)) cur = present[0][0];
  const bar = el("div", { class: `${NS}-ptabs`, role: "tablist" });
  const apply = () => {
    for (const d of secs) d.hidden = cur !== "all" && d.dataset.group !== cur;
    for (const b of bar.children) b.classList.toggle("active", b.dataset.g === cur);
  };
  for (const [id, label] of [...present, ["all", "All"]]) {
    const n = id === "all" ? secs.length : secs.filter((d) => d.dataset.group === id).length;
    bar.appendChild(el("button", {
      type: "button", role: "tab", "data-g": id, title: `${label} (${n})`,
      onclick: () => {
        cur = S.ui.propGroup[item.type] = id;
        apply();
        host.scrollTop = 0;
      },
    }, label));
  }
  top.appendChild(bar);
  apply();
}

function imageAdjustSection(item) {
  const p = item.props;
  if (!p.adjust) p.adjust = {};
  const a = p.adjust;
  const sl = (key, label, min, max, step = 1) => row(label, fRange(a, key, min, max, step, { after: () => refreshCanvas() }));
  for (const [k, v] of Object.entries({ brightness: 0, contrast: 0, saturation: 0, grayscale: 0, sepia: 0, hue: 0, blur: 0 })) if (a[k] == null) a[k] = v;
  const presets = [
    ["Original", {}],
    ["Mono", { grayscale: 100, contrast: 10 }],
    ["Vivid", { saturation: 45, contrast: 12 }],
    ["Warm", { sepia: 30, saturation: 10 }],
    ["Faded", { contrast: -25, brightness: 8, saturation: -20 }],
    ["Dramatic", { contrast: 40, brightness: -6 }],
  ];
  const presetRow = el("div", { class: `${NS}-chips` }, ...presets.map(([n, v]) => el("button", { type: "button", class: `${NS}-chip`, onclick: () => commit(() => (p.adjust = { brightness: 0, contrast: 0, saturation: 0, grayscale: 0, sepia: 0, hue: 0, blur: 0, ...v })) }, n)));
  return section("Adjust", [presetRow, sl("brightness", "Brightness", -100, 100), sl("contrast", "Contrast", -100, 100), sl("saturation", "Saturation", -100, 100), sl("grayscale", "Grayscale", 0, 100), sl("sepia", "Sepia", 0, 100), sl("hue", "Hue", -180, 180), sl("blur", "Blur", 0, 5, 0.1)], false);
}

function emptyState() {
  const tip = (k, t) => el("li", {}, el("kbd", {}, k), el("span", {}, t));
  return el("div", { class: `${NS}-emptycard` },
    el("div", { class: `${NS}-emptyicon`, html: icon("select", 22) }),
    el("b", {}, "Nothing selected"),
    el("p", {}, "Add items from the top bar; they appear in the middle of the view. Select an item to edit it here. Paper size, margins and guides are on the Page tab."),
    el("div", { class: `${NS}-keyshead` }, "Shortcuts"),
    el("ul", { class: `${NS}-keys` },
      tip("Double-click", "edit text, or pan a map's content"),
      tip("Ctrl + scroll", "zoom the canvas"),
      tip("Space + drag", "pan the canvas"),
      tip("Arrows", "nudge 1 mm (Shift 10 mm)"),
      tip("Alt + drag", "move without snapping"),
      tip("Ctrl + D", "duplicate"),
    ),
  );
}

// ---------------------------------------------------------------- precise position & size
const LEN_UNITS = { mm: [1, 2], cm: [10, 3], in: [25.4, 3], pt: [25.4 / 72, 1], px: [25.4 / 96, 0] };
const PREF_KEY = "glc:prefs:v1";
function prefs() {
  if (!S.prefs) {
    try {
      S.prefs = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    } catch {
      S.prefs = {};
    }
    S.prefs = { unit: "mm", ref: "tl", ...S.prefs };
  }
  return S.prefs;
}
function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs));
  } catch {}
}
// Number field that shows a millimetre value in the preferred unit.
function fLen(get, put, { min = -1e6, step } = {}) {
  const [k, dec] = LEN_UNITS[prefs().unit] || LEN_UNITS.mm;
  const input = el("input", { type: "number", class: `${NS}-input`, value: round(get() / k, dec), step: step ?? (dec ? 10 ** -Math.min(dec, 2) * 10 : 1) });
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    put(Math.max(min, round(v * k, 4)));
  });
  return el("span", { class: `${NS}-unitwrap` }, input, el("span", { class: `${NS}-unit` }, prefs().unit));
}
const REF_POINTS = [["tl", 0, 0], ["tc", 0.5, 0], ["tr", 1, 0], ["ml", 0, 0.5], ["mc", 0.5, 0.5], ["mr", 1, 0.5], ["bl", 0, 1], ["bc", 0.5, 1], ["br", 1, 1]];
function refPicker() {
  const g = el("div", { class: `${NS}-refpick`, title: "Reference point for X and Y" });
  for (const [id] of REF_POINTS) {
    const b = el("button", { type: "button", class: id === prefs().ref ? "active" : "", "aria-label": `Reference ${id}` });
    b.addEventListener("click", () => {
      prefs().ref = id;
      savePrefs();
      renderProps();
    });
    g.appendChild(b);
  }
  return g;
}
function positionRows(item) {
  const after = () => {
    renderItemList();
    refreshCanvas();
    renderSelection();
  };
  const [, fx, fy] = REF_POINTS.find(([id]) => id === prefs().ref) || REF_POINTS[0];
  const live = (fn) => (v) => liveSet(item, "_", null, () => {
    delete item._;
    fn(v);
    after();
  });
  const unitSel = el("select", { class: `${NS}-input ${NS}-sm`, title: "Units for position and size" }, ...Object.keys(LEN_UNITS).map((u) => el("option", { value: u, selected: u === prefs().unit }, u)));
  unitSel.addEventListener("change", () => {
    prefs().unit = unitSel.value;
    savePrefs();
    renderProps();
  });
  const ratio = item.h ? item.w / item.h : 1;
  const lockBtn = el("button", { type: "button", class: `${NS}-tog ${item.lockRatio ? "active" : ""}`, title: "Lock aspect ratio", html: icon(item.lockRatio ? "lock" : "unlock", 14) });
  lockBtn.addEventListener("click", () => commit(() => (item.lockRatio = !item.lockRatio)));
  return [
    row("Name", fText(item, "name", { after: () => renderItemList() })),
    el("div", { class: `${NS}-posgrid` },
      refPicker(),
      el("div", { class: `${NS}-grid2` },
        row("X", fLen(() => item.x + item.w * fx, live((v) => (item.x = round(v - item.w * fx, 4))))),
        row("Y", fLen(() => item.y + item.h * fy, live((v) => (item.y = round(v - item.h * fy, 4))))),
      ),
    ),
    el("div", { class: `${NS}-whgrid` },
      row("W", fLen(() => item.w, live((v) => {
        const ax = item.x + item.w * fx;
        const ay = item.y + item.h * fy;
        item.w = Math.max(0.5, v);
        if (item.lockRatio) item.h = round(item.w / ratio, 4);
        item.x = round(ax - item.w * fx, 4);
        item.y = round(ay - item.h * fy, 4);
      }), { min: 0.5 })),
      lockBtn,
      row("H", fLen(() => item.h, live((v) => {
        const ax = item.x + item.w * fx;
        const ay = item.y + item.h * fy;
        item.h = Math.max(0.5, v);
        if (item.lockRatio) item.w = round(item.h * ratio, 4);
        item.x = round(ax - item.w * fx, 4);
        item.y = round(ay - item.h * fy, 4);
      }), { min: 0.5 })),
    ),
    el("div", { class: `${NS}-grid2` },
      row("Rotation", el("span", { class: `${NS}-rotrow` },
        fNum(item, "rot", { min: -360, max: 360, step: 0.5, unit: "°", after }),
        iconBtn("undo", "Rotate −90°", () => commit(() => (item.rot = (((item.rot || 0) - 90 + 540) % 360) - 180))),
        iconBtn("redo", "Rotate +90°", () => commit(() => (item.rot = (((item.rot || 0) + 90 + 540) % 360) - 180))),
      )),
      row("Units", unitSel),
    ),
    row("Opacity", fRange(item, "opacity", 0, 1, 0.01, { after })),
  ];
}

function commonProps(item) {
  const after = () => {
    renderItemList();
    refreshCanvas();
  };
  const fx = itemFx(item);
  const fxAfter = () => {
    refreshCanvas();
    renderProps();
  };
  const effects = section("Effects", [
    fCheck(fx, "shadow.on", "Drop shadow", { after: fxAfter }),
    fx.shadow.on ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(fx, "shadow.color", { after: refreshCanvas })), row("Opacity", fRange(fx, "shadow.opacity", 0, 1, 0.05, { after: refreshCanvas }))) : null,
    fx.shadow.on ? el("div", { class: `${NS}-grid3` }, row("Blur", fNum(fx, "shadow.blur", { min: 0, step: 0.2, unit: "mm", after: refreshCanvas })), row("X", fNum(fx, "shadow.dx", { step: 0.2, unit: "mm", after: refreshCanvas })), row("Y", fNum(fx, "shadow.dy", { step: 0.2, unit: "mm", after: refreshCanvas }))) : null,
    fCheck(fx, "glass.on", "Frosted glass (blurs the map behind)", { after: fxAfter }),
    fx.glass.on ? el("div", { class: `${NS}-grid2` }, row("Blur", fNum(fx, "glass.blur", { min: 0, step: 0.5, unit: "mm", after: refreshCanvas })), row("Radius", fNum(fx, "glass.radius", { min: 0, step: 0.5, unit: "mm", after: refreshCanvas }))) : null,
    fx.glass.on ? el("div", { class: `${NS}-grid2` }, row("Tint", fColor(fx, "glass.tint", { after: refreshCanvas })), row("Tint opacity", fRange(fx, "glass.opacity", 0, 1, 0.05, { after: refreshCanvas }))) : null,
    fx.glass.on ? fCheck(fx, "glass.border", "Light edge", { after: refreshCanvas }) : null,
  ], fx.shadow.on || fx.glass.on);
  return [effects, section("Position & Size", [
    ...positionRows(item),
    el("div", { class: `${NS}-btnrow` },
      btn("Flip H", () => commit(() => (item.flipX = !item.flipX)), { iconName: "flipH", title: "Flip horizontally" }),
      btn("Flip V", () => commit(() => (item.flipY = !item.flipY)), { iconName: "flipV", title: "Flip vertically" }),
      btn("Center", () => commit(() => {
        item.x = round((S.doc.page.width - item.w) / 2, 2);
        item.y = round((S.doc.page.height - item.h) / 2, 2);
      }), { iconName: "alC", title: "Center on page" }),
    ),
    el("div", { class: `${NS}-row` }, fCheck(item, "locked", "Lock position", { after: () => { renderItemList(); renderSelection(); refreshCanvas(); } }), fCheck(item, "hidden", "Hide", { after })),
  ])];
}

function itemProps(item) {
  const p = item.props;
  const out = [];
  const typeLabel = el("div", { class: `${NS}-ptype`, html: `${icon(ITEM_TYPES[item.type].icon, 15)}<span>${esc(ITEM_TYPES[item.type].label)}</span>` });
  out.push(typeLabel);
  const P = (path) => `props.${path}`;
  switch (item.type) {
    case "map": {
      const setScale = (v) => {
        if (!(v > 0)) return;
        liveSet(item, P("view.zoom"), zoomForScale(v, p.view.center[1]), () => {
          if (p.scaleLock) p.scaleLock = v;
          refreshCanvas();
          scheduleOverlayRefresh();
        });
      };
      const scaleInput = el("input", { type: "number", class: `${NS}-input`, value: mapScale(item), step: 500, min: 1 });
      scaleInput.addEventListener("change", () => setScale(parseFloat(scaleInput.value)));
      S.ui.liveScaleInput = scaleInput;
      const presets = el("select", { class: `${NS}-input ${NS}-sm` }, el("option", { value: "" }, "Preset…"), ...PRESET_SCALES.map((s) => el("option", { value: s }, `1 : ${fmtNumber(s)}`)));
      presets.addEventListener("change", () => {
        if (!presets.value) return;
        scaleInput.value = presets.value;
        setScale(parseFloat(presets.value));
      });
      const snapshot = p.source === "snapshot";
      const capture = async () => {
        pushHistory();
        try {
          await captureGeoLibre(item);
          saveLibrary();
          renderAll();
          toast("Captured the current GeoLibre view");
        } catch (e) {
          S.history.pop();
          toast(`Capture failed: ${e.message}`, "warn");
        }
      };
      const contentSec = section("Content", [
        row("Source", fSeg(item, P("source"), [["live", "Live map", "Live MapLibre map, redrawn at print resolution"], ["snapshot", "Capture", "Capture of what GeoLibre draws now (includes COG / raster layers)"]], {
          after: () => {
            if (p.source === "snapshot" && !p.snapshot?.src) return capture();
            refreshCanvas();
            renderProps();
          },
        })),
        el("p", { class: `${NS}-muted` }, snapshot
          ? "Shows exactly what GeoLibre draws, including raster layers. Move GeoLibre to the area you want, then recapture. Resolution follows your screen."
          : "Redraws vector layers and the basemap at print resolution. Raster (COG) layers drawn by GeoLibre are not included — use “GeoLibre capture” for those."),
        snapshot ? btn("Recapture GeoLibre view", capture, { iconName: "camera", primary: true }) : null,
      ]);
      out.push(contentSec);
      if (snapshot) {
        out.push(
          section("Map View", [
            row("Scale  1 :", el("span", { class: `${NS}-readonly` }, fmtNumber(mapScale(item)))),
            el("p", { class: `${NS}-muted` }, "Scale and extent come from the capture; resize the frame to crop it."),
            row("Background", fColor(item, P("background"))),
          ]),
          section("Frame", [
            ...mapFrameShapeRows(item),
            fCheck(item, P("frame.show"), "Show frame"),
            el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("frame.color"))), row("Width", fNum(item, P("frame.width"), { min: 0, step: 0.05, unit: "mm" }))),
          ]),
          gridSection(item),
        );
        break;
      }
      const hist = viewHistory.get(item.id);
      out.push(
        section("Map View", [
          el("div", { class: `${NS}-mapnav` },
            iconBtn("zin", "Zoom map in", () => zoomMapBy(item, 2)),
            iconBtn("zout", "Zoom map out", () => zoomMapBy(item, 0.5)),
            iconBtn("fitlayers", "Fit all layers", () => fitAllLayers(item)),
            iconBtn("undo", "Previous extent", () => stepMapView(item, -1), hist?.back.length ? "" : `${NS}-dim`),
            iconBtn("redo", "Next extent", () => stepMapView(item, 1), hist?.fwd.length ? "" : `${NS}-dim`),
            iconBtn("movecontent", "Move content tool (C)", () => setTool(S.tool === "content" ? "select" : "content"), S.tool === "content" ? `${NS}-on` : ""),
          ),
          el("div", { class: `${NS}-btnrow` },
            btn("Match GeoLibre view", () => commit(() => viewFromGeoLibre(item) || toast("GeoLibre map not found", "warn")), { iconName: "sync", title: "Set this frame's extent to the current GeoLibre map view" }),
            btn(S.contentMode === item.id ? "Done panning" : "Pan map content", () => (S.contentMode === item.id ? exitContentMode() : enterContentMode(item.id)), { iconName: "pan", primary: S.contentMode === item.id }),
          ),
          row("Scale  1 :", scaleInput, presets),
          fCheck(item, P("scaleLock"), "Lock scale (zoom stays fixed when panning/resizing)", { onSet: (on) => commit(() => (p.scaleLock = on ? mapScale(item) : 0)) }),
          el("div", { class: `${NS}-grid2` },
            row("Longitude", fNum(item, P("view.center.0"), { step: 0.0001, after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
            row("Latitude", fNum(item, P("view.center.1"), { step: 0.0001, after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
          ),
          (() => {
            const opts = glLayers().filter((l) => !/cog|raster|tile|xyz|wms/i.test(String(l.type || "")));
            if (!opts.length || !S.app?.getLayerFeatures) return null;
            const sel = el("select", { class: `${NS}-input` }, el("option", { value: "" }, "Zoom to layer…"), ...opts.map((l) => el("option", { value: l.id }, l.name || l.id)));
            sel.addEventListener("change", () => sel.value && zoomMapToLayer(item, sel.value));
            return row("Extent", sel);
          })(),
          row("Map rotation", fNum(item, P("view.bearing"), { step: 1, min: -180, max: 360, unit: "°", after: () => { refreshCanvas(); scheduleOverlayRefresh(); } })),
          row("Basemap", fSelect(item, P("basemap"), Object.entries(BASEMAP_STYLES), { after: () => refreshCanvas() })),
          row("Background", fColor(item, P("background"))),
          btn("Reload layers from GeoLibre", () => {
            S.styleEpoch = (S.styleEpoch || 0) + 1;
            refreshCanvas();
            toast("Map layers reloaded");
          }, { iconName: "refresh", title: "Fetch the latest style & layers from GeoLibre" }),
        ]),
        mapLayersSection(item),
        section("Frame", [
          ...mapFrameShapeRows(item),
          fCheck(item, P("frame.show"), "Show frame"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("frame.color"))), row("Width", fNum(item, P("frame.width"), { min: 0, step: 0.05, unit: "mm" }))),
        ]),
        gridSection(item),
        section("Overview / Locator", [
          el("p", { class: `${NS}-muted` }, "For inset maps: show another map's extent on this map."),
          row("Show extent of", fSelect(item, P("overview.source"), mapOptions(item.id, true, "— none —"))),
          row("Marker", fSelect(item, P("overview.marker"), [["rect", "Extent box"], ["point", "Location point"], ["cross", "Box + crosshair"]])),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("overview.color"))), row("Width", fNum(item, P("overview.width"), { min: 0, step: 0.1, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Fill", fColor(item, P("overview.fill"))), row("Opacity", fRange(item, P("overview.fillOpacity"), 0, 1, 0.05))),
        ], !!p.overview.source),
      );
      break;
    }
    case "legend": {
      const entriesBox = el("div", { class: `${NS}-entries` });
      const drawEntries = () => {
        entriesBox.innerHTML = "";
        (p.entries || []).forEach((e, i) => {
          const r = el("div", { class: `${NS}-entry ${e.kind === "group" ? "group" : ""}` });
          const vis = el("input", { type: "checkbox", checked: !e.hidden, title: "Show" });
          vis.addEventListener("change", () => liveSet(e, "hidden", !vis.checked));
          const sw = e.kind === "group" ? el("span", { class: `${NS}-swg`, html: icon("list", 13) }) : el("span", { class: `${NS}-sw`, html: `<svg width="22" height="14" viewBox="0 0 ${p.patchW} ${p.patchH}">${legendPatch(e.patch, 0, 0, p.patchW, p.patchH)}</svg>` });
          const lab = el("input", { type: "text", class: `${NS}-input`, value: e.label ?? "" });
          lab.addEventListener("input", () => {
            e.userLabel = true;
            liveSet(e, "label", lab.value);
          });
          const col = e.patch && e.kind !== "group" ? el("input", { type: "color", class: `${NS}-color ${NS}-sm`, value: normalizeHex(e.patch.type === "line" ? e.patch.stroke : e.patch.fill), title: "Symbol color" }) : null;
          col?.addEventListener("input", () => {
            liveSet(e.patch, e.patch.type === "line" ? "stroke" : "fill", col.value);
            sw.innerHTML = `<svg width="22" height="14" viewBox="0 0 ${p.patchW} ${p.patchH}">${legendPatch(e.patch, 0, 0, p.patchW, p.patchH)}</svg>`;
          });
          const up = iconBtn("up", "Move up", () => {
            if (i === 0) return;
            commit(() => ([p.entries[i - 1], p.entries[i]] = [p.entries[i], p.entries[i - 1]]));
          });
          const dn = iconBtn("down", "Move down", () => {
            if (i >= p.entries.length - 1) return;
            commit(() => ([p.entries[i + 1], p.entries[i]] = [p.entries[i], p.entries[i + 1]]));
          });
          const del = iconBtn("trash", "Delete entry", () => commit(() => p.entries.splice(i, 1)));
          r.append(vis, sw, lab, col || el("span"), up, dn, del);
          entriesBox.appendChild(r);
        });
      };
      drawEntries();
      const addManual = el("select", { class: `${NS}-input` }, el("option", { value: "" }, "+ Add manual entry…"), el("option", { value: "fill" }, "Polygon"), el("option", { value: "line" }, "Line"), el("option", { value: "point" }, "Point"), el("option", { value: "group" }, "Group heading"));
      addManual.addEventListener("change", () => {
        const t = addManual.value;
        if (!t) return;
        commit(() =>
          p.entries.push(
            t === "group"
              ? { key: uid("man"), kind: "group", label: "Group", manual: true }
              : { key: uid("man"), kind: "item", label: "New entry", manual: true, userLabel: true, patch: t === "line" ? { type: "line", stroke: "#2563eb", strokeWidth: 0.6 } : t === "point" ? { type: "point", fill: "#dc2626", stroke: "#ffffff", strokeWidth: 0.2, radius: 1.3 } : { type: "fill", fill: "#86efac", stroke: "#166534", strokeWidth: 0.25 } },
          ),
        );
      });
      out.push(
        section("Legend", [
          el("div", { class: `${NS}-btnrow` },
            btn("Sync from map", () => commit(() => {
              const n = syncLegendEntries(item);
              toast(n ? `${n} legend entries from GeoLibre layers` : "No readable layers — add manual entries", n ? "info" : "warn");
            }), { iconName: "sync", primary: true }),
            btn("Fit height", () => commit(() => (item.h = round(S.legendCache.get(item.id) || item.h, 2))), { title: "Fit the box height to the legend content" }),
          ),
          row("Title", fText(item, P("title"))),
          row("Title font", fFont(item, P("titleFont"))),
          row("Title alignment", fSeg(item, P("titleAlign"), [["left", "Left"], ["center", "Center"]])),
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
        ]),
        section("Entries", [
          entriesBox,
          addManual,
          fCheck(item, P("showGroups"), "Show group headings (classified layer names)"),
          fCheck(item, P("autoSync"), "Auto-sync when the composer opens"),
          fCheck(item, P("autoHeight"), "Box height follows content", { after: () => { refreshCanvas(); renderSelection(); } }),
        ]),
        section("Layout", [
          el("div", { class: `${NS}-grid2` }, row("Columns", fNum(item, P("columns"), { min: 1, max: 8, step: 1 })), row("Column gap", fNum(item, P("colGap"), { min: 0, step: 0.5, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Symbol width", fNum(item, P("patchW"), { min: 1, step: 0.5, unit: "mm" })), row("Symbol height", fNum(item, P("patchH"), { min: 1, step: 0.5, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Row gap", fNum(item, P("rowGap"), { min: 0, step: 0.2, unit: "mm" })), row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" }))),
          row("Group font", fFont(item, P("groupFont"))),
          row("Entry font", fFont(item, P("itemFont"))),
        ], false),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Background opacity", fRange(item, P("bgOpacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Corner radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" })),
        ], false),
      );
      break;
    }
    case "attrtable":
      out.push(...attrTableProps(item));
      break;
    case "chart":
      out.push(...chartProps(item));
      break;
    case "colorbar": {
      const sources = colorbarSourceOptions();
      const read = () =>
        commit(() => {
          const msg = readColorbarFromLayer(p);
          toast(msg, /no stored|not found|not in the list|RGB composite/.test(msg) ? "warn" : "info");
        });
      out.push(
        section("Data", [
          row("Values from", fSelect(item, P("source"), sources, { after: () => { if (p.source) read(); else renderProps(); } })),
          p.source ? btn("Re-read from layer", read, { iconName: "sync" }) : null,
          el("div", { class: `${NS}-grid2` },
            row("Minimum", fNum(item, P("vmin"), { step: 0.1 })),
            row("Maximum", fNum(item, P("vmax"), { step: 0.1 })),
          ),
          row("Colormap", colormapPicker(item)),
          p.colormap === "custom" ? row("Colors", fArea(item, P("customColors"), { rows: 2 })) : null,
          p.colormap === "custom" ? el("p", { class: `${NS}-muted` }, "Colors from low to high, separated by commas, e.g. #2c7bb6, #ffffbf, #d7191c") : null,
          el("div", { class: `${NS}-grid2` },
            row("Classes", fNum(item, P("bins"), { min: 0, max: 50, step: 1 })),
            row("", fCheck(item, P("reverse"), "Reverse")),
          ),
          el("p", { class: `${NS}-muted` }, "Classes 0 = continuous gradient; 2 or more = discrete steps."),
        ]),
        section("Bar", [
          row("Orientation", fSeg(item, P("orientation"), [["horizontal", "Horizontal"], ["vertical", "Vertical"]], {
            after: () => {
              const [w, h] = [item.w, item.h];
              if ((p.orientation === "vertical") === (w > h)) Object.assign(item, { w: h, h: w });
              refreshCanvas();
              renderSelection();
            },
          })),
          row("Ends", fSeg(item, P("extend"), [["neither", "Flat"], ["min", "Min"], ["max", "Max"], ["both", "Both"]])),
          p.extend !== "neither" ? row("End shape", fSeg(item, P("extendShape"), [["triangle", "Pointed"], ["rect", "Square"]])) : null,
          p.extend !== "neither" ? row("End length", fRange(item, P("extendFrac"), 0.02, 0.25, 0.01)) : null,
          row("Thickness", fNum(item, P("thickness"), { min: 0.5, step: 0.25, unit: "mm" })),
          fCheck(item, P("outline"), "Outline"),
          p.outline ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("outlineColor"))), row("Width", fNum(item, P("outlineWidth"), { min: 0.05, step: 0.05, unit: "mm" }))) : null,
        ]),
        section("Ticks & Labels", [
          row("Placement", fSeg(item, P("tickMode"), [["linear", "Even"], ["nice", "Rounded"], ["custom", "Custom"]])),
          p.tickMode !== "custom" ? row("Number of ticks", fNum(item, P("tickCount"), { min: 2, max: 30, step: 1 })) : null,
          p.tickMode === "custom" ? row("Values", fText(item, P("customTicks"), { placeholder: "e.g. 0, 0.25, 0.5, 1" })) : null,
          el("p", { class: `${NS}-muted` }, p.tickMode === "linear" ? "Even: ticks from min to max inclusive (like numpy.linspace)." : p.tickMode === "nice" ? "Rounded: about that many ticks at round numbers inside the range." : "Only values inside min–max are drawn."),
          el("div", { class: `${NS}-grid2` },
            row("Decimals", fSelect(item, P("decimals"), [[-1, "Auto"], [0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]])),
            row("", fCheck(item, P("thousands"), "1,000 separator")),
          ),
          el("div", { class: `${NS}-grid2` }, row("Prefix", fText(item, P("prefix"))), row("Suffix", fText(item, P("suffix"), { placeholder: "e.g.  m, °C, %" }))),
          row("Side", fSeg(item, P("tickSide"), p.orientation === "vertical" ? [["after", "Right"], ["before", "Left"]] : [["after", "Below"], ["before", "Above"]])),
          row("Tick marks", fSeg(item, P("tickDir"), [["out", "Out"], ["in", "In"], ["both", "Both"], ["none", "None"]])),
          p.tickDir !== "none" ? el("div", { class: `${NS}-grid2` }, row("Length", fNum(item, P("tickLen"), { min: 0.2, step: 0.1, unit: "mm" })), row("Width", fNum(item, P("tickWidth"), { min: 0.05, step: 0.05, unit: "mm" }))) : null,
          p.tickDir !== "none" ? row("Tick color", fColor(item, P("tickColor"))) : null,
          row("Label font", fFont(item, P("tickFont"))),
        ]),
        section("Title", [
          row("Text", fText(item, P("title"), { placeholder: "e.g. Elevation (m)" })),
          row("Position", fSeg(item, P("titlePos"), [["before", p.orientation === "vertical" ? "Top" : "Above"], ["after", p.orientation === "vertical" ? "Bottom" : "Below"], ["side", "Side"]])),
          p.titlePos !== "side" ? row("Align", fSeg(item, P("titleAlign"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])) : null,
          row("Font", fFont(item, P("titleFont"))),
        ]),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Padding", fNum(item, P("padding"), { min: 0, step: 0.5, unit: "mm" })),
          fCheck(item, P("border.show"), "Border"),
          p.border.show ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))) : null,
        ], false),
      );
      break;
    }
    case "scalebar":
      out.push(
        section("Scale Bar Style", [galleryGrid("scalebar", p.style, (id) => commit(() => (p.style = id)))]),
        section("Settings", [
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
          row("Units", fSelect(item, P("units"), [["auto", "Auto"], ["km", "Kilometers"], ["m", "Meters"], ["mi", "Miles"], ["nmi", "Nautical miles"]])),
          p.style === "dual" ? row("Second unit", fSelect(item, P("dualUnit"), [["papercm", "Centimeters on paper"], ["km", "Kilometers"], ["m", "Meters"], ["mi", "Miles"], ["nmi", "Nautical miles"]])) : null,
          p.style === "dual" ? row("Second label", fText(item, P("dualLabel"), { placeholder: "cm (auto)" })) : null,
          el("div", { class: `${NS}-grid2` }, row("Segments", fNum(item, P("segments"), { min: 1, max: 12, step: 1 })), row("Value/segment", fNum(item, P("segmentValue"), { min: 0, step: 0.5 }))),
          el("p", { class: `${NS}-muted` }, "Value/segment 0 = fit the box width automatically."),
          fCheck(item, P("leftSegments"), "Subdivided left segment (classic)"),
          row("Unit label", fText(item, P("unitLabel"), { placeholder: "km / m (auto)" })),
          el("div", { class: `${NS}-grid2` }, row("Bar height", fNum(item, P("barHeight"), { min: 0.3, step: 0.1, unit: "mm" })), row("Line width", fNum(item, P("lineWidth"), { min: 0.05, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Color 1", fColor(item, P("color1"))), row("Color 2", fColor(item, P("color2")))),
          row("Font", fFont(item, P("font"))),
          fCheck(item, P("showNumeric"), "Also show numeric scale below"),
          row("Numeric prefix", fText(item, P("numericPrefix"))),
          row("Align (numeric)", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
        ]),
      );
      break;
    case "north":
      out.push(
        section("North Arrow Style", [galleryGrid("north", p.variant, (id) => commit(() => (p.variant = id)))]),
        section("Settings", [
          el("div", { class: `${NS}-grid2` }, row("Primary color", fColor(item, P("color1"))), row("Secondary color", fColor(item, P("color2")))),
          row("Letter", fSelect(item, P("label"), [["N", "N"], ["U", "U (Indonesian)"], ["", "No letter"]])),
          row("Letter font", fontPicker(p.fontFamily || "Arial", (n) => liveSet(item, P("fontFamily"), n, () => {
            refreshCanvas();
            renderProps();
          }))),
          fCheck(item, P("rotateWithMap"), "Follow map rotation"),
          row("Map", fSelect(item, P("linkedMap"), mapOptions(null))),
          row("Extra rotation", fNum(item, P("rotation"), { step: 1, unit: "°" })),
        ]),
      );
      break;
    case "text":
      out.push(
        section("Text", [
          (S.ui.textArea = fArea(item, P("text"), { rows: 4 })),
          el("p", { class: `${NS}-muted` }, "Wrap math in $…$ for LaTeX, e.g. Area ($km^2$) or $\\mathrm{Mg\\,ha^{-1}}$."),
          el("div", { class: `${NS}-chips` },
            el("span", { class: `${NS}-muted` }, "Insert:"),
            ...["{title}", "{date}", "{year}", "{scale}", "{projection}", "{author}", "{organization}", "{source}"].map((v) =>
              el("button", { type: "button", class: `${NS}-chip`, onclick: () => commit(() => (p.text = `${p.text || ""}${v}`)) }, v),
            ),
          ),
          ...typographyRows(item, "props.font", { text: true }),
          btn("Fit height to text", () => commit(() => {
            const pad = p.padding || 0;
            const lines = wrapText(applyCase(resolveVars(p.text, item), p.textCase), p.font, p.wrap ? item.w - pad * 2 : 0);
            item.h = round(lines.length * p.font.size * PT * p.lineHeight + pad * 2 + 0.6, 2);
          })),
        ]),
        section("LaTeX & Symbols", [templateButtons(S.ui.textArea, { mathWrap: true }), symbolCatalog(S.ui.textArea, { mathWrap: true })], false),
        section("Text effects", [
          row("Effect", fSelect(item, P("effect"), Object.entries(TEXT_EFFECTS), { after: () => { refreshCanvas(); renderProps(); } })),
          p.effect && p.effect !== "none" && p.effect !== "lift" && p.effect !== "hollow" ? row("Effect color", fColor(item, P("effectColor"))) : null,
          p.effect && p.effect !== "none" && p.effect !== "highlight" ? row("Strength", fRange(item, P("effectStrength"), 0, 100, 5)) : null,
        ], !!(p.effect && p.effect !== "none")),
        section("Halo, Background & Border", [
          fCheck(item, P("halo"), "Text halo / outline"),
          el("div", { class: `${NS}-grid2` }, row("Halo color", fColor(item, P("haloColor"))), row("Halo width", fNum(item, P("haloWidth"), { min: 0, step: 0.1, unit: "mm" }))),
          row("Background", fColor(item, P("background"), { allowNone: true })),
          row("Background opacity", fRange(item, P("bgOpacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-grid2` }, row("Style", fSelect(item, P("border.style"), Object.entries(BORDER_STYLES))), row("Radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" }))),
        ], false),
      );
      break;
    case "image":
      out.push(
        section("Image", [
          p.src ? el("img", { src: p.src, class: `${NS}-imgprev` }) : el("p", { class: `${NS}-muted` }, "No image yet."),
          el("div", { class: `${NS}-btnrow` }, btn("Choose image…", () => pickImage(item), { iconName: "image", primary: true }), p.src ? btn("Remove", () => commit(() => (p.src = ""))) : null),
          row("Fit", fSelect(item, P("fit"), [["contain", "Contain (keep ratio)"], ["cover", "Cover (crop)"], ["fill", "Stretch"]])),
          row("Mask", fSelect(item, P("mask"), [["none", "Rectangle"], ["circle", "Circle / ellipse"], ["hexagon", "Hexagon"], ["star", "Star"], ["heart", "Heart"], ["blob", "Blob"]])),
          row("Opacity", fRange(item, P("opacity"), 0, 1, 0.05)),
          fCheck(item, P("border.show"), "Border"),
          el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Corner radius", fNum(item, P("border.radius"), { min: 0, step: 0.5, unit: "mm" })),
        ]),
        imageAdjustSection(item),
      );
      break;
    case "__image_adjust__":
      break;
    case "shape":
      out.push(
        section("Shape", [galleryGrid("shape", p.shape, (id) => commit(() => (p.shape = id)))]),
        section("Fill", fillControls(item)),
        section("Style", [
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("stroke"))), row("Width", fNum(item, P("strokeWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Line style", fSelect(item, P("strokeStyle"), Object.entries(BORDER_STYLES))),
          p.shape === "rounded" ? row("Corner radius", fNum(item, P("radius"), { min: 0, step: 0.5, unit: "mm" })) : null,
          fCheck(item, P("shadow"), "Drop shadow"),
        ]),
      );
      break;
    case "latex": {
      const ta = fArea(item, P("tex"), { rows: 3, after: () => refreshCanvas() });
      ta.classList.add(`${NS}-mono`);
      ta.addEventListener("change", () => rememberFormula(p.tex));
      const recent = recentFormulas();
      out.push(
        section("Formula", [
          ta,
          el("p", { class: `${NS}-muted` }, MATH.ready ? "Any MathJax LaTeX works, e.g. \\frac{a}{b}, x^{2}, \\sum_{i=1}^{n}." : "Loading MathJax… the formula appears as soon as it is ready."),
          templateButtons(ta),
          recent.length
            ? el("div", { class: `${NS}-chips` }, el("span", { class: `${NS}-muted` }, "Recent:"), ...recent.map((r) => el("button", { type: "button", class: `${NS}-chip`, title: r, onclick: () => commit(() => (p.tex = r)) }, r.length > 18 ? `${r.slice(0, 18)}…` : r)))
            : null,
          row("Size", fNum(item, P("size"), { min: 4, max: 200, step: 1, unit: "pt" })),
          row("Color", fColor(item, P("color"))),
          row("Style", fSeg(item, P("display"), [[true, "Display"], [false, "Inline"]])),
          row("Align", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
          row("Vertical", fSeg(item, P("valign"), [["top", "Top"], ["middle", "Center"], ["bottom", "Bottom"]])),
          btn("Fit box to formula", () => commit(() => {
            const w = S.mathWidth?.get(item.id);
            const h = S.legendCache.get(item.id);
            if (w) item.w = round(w, 2);
            if (h) item.h = round(h, 2);
          })),
        ]),
        section("Symbols", [symbolCatalog(ta)], true),
        section("Background & Border", [
          row("Background", fColor(item, P("background"), { allowNone: true })),
          fCheck(item, P("border.show"), "Border"),
          p.border.show ? el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("border.color"))), row("Width", fNum(item, P("border.width"), { min: 0, step: 0.05, unit: "mm" }))) : null,
        ], false),
      );
      break;
    }
    case "icon":
      out.push(
        section("Icon", [
          el("p", { class: `${NS}-muted` }, `${ICON_SET_LABELS[p.set] || p.set} · ${p.name} (CC0)`),
          row("Color", fColor(item, P("color"))),
          row("Label", fText(item, P("label"), { placeholder: "Optional label" })),
          p.label ? row("Font", fFont(item, P("font"))) : null,
          btn("Replace from catalog…", (e) => openCatalog(e.currentTarget), { iconName: "library" }),
        ]),
      );
      break;
    case "marker":
      out.push(
        section("Symbol", [galleryGrid("marker", p.symbol, (id) => commit(() => (p.symbol = id)))]),
        section("Style", [
          el("div", { class: `${NS}-grid2` }, row("Fill", fColor(item, P("fill"))), row("Outline", fColor(item, P("stroke")))),
          row("Size", fNum(item, P("size"), { min: 1, step: 0.5, unit: "mm" })),
          row("Label", fText(item, P("label"), { placeholder: "Leave empty for symbol only" })),
          row("Position", fSeg(item, P("labelPos"), [["right", "Right"], ["left", "Left"], ["top", "Top"], ["bottom", "Bottom"]])),
          row("Font", fFont(item, P("font"))),
          fCheck(item, P("halo"), "Label halo"),
        ]),
      );
      break;
    case "path":
      out.push(
        section("Drawing", [
          el("div", { class: `${NS}-row ${NS}-wrap` },
            fCheck(item, P("closed"), "Closed (polygon)", { after: () => { refreshCanvas(); renderProps(); } }),
            fCheck(item, P("smooth"), "Smooth curve"),
          ),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("stroke"))), row("Width", fNum(item, P("strokeWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          row("Line style", fSelect(item, P("strokeStyle"), Object.entries(BORDER_STYLES))),
          !p.closed ? el("div", { class: `${NS}-row ${NS}-wrap` }, fCheck(item, P("arrowStart"), "Arrow at start"), fCheck(item, P("arrowEnd"), "Arrow at end")) : null,
          el("p", { class: `${NS}-muted` }, `${p.points.length} points. Resize the box to scale the drawing.`),
        ]),
        p.closed ? section("Fill", fillControls(item)) : null,
      );
      break;
    case "table": {
      const ta = el("textarea", { class: `${NS}-input ${NS}-area`, rows: Math.min(10, Math.max(4, p.rows.length + 1)) });
      ta.value = p.rows.map((r) => r.join(" | ")).join("\n");
      ta.addEventListener("input", () => liveSet(item, P("rows"), ta.value.split("\n").map((l) => l.split("|").map((c) => c.trim()))));
      out.push(
        section("Table Content", [
          el("p", { class: `${NS}-muted` }, "One line per table row; separate columns with | . Variables such as {date} are supported."),
          ta,
          row("Column widths", fText(item, P("colWidths"), { placeholder: "e.g. 35,65" })),
          fCheck(item, P("header"), "First row = column headers"),
          btn("Fit height", () => commit(() => (item.h = round(S.legendCache.get(item.id) || item.h, 2)))),
        ]),
        section("Table Style", [
          row("Font", fFont(item, P("font"))),
          row("Title font", fFont(item, P("headerFont"))),
          row("Header background", fColor(item, P("headerBg"), { allowNone: true })),
          row("Background", fColor(item, P("background"), { allowNone: true })),
          fCheck(item, P("zebra"), "Alternating rows"),
          row("Alternate color", fColor(item, P("zebraColor"))),
          el("div", { class: `${NS}-grid2` }, row("Line", fColor(item, P("borderColor"))), row("Width", fNum(item, P("borderWidth"), { min: 0, step: 0.05, unit: "mm" }))),
          el("div", { class: `${NS}-row` }, fCheck(item, P("outerBorder"), "Outer border"), fCheck(item, P("innerBorder"), "Inner lines")),
          row("Padding", fNum(item, P("padding"), { min: 0, step: 0.2, unit: "mm" })),
          row("Align", fSeg(item, P("align"), [["left", "Left"], ["center", "Center"], ["right", "Right"]])),
        ], false),
      );
      break;
    }
  }
  out.push(...commonProps(item));
  return out;
}

function gridSection(item) {
  const p = item.props;
  const g = p.grid;
  const P = (path) => `props.grid.${path}`;
  const geoIntervals = [
    [0, "Auto"],
    [1 / 3600, '1"'], [5 / 3600, '5"'], [10 / 3600, '10"'], [15 / 3600, '15"'], [30 / 3600, '30"'],
    [1 / 60, "1'"], [2 / 60, "2'"], [5 / 60, "5'"], [10 / 60, "10'"], [15 / 60, "15'"], [30 / 60, "30'"],
    [1, "1°"], [2, "2°"], [5, "5°"], [10, "10°"], [15, "15°"], [30, "30°"],
  ];
  const utmIntervals = [[0, "Auto"], ...[100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000].map((v) => [v, `${fmtNumber(v)} m`])];
  const rerender = () => {
    refreshCanvas();
    renderProps();
  };
  return section("Coordinate Grid / Graticule", [
    fCheck(item, P("show"), "Show coordinate grid"),
    row("System", fSelect(item, P("type"), [["dms", "Degrees Minutes Seconds (DMS)"], ["dm", "Degrees Minutes (DM)"], ["dd", "Decimal degrees (DD)"], ["utm", "UTM (meters)"]], { after: () => { g.interval = 0; rerender(); } })),
    row("Interval", fSelect(item, P("interval"), g.type === "utm" ? utmIntervals : geoIntervals)),
    g.type === "utm" ? row("UTM zone", fNum(item, P("zone"), { min: 0, max: 60, step: 1 })) : null,
    g.type === "utm" ? row("Label units", fSeg(item, P("utmUnit"), [["m", "Meters"], ["km", "Kilometers"]])) : null,
    g.type === "utm" ? el("p", { class: `${NS}-muted` }, `Zone 0 = automatic (zone ${UTM.zoneOf(p.view.center[0])}${p.view.center[1] < 0 ? "S" : "N"}).`) : null,
    row("Hemisphere labels", fSeg(item, P("lang"), [["en", "E/W, N/S"], ["id", "BT/LS (ID)"]])),
    g.type === "dd" ? row("Decimals", fNum(item, P("decimals"), { min: 0, max: 6, step: 1 })) : null,
    el("div", { class: `${NS}-sub` }, "Grid lines"),
    row("Style", fSelect(item, P("style"), [["lines", "Solid"], ["cross", "Crosses (+)"], ["dots", "Point"], ["none", "No lines (labels only)"]])),
    el("div", { class: `${NS}-grid2` }, row("Color", fColor(item, P("color"))), row("Width", fNum(item, P("width"), { min: 0.05, step: 0.05, unit: "mm" }))),
    el("div", { class: `${NS}-grid2` }, row("Line", fSelect(item, P("dash"), Object.entries(BORDER_STYLES))), row("Opacity", fRange(item, P("opacity"), 0, 1, 0.05))),
    g.style === "cross" ? row("Cross size", fNum(item, P("crossSize"), { min: 0.5, step: 0.5, unit: "mm" })) : null,
    el("div", { class: `${NS}-sub` }, "Grid frame"),
    row("Frame style", fSelect(item, P("frameStyle"), [["none", "Plain"], ["zebra", "Zebra (black-white)"], ["ticks-in", "Ticks inside"], ["ticks-out", "Ticks outside"], ["ticks-cross", "Ticks inside + outside"]], { after: rerender })),
    g.frameStyle === "zebra" ? el("div", { class: `${NS}-grid2` }, row("Zebra width", fNum(item, P("zebraWidth"), { min: 0.3, step: 0.1, unit: "mm" })), row("Color", fColor(item, P("zebraColor")))) : null,
    g.frameStyle.startsWith("ticks") ? row("Tick length", fNum(item, P("tickLen"), { min: 0.3, step: 0.1, unit: "mm" })) : null,
    el("div", { class: `${NS}-sub` }, "Coordinate labels"),
    el("div", { class: `${NS}-row ${NS}-wrap` }, fCheck(item, P("labels.top"), "Top"), fCheck(item, P("labels.bottom"), "Bottom"), fCheck(item, P("labels.left"), "Left"), fCheck(item, P("labels.right"), "Right")),
    row("Position", fSeg(item, P("labelPos"), [["outside", "Outside"], ["inside", "Inside"]])),
    fCheck(item, P("rotateSide"), "Vertical left/right labels"),
    row("Label offset", fNum(item, P("gap"), { min: 0, step: 0.2, unit: "mm" })),
    row("Label font", fFont(item, P("font"))),
  ], g.show);
}

function pageProps() {
  const pg = S.doc.page;
  if (!pg.border) pg.border = { show: false, color: "#000000", width: 0.6, double: false, inset: 5, gap: 1.2 };
  const refit = () => {
    renderAll();
    fitPage();
  };
  const unit = pg.unit || "mm";
  const step = PAGE_UNITS[unit].step;
  const dimInput = (key) => {
    const input = el("input", { type: "number", class: `${NS}-input`, value: round(toUnit(pg[key], pg), unit === "px" || unit === "mm" || unit === "pt" ? 0 : 3), step, min: 0 });
    input.addEventListener("change", () => {
      const v = parseFloat(input.value);
      if (!(v > 0)) return;
      commit(() => {
        pg[key] = round(fromUnit(v, pg), 3);
        pg.size = "custom";
      });
      fitPage();
    });
    return el("span", { class: `${NS}-unitwrap` }, input, el("span", { class: `${NS}-unit` }, unit));
  };
  const sizeBtn = el("button", { type: "button", class: `${NS}-cmapbtn`, title: "Choose from the page size catalog" }, el("span", {}, paperLabel(pg)));
  sizeBtn.addEventListener("click", () => openPaperCatalog(sizeBtn, () => fitPage()));
  const swap = () =>
    commit(() => {
      [pg.width, pg.height] = [pg.height, pg.width];
      pg.orientation = pg.width >= pg.height ? "landscape" : "portrait";
    });
  return [
    section("Page Size", [
      row("Size", sizeBtn),
      row("Orientation", fSeg(pg, "orientation", [["portrait", "Portrait"], ["landscape", "Landscape"]], {
        after: () => {
          if ((pg.orientation === "landscape") !== pg.width >= pg.height) [pg.width, pg.height] = [pg.height, pg.width];
          refit();
        },
      })),
      row("Units", fSeg(pg, "unit", [["mm", "mm"], ["cm", "cm"], ["in", "in"], ["pt", "pt"], ["px", "px"]], { after: () => renderProps() })),
      el("div", { class: `${NS}-grid2` }, row("Width", dimInput("width")), row("Height", dimInput("height"))),
      unit === "px" ? row("Pixels per inch", fNum(pg, "pxDpi", { min: 36, max: 600, step: 1, after: () => { S.exportDpi = pg.pxDpi; renderProps(); } })) : null,
      unit === "px" ? el("p", { class: `${NS}-muted` }, `Exports at ${pg.pxDpi || 96} dpi give exactly ${Math.round(toUnit(pg.width, pg))} × ${Math.round(toUnit(pg.height, pg))} px.`) : null,
      btn("Swap width and height", swap, { iconName: "refresh" }),
      row("Paper color", fColor(pg, "background")),
    ]),
    section("Page Border (Neatline)", [
      fCheck(pg, "border.show", "Show page border"),
      fCheck(pg, "border.double", "Double line"),
      el("div", { class: `${NS}-grid2` }, row("Color", fColor(pg, "border.color")), row("Width", fNum(pg, "border.width", { min: 0.05, step: 0.05, unit: "mm" }))),
      el("div", { class: `${NS}-grid2` }, row("Inset", fNum(pg, "border.inset", { min: 0, step: 0.5, unit: "mm" })), row("Double gap", fNum(pg, "border.gap", { min: 0.2, step: 0.1, unit: "mm" }))),
    ]),
    ...gridDesignSections(pg),
  ];
}

// ---------------------------------------------------------------- grid design (canvas grid, layout grid, guides, snapping)
function gridDefaults(pg) {
  pg.gridSize ??= 5;
  pg.gridSub ??= 5;
  pg.gridStyle ??= "lines";
  pg.gridColor ??= "#0d99ff";
  pg.gridOpacity ??= 0.14;
  pg.snapTol ??= 6;
  pg.nudge ??= 1;
  pg.nudgeBig ??= 10;
  pg.guideColor ??= "#00c2ff";
  pg.layoutGrid ??= { show: false, cols: 12, colGutter: 5, rows: 0, rowGutter: 5, margin: null, color: "#ff3b6b", opacity: 0.1, snap: true };
  pg.guides ??= { v: [], h: [] };
}
function gridDesignSections(pg) {
  gridDefaults(pg);
  const deco = () => {
    renderPageDecor();
    renderGuides?.();
  };
  const lg = pg.layoutGrid;
  const gi = el("input", { type: "number", class: `${NS}-input`, step: 0.5, placeholder: "0" });
  const gdir = el("select", { class: `${NS}-input ${NS}-sm` }, el("option", { value: "v" }, "Vertical at X"), el("option", { value: "h" }, "Horizontal at Y"));
  const addGuide = btn("Add", () => {
    const v = parseFloat(gi.value);
    if (!Number.isFinite(v)) return toast("Type a position in mm", "warn");
    commit(() => pg.guides[gdir.value].push(round(v, 3)));
  }, { iconName: "plus" });
  const guideList = el("div", { class: `${NS}-guidelist` });
  for (const dir of ["v", "h"]) {
    pg.guides[dir].forEach((v, i) => {
      guideList.appendChild(el("span", { class: `${NS}-guidechip` }, `${dir === "v" ? "X" : "Y"} ${fmtNumber(v, 2)}`, iconBtn("close", "Remove guide", () => commit(() => pg.guides[dir].splice(i, 1)))));
    });
  }
  return [
    section("Canvas grid", [
      fCheck(pg, "showGrid", "Show grid (not printed)", { after: deco }),
      el("div", { class: `${NS}-grid2` },
        row("Spacing", fNum(pg, "gridSize", { min: 0.5, step: 0.5, unit: "mm", after: deco })),
        row("Major every", fNum(pg, "gridSub", { min: 1, max: 20, step: 1, after: deco })),
      ),
      el("div", { class: `${NS}-grid2` },
        row("Style", fSelect(pg, "gridStyle", [["lines", "Lines"], ["dots", "Dots"]], { after: deco })),
        row("Color", fColor(pg, "gridColor", { after: deco })),
      ),
      row("Opacity", fRange(pg, "gridOpacity", 0.03, 0.6, 0.01, { after: deco })),
      fCheck(pg, "snapGrid", "Snap to grid"),
    ]),
    section("Layout grid", [
      fCheck(lg, "show", "Show columns and rows (not printed)", { after: () => { deco(); renderProps(); } }),
      el("div", { class: `${NS}-grid2` },
        row("Columns", fNum(lg, "cols", { min: 0, max: 48, step: 1, after: deco })),
        row("Gutter", fNum(lg, "colGutter", { min: 0, step: 0.5, unit: "mm", after: deco })),
      ),
      el("div", { class: `${NS}-grid2` },
        row("Rows", fNum(lg, "rows", { min: 0, max: 48, step: 1, after: deco })),
        row("Gutter", fNum(lg, "rowGutter", { min: 0, step: 0.5, unit: "mm", after: deco })),
      ),
      el("div", { class: `${NS}-grid2` },
        row("Margin", fNum(lg, "margin", { min: 0, step: 0.5, unit: "mm", after: deco })),
        row("Color", fColor(lg, "color", { after: deco })),
      ),
      el("p", { class: `${NS}-muted` }, "Margin empty or 0 uses the page margin. Items snap to column and row edges."),
      fCheck(lg, "snap", "Snap to columns and rows"),
    ], !!lg.show),
    section("Guides", [
      fCheck(pg, "showGuides", "Show guides", { after: () => renderGuides() }),
      row("Guide color", fColor(pg, "guideColor", { after: () => renderGuides() })),
      el("div", { class: `${NS}-addguide` }, gdir, el("span", { class: `${NS}-unitwrap` }, gi, el("span", { class: `${NS}-unit` }, "mm")), addGuide),
      guideList.childElementCount ? guideList : el("p", { class: `${NS}-muted` }, "Drag from a ruler to add a guide, or type an exact position above."),
      el("div", { class: `${NS}-grid2` },
        row("Page margin", fNum(pg, "margin", { min: 0, step: 1, unit: "mm", after: deco })),
        row("", fCheck(pg, "showMargin", "Show margin", { after: deco })),
      ),
      btn("Clear all guides", () => commit(() => (pg.guides = { v: [], h: [] })), { iconName: "trash" }),
    ]),
    section("Snapping & nudge", [
      fCheck(pg, "snapGuides", "Smart snap to items, page, margins and guides"),
      row("Snap distance", fNum(pg, "snapTol", { min: 1, max: 30, step: 1, unit: "px" })),
      el("div", { class: `${NS}-grid2` },
        row("Arrow keys", fNum(pg, "nudge", { min: 0.01, step: 0.1, unit: "mm" })),
        row("Shift + arrows", fNum(pg, "nudgeBig", { min: 0.1, step: 1, unit: "mm" })),
      ),
      el("p", { class: `${NS}-muted` }, "Alt + arrows moves 0.1 mm. Hold Alt while dragging to turn snapping off; Shift keeps the direction or the proportions."),
    ], false),
  ];
}

function varProps() {
  const vars = S.doc.vars || (S.doc.vars = {});
  const list = el("div", {});
  for (const key of Object.keys(vars)) {
    const del = iconBtn("trash", "Delete variable", () => {
      commit(() => delete vars[key]);
    });
    list.appendChild(el("div", { class: `${NS}-varrow` }, el("code", {}, `{${key}}`), fText(vars, key, { after: () => refreshCanvas() }), del));
  }
  const nameIn = el("input", { class: `${NS}-input`, placeholder: "variable_name" });
  const add = btn("Add", () => {
    const k = nameIn.value.trim().toLowerCase().replace(/[^\w]/g, "_");
    if (!k) return;
    commit(() => (vars[k] = ""));
  }, { iconName: "plus" });
  return [
    section("Layout Variables", [
      el("p", { class: `${NS}-muted` }, "Fill these once and use them in any text or table by typing {name}. Built-in: {date}, {year}, {scale}, {scale:Map Name}."),
      list,
      el("div", { class: `${NS}-varrow` }, nameIn, add),
    ]),
  ];
}
