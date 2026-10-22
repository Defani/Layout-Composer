// ---------------------------------------------------------------- Word-style text ribbon
// Font · Paragraph · Styles groups in two rows with a caption, like the Home tab
// of Word / Google Docs. Formatting applies to the whole text item.

const FONT_SIZES = [6, 7, 8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const HIGHLIGHTS = ["#FFFF00", "#00FF00", "#00FFFF", "#FF00FF", "#0000FF", "#FF0000", "#000080", "#008080", "#008000", "#800080", "#800000", "#808000", "#808080", "#C0C0C0", "#000000"];
const UNDERLINES = [["single", "Single"], ["double", "Double"], ["thick", "Thick"], ["dotted", "Dotted"], ["dash", "Dashed"], ["wavy", "Wavy"]];
const TEXT_STYLES = [
  { id: "normal", name: "Normal", font: { size: 11, bold: false, italic: false, color: "#111111" }, textCase: "none", lineHeight: 1.2, paraSpacing: 0 },
  { id: "nospace", name: "No Spacing", font: { size: 11, bold: false, italic: false, color: "#111111" }, textCase: "none", lineHeight: 1, paraSpacing: 0 },
  { id: "title", name: "Title", font: { size: 20, bold: true, italic: false, color: "#111111" }, textCase: "upper", align: "center" },
  { id: "subtitle", name: "Subtitle", font: { size: 13, bold: false, italic: true, color: "#555555" }, textCase: "none" },
  { id: "h1", name: "Heading 1", font: { size: 16, bold: true, italic: false, color: "#1F3864" }, textCase: "none" },
  { id: "h2", name: "Heading 2", font: { size: 13, bold: true, italic: false, color: "#2F5496" }, textCase: "none" },
  { id: "h3", name: "Heading 3", font: { size: 11, bold: true, italic: false, color: "#1F3763" }, textCase: "none" },
  { id: "caption", name: "Caption", font: { size: 8, bold: false, italic: true, color: "#444444" }, textCase: "none" },
  { id: "quote", name: "Quote", font: { size: 11, bold: false, italic: true, color: "#555555" }, textCase: "none", align: "center" },
  { id: "maptitle", name: "Map Title", font: { size: 14, bold: true, italic: false, color: "#000000" }, textCase: "upper", align: "center" },
  { id: "source", name: "Source note", font: { size: 7, bold: false, italic: false, color: "#333333" }, textCase: "none", align: "left" },
];

const RIB_ICONS = {
  grow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20 9 5l6 15M5.5 14h7"/><path d="M17 9l2.5-3L22 9"/></svg>',
  shrink: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20 9 5l6 15M5.5 14h7"/><path d="M17 6l2.5 3L22 6"/></svg>',
  clear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 10 5l4 9"/><path d="m13 21 4-4m0 0 4-4m-4 4-4-4m4 4 4 4" stroke="#e11d48"/></svg>',
  bullets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="6" r="1.3" fill="currentColor"/><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="5" cy="18" r="1.3" fill="currentColor"/><path d="M10 6h10M10 12h10M10 18h10"/></svg>',
  numbers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 6h10M10 12h10M10 18h10"/><text x="2" y="8.5" font-size="7" fill="currentColor" stroke="none" font-family="Arial">1</text><text x="2" y="14.5" font-size="7" fill="currentColor" stroke="none" font-family="Arial">2</text><text x="2" y="20.5" font-size="7" fill="currentColor" stroke="none" font-family="Arial">3</text></svg>',
  outdent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M11 10h9M11 14h9M4 19h16M7 9l-3 3 3 3"/></svg>',
  indent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M11 10h9M11 14h9M4 19h16M4 9l3 3-3 3"/></svg>',
  sort: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4v16m0 0-3-3m3 3 3-3"/><text x="2" y="10" font-size="8" fill="currentColor" stroke="none" font-family="Arial" font-weight="bold">A</text><text x="2" y="20" font-size="8" fill="currentColor" stroke="none" font-family="Arial" font-weight="bold">Z</text></svg>',
  alJ: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
  alL: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
  alC: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
  alR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>',
  spacing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 6h10M11 12h10M11 18h10M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2"/></svg>',
  shading: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 7-7 7 7-7 7z"/><path d="M19 15s2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 2-3.5 2-3.5z"/></svg>',
  borders: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" stroke-dasharray="2 2"/><path d="M4 20h16"/></svg>',
  para: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4h9v2h-2v14h-2V6h-2v14h-2v-8a4 4 0 1 1 0-8z"/></svg>',
  highlight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 15 7-11 3 2-7 11z"/><path d="m9 15-1 3h3"/></svg>',
};

function textRibbon(item, fp) {
  const isText = item.type === "text";
  const p = item.props;
  const f = getPath(item, fp);
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const set = (path, v) => liveSet(item, path, v, rerender);
  const btn = (html, title, onClick, active = false, extra = "") => el("button", { type: "button", class: `${NS}-qbtn ${active ? "active" : ""} ${extra}`, title, "aria-label": title, html, onclick: onClick });
  const caret = (title, build) => {
    const b = el("button", { type: "button", class: `${NS}-qbtn ${NS}-qcaret`, title, html: icon("chevron", 10) });
    b.addEventListener("click", () => popoverAt(b, build(), `${NS}-ddpop`));
    return b;
  };
  // a main button with a menu arrow next to it (Word's split buttons)
  const split = (main, title, build) => el("span", { class: `${NS}-split` }, main, caret(title, build));
  const menu = (...children) => el("div", { class: `${NS}-ddmenu` }, ...children);
  const opt = (label, onPick, active = false, html = null) => el("button", { type: "button", class: `${NS}-ddopt ${active ? "active" : ""}`, onclick: () => { closePopover(); onPick(); }, ...(html ? { html } : {}) }, ...(html ? [] : [label]));
  const swatches = (colors, onPick, current) => el("div", { class: `${NS}-ddswatches` }, ...colors.map((c) => el("button", { type: "button", class: `${NS}-ddsw ${String(current).toLowerCase() === c.toLowerCase() ? "active" : ""}`, title: c, style: { background: c }, onclick: () => { closePopover(); onPick(c); } })));
  // a color button: the letter / icon over a bar in the current color (Word's A with the red bar)
  const colorBtn = (glyph, colorNow, title, onMain) => {
    const b = btn(`<span class="${NS}-cglyph">${glyph}<i style="background:${colorNow || "transparent"}"></i></span>`, title, onMain);
    return b;
  };
  const group = (caption, row1, row2) => el("div", { class: `${NS}-rgroup` },
    el("div", { class: `${NS}-rrows` }, el("div", { class: `${NS}-rrow` }, ...row1.filter(Boolean)), el("div", { class: `${NS}-rrow` }, ...row2.filter(Boolean))),
    el("div", { class: `${NS}-rcap` }, caption),
  );

  // ---- Font
  const fam = fontPicker(f.family, (n) => set(`${fp}.family`, n), { cls: `${NS}-qfam` });
  const size = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: f.size, min: 2, max: 400, step: 0.5, title: "Font size (pt)" });
  size.addEventListener("change", () => {
    const v = parseFloat(size.value);
    if (v > 0) set(`${fp}.size`, v);
  });
  const sizeBox = el("span", { class: `${NS}-split ${NS}-sizebox` }, size, caret("Font sizes", () => menu(...FONT_SIZES.map((s) => opt(String(s), () => set(`${fp}.size`, s), s === f.size)))));
  const stepSize = (dir) => {
    const cur = f.size;
    const next = dir > 0 ? FONT_SIZES.find((s) => s > cur + 1e-9) ?? Math.round(cur + 10) : [...FONT_SIZES].reverse().find((s) => s < cur - 1e-9) ?? Math.max(1, cur - 1);
    set(`${fp}.size`, next);
  };
  const caseMenu = () => menu(
    opt("Sentence case.", () => set("props.textCase", "sentence"), p.textCase === "sentence"),
    opt("lowercase", () => set("props.textCase", "lower"), p.textCase === "lower"),
    opt("UPPERCASE", () => set("props.textCase", "upper"), p.textCase === "upper"),
    opt("Capitalize Each Word", () => set("props.textCase", "title"), p.textCase === "title"),
    opt("tOGGLE cASE", () => set("props.textCase", "toggle"), p.textCase === "toggle"),
    opt("As typed", () => set("props.textCase", "none"), !p.textCase || p.textCase === "none"),
  );
  const clearFormatting = () => commit(() => {
    Object.assign(f, { bold: false, italic: false, color: "#111111", spacing: 0, smallCaps: false });
    if (isText) {
      Object.assign(p, { underline: "none", decoration: "none", strike: false, highlight: "", effect: "none", textCase: "none", halo: false, styleName: "normal" });
      f.size = 11;
    }
  });
  const ul = p.underline || (p.decoration === "underline" ? "single" : "none");
  const wrapMath = (tpl) => () => {
    const ta = S.ui.textArea;
    if (ta && document.body.contains(ta)) insertAtCaret(ta, tpl);
    else commit(() => (p.text = `${p.text || ""}${tpl.replace("|", "2")}`));
  };
  const fontColor = split(
    colorBtn("A", f.color, "Font color", () => openColorWheel(fontColor, f.color || "#000000", (c) => liveSet(item, `${fp}.color`, c, () => refreshCanvas()))),
    "Font color palette",
    () => el("div", {}, el("div", { class: `${NS}-mhead` }, "Colors"), swatches(QUICK_PALETTE, (c) => set(`${fp}.color`, c), f.color), opt("More colors…", () => setTimeout(() => openColorWheel(fontColor, f.color || "#000000", (c) => liveSet(item, `${fp}.color`, c, () => refreshCanvas())), 0))),
  );
  const fontRow1 = [fam, sizeBox, btn(RIB_ICONS.grow, "Increase font size", () => stepSize(1)), btn(RIB_ICONS.shrink, "Decrease font size", () => stepSize(-1))];
  const fontRow2 = [
    btn("<b>B</b>", "Bold", () => set(`${fp}.bold`, !f.bold), !!f.bold),
    btn("<i>I</i>", "Italic", () => set(`${fp}.italic`, !f.italic), !!f.italic),
  ];
  if (isText) {
    const aa = btn(`Aa${icon("chevron", 9)}`, "Change case", () => popoverAt(aa, caseMenu(), `${NS}-ddpop`), p.textCase && p.textCase !== "none");
    fontRow1.push(aa, btn(RIB_ICONS.clear, "Clear all formatting", clearFormatting), btn("Ω", "Insert symbol", () => openSymbolDialog()));
    fontRow2.push(
      split(btn("<u>U</u>", "Underline", () => set("props.underline", ul === "none" ? "single" : "none"), ul !== "none"), "Underline style", () => menu(
        ...UNDERLINES.map(([v, l]) => opt(l, () => set("props.underline", v), ul === v, `<span class="${NS}-ulprev ${v}">${l}</span>`)),
        opt("No underline", () => set("props.underline", "none"), ul === "none"),
      )),
      btn("<s>abc</s>", "Strikethrough", () => set("props.strike", !p.strike), !!p.strike),
      btn("x<sub>2</sub>", "Subscript (inserts LaTeX $_{}$ at the cursor)", wrapMath("$_{|}$")),
      btn("x<sup>2</sup>", "Superscript (inserts LaTeX $^{}$ at the cursor)", wrapMath("$^{|}$")),
      split(btn('<span style="font-weight:700;color:#2563eb;-webkit-text-stroke:0.4px #1e3a8a">A</span>', "Text effects", () => set("props.effect", (p.effect || "none") === "none" ? "shadow" : "none"), (p.effect || "none") !== "none"), "Text effects", () => menu(
        ...Object.entries(TEXT_EFFECTS).map(([v, l]) => opt(l, () => set("props.effect", v), (p.effect || "none") === v)),
        el("div", { class: `${NS}-mhead` }, "Effect color"),
        swatches(QUICK_PALETTE, (c) => set("props.effectColor", c), p.effectColor),
      )),
    );
    const hl = split(
      colorBtn(RIB_ICONS.highlight, p.highlight || "#FFFF00", "Text highlight color", () => set("props.highlight", p.highlight ? "" : p.lastHighlight || "#FFFF00")),
      "Highlight colors",
      () => el("div", {}, swatches(HIGHLIGHTS, (c) => commit(() => Object.assign(p, { highlight: c, lastHighlight: c })), p.highlight), opt("No color", () => set("props.highlight", ""), !p.highlight)),
    );
    fontRow2.push(hl);
  }
  fontRow2.push(fontColor);
  const groups = [group("Font", fontRow1, fontRow2)];
  if (!isText) return groups;

  // ---- Paragraph
  const list = p.list || { kind: "none" };
  const setList = (kind, style) => commit(() => {
    p.list = kind === "none" ? { kind: "none" } : { kind, style };
    // drop markers typed by hand with the old bullet buttons
    if (kind !== "none") p.text = (p.text || "").split("\n").map((l) => l.replace(/^\s*(?:[•◦▪■➢✓–★❖➤○◆-]\s+|\d+[.)]\s+)/, "")).join("\n");
  });
  const preview = (marker) => `<span class="${NS}-listprev"><span>${esc(marker)}</span><i></i></span>`;
  const bulletMenu = () => el("div", {}, el("div", { class: `${NS}-mhead` }, "Bullet library"),
    el("div", { class: `${NS}-ddgrid` },
      opt("None", () => setList("none"), list.kind === "none", `<span class="${NS}-listprev"><b>None</b></span>`),
      ...LIST_BULLETS.map((b) => opt(b, () => setList("bullet", b), list.kind === "bullet" && list.style === b, preview(b))),
    ));
  const numberMenu = () => el("div", {}, el("div", { class: `${NS}-mhead` }, "Numbering library"),
    el("div", { class: `${NS}-ddgrid ${NS}-ddgrid3` },
      opt("None", () => setList("none"), list.kind === "none", `<span class="${NS}-listprev tall"><b>None</b></span>`),
      ...LIST_NUMBERING.map((st) => opt(st, () => setList("number", st), list.kind === "number" && list.style === st, `<span class="${NS}-listprev tall">${[1, 2, 3].map((n) => `<span>${esc(listMarker(n, st))}</span><i></i>`).join("")}</span>`)),
    ));
  const indentStep = 5;
  const sortParas = (dir) => commit(() => {
    const paras = (p.text || "").split("\n");
    const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    paras.sort((a, b) => dir * coll.compare(a, b));
    p.text = paras.join("\n");
  });
  const align = p.align || "left";
  const lhNow = p.lineHeight || 1.2;
  const spacingMenu = () => el("div", {},
    menu(...[1, 1.15, 1.2, 1.5, 2, 2.5, 3].map((v) => opt(`${v}`, () => set("props.lineHeight", v), Math.abs(lhNow - v) < 0.01))),
    el("div", { class: `${NS}-mhead` }, "Space between paragraphs"),
    menu(...[0, 1, 2, 3, 4, 6].map((v) => opt(`${v} mm`, () => set("props.paraSpacing", v), (p.paraSpacing || 0) === v))),
  );
  const shading = split(
    colorBtn(RIB_ICONS.shading, p.background || "transparent", "Shading (background)", () => set("props.background", p.background ? "" : p.lastShading || "#FFF2CC")),
    "Shading colors",
    () => el("div", {}, swatches(["#FFFFFF", "#F2F2F2", "#D9D9D9", "#FFF2CC", "#FCE4D6", "#E2EFDA", "#DDEBF7", "#EDE7F6", "#FDE9E7", ...QUICK_PALETTE.slice(0, 9)], (c) => commit(() => Object.assign(p, { background: c, lastShading: c })), p.background), opt("No color", () => set("props.background", ""), !p.background)),
  );
  const borderMenu = () => menu(
    opt("No border", () => set("props.border.show", false), !p.border?.show),
    opt("Box · thin", () => commit(() => Object.assign(p.border, { show: true, width: 0.2, radius: 0, style: "solid" })), p.border?.show && p.border.width <= 0.25 && !p.border.radius),
    opt("Box · thick", () => commit(() => Object.assign(p.border, { show: true, width: 0.6, radius: 0, style: "solid" })), p.border?.show && p.border.width >= 0.5),
    opt("Box · rounded", () => commit(() => Object.assign(p.border, { show: true, width: 0.3, radius: 2, style: "solid" })), p.border?.show && p.border.radius > 0),
    opt("Box · dashed", () => commit(() => Object.assign(p.border, { show: true, width: 0.3, radius: 0, style: "dash" })), p.border?.show && p.border.style === "dash"),
  );
  const openParaSettings = () => {
    if (S.ui.root.classList.contains("hide-right")) toggleDock("right");
    setTab("item");
  };
  groups.push(group("Paragraph",
    [
      split(btn(RIB_ICONS.bullets, "Bullets", () => setList(list.kind === "bullet" ? "none" : "bullet", list.kind === "bullet" ? undefined : p.lastBullet || "•"), list.kind === "bullet"), "Bullet library", bulletMenu),
      split(btn(RIB_ICONS.numbers, "Numbering", () => setList(list.kind === "number" ? "none" : "number", list.kind === "number" ? undefined : "1."), list.kind === "number"), "Numbering library", numberMenu),
      btn(RIB_ICONS.outdent, "Decrease indent", () => set("props.indent", Math.max(0, (p.indent || 0) - indentStep))),
      btn(RIB_ICONS.indent, "Increase indent", () => set("props.indent", (p.indent || 0) + indentStep)),
      split(btn(RIB_ICONS.sort, "Sort paragraphs A to Z", () => sortParas(1)), "Sort", () => menu(opt("A → Z", () => sortParas(1)), opt("Z → A", () => sortParas(-1)))),
      btn(RIB_ICONS.para, "Paragraph settings", openParaSettings),
    ],
    [
      btn(RIB_ICONS.alL, "Align left", () => set("props.align", "left"), align === "left"),
      btn(RIB_ICONS.alC, "Center", () => set("props.align", "center"), align === "center"),
      btn(RIB_ICONS.alR, "Align right", () => set("props.align", "right"), align === "right"),
      btn(RIB_ICONS.alJ, "Justify", () => set("props.align", "justify"), align === "justify"),
      split(btn(RIB_ICONS.spacing, "Line and paragraph spacing", () => set("props.lineHeight", lhNow >= 1.45 ? 1.2 : 1.5)), "Line spacing options", spacingMenu),
      shading,
      split(btn(RIB_ICONS.borders, "Borders", () => set("props.border.show", !p.border?.show), !!p.border?.show), "Border options", borderMenu),
    ],
  ));

  // ---- Styles (quick style gallery)
  // six cards on the ribbon (the chosen style always among them), all of them under ▾
  const card = (st) => {
    const b = el("button", { type: "button", class: `${NS}-stylecard ${p.styleName === st.id ? "active" : ""}`, title: st.name },
      el("span", { class: `${NS}-stylesample`, style: { fontWeight: st.font.bold ? "700" : "400", fontStyle: st.font.italic ? "italic" : "normal", color: st.font.color, fontSize: `${clamp(st.font.size * 0.9, 10, 17)}px`, textTransform: st.textCase === "upper" ? "uppercase" : "none" } }, "AaBbCc"),
      el("small", {}, st.name),
    );
    b.addEventListener("click", () => commit(() => {
      Object.assign(p.font, st.font);
      p.textCase = st.textCase || "none";
      if (st.align) p.align = st.align;
      if (st.lineHeight) p.lineHeight = st.lineHeight;
      if (st.paraSpacing != null) p.paraSpacing = st.paraSpacing;
      p.styleName = st.id;
      closePopover();
    }));
    return b;
  };
  const shown = TEXT_STYLES.slice(0, 6);
  const cur = TEXT_STYLES.find((s) => s.id === p.styleName);
  if (cur && !shown.includes(cur)) shown[5] = cur;
  const more = el("button", { type: "button", class: `${NS}-qbtn ${NS}-stylemore`, title: "All styles", html: icon("chevron", 12) });
  more.addEventListener("click", () => popoverAt(more, el("div", {}, el("div", { class: `${NS}-ptitle` }, "Styles"), el("div", { class: `${NS}-stylegal ${NS}-stylegal-all` }, ...TEXT_STYLES.map(card))), `${NS}-ddpop`));
  const gallery = el("div", { class: `${NS}-stylegal` }, ...shown.map(card));
  groups.push(el("div", { class: `${NS}-rgroup ${NS}-rgroup-styles` }, el("div", { class: `${NS}-stylewrap` }, gallery, more), el("div", { class: `${NS}-rcap` }, "Styles")));
  return groups;
}
