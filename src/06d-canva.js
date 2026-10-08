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
  return item;
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
  Object.assign(ta.style, {
    left: `${item.x * Z}px`,
    top: `${item.y * Z}px`,
    width: `${Math.max(item.w * Z, 40)}px`,
    height: `${Math.max(item.h * Z, 20)}px`,
    transform: item.rot ? `rotate(${item.rot}deg)` : "",
    fontFamily: `"${p.font.family}", Arial, sans-serif`,
    fontSize: `${p.font.size * PT * Z}px`,
    fontWeight: p.font.bold ? "700" : "400",
    fontStyle: p.font.italic ? "italic" : "normal",
    color: p.font.color,
    textAlign: p.align,
    lineHeight: String(p.lineHeight || 1.2),
    padding: `${(p.padding || 0) * Z}px`,
    background: p.background || "rgba(255,255,255,0.85)",
  });
  S.ui.paper.appendChild(ta);
  node.style.visibility = "hidden";
  S.inline = { item, ta, node, before: p.text };
  ta.focus();
  ta.select();
  ta.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      ta.value = S.inline.before;
      finishInlineEdit();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) finishInlineEdit();
  });
  ta.addEventListener("input", () => {
    // grow the box while typing
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, item.h * Z)}px`;
  });
  ta.addEventListener("blur", () => finishInlineEdit());
}
function finishInlineEdit() {
  const ed = S.inline;
  if (!ed) return;
  S.inline = null;
  const { item, ta, node, before } = ed;
  const text = ta.value;
  const needH = (ta.scrollHeight / S.zoom);
  ta.remove();
  node.style.visibility = "";
  if (text !== before) {
    commit(() => {
      item.props.text = text;
      if (needH > item.h + 0.5) item.h = round(needH, 1);
    });
  }
}
