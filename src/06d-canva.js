// ---------------------------------------------------------------- Canva-style ease of use
// One click adds an item at the centre of the view; double-click edits text in
// place; ready-made text presets.

// Centre of what is visible on the canvas, in page mm.
function viewCenterMM() {
  const sc = S.ui.scroll;
  const x = (sc.scrollLeft + sc.clientWidth / 2 - CANVAS_PAD) / S.zoom;
  const y = (sc.scrollTop + sc.clientHeight / 2 - CANVAS_PAD) / S.zoom;
  const pg = S.doc.page;
  return [clamp(x, 0, pg.width), clamp(y, 0, pg.height)];
}

// Add an item of `tool` (rail / menu ids) centred in the view, then select it.
function addAtCenter(tool, variant, after) {
  const type = { inset: "map", title: "text", heading: "text", subheading: "text", body: "text", caption: "text", maplabel: "text", callout: "text" }[tool] || tool;
  const def = ITEM_TYPES[type];
  if (!def) return;
  const [cx, cy] = viewCenterMM();
  const pg = S.doc.page;
  // size relative to the page so items are usable on A4 and on large sheets alike
  const k = clamp(Math.min(pg.width, pg.height) / 210, 0.6, 3);
  let [w, h] = def.size.map((v) => round(v * k, 1));
  if (type === "map" && tool === "map") [w, h] = [round(pg.width * 0.6, 1), round(pg.height * 0.6, 1)];
  w = Math.min(w, pg.width);
  h = Math.min(h, pg.height);
  const fx = (v, size, max) => round(clamp(v - size / 2, 0, Math.max(0, max - size)), 1);
  addItemFromTool(TEXT_PRESETS[tool] ? "text" : tool, { x: fx(cx, w, pg.width), y: fx(cy, h, pg.height), w, h }, variant);
  const item = S.doc.items.at(-1);
  if (!item) return;
  const preset = TEXT_PRESETS[tool];
  if (preset) {
    commit(() => {
      Object.assign(item, { name: preset.name });
      item.props = deepMerge(item.props, clone(preset.props));
      item.props.font = { ...item.props.font, ...preset.props.font, size: round((preset.props.font?.size || item.props.font.size) * Math.sqrt(k), 1) };
      const lh = item.props.font.size * PT * (item.props.lineHeight || 1.2);
      item.h = round(Math.max(lh + 2 * (item.props.padding || 0) + 1, preset.h ? preset.h * k : 0), 1);
      if (preset.w) item.w = round(preset.w * k, 1);
      item.x = fx(cx, item.w, pg.width);
      item.y = fx(cy, item.h, pg.height);
    });
  }
  setTool("select");
  select([item.id]);
  after?.(item);
  // Canva-style: a new text box is ready to type into, its text selected so the
  // first keystroke replaces the placeholder.
  if (item.type === "text" && !after) requestAnimationFrame(() => startInlineEdit(item));
  return item;
}

// Double-click on an empty part of the page: drop a text box there and type.
function addTextAt(xMM, yMM) {
  const pg = S.doc.page;
  const k = clamp(Math.min(pg.width, pg.height) / 210, 0.6, 3);
  const size = round(12 * Math.sqrt(k), 1);
  const h = round(size * PT * 1.2 + 2, 1);
  const w = round(40 * k, 1);
  addItemFromTool("text", { x: round(clamp(xMM, 0, pg.width - w), 1), y: round(clamp(yMM - h / 2, 0, pg.height - h), 1), w, h });
  const item = S.doc.items.at(-1);
  if (!item || item.type !== "text") return;
  commit(() => {
    item.props.text = "";
    item.props.font = { ...item.props.font, size };
    item.props.wrap = false;
    item.props.autoSize = "width";
  });
  setTool("select");
  select([item.id]);
  requestAnimationFrame(() => startInlineEdit(item));
}

