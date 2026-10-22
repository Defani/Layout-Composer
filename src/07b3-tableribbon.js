// ---------------------------------------------------------------- Word-style table ribbon
// Two contextual tabs while a table is selected, like Word's Table Tools:
// Table Design (style options, styles, borders, shading) and Table Layout
// (font, rows & columns, cell size, alignment).

const TABLE_STYLES = [
  { id: "grid", name: "Table Grid", set: { header: false, zebra: false, bandCols: false, headerBg: "", background: "#ffffff", borderColor: "#000000", outerBorder: true, innerH: true, innerV: true, borderStyle: "solid" } },
  { id: "plain", name: "Plain", set: { header: true, zebra: false, bandCols: false, headerBg: "", background: "", borderColor: "#7f7f7f", outerBorder: false, innerH: true, innerV: false, headerRule: true, borderStyle: "solid" } },
  { id: "light", name: "Grid light", set: { header: true, zebra: false, bandCols: false, headerBg: "#f2f2f2", background: "#ffffff", borderColor: "#bfbfbf", outerBorder: true, innerH: true, innerV: true, borderStyle: "solid" } },
  { id: "banded", name: "Banded gray", set: { header: true, zebra: true, zebraColor: "#f2f2f2", bandCols: false, headerBg: "#d9d9d9", background: "#ffffff", borderColor: "#a6a6a6", outerBorder: true, innerH: false, innerV: false, borderStyle: "solid" } },
  { id: "blue", name: "Blue header", set: { header: true, zebra: true, zebraColor: "#deebf7", bandCols: false, headerBg: "#2f5496", headerColor: "#ffffff", background: "#ffffff", borderColor: "#8eaadb", outerBorder: true, innerH: true, innerV: false, borderStyle: "solid" } },
  { id: "green", name: "Green header", set: { header: true, zebra: true, zebraColor: "#e2efda", bandCols: false, headerBg: "#548235", headerColor: "#ffffff", background: "#ffffff", borderColor: "#a9d08e", outerBorder: true, innerH: true, innerV: false, borderStyle: "solid" } },
  { id: "dashed", name: "Dashed lines", set: { header: true, zebra: false, bandCols: false, headerBg: "", background: "", borderColor: "#595959", outerBorder: true, innerH: true, innerV: true, borderStyle: "dash" } },
  { id: "none", name: "No borders", set: { header: false, zebra: false, bandCols: false, headerBg: "", background: "", outerBorder: false, innerH: false, innerV: false, borderStyle: "solid" } },
];
const TABLE_WIDTHS = [[0.1, "¼ pt"], [0.18, "½ pt"], [0.25, "¾ pt"], [0.35, "1 pt"], [0.53, "1½ pt"], [0.7, "2¼ pt"], [1.06, "3 pt"]];

// a small picture of a table style for the gallery
function tableStyleThumb(st) {
  const s = st.set;
  let out = `<svg width="40" height="30" viewBox="0 0 40 30">`;
  out += `<rect width="40" height="30" fill="${s.background || "#ffffff"}"/>`;
  for (let r = 0; r < 5; r++) {
    const y = r * 6;
    if (r === 0 && s.header && s.headerBg) out += `<rect y="0" width="40" height="6" fill="${s.headerBg}"/>`;
    else if (s.zebra && r % 2 === 0 && r > 0) out += `<rect y="${y}" width="40" height="6" fill="${s.zebraColor}"/>`;
    if (r > 0 && s.innerH) out += `<line x1="0" y1="${y}" x2="40" y2="${y}" stroke="${s.borderColor}" stroke-width="${s.headerRule && r === 1 ? 1.2 : 0.6}"${s.borderStyle === "dash" ? ' stroke-dasharray="2 1.5"' : ""}/>`;
  }
  if (s.innerV) for (let c = 1; c < 4; c++) out += `<line x1="${c * 10}" y1="0" x2="${c * 10}" y2="30" stroke="${s.borderColor}" stroke-width="0.6"${s.borderStyle === "dash" ? ' stroke-dasharray="2 1.5"' : ""}/>`;
  if (s.outerBorder) out += `<rect x="0.5" y="0.5" width="39" height="29" fill="none" stroke="${s.borderColor}" stroke-width="1"/>`;
  return `${out}</svg>`;
}