const TEXT_PRESETS = {
  heading: { name: "Heading", w: 140, props: { text: "Add a heading", font: { size: 26, bold: true }, align: "center", valign: "middle" } },
  subheading: { name: "Subheading", w: 120, props: { text: "Add a subheading", font: { size: 15, bold: true, color: "#333333" }, align: "center", valign: "middle" } },
  body: { name: "Body text", w: 90, h: 24, props: { text: "Add a little bit of body text. Double-click to edit it on the page.", font: { size: 10 }, align: "left", valign: "top", wrap: true } },
  caption: { name: "Caption", w: 80, props: { text: "Caption — source, date or note", font: { size: 8, italic: true, color: "#555555" }, align: "left", valign: "middle" } },
  maplabel: { name: "Map label", w: 50, props: { text: "LABEL", font: { size: 9, bold: true, color: "#1f2937", spacing: 20 }, align: "center", valign: "middle", halo: true, haloColor: "#ffffff", haloWidth: 0.8 } },
  callout: { name: "Callout", w: 70, h: 20, props: { text: "Callout text", font: { size: 10, color: "#ffffff", bold: true }, align: "center", valign: "middle", padding: 3, background: "#0d99ff", border: { show: false, radius: 4 } } },
};

// ---------------------------------------------------------------- inline text editing
function startInlineEdit(item) {
  if (!item || item.type !== "text" || item.locked) return;
  finishInlineEdit();
  const node = S.ui.itemEls.get(item.id);
  if (!node) return;
  const p = item.props;
  const Z = S.zoom;
  const ta = el("textarea", { class: `${NS}-inline`, spellcheck: "false" });
  ta.value = p.text || "";
  // Canva: a heading box hugs its text and grows from its anchor (left edge,
  // centre or right edge) while typing; a paragraph box keeps its width, wraps
  // and grows downwards. The real box, its frame and handles follow every key.
  const hug = p.autoSize === "width" || !p.wrap;
  if (hug) ta.style.whiteSpace = "pre";
  Object.assign(ta.style, {
    transform: item.rot ? `rotate(${item.rot}deg)` : "",
    fontFamily: `"${p.font.family}", Arial, sans-serif`,
    fontSize: `${p.font.size * PT * Z}px`,
    fontWeight: p.font.bold ? "700" : "400",
    fontStyle: p.font.italic ? "italic" : "normal",
    color: p.font.color,
    textAlign: p.align,
    lineHeight: String(p.lineHeight || 1.2),
    padding: `${(p.padding || 0) * Z}px`,
    // transparent: the text looks the same while typing as after (Canva)
    background: p.background || "transparent",
    letterSpacing: p.font.spacing ? `${(p.font.spacing / 1000) * p.font.size * PT * Z}px` : "",
    paddingLeft: `${((p.padding || 0) + Math.max(0, p.indent || 0)) * Z}px`,
    textTransform: { upper: "uppercase", lower: "lowercase", title: "capitalize" }[p.textCase] || "",
    textDecoration: [p.underline && p.underline !== "none" ? "underline" : "", p.strike ? "line-through" : ""].filter(Boolean).join(" "),
  });
  const orig = { text: p.text, x: item.x, y: item.y, w: item.w, h: item.h };
  const ax = p.align === "center" ? item.x + item.w / 2 : p.align === "right" ? item.x + item.w : item.x;
  const kx = p.align === "center" ? 0.5 : p.align === "right" ? 1 : 0;
  const ky = p.valign === "middle" ? 0.5 : p.valign === "bottom" ? 1 : 0;
  const fit = () => {
    p.text = ta.value;
    renderPaper([item.id]); // auto-size settles the box from the real text
    if (hug) item.x = round(ax - item.w * kx, 3);
    const pad = (p.padding || 0) * Z;
    let w = item.w * Z;
    let left = item.x * Z;
    Object.assign(ta.style, { width: `${w}px`, paddingTop: `${pad}px`, height: "0px" });
    // font metrics of the page and the editor can differ a hair: never let the
    // editor scroll its text sideways
    if (hug && ta.scrollWidth > ta.clientWidth) {
      const d = ta.scrollWidth - ta.clientWidth + 2;
      w += d;
      left -= d * kx;
      ta.style.width = `${w}px`;
    }
    const need = ta.scrollHeight;
    // a fixed box grows downwards when the text no longer fits (Canva)
    if (p.autoSize !== "width" && p.autoSize !== "height" && need / Z > item.h) item.h = round(need / Z, 2);
    const boxH = item.h * Z;
    Object.assign(ta.style, {
      left: `${left}px`,
      top: `${item.y * Z}px`,
      paddingTop: `${pad + Math.max(0, boxH - need) * ky}px`,
      height: `${Math.max(boxH, need)}px`,
    });
    Object.assign(node.style, { left: `${item.x * Z}px`, height: `${boxH}px` });
    renderSelection();
  };
  S.ui.paper.appendChild(ta);
  S.ui.paper.classList.add(`${NS}-inlineedit`);
  node.style.visibility = "hidden";
  S.inline = { item, ta, node, orig };
  fit();
  ta.focus();
  ta.select();
  ta.addEventListener("keydown", (e) => {
    e.stopPropagation();
    // Esc or Ctrl+Enter leave the box keeping what was typed (Canva / PowerPoint);
    // Ctrl+Z afterwards brings the old text back
    if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      finishInlineEdit();
    }
  });
  ta.addEventListener("input", fit);
  ta.addEventListener("blur", () => finishInlineEdit());
}
function finishInlineEdit() {
  const ed = S.inline;
  if (!ed) return;
  S.inline = null;
  const { item, ta, node, orig } = ed;
  const text = ta.value;
  const end = { x: item.x, y: item.y, w: item.w, h: item.h };
  // the live edit changed the item in place: put it back so the undo step
  // below records the text as it was
  Object.assign(item, { x: orig.x, y: orig.y, w: orig.w, h: orig.h });
  item.props.text = orig.text;
  ta.remove();
  S.ui.paper.classList.remove(`${NS}-inlineedit`);
  node.style.visibility = "";
  // an empty new text box is dropped instead of leaving an invisible item
  if (!text.trim() && !orig.text) {
    commit(() => (S.doc.items = S.doc.items.filter((i) => i.id !== item.id)));
    select([]);
    return;
  }
  if (text !== orig.text) commit(() => {
      Object.assign(item, end);
      item.props.text = text;
    });
  else {
    renderPaper([item.id]);
    renderSelection();
  }
}