function tableRibbon(item, part) {
  const p = item.props;
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const set = (path, v) => liveSet(item, path, v, rerender);
  const btn = (html, title, onClick, active = false) => el("button", { type: "button", class: `${NS}-qbtn ${active ? "active" : ""}`, title, "aria-label": title, html, onclick: onClick });
  const big = (iconName, label, title, onClick) => el("button", { type: "button", class: `${NS}-rbig`, title, html: `${icon(iconName, 20)}<span>${esc(label)}</span>`, onclick: (e) => onClick(e.currentTarget) });
  const caret = (title, build) => {
    const b = el("button", { type: "button", class: `${NS}-qbtn ${NS}-qcaret`, title, html: icon("chevron", 10) });
    b.addEventListener("click", () => popoverAt(b, build(), `${NS}-ddpop`));
    return b;
  };
  const split = (main, title, build) => el("span", { class: `${NS}-split` }, main, caret(title, build));
  const opt = (label, onPick, active = false) => el("button", { type: "button", class: `${NS}-ddopt ${active ? "active" : ""}`, onclick: () => { closePopover(); onPick(); } }, label);
  const swatches = (colors, onPick, current) => el("div", { class: `${NS}-ddswatches` }, ...colors.map((c) => el("button", { type: "button", class: `${NS}-ddsw ${String(current).toLowerCase() === c.toLowerCase() ? "active" : ""}`, title: c, style: { background: c }, onclick: () => { closePopover(); onPick(c); } })));
  const group = (caption, ...children) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, ...children), el("div", { class: `${NS}-rcap` }, caption));
  const rowOf = (...c) => el("div", { class: `${NS}-rrow` }, ...c.filter(Boolean));
  const innerH = p.innerH ?? p.innerBorder;
  const innerV = p.innerV ?? p.innerBorder;

  if (part === "design") {
    // ---- Table Style Options
    const check = (key, label) => {
      const c = el("input", { type: "checkbox", checked: !!p[key] });
      c.addEventListener("change", () => set(`props.${key}`, c.checked));
      return el("label", { class: `${NS}-rcheck` }, c, label);
    };
    const options = el("div", { class: `${NS}-rchecks` },
      check("header", "Header Row"), check("firstCol", "First Column"),
      check("footer", "Total Row"), check("lastCol", "Last Column"),
      check("zebra", "Banded Rows"), check("bandCols", "Banded Columns"),
    );
    // ---- Table Styles
    const styles = el("div", { class: `${NS}-tstylegal` }, ...TABLE_STYLES.map((st) =>
      el("button", { type: "button", class: `${NS}-tstyle ${p.tableStyle === st.id ? "active" : ""}`, title: st.name, html: tableStyleThumb(st), onclick: () => commit(() => {
        Object.assign(p, st.set, { tableStyle: st.id });
        p.headerFont.color = st.set.headerColor || p.font.color || "#111111";
      }) })));
    // ---- Borders and shading
    const styleSel = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Border style" }, ...[["solid", "———"], ["dash", "– – –"], ["dot", "·······"], ["dashdot", "–·–·"]].map(([v, l]) => el("option", { value: v, selected: (p.borderStyle || "solid") === v }, l)));
    styleSel.addEventListener("change", () => set("props.borderStyle", styleSel.value));
    const widthSel = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Border width" }, ...TABLE_WIDTHS.map(([v, l]) => el("option", { value: v, selected: Math.abs((p.borderWidth || 0) - v) < 0.02 }, l)));
    if (!TABLE_WIDTHS.some(([v]) => Math.abs((p.borderWidth || 0) - v) < 0.02)) widthSel.appendChild(el("option", { value: p.borderWidth, selected: true }, `${p.borderWidth} mm`));
    widthSel.addEventListener("change", () => set("props.borderWidth", parseFloat(widthSel.value)));
    const pen = split(
      btn(`<span class="${NS}-cglyph">${icon("pen", 14)}<i style="background:${p.borderColor}"></i></span>`, "Pen color", () => openColorWheel(pen, p.borderColor, (c) => liveSet(item, "props.borderColor", c, () => refreshCanvas()))),
      "Pen colors",
      () => swatches(["#000000", "#404040", "#7f7f7f", "#bfbfbf", ...QUICK_PALETTE.slice(0, 14)], (c) => set("props.borderColor", c), p.borderColor),
    );
    const setBorders = (outer, h, v) => commit(() => Object.assign(p, { outerBorder: outer, innerH: h, innerV: v }));
    const borders = split(
      btn('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16"/><path d="M12 4v16M4 12h16"/></svg>', "All borders", () => setBorders(true, true, true), p.outerBorder && innerH && innerV),
      "Borders",
      () => el("div", { class: `${NS}-ddmenu` },
        opt("All borders", () => setBorders(true, true, true), p.outerBorder && innerH && innerV),
        opt("Outside borders", () => setBorders(true, false, false), p.outerBorder && !innerH && !innerV),
        opt("Inside borders", () => setBorders(false, true, true), !p.outerBorder && innerH && innerV),
        opt("Inside horizontal", () => setBorders(p.outerBorder, true, false), innerH && !innerV),
        opt("Inside vertical", () => setBorders(p.outerBorder, false, true), !innerH && innerV),
        opt("No border", () => setBorders(false, false, false), !p.outerBorder && !innerH && !innerV),
      ),
    );
    const shading = split(
      btn(`<span class="${NS}-cglyph">${RIB_ICONS.shading}<i style="background:${p.background || "transparent"}"></i></span>`, "Shading (table background)", () => set("props.background", p.background ? "" : "#ffffff")),
      "Shading colors",
      () => el("div", {}, el("div", { class: `${NS}-mhead` }, "Table"), swatches(["#FFFFFF", "#F2F2F2", "#FFF2CC", "#E2EFDA", "#DDEBF7", "#FCE4D6"], (c) => set("props.background", c), p.background),
        el("div", { class: `${NS}-mhead` }, "Header row"), swatches(["#D9D9D9", "#BDD7EE", "#C6E0B4", "#FFE699", "#2F5496", "#548235", "#000000"], (c) => set("props.headerBg", c), p.headerBg),
        el("div", { class: `${NS}-mhead` }, "Banded rows / columns"), swatches(["#F2F2F2", "#DEEBF7", "#E2EFDA", "#FFF2CC", "#FBE5D6"], (c) => set("props.zebraColor", c), p.zebraColor),
        opt("No table shading", () => set("props.background", ""), !p.background)),
    );
    return [
      group("Table Style Options", options),
      el("div", { class: `${NS}-rgroup` }, styles, el("div", { class: `${NS}-rcap` }, "Table Styles")),
      group("Borders", rowOf(styleSel, widthSel), rowOf(pen, borders, shading)),
    ];
  }

  // ---- Table Layout: rows & columns, cell size, alignment
  const rows = p.rows;
  const nCols = Math.max(1, ...rows.map((r) => r.length));
  const widths = () => {
    const w = String(p.colWidths || "").split(",").map(parseFloat).filter((v) => v > 0);
    while (w.length < nCols) w.push(w.length ? w[w.length - 1] : 1);
    return w.slice(0, nCols);
  };
  const addRow = () => commit(() => rows.push(Array(nCols).fill("")));
  const addCol = () => commit(() => {
    rows.forEach((r) => r.push(""));
    const w = widths();
    w.push(Math.round(w.reduce((a, b) => a + b, 0) / w.length));
    p.colWidths = w.join(",");
  });
  const delRow = () => rows.length > 1 && commit(() => rows.pop());
  const delCol = () => nCols > 1 && commit(() => {
    rows.forEach((r) => r.length >= nCols && r.splice(nCols - 1, 1));
    p.colWidths = widths().slice(0, nCols - 1).join(",");
    if (p.colAlign) p.colAlign = p.colAlign.slice(0, nCols - 1);
  });
  const cw = el("input", { type: "text", class: `${NS}-input ${NS}-tcolw`, value: widths().join(","), title: "Column widths as proportions, e.g. 35,65" });
  cw.addEventListener("change", () => set("props.colWidths", cw.value));
  const valign = p.valign || "middle";
  const align = p.align || "left";
  const alignGrid = el("div", { class: `${NS}-talign` }, ...["top", "middle", "bottom"].flatMap((v) => ["left", "center", "right"].map((h) =>
    el("button", { type: "button", class: `${NS}-qbtn ${valign === v && align === h && !p.colAlign?.some(Boolean) ? "active" : ""}`, title: `Align ${v} ${h}`, html: `<svg width="14" height="14" viewBox="0 0 14 14"><rect x="0.5" y="0.5" width="13" height="13" fill="none" stroke="currentColor" stroke-opacity="0.35"/><rect x="${h === "left" ? 2 : h === "center" ? 4 : 6}" y="${v === "top" ? 2 : v === "middle" ? 6 : 10}" width="6" height="2" fill="currentColor"/></svg>`, onclick: () => commit(() => Object.assign(p, { valign: v, align: h, colAlign: [] })) }))));
  const pad = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: p.padding, min: 0, step: 0.2, title: "Cell margins (mm)" });
  pad.addEventListener("change", () => set("props.padding", Math.max(0, parseFloat(pad.value) || 0)));
  return [
    group("Rows & Columns",
      rowOf(big("table", "Edit cells", "Edit the table cell by cell", (b) => openTableEditor(item, b)),
        el("div", { class: `${NS}-rstack` },
          rowOf(btn("+ Row", "Insert a row at the bottom", addRow), btn("+ Column", "Insert a column on the right", addCol)),
          rowOf(btn("− Row", "Delete the last row", delRow), btn("− Column", "Delete the last column", delCol)),
        )),
    ),
    group("Cell Size",
      rowOf(btn("AutoFit", "Fit the table height to its contents", () => commit(() => (item.h = round(S.legendCache.get(item.id) || item.h, 2)))), btn("⇹ Columns", "Distribute columns evenly", () => set("props.colWidths", Array(nCols).fill(1).join(",")))),
      rowOf(el("span", { class: `${NS}-qtag` }, "Widths"), cw),
    ),
    el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows ${NS}-rrow` }, alignGrid, el("div", { class: `${NS}-rstack` }, el("span", { class: `${NS}-qtag` }, "Cell margins"), el("span", { class: `${NS}-unitwrap` }, pad, el("span", { class: `${NS}-unit` }, "mm")))), el("div", { class: `${NS}-rcap` }, "Alignment")),
  ];
}

// Spreadsheet-like editor: click a cell, then insert or delete around it (Word's
// Rows & Columns act on the cell with the cursor).
function openTableEditor(item, anchor) {
  const p = item.props;
  let cur = [0, 0];
  const body = el("div", { class: `${NS}-tedit` });
  const draw = () => {
    const rows = p.rows;
    const nCols = Math.max(1, ...rows.map((r) => r.length));
    const at = (fn) => () => {
      commit(fn);
      draw();
    };
    const [r0, c0] = cur;
    const widths = () => {
      const w = String(p.colWidths || "").split(",").map(parseFloat).filter((v) => v > 0);
      while (w.length < nCols) w.push(w.length ? w[w.length - 1] : 1);
      return w.slice(0, nCols);
    };
    const insCol = (ci) => at(() => {
      rows.forEach((r) => r.splice(ci, 0, ""));
      const w = widths();
      w.splice(ci, 0, Math.round(w.reduce((a, b) => a + b, 0) / w.length));
      p.colWidths = w.join(",");
      if (p.colAlign?.length) p.colAlign.splice(ci, 0, null);
    });
    const tools = el("div", { class: `${NS}-btnrow ${NS}-tedtools` },
      el("button", { type: "button", class: `${NS}-btn`, onclick: at(() => rows.splice(r0, 0, Array(nCols).fill(""))) }, "Row above"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: at(() => { rows.splice(r0 + 1, 0, Array(nCols).fill("")); cur = [r0 + 1, c0]; }) }, "Row below"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: insCol(c0) }, "Column left"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: () => { insCol(c0 + 1)(); cur = [r0, c0 + 1]; draw(); } }, "Column right"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: at(() => { if (rows.length > 1) rows.splice(r0, 1); cur = [Math.min(r0, rows.length - 1), c0]; }) }, "Delete row"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: at(() => {
        if (nCols < 2) return;
        rows.forEach((r) => r.splice(c0, 1));
        p.colWidths = widths().filter((_, i) => i !== c0).join(",");
        if (p.colAlign?.length) p.colAlign.splice(c0, 1);
        cur = [r0, Math.min(c0, nCols - 2)];
      }) }, "Delete column"),
    );
    const grid = el("div", { class: `${NS}-tedgrid`, style: { gridTemplateColumns: `repeat(${nCols}, minmax(70px, 1fr))` } });
    rows.forEach((r, ri) => {
      for (let ci = 0; ci < nCols; ci++) {
        const inp = el("input", { type: "text", class: `${NS}-input ${ri === r0 && ci === c0 ? "cur" : ""} ${p.header && ri === 0 ? "head" : ""}`, value: r[ci] ?? "" });
        inp.addEventListener("focus", () => {
          cur = [ri, ci];
          grid.querySelectorAll("input.cur").forEach((x) => x.classList.remove("cur"));
          inp.classList.add("cur");
        });
        inp.addEventListener("input", () => {
          while (r.length <= ci) r.push("");
          r[ci] = inp.value;
          liveSet(item, "props.rows", rows, () => refreshCanvas());
        });
        grid.appendChild(inp);
      }
    });
    body.replaceChildren(el("div", { class: `${NS}-ptitle` }, "Edit table"), tools, grid, el("p", { class: `${NS}-muted` }, "Click a cell, then insert or delete rows and columns around it. Variables such as {date} work in cells."));
    grid.querySelector("input.cur")?.focus();
  };
  draw();
  popoverAt(anchor, body, `${NS}-tedpop`);
}