// ---------------------------------------------------------------- mini toolbar (Canva)
// Floats above a single selected item: lock, duplicate, delete and more.
ICON_PATHS.more = "M5 12h.01M12 12h.01M19 12h.01";
function miniBar(item) {
  const act = (fn) => () => {
    finishInlineEdit();
    fn();
  };
  const bar = el("div", { class: `${NS}-minibar` },
    iconBtn(item.locked ? "lock" : "unlock", item.locked ? "Unlock" : "Lock", act(() => commit(() => (item.locked = !item.locked))), `${NS}-qbtn`),
    item.locked ? null : iconBtn("copy", "Duplicate (Ctrl+D)", act(() => duplicateSelection()), `${NS}-qbtn`),
    item.locked ? null : iconBtn("trash", "Delete (Del)", act(() => deleteSelection()), `${NS}-qbtn`),
    iconBtn("more", "More", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      finishInlineEdit();
      openContextMenu({ preventDefault() {}, clientX: r.left, clientY: r.bottom + 4 });
    }, `${NS}-qbtn`),
  );
  // keep the text box focused while a button is pressed
  bar.addEventListener("mousedown", (e) => e.preventDefault());
  if (item.rot) bar.style.transform = `translateX(-50%) rotate(${-item.rot}deg)`;
  return bar;
}
