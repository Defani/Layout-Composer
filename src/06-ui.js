// ---------------------------------------------------------------- icons
const ICON_PATHS = {
  select: "M5 3l14 8-6 1.5L10 19z",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  inset: "M3 4h18v16H3zM13 12h6v6h-6z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  ruler: "M2 16l14-14 6 6L8 22zM7 11l2 2M10 8l2 2M13 5l2 2",
  north: "M12 2l6 18-6-4-6 4z",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  title: "M6 4v16M18 4v16M6 12h12",
  image: "M3 4h18v16H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 20",
  shape: "M3 3h8v8H3zM17 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 14l5 7H7z",
  table: "M3 4h18v16H3zM3 10h18M3 15h18M10 4v16",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  redo: "M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  zin: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5M11 8v6M8 11h6",
  zout: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5M8 11h6",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  save: "M5 3h11l5 5v13H3V3zM7 3v6h8M7 21v-7h10v7",
  open: "M3 7V5h7l2 2h9v12H3zM3 7h18",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  close: "M6 6l12 12M18 6L6 18",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  eyeoff: "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  top: "M5 4h14M12 20V8M7 13l5-5 5 5",
  bottom: "M5 20h14M12 4v12M7 11l5 5 5-5",
  copy: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  alL: "M4 3v18M8 7h10v4H8zM8 14h6v4H8z",
  alC: "M12 3v18M6 7h12v4H6zM8 14h8v4H8z",
  alR: "M20 3v18M6 7h10v4H6zM10 14h6v4h-6z",
  alT: "M3 4h18M7 8h4v10H7zM14 8h4v6h-4z",
  alM: "M3 12h18M7 6h4v12H7zM14 8h4v8h-4z",
  alB: "M3 20h18M7 6h4v10H7zM14 10h4v6h-4z",
  disH: "M4 4v16M20 4v16M9 8h6v8H9z",
  disV: "M4 4h16M4 20h16M8 9h8v6H8z",
  template: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  page: "M6 2h9l5 5v15H6zM15 2v5h5",
  vars: "M8 4C5 4 6 10 3 12c3 2 2 8 5 8M16 4c3 0 2 6 5 8-3 2-2 8-5 8",
  movecontent: "M3 3h18v18H3zM12 7v10M7 12h10M12 7l-2 2M12 7l2 2M12 17l-2-2M12 17l2-2M7 12l2-2M7 12l2 2M17 12l-2-2M17 12l-2 2",
  pan: "M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3",
  refresh: "M20 11a8 8 0 1 0-2 5.3M20 4v7h-7",
  plus: "M12 5v14M5 12h14",
  fitlayers: "M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4M8 9l4-2 4 2v6l-4 2-4-2z",
  fitsel: "M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4M8 8h8v8H8z",
  dockleft: "M3 4h18v16H3zM9 4v16M5 8h2M5 11h2",
  dockright: "M3 4h18v16H3zM15 4v16M17 8h2M17 11h2",
  flipH: "M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5z",
  flipV: "M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z",
  layout: "M3 3h18v18H3zM6 6h9v8H6zM18 7v4M6 17h5M14 17h4",
  rename: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  colorbar: "M3 9h18v6H3zM3 9l-2 3 2 3M21 9l2 3-2 3M7 18v2M12 18v2M17 18v2",
  sameW: "M4 8h16M4 16h16M4 5v6M20 5v6M4 13v6M20 13v6",
  sameH: "M8 4v16M16 4v16M5 4h6M5 20h6M13 4h6M13 20h6",
  pen: "M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.59 7.59M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  sigma: "M18 4H6l6 8-6 8h12",
  library: "M4 4h5v16H4zM10 4h4v16h-4zM15.5 4.5l4-1 3 15.5-4 1z",
  marker: "M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  eyedrop: "M2 22l1-4 9.5-9.5M14.5 6.5l3 3M13 5l6 6M15 3l6 6-3 3-6-6z",
  fx: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  sync: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
};
// Two-tone item icons: a soft tinted body (currentColor at low opacity) under a crisp outline,
// so they follow the theme and turn blue as a whole when the tool is active.
const tt = (fill, line, extra = "") =>
  `<path d="${fill}" fill="currentColor" opacity=".2" stroke="none"/>` +
  `<path d="${line}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>${extra}`;
const ICON_SVG = {
  select: tt("M5.5 3.5l13 7.4-5.6 1.5-2.9 5.6z", "M5.5 3.5l13 7.4-5.6 1.5-2.9 5.6zM12.9 12.4l4.6 4.6"),
  pan: tt(
    "M8 11V5.5a1.5 1.5 0 0 1 3 0V10V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15z",
    "M8 11V5.5a1.5 1.5 0 0 1 3 0V10V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15z",
  ),
  movecontent: tt(
    "M3 3h18v18H3z",
    "M3 3h18v18H3zM12 7.5v9M7.5 12h9M10.3 9.2L12 7.5l1.7 1.7M10.3 14.8L12 16.5l1.7-1.7M9.2 10.3L7.5 12l1.7 1.7M14.8 10.3l1.7 1.7-1.7 1.7",
  ),
  map: tt("M9 3.5l6 3v14l-6-3z", "M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3zM9 3.5v14M15 6.5v14"),
  inset: tt("M12.5 11.5h7v7h-7z", "M3 4h18v16H3zM12.5 11.5h7v7h-7zM6 8l3 2.5 2-1.5", '<circle cx="16" cy="15" r="1" fill="currentColor"/>'),
  list: tt(
    "M3.5 5h4v3.5h-4zM3.5 15.5h4V19h-4z",
    "M3.5 5h4v3.5h-4zM3.5 15.5h4V19h-4zM3.5 12h4M11 6.8h9.5M11 12h9.5M11 17.2h9.5",
  ),
  colorbar:
    '<path d="M5 8h4.7v6H5z" fill="currentColor" opacity=".12"/><path d="M9.7 8h4.6v6H9.7z" fill="currentColor" opacity=".38"/><path d="M14.3 8H19v6h-4.7z" fill="currentColor" opacity=".7"/>' +
    '<path d="M5 8h14l3 3-3 3H5l-3-3zM6 17.5v2M12 17.5v2M18 17.5v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  north:
    '<path d="M12 3l5.5 15L12 14.6z" fill="currentColor"/>' +
    '<path d="M12 3L6.5 18 12 14.6 17.5 18z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M10 22v-3.2l4 3.2v-3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>',
  text: tt("M4 4h16v3.5H4z", "M4 7.5V4h16v3.5M12 4v16M9 20h6"),
  title: tt("M5 4h4v16H5zM15 4h4v16h-4z", "M7 4v16M17 4v16M7 12h10M5 4h4M5 20h4M15 4h4M15 20h4"),
  image: tt("M3.5 4.5h17v15h-17z", "M3.5 4.5h17v15h-17zM3.5 17l5.5-5.5 4 4 2.5-2.5 5 5", '<circle cx="15.5" cy="9" r="1.7" fill="currentColor"/>'),
  shape: tt("M3.5 3.5h8v8h-8zM12.5 20.5l4.5-8 4.5 8z", "M3.5 3.5h8v8h-8zM12.5 20.5l4.5-8 4.5 8z", '<circle cx="7.5" cy="16.5" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="7" r="3.8" fill="currentColor" opacity=".55"/>'),
  table: tt("M3.5 4.5h17v5h-17z", "M3.5 4.5h17v15h-17zM3.5 9.5h17M3.5 14.5h17M10 9.5v10"),
  pen: tt("M12.5 19.5l7-7 2.5 2.5-7 7z", "M12.5 19.5l7-7 2.5 2.5-7 7zM18 13l-1.5-7.5L3 2.5l3 13.5 7 1.5zM3 2.5l7.5 7.5", '<circle cx="11.5" cy="11" r="1.6" fill="currentColor"/>'),
  marker: tt("M12 21.5s7-6.4 7-11.8a7 7 0 1 0-14 0c0 5.4 7 11.8 7 11.8z", "M12 21.5s7-6.4 7-11.8a7 7 0 1 0-14 0c0 5.4 7 11.8 7 11.8z", '<circle cx="12" cy="9.7" r="2.6" fill="currentColor"/>'),
  sigma: tt("M6 4h12v3H6z", "M18 7V4H6l6 8-6 8h12v-3"),
  template: tt("M3 3h8v8H3zM13 13h8v8h-8z", "M3 3h8v8H3zM13 3h8v6h-8zM13 13h8v8h-8zM3 15h8v6H3z"),
  page: tt("M6 2.5h9l4.5 4.5v14.5H6z", "M6 2.5h9l4.5 4.5v14.5H6zM15 2.5V7h4.5"),
  layout: tt("M6 6h9v8H6z", "M3 3h18v18H3zM6 6h9v8H6zM18 7v4M6 17h5M14 17h4"),
  scalebar:
    '<rect x="2" y="9" width="20" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="2" y="9" width="5" height="5" fill="currentColor"/><rect x="12" y="9" width="5" height="5" fill="currentColor"/>' +
    '<path d="M2 17v2M12 17v2M22 17v2M7 17v1.2M17 17v1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
};
function icon(name, size = 16) {
  if (ICON_SVG[name]) return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICON_SVG[name]}</svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name] || ""}"/></svg>`;
}
function iconBtn(name, title, onClick, extraClass = "") {
  return el("button", { type: "button", class: `${NS}-ibtn ${extraClass}`, title, "aria-label": title, html: icon(name), onclick: onClick });
}

// ---------------------------------------------------------------- shell
const TOOLS = [
  { id: "select", icon: "select", short: "Select", label: "Select / move (V)" },
  { id: "pan", icon: "pan", short: "Pan", label: "Pan canvas (H, or hold Space)" },
  { id: "content", icon: "movecontent", short: "Content", label: "Move map content (C): drag inside any map frame to pan, scroll to zoom, right-drag to rotate" },
  { sep: true },
  { id: "map", icon: "map", short: "Map", label: "Add map frame" },
  { id: "inset", icon: "inset", short: "Inset", label: "Add inset / key map" },
  { id: "legend", icon: "list", short: "Legend", label: "Add legend" },
  { id: "colorbar", icon: "colorbar", short: "Color bar", label: "Add color bar" },
  { id: "north", icon: "north", short: "North", label: "Add north arrow", gallery: "north" },
];

// Insert menus in the top bar: each opens a small menu or gallery, then arms a tool.
const INSERT_MENUS = [
  {
    id: "text", icon: "text", label: "Text", tools: ["title", "text", "table", "latex"],
    items: [
      ["heading", "title", "Heading", "26 pt bold"],
      ["subheading", "title", "Subheading", "15 pt bold"],
      ["body", "text", "Body text", "Wrapped paragraph"],
      ["caption", "text", "Caption", "Small italic note"],
      ["maplabel", "text", "Map label", "Spaced capitals with halo"],
      ["callout", "text", "Callout", "Text on a colored box"],
      ["title", "title", "Map title", "Uses the {title} variable"],
      ["table", "table", "Table / info box", "Rows and columns, e.g. a title block"],
      ["latex", "sigma", "Formula (LaTeX)", "MathJax formula"],
    ],
  },
  { id: "draw", icon: "pen", label: "Draw", tools: ["pen"], gallery: "draw", tool: "pen" },
  { id: "shape", icon: "shape", label: "Shape", tools: ["shape"], gallery: "shape", tool: "shape" },
  { id: "image", icon: "image", label: "Image", tools: ["image"], tool: "image" },
  { id: "symbols", icon: "marker", label: "Symbols", tools: ["marker"], symbols: true },
  { id: "scalebar", icon: "scalebar", label: "Scale bar", tools: ["scalebar"], gallery: "scalebar", tool: "scalebar" },
];
function buildInsertBar() {
  const grp = el("div", { class: `${NS}-grp ${NS}-insert` });
  for (const m of INSERT_MENUS) {
    const b = el("button", { type: "button", class: `${NS}-ins`, "data-tools": m.tools.join(" "), title: m.label, html: `${icon(m.icon, 16)}<span>${esc(m.label)}</span>${m.tool === "image" ? "" : '<svg class="glc-caret" width="8" height="8" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'}` });
    b.addEventListener("click", () => {
      if (m.tool === "image") return addAtCenter("image");
      if (m.gallery) return openToolGallery({ id: m.tool, gallery: m.gallery }, b);
      if (m.symbols) return openSymbolsMenu(b);
      const list = el("div", { class: `${NS}-menu` });
      for (const [tool, ic, name, hint] of m.items) {
        const it = el("button", { type: "button", class: `${NS}-menuitem`, html: `${icon(ic, 15)}<span>${esc(name)}</span><small>${esc(hint)}</small>` });
        it.addEventListener("click", () => {
          closePopover();
          addAtCenter(tool);
        });
        list.appendChild(it);
      }
      popoverAt(b, list);
    });
    grp.appendChild(b);
  }
  return grp;
}
function openSymbolsMenu(anchor) {
  const body = el("div", {},
    el("div", { class: `${NS}-ptitle` }, "Point markers"),
    galleryGrid("marker", null, (id) => {
      closePopover();
      addAtCenter("marker", id);
    }),
    el("div", { class: `${NS}-msep` }),
  );
  const cat = el("button", { type: "button", class: `${NS}-menuitem`, html: `${icon("library", 15)}<span>Icon catalog…</span><small>Maki · Temaki (CC0)</small>` });
  cat.addEventListener("click", () => openCatalog(anchor));
  body.appendChild(cat);
  popoverAt(anchor, body, `${NS}-galpop`);
}


const EXPORT_FORMATS = [
  ["png", "PNG"],
  ["jpg", "JPG"],
  ["pdf", "PDF"],
  ["svg", "SVG"],
];

function buildShell() {
  const root = el("div", { class: `${NS}-root`, tabindex: "-1" });
  const top = el("header", { class: `${NS}-top` });
  const layoutSel = el("select", { class: `${NS}-layoutsel`, title: "Active layout", onchange: (e) => switchLayout(e.target.value) });
  S.ui.layoutSel = layoutSel;
  const zoomLbl = el("button", { type: "button", class: `${NS}-zoomlbl`, title: "Zoom to 100% (actual size)", onclick: () => setZoom(PX96, null) }, "100%");
  S.ui.zoomLbl = zoomLbl;
  S.exportFmt = S.exportFmt || "png";
  S.exportDpi = S.exportDpi || 300;
  top.append(
    iconBtn("dockleft", "Show / hide the Items panel", () => toggleDock("left"), `${NS}-docktog`),
    el("div", { class: `${NS}-brand`, title: "Layout Composer", html: `${icon("layout", 18)}<span>Layout Composer</span>` }),
    el("div", { class: `${NS}-grp` },
      layoutSel,
      iconBtn("plus", "New layout / templates", (e) => openNewMenu(e.currentTarget)),
      iconBtn("template", "Save as template…", () => saveAsTemplate()),
      iconBtn("rename", "Rename layout", () => renameLayout()),
      iconBtn("trash", "Delete layout", () => deleteLayout()),
    ),
    el("div", { class: `${NS}-grp` }, iconBtn("undo", "Undo (Ctrl+Z)", undo), iconBtn("redo", "Redo (Ctrl+Y)", redo)),
    buildInsertBar(),
    el("div", { class: `${NS}-grp` },
      iconBtn("zout", "Zoom out (Ctrl+−)", () => setZoom(S.zoom / 1.2)),
      zoomLbl,
      iconBtn("zin", "Zoom in (Ctrl++)", () => setZoom(S.zoom * 1.2)),
      iconBtn("fit", "Fit page (Ctrl+0)", () => fitPage()),
      iconBtn("fitsel", "Zoom to selection (Shift+2)", () => zoomToSelection()),
    ),
    el("div", { class: `${NS}-spacer` }),
    el("div", { class: `${NS}-grp` },
      iconBtn("open", "Open layout file (.json)", () => importJSON()),
      iconBtn("save", "Save layout file (.json)", () => exportJSON()),
    ),
    el("button", { type: "button", class: `${NS}-btn ${NS}-primary`, html: `${icon("download")}<span>Export</span>`, onclick: (e) => openExportMenu(e.currentTarget) }),
    iconBtn("dockright", "Show / hide the Properties panel", () => toggleDock("right"), `${NS}-docktog`),
    iconBtn("close", "Close Layout Composer", () => closeComposer(), `${NS}-closebtn`),
  );

  const tools = el("nav", { class: `${NS}-tools` });
  for (const t of TOOLS) {
    if (t.sep) {
      tools.appendChild(el("div", { class: `${NS}-tsep` }));
      continue;
    }
    const b = el("button", { type: "button", class: `${NS}-tool`, "data-tool": t.id, title: t.label, "aria-label": t.label, html: `${icon(t.icon, 18)}<span>${esc(t.short)}</span>` });
    b.addEventListener("click", () => {
      if (t.action) t.action(b);
      else if (t.gallery) openToolGallery(t, b);
      else if (["map", "inset", "legend", "colorbar"].includes(t.id)) addAtCenter(t.id);
      else setTool(t.id);
    });
    tools.appendChild(b);
  }

  const left = el("aside", { class: `${NS}-left` },
    el("div", { class: `${NS}-phead` }, el("span", {}, "Items"), el("span", { class: `${NS}-count` })),
    el("div", { class: `${NS}-itemsearch` }, el("input", { type: "search", class: `${NS}-input`, placeholder: "Search items…", oninput: (e) => { S.itemFilter = e.target.value; renderItemList(); } })),
    el("div", { class: `${NS}-itemlist` }),
    el("div", { class: `${NS}-arrange` },
      el("div", { class: `${NS}-sub` }, "Arrange"),
      el("div", { class: `${NS}-btngrid` },
        iconBtn("top", "Bring to front", () => arrange("top")),
        iconBtn("up", "Bring forward", () => arrange("up")),
        iconBtn("down", "Send backward", () => arrange("down")),
        iconBtn("bottom", "Send to back", () => arrange("bottom")),
        iconBtn("copy", "Duplicate (Ctrl+D)", () => duplicateSelection()),
        iconBtn("trash", "Delete (Del)", () => deleteSelection()),
      ),
      el("div", { class: `${NS}-sub` }, "Align", el("small", {}, "to page when one item is selected")),
      el("div", { class: `${NS}-btngrid` },
        iconBtn("alL", "Align left", () => align("left")),
        iconBtn("alC", "Center horizontally", () => align("hcenter")),
        iconBtn("alR", "Align right", () => align("right")),
        iconBtn("alT", "Align top", () => align("top")),
        iconBtn("alM", "Center vertically", () => align("vcenter")),
        iconBtn("alB", "Align bottom", () => align("bottom")),
        iconBtn("disH", "Distribute horizontally (3+ items)", () => align("distH")),
        iconBtn("disV", "Distribute vertically (3+ items)", () => align("distV")),
        iconBtn("sameW", "Match width of the first selected item", () => align("sameW")),
        iconBtn("sameH", "Match height of the first selected item", () => align("sameH")),
      ),
    ),
  );

  const stage = el("main", { class: `${NS}-stage` },
    el("div", { class: `${NS}-quick`, style: { display: "none" } }),
    el("div", { class: `${NS}-rcorner` }),
    el("canvas", { class: `${NS}-rtop` }),
    el("canvas", { class: `${NS}-rleft` }),
    el("div", { class: `${NS}-scroll` }, el("div", { class: `${NS}-canvas` }, el("div", { class: `${NS}-paper` }, el("div", { class: `${NS}-pagedecor` }), el("div", { class: `${NS}-items` }), el("div", { class: `${NS}-uguides` }), el("div", { class: `${NS}-selection` }), el("div", { class: `${NS}-guides` })))),
  );

  const right = el("aside", { class: `${NS}-right` },
    el("div", { class: `${NS}-tabs` },
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "item", onclick: () => setTab("item") }, "Item"),
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "page", onclick: () => setTab("page") }, "Page"),
      el("button", { type: "button", class: `${NS}-tab`, "data-tab": "vars", onclick: () => setTab("vars") }, "Variables"),
    ),
    el("div", { class: `${NS}-props` }),
  );

  const status = el("footer", { class: `${NS}-status` }, el("span", { class: `${NS}-pos` }, "x –  y –"), el("span", { class: `${NS}-selinfo` }), el("span", { class: `${NS}-hint` }), el("span", { class: `${NS}-viewtoggles` }, viewToggle("grid", "Canvas grid"), viewToggle("guides", "Guides"), viewToggle("snap", "Snap")), el("span", { class: `${NS}-zoomwrap` }, iconBtn("zout", "Zoom out", () => setZoom(S.zoom / 1.2)), buildZoomSlider(), iconBtn("zin", "Zoom in", () => setZoom(S.zoom * 1.2))));
  root.append(top, el("div", { class: `${NS}-body` }, tools, left, stage, right), status, el("div", { class: `${NS}-toasts` }));

  S.ui.root = root;
  S.ui.quick = stage.querySelector(`.${NS}-quick`);
  S.ui.scroll = stage.querySelector(`.${NS}-scroll`);
  S.ui.canvas = stage.querySelector(`.${NS}-canvas`);
  S.ui.paper = stage.querySelector(`.${NS}-paper`);
  S.ui.decor = stage.querySelector(`.${NS}-pagedecor`);
  S.ui.items = stage.querySelector(`.${NS}-items`);
  S.ui.sel = stage.querySelector(`.${NS}-selection`);
  S.ui.guides = stage.querySelector(`.${NS}-guides`);
  S.ui.uguides = stage.querySelector(`.${NS}-uguides`);
  S.ui.rTop = stage.querySelector(`.${NS}-rtop`);
  S.ui.rLeft = stage.querySelector(`.${NS}-rleft`);
  S.ui.itemList = left.querySelector(`.${NS}-itemlist`);
  S.ui.itemCount = left.querySelector(`.${NS}-count`);
  S.ui.props = right.querySelector(`.${NS}-props`);
  S.ui.tabs = right.querySelector(`.${NS}-tabs`);
  S.ui.pos = status.querySelector(`.${NS}-pos`);
  S.ui.selInfo = status.querySelector(`.${NS}-selinfo`);
  S.ui.hint = status.querySelector(`.${NS}-hint`);
  S.ui.tools = tools;
  S.ui.itemEls = new Map();
  S.tab = "item";

  S.ui.scroll.addEventListener("scroll", () => drawRulers());
  S.ui.scroll.addEventListener("wheel", onWheel, { passive: false });
  S.ui.canvas.addEventListener("pointerdown", onPointerDown);
  S.ui.canvas.addEventListener("dblclick", onDblClick);
  S.ui.canvas.addEventListener("pointermove", onHoverMove);
  S.ui.canvas.addEventListener("contextmenu", openContextMenu);
  bindRulerGuides();
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = stage.clientWidth;
    if ((S.pendingFit || (lastW && Math.abs(w - lastW) > 40 && S.autoFit)) && S.doc) fitPage();
    lastW = w;
    drawRulers();
  });
  ro.observe(stage);
  S.disposers.push(() => ro.disconnect());
  return root;
}

function openExportMenu(anchor) {
  const fmts = [
    ["png", "PNG", "Raster image"],
    ["jpg", "JPG", "Raster image, smaller file"],
    ["pdf", "PDF", "Page flattened at the chosen resolution"],
    ["vpdf", "Vector PDF", "Text, lines and symbols stay vector; maps are images"],
    ["geopdf", "GeoPDF", "PDF with the map frames georeferenced (WGS 84)"],
    ["svg", "SVG", "Editable vector page; maps embedded at 200 dpi"],
  ];
  const grid = el("div", { class: `${NS}-fmtgrid` });
  const dpiSel = el("select", { class: `${NS}-input` }, ...[75, 96, 150, 200, 300, 400, 600].map((d) => el("option", { value: d, selected: d === S.exportDpi }, `${d} dpi`)));
  const bgSel = el("select", { class: `${NS}-input` }, el("option", { value: "page" }, "Page color"), el("option", { value: "white" }, "White"), el("option", { value: "transparent" }, "Transparent"));
  bgSel.value = S.exportBg || "page";
  const name = el("input", { class: `${NS}-input`, value: S.exportName || safeName(S.doc.name) });
  const ext = el("span", { class: `${NS}-unit` });
  const dpiRow = el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "Resolution"), el("span", { class: `${NS}-pctl` }, dpiSel));
  const bgRow = el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "Background"), el("span", { class: `${NS}-pctl` }, bgSel));
  const info = el("div", { class: `${NS}-muted` });
  const refresh = () => {
    for (const b of grid.children) b.classList.toggle("active", b.dataset.v === S.exportFmt);
    const pg = S.doc.page;
    const px = (mm) => Math.round((mm / 25.4) * S.exportDpi);
    const f = S.exportFmt;
    dpiRow.style.display = f === "svg" ? "none" : "";
    bgSel.querySelector('[value="transparent"]').disabled = !(f === "png" || f === "svg");
    if (bgSel.value === "transparent" && bgSel.querySelector('[value="transparent"]').disabled) bgSel.value = "page";
    ext.textContent = f === "vpdf" || f === "geopdf" ? ".pdf" : `.${f}`;
    info.textContent =
      f === "svg" || f === "vpdf"
        ? fmts.find((x) => x[0] === f)[2] + "."
        : f === "pdf" || f === "geopdf"
          ? `${pg.width} × ${pg.height} mm at ${S.exportDpi} dpi.${f === "geopdf" ? " Readable in QGIS, Avenza Maps and Acrobat." : ""}`
          : `${px(pg.width)} × ${px(pg.height)} px at ${S.exportDpi} dpi.`;
  };
  for (const [v, label, title] of fmts) {
    const b = el("button", { type: "button", "data-v": v, title }, label);
    b.addEventListener("click", () => {
      S.exportFmt = v;
      refresh();
    });
    grid.appendChild(b);
  }
  dpiSel.addEventListener("change", () => {
    S.exportDpi = parseInt(dpiSel.value, 10);
    refresh();
  });
  bgSel.addEventListener("change", () => (S.exportBg = bgSel.value));
  name.addEventListener("input", () => (S.exportName = name.value));
  const go = el("button", { type: "button", class: `${NS}-btn ${NS}-primary ${NS}-wide`, html: `${icon("download")}<span>Export</span>` });
  go.addEventListener("click", () => {
    closePopover();
    S.exportBg = bgSel.value;
    S.exportName = name.value;
    exportLayout(S.exportFmt);
  });
  refresh();
  const pop = popoverAt(
    anchor,
    el("div", { class: `${NS}-exportpop` },
      el("div", { class: `${NS}-ptitle` }, "Export"),
      grid,
      dpiRow,
      bgRow,
      el("label", { class: `${NS}-prow` }, el("span", { class: `${NS}-plabel` }, "File name"), el("span", { class: `${NS}-pctl` }, name, ext)),
      info,
      go,
    ),
  );
  const r = anchor.getBoundingClientRect();
  const rr = S.ui.root.getBoundingClientRect();
  pop.style.left = `${Math.max(8, r.right - rr.left - pop.offsetWidth)}px`;
}

function setTab(tab) {
  S.tab = tab;
  renderProps();
}
function setTool(id, variant) {
  S.tool = id;
  S.toolVariant = variant || null;
  for (const b of S.ui.tools.querySelectorAll(`.${NS}-tool`)) b.classList.toggle("active", b.dataset.tool === id);
  for (const b of S.ui.root.querySelectorAll(`.${NS}-ins`)) b.classList.toggle("active", b.dataset.tools.split(" ").includes(id));
  S.ui.canvas.dataset.tool = id;
  const hints = {
    select: "Click to select · Shift+click to multi-select · Double-click a map to pan its content · Arrows = nudge 1 mm (Shift 10 mm)",
    pan: "Drag to pan the canvas",
    content: "Drag inside a map frame to move its content · scroll to zoom · right-drag to rotate · V to return to Select",
    pen: "Click to add points · Shift = 45° · click the first point to close · double-click or Enter to finish · Backspace removes a point · Esc cancels",
  };
  if (id === "pen") hints.pen = (DRAW_MODES.find((m) => m.id === (variant || "polyline")) || DRAW_MODES[0]).hint + " · Esc cancels";
  S.ui.hint.textContent = hints[id] || "Click-drag on the paper to draw the item box, or click once for the default size. Esc to cancel.";
}

// ---------------------------------------------------------------- tool galleries
function closePopover() {
  S.ui.popover?.remove();
  S.ui.popover = null;
}
function popoverAt(anchor, content, cls = "") {
  closePopover();
  const pop = el("div", { class: `${NS}-popover ${cls}` }, content);
  S.ui.root.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const rr = S.ui.root.getBoundingClientRect();
  pop.style.left = `${Math.min(r.right + 6 - rr.left, rr.width - pop.offsetWidth - 8)}px`;
  pop.style.top = `${Math.max(8, Math.min(r.top - rr.top, rr.height - pop.offsetHeight - 8))}px`;
  if (r.top + pop.offsetHeight > rr.bottom) pop.style.top = `${Math.max(8, rr.height - pop.offsetHeight - 8)}px`;
  if (anchor.closest(`.${NS}-top`)) {
    pop.style.left = `${Math.min(r.left - rr.left, rr.width - pop.offsetWidth - 8)}px`;
    pop.style.top = `${r.bottom - rr.top + 6}px`;
  }
  setTimeout(() => {
    const off = (e) => {
      if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) {
        closePopover();
        document.removeEventListener("pointerdown", off, true);
      }
    };
    document.addEventListener("pointerdown", off, true);
  }, 0);
  S.ui.popover = pop;
  requestAnimationFrame(() => {
    const b = pop.getBoundingClientRect();
    const R = S.ui.root.getBoundingClientRect();
    if (b.bottom > R.bottom - 6) pop.style.top = `${Math.max(6, R.height - b.height - 6)}px`;
    if (b.right > R.right - 6) pop.style.left = `${Math.max(6, R.width - b.width - 6)}px`;
  });
  return pop;
}
function northThumb(v, size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">${v.svg("currentColor", "var(--glc-paper, #fff)", "N", "Arial")}</svg>`;
}
function shapeThumb(s, size = 40) {
  const w = 30;
  const h = s.line ? 20 : 20;
  const item = { id: "thumb", w, h, props: { ...ITEM_TYPES.shape.defaults(), shape: s.id, fill: "currentColor", fillOpacity: 0.25, stroke: "currentColor", strokeWidth: 1.2, radius: 4 } };
  return `<svg width="${size}" height="${size * 0.7}" viewBox="-2 -2 ${w + 4} ${h + 4}">${RENDERERS.shape(item)}</svg>`;
}
function scalebarThumb(st) {
  const fake = newItem("scalebar", 0, 0);
  fake.w = 60;
  fake.h = 10;
  fake.props.style = st.id;
  fake.props.font.size = 6;
  fake.props.color1 = "currentColor";
  fake.props.color2 = "var(--glc-paper, #fff)";
  const map = mapItems()[0];
  if (!map) return `<span>${esc(st.name)}</span>`;
  fake.props.linkedMap = map.id;
  return `<svg width="120" height="22" viewBox="-2 -1 72 12" overflow="visible">${RENDERERS.scalebar(fake)}</svg>`;
}
function galleryGrid(kind, current, onPick) {
  const grid = el("div", { class: `${NS}-gallery ${NS}-gal-${kind}` });
  const list = { north: NORTH_ARROWS, shape: SHAPES, scalebar: SCALEBAR_STYLES, draw: DRAW_MODES, marker: MARKER_SYMBOLS }[kind];
  for (const v of list) {
    const html = kind === "north" ? northThumb(v) : kind === "shape" ? shapeThumb(v) : kind === "draw" ? drawThumb(v) : kind === "marker" ? markerThumb(v) : scalebarThumb(v);
    const b = el("button", { type: "button", class: `${NS}-gitem ${v.id === current ? "active" : ""}`, title: v.name, html: `${html}<small>${esc(v.name)}</small>` });
    b.addEventListener("click", () => onPick(v.id));
    grid.appendChild(b);
  }
  return grid;
}
function openToolGallery(tool, anchor) {
  const titles = { north: "Choose a north arrow style", shape: "Choose a shape", scalebar: "Choose a scale bar style", draw: "Draw", marker: "Choose a marker symbol" };
  const pop = popoverAt(anchor, el("div", {}, el("div", { class: `${NS}-ptitle` }, titles[tool.gallery]), galleryGrid(tool.gallery, null, (id) => {
    closePopover();
    // drawing needs the pointer; everything else drops straight onto the page
    if (tool.id === "pen") setTool("pen", id);
    else addAtCenter(tool.id, id);
  })), `${NS}-galpop`);
  return pop;
}

// ---------------------------------------------------------------- zoom / scroll
const CANVAS_PAD = 260;
function setZoom(z, anchor) {
  S.autoFit = false;
  const sc = S.ui.scroll;
  const old = S.zoom;
  z = clamp(z, 0.4, 30);
  // keep the point under the cursor (or the view centre) still
  const rect = sc.getBoundingClientRect();
  const ax = anchor ? anchor.x - rect.left : sc.clientWidth / 2;
  const ay = anchor ? anchor.y - rect.top : sc.clientHeight / 2;
  const mmX = (sc.scrollLeft + ax - CANVAS_PAD) / old;
  const mmY = (sc.scrollTop + ay - CANVAS_PAD) / old;
  S.zoom = z;
  layoutCanvas();
  sc.scrollLeft = mmX * z + CANVAS_PAD - ax;
  sc.scrollTop = mmY * z + CANVAS_PAD - ay;
  renderPaper();
  renderSelection();
  drawRulers();
  updateZoomUI();
  renderGuides();
}
function fitPage() {
  S.autoFit = true;
  const sc = S.ui.scroll;
  const pg = S.doc.page;
  // Not laid out yet (overlay just mounted or window hidden): fit once it has a size.
  if (sc.clientWidth < 80 || sc.clientHeight < 80) {
    S.pendingFit = true;
    clearTimeout(S.fitRetry);
    S.fitRetry = setTimeout(() => S.pendingFit && S.open && fitPage(), 250);
    return;
  }
  S.pendingFit = false;
  const z = Math.min((sc.clientWidth - 48) / pg.width, (sc.clientHeight - 48) / pg.height);
  S.zoom = clamp(z, 0.4, 30);
  layoutCanvas();
  sc.scrollLeft = CANVAS_PAD + (pg.width * S.zoom) / 2 - sc.clientWidth / 2;
  sc.scrollTop = CANVAS_PAD + (pg.height * S.zoom) / 2 - sc.clientHeight / 2;
  renderPaper();
  renderSelection();
  drawRulers();
  updateZoomUI();
  renderGuides();
}
function layoutCanvas() {
  const pg = S.doc.page;
  const Z = S.zoom;
  S.ui.canvas.style.width = `${pg.width * Z + CANVAS_PAD * 2}px`;
  S.ui.canvas.style.height = `${pg.height * Z + CANVAS_PAD * 2}px`;
  Object.assign(S.ui.paper.style, { left: `${CANVAS_PAD}px`, top: `${CANVAS_PAD}px`, width: `${pg.width * Z}px`, height: `${pg.height * Z}px` });
  // page background, neatline and margin guides scale with the canvas
  renderPageDecor();
}
function onWheel(e) {
  if (S.contentMode && e.target.closest(`.${NS}-item[data-id="${S.contentMode}"]`)) return; // map handles its own wheel
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setZoom(S.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { x: e.clientX, y: e.clientY });
  }
}
// client px -> page mm
function toMM(e) {
  const r = S.ui.paper.getBoundingClientRect();
  return [(e.clientX - r.left) / S.zoom, (e.clientY - r.top) / S.zoom];
}

// ---------------------------------------------------------------- rulers
function drawRulers() {
  if (!S.ui.rTop || !S.doc) return;
  const dpr = window.devicePixelRatio || 1;
  const sc = S.ui.scroll;
  const Z = S.zoom;
  const style = getComputedStyle(S.ui.root);
  const fg = style.getPropertyValue("--glc-muted-fg").trim() || "#6b7280";
  const bg = style.getPropertyValue("--glc-panel").trim() || "#f8fafc";
  const step = Z >= 6 ? 1 : Z >= 2.5 ? 5 : Z >= 1 ? 10 : 50;
  const labelStep = Z >= 6 ? 10 : Z >= 2.5 ? 10 : Z >= 1 ? 50 : 100;
  for (const [cv, horiz] of [
    [S.ui.rTop, true],
    [S.ui.rLeft, false],
  ]) {
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (!W || !H) continue;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.font = "9px system-ui, sans-serif";
    ctx.lineWidth = 1;
    const off = (horiz ? CANVAS_PAD - sc.scrollLeft : CANVAS_PAD - sc.scrollTop);
    const len = horiz ? W : H;
    const startMm = Math.floor(-off / Z / step) * step;
    const endMm = (len - off) / Z;
    ctx.beginPath();
    for (let mm = startMm; mm <= endMm; mm += step) {
      const p = Math.round(off + mm * Z) + 0.5;
      const major = mm % labelStep === 0;
      const t = major ? 10 : mm % (step * 5) === 0 ? 6 : 3;
      if (horiz) {
        ctx.moveTo(p, H);
        ctx.lineTo(p, H - t);
        if (major) ctx.fillText(String(mm), p + 2, 9);
      } else {
        ctx.moveTo(W, p);
        ctx.lineTo(W - t, p);
        if (major) {
          ctx.save();
          ctx.translate(9, p + 2);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "right";
          ctx.fillText(String(mm), 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.stroke();
    // highlight selection extent
    const sel = selectedItems();
    if (sel.length) {
      const b = bboxOf(sel);
      ctx.fillStyle = "rgba(37,99,235,0.25)";
      if (horiz) ctx.fillRect(off + b.x * Z, 0, b.w * Z, H);
      else ctx.fillRect(0, off + b.y * Z, W, b.h * Z);
    }
  }
}
function bboxOf(items) {
  const x1 = Math.min(...items.map((i) => i.x));
  const y1 = Math.min(...items.map((i) => i.y));
  const x2 = Math.max(...items.map((i) => i.x + i.w));
  const y2 = Math.max(...items.map((i) => i.y + i.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ---------------------------------------------------------------- rendering
function renderAll({ props = true } = {}) {
  if (!S.open || !S.doc) return;
  layoutCanvas();
  renderPageDecor();
  renderPaper();
  renderSelection();
  renderItemList();
  renderLayoutSelect();
  renderGuides();
  updateZoomUI();
  if (props) renderProps();
  drawRulers();
}
function afterDocReplaced() {
  saveLibrary();
  // drop live maps for items that no longer exist
  for (const id of [...S.maps.keys()]) if (!findItem(id)) destroyLiveMap(id);
  renderAll();
}

function pageDecorSVG(forExport, background = "page") {
  const pg = S.doc.page;
  const fill = background === "transparent" ? "" : background === "white" ? "#ffffff" : pg.background || "#fff";
  let s = fill ? `<rect width="${pg.width}" height="${pg.height}" fill="${esc(fill)}"/>` : "";
  const b = pg.border;
  if (b?.show) {
    const i = b.inset || 0;
    s += `<rect x="${i}" y="${i}" width="${pg.width - i * 2}" height="${pg.height - i * 2}" fill="none" stroke="${esc(b.color)}" stroke-width="${b.width}"/>`;
    if (b.double) {
      const g = b.gap || 1.2;
      s += `<rect x="${i + g}" y="${i + g}" width="${pg.width - (i + g) * 2}" height="${pg.height - (i + g) * 2}" fill="none" stroke="${esc(b.color)}" stroke-width="${b.width * 0.4}"/>`;
    }
  }
  if (!forExport && pg.showMargin && pg.margin > 0) {
    const m = pg.margin;
    s += `<rect x="${m}" y="${m}" width="${pg.width - 2 * m}" height="${pg.height - 2 * m}" fill="none" stroke="#38bdf8" stroke-width="${0.6 / S.zoom}" stroke-dasharray="${3 / S.zoom} ${2 / S.zoom}"/>`;
  }
  return s;
}
function renderPageDecor() {
  const pg = S.doc.page;
  const Z = S.zoom;
  S.ui.decor.innerHTML = `<svg width="${pg.width * Z}" height="${pg.height * Z}" viewBox="0 0 ${pg.width} ${pg.height}">${pageDecorSVG(false)}</svg>`;
  if (pg.showGrid && pg.gridSize > 0) {
    const g = pg.gridSize * Z;
    S.ui.paper.style.setProperty("--glc-grid", `${g}px`);
    S.ui.paper.classList.add("showgrid");
  } else S.ui.paper.classList.remove("showgrid");
}

function renderPaper(onlyIds) {
  const Z = S.zoom;
  const seen = new Set();
  S.doc.items.forEach((item, idx) => {
    if (onlyIds && !onlyIds.includes(item.id)) {
      seen.add(item.id);
      return;
    }
    seen.add(item.id);
    let node = S.ui.itemEls.get(item.id);
    if (!node) {
      node = el("div", { class: `${NS}-item ${NS}-t-${item.type}`, "data-id": item.id });
      if (item.type === "map") {
        node.appendChild(el("div", { class: `${NS}-mapbox` }));
        node.appendChild(el("div", { class: `${NS}-mapnote` }));
      }
      node.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      if (item.type === "map") node.appendChild(el("div", { class: `${NS}-shield` }));
      S.ui.items.appendChild(node);
      S.ui.itemEls.set(item.id, node);
    }
    Object.assign(node.style, {
      left: `${item.x * Z}px`,
      top: `${item.y * Z}px`,
      width: `${item.w * Z}px`,
      height: `${item.h * Z}px`,
      zIndex: String(idx + 1),
      transform: `${item.rot ? `rotate(${item.rot}deg)` : ""}${item.flipX || item.flipY ? ` scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})` : ""}`,
      opacity: String(item.opacity ?? 1),
      display: item.hidden ? "none" : "",
    });
    node.classList.toggle("locked", !!item.locked);
    applyFxPreview(node, item);
    node.classList.toggle("content", S.contentMode === item.id);
    const svg = node.querySelector("svg");
    svg.setAttribute("width", item.w * Z);
    svg.setAttribute("height", item.h * Z);
    svg.setAttribute("viewBox", `0 0 ${item.w} ${item.h}`);
    svg.setAttribute("overflow", "visible");
    svg.innerHTML = renderItem(item, { export: false });
    if (item.type === "map") {
      const box = node.querySelector(`.${NS}-mapbox`);
      box.style.background = item.props.background || "#fff";
      const note = node.querySelector(`.${NS}-mapnote`);
      if (!MapCtor() && item.props.source !== "snapshot") {
        note.textContent = "GeoLibre map not found — open the composer from inside GeoLibre.";
      } else note.textContent = "";
      if (item.props.source === "snapshot") destroyLiveMap(item.id);
      else if (!item.hidden) {
        ensureLiveMap(item, box).then((rec) => {
          if (!rec?.map) return;
          if (rec.map.loaded()) syncLiveMap(item);
          else rec.map.once("load", () => syncLiveMap(findItem(item.id) || item));
        });
        syncLiveMap(item);
      }
    }
  });
  if (!onlyIds) {
    for (const [id, node] of S.ui.itemEls) {
      if (!seen.has(id)) {
        node.remove();
        S.ui.itemEls.delete(id);
        destroyLiveMap(id);
      }
    }
  }
}
// Re-render SVG overlays (scale bars, insets, grids) after a map moved.
let overlayRaf = 0;
function scheduleOverlayRefresh() {
  if (overlayRaf) return;
  overlayRaf = requestAnimationFrame(() => {
    overlayRaf = 0;
    for (const item of S.doc.items) {
      const node = S.ui.itemEls.get(item.id);
      if (!node || item.hidden) continue;
      if (item.type === "image" || item.type === "shape") continue;
      node.querySelector("svg").innerHTML = renderItem(item, { export: false });
    }
    if (S.ui.liveScaleInput && document.activeElement !== S.ui.liveScaleInput) {
      const it = selectedItems()[0];
      if (it?.type === "map") S.ui.liveScaleInput.value = mapScale(it);
    }
  });
}

function renderSelection() {
  const host = S.ui.sel;
  host.innerHTML = "";
  const Z = S.zoom;
  const items = selectedItems();
  for (const item of items) {
    const box = el("div", { class: `${NS}-selbox ${item.locked ? "locked" : ""}`, "data-id": item.id });
    Object.assign(box.style, {
      left: `${item.x * Z}px`,
      top: `${item.y * Z}px`,
      width: `${item.w * Z}px`,
      height: `${item.h * Z}px`,
      transform: item.rot ? `rotate(${item.rot}deg)` : "",
    });
    if (items.length === 1 && !item.locked && S.contentMode !== item.id) {
      for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) box.appendChild(el("div", { class: `${NS}-handle h-${h}`, "data-handle": h }));
      box.appendChild(el("div", { class: `${NS}-rothandle`, title: "Rotate (Shift = 15° steps)" }));
      box.appendChild(el("div", { class: `${NS}-sizebadge` }, `${round(item.w, 1)} × ${round(item.h, 1)}`));
    }
    host.appendChild(box);
  }
  const info = items.length === 1 ? `${items[0].name} · ${round(items[0].w, 1)} × ${round(items[0].h, 1)} mm` : items.length ? `${items.length} items selected` : "";
  S.ui.selInfo.textContent = info;
}

function renderLayoutSelect() {
  const sel = S.ui.layoutSel;
  sel.innerHTML = "";
  const list = Object.values(S.library.layouts).sort((a, b) => a.name.localeCompare(b.name));
  for (const d of list) sel.appendChild(el("option", { value: d.id, selected: d.id === S.doc.id }, d.name));
}

function renderItemList() {
  const host = S.ui.itemList;
  host.innerHTML = "";
  const q = String(S.itemFilter || "").trim().toLowerCase();
  const items = [...S.doc.items].reverse().filter((i) => !q || i.name.toLowerCase().includes(q) || i.type.includes(q) || (ITEM_TYPES[i.type]?.label || "").toLowerCase().includes(q));
  if (S.ui.itemCount) S.ui.itemCount.textContent = items.length ? String(items.length) : "";
  if (!items.length) host.appendChild(el("div", { class: `${NS}-empty` }, "No items yet. Pick a tool on the left and draw it on the page."));
  for (const item of items) {
    const row = el("div", { class: `${NS}-li ${S.selection.includes(item.id) ? "sel" : ""} ${item.hidden ? "dim" : ""}`, "data-id": item.id });
    const vis = iconBtn(item.hidden ? "eyeoff" : "eye", item.hidden ? "Show" : "Hide", (e) => {
      e.stopPropagation();
      commit(() => (item.hidden = !item.hidden));
    });
    const lock = iconBtn(item.locked ? "lock" : "unlock", item.locked ? "Unlock" : "Lock", (e) => {
      e.stopPropagation();
      commit(() => (item.locked = !item.locked));
    });
    const name = el("span", { class: `${NS}-liname`, title: "Double-click to rename" }, item.name);
    name.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const input = el("input", { class: `${NS}-input`, value: item.name });
      name.replaceWith(input);
      input.focus();
      input.select();
      const done = () => commit(() => (item.name = input.value.trim() || item.name));
      input.addEventListener("blur", done);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
        if (ev.key === "Escape") renderItemList();
      });
    });
    vis.classList.toggle("on", !!item.hidden);
    lock.classList.toggle("on", !!item.locked);
    if (item.group) name.appendChild(el("span", { class: `${NS}-grptag`, title: "Grouped" }, "⧉"));
    row.append(el("span", { class: `${NS}-liicon`, html: icon(ITEM_TYPES[item.type].icon, 14) }), name, vis, lock);
    row.addEventListener("click", (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelect(item.id);
      else select([item.id]);
    });
    host.appendChild(row);
  }
}

function select(ids) {
  if (S.contentMode && !ids.includes(S.contentMode)) exitContentMode();
  S.selection = ids.filter((id) => findItem(id));
  if (S.selection.length) S.tab = "item";
  renderSelection();
  renderItemList();
  renderProps();
  drawRulers();
}
function toggleSelect(id) {
  if (S.selection.includes(id)) select(S.selection.filter((s) => s !== id));
  else select([...S.selection, id]);
}

// ---------------------------------------------------------------- content mode (pan map inside frame)
function enterContentMode(id) {
  const item = findItem(id);
  if (!item || item.type !== "map") return;
  if (item.props.source === "snapshot") {
    toast("This frame shows a captured GeoLibre view. Switch Content to “Live map” to pan it, or recapture after moving GeoLibre.", "warn");
    return;
  }
  pushHistory();
  S.contentMode = id;
  select([id]);
  renderPaper();
  S.ui.hint.textContent = "Map content mode: drag to pan, scroll to zoom, right-drag to rotate. Click outside the map or press Esc to finish.";
  toast("Map content mode on — Esc to finish");
}
function exitContentMode() {
  if (!S.contentMode) return;
  S.contentMode = null;
  renderPaper();
  renderSelection();
  renderProps();
  setTool(S.tool);
  saveLibrary();
}

// ---------------------------------------------------------------- pointer interactions
function onHoverMove(e) {
  const [x, y] = toMM(e);
  if (S.tool === "pen" && S.pen) drawPenPreview(penPoint(e));
  S.ui.pos.textContent = `x: ${round(x, 1)} mm   y: ${round(y, 1)} mm`;
}

function snapValue(v, candidates, thr) {
  let best = null;
  for (const c of candidates) {
    const d = Math.abs(v - c);
    if (d <= thr && (!best || d < best.d)) best = { d, c };
  }
  return best;
}
function snapTargets(excludeIds) {
  const pg = S.doc.page;
  const xs = [0, pg.width, pg.width / 2];
  const ys = [0, pg.height, pg.height / 2];
  if (pg.margin > 0) {
    xs.push(pg.margin, pg.width - pg.margin);
    ys.push(pg.margin, pg.height - pg.margin);
  }
  if (pg.showGuides !== false && pg.guides) {
    xs.push(...pg.guides.v);
    ys.push(...pg.guides.h);
  }
  for (const it of S.doc.items) {
    if (excludeIds.includes(it.id) || it.hidden) continue;
    xs.push(it.x, it.x + it.w, it.x + it.w / 2);
    ys.push(it.y, it.y + it.h, it.y + it.h / 2);
  }
  return { xs, ys };
}
function showGuides(gx, gy) {
  const host = S.ui.guides;
  host.innerHTML = "";
  const Z = S.zoom;
  for (const x of gx) host.appendChild(el("div", { class: `${NS}-guide v`, style: { left: `${x * Z}px` } }));
  for (const y of gy) host.appendChild(el("div", { class: `${NS}-guide h`, style: { top: `${y * Z}px` } }));
}
function snapPoint(x, y, exclude, { edgesX = [0], edgesY = [0] } = {}) {
  const pg = S.doc.page;
  const thr = 6 / S.zoom;
  const gx = [];
  const gy = [];
  let dx = null;
  let dy = null;
  if (pg.snapGuides) {
    const t = snapTargets(exclude);
    for (const off of edgesX) {
      const s = snapValue(x + off, t.xs, thr);
      if (s && (!dx || s.d < dx.d)) dx = { d: s.d, v: s.c - off, g: s.c };
    }
    for (const off of edgesY) {
      const s = snapValue(y + off, t.ys, thr);
      if (s && (!dy || s.d < dy.d)) dy = { d: s.d, v: s.c - off, g: s.c };
    }
  }
  if (dx) {
    x = dx.v;
    gx.push(dx.g);
  } else if (pg.snapGrid && pg.gridSize > 0) x = Math.round(x / pg.gridSize) * pg.gridSize;
  if (dy) {
    y = dy.v;
    gy.push(dy.g);
  } else if (pg.snapGrid && pg.gridSize > 0) y = Math.round(y / pg.gridSize) * pg.gridSize;
  return { x, y, gx, gy };
}

function onPointerDown(e) {
  if (S.inline && !e.target.closest(`.${NS}-inline`)) finishInlineEdit();
  if (e.target.closest(`.${NS}-inline`)) return;
  if (e.button === 2) return;
  closePopover();
  const target = e.target;
  // map content mode: let MapLibre handle events inside the active frame
  if (S.contentMode) {
    const inside = target.closest(`.${NS}-item[data-id="${S.contentMode}"]`);
    if (inside) return;
    exitContentMode();
  }
  if (S.tool === "pan" || e.button === 1 || S.spaceDown) return startPan(e);
  if (S.tool === "content") {
    const mapNode = target.closest(`.${NS}-t-map`);
    if (mapNode) {
      const it = findItem(mapNode.dataset.id);
      if (it?.props.source === "snapshot") toast("Captured frames can't be panned — recapture GeoLibre instead.", "warn");
      else if (it && !S.selection.includes(it.id)) select([it.id]);
    }
    return;
  }
  const ug = target.closest(`.${NS}-uguide`);
  if (ug && S.tool === "select") return startGuideDrag(e, ug.dataset.axis, Number(ug.dataset.i));
  const [mx, my] = toMM(e);
  if (S.tool === "pen") return penDown(e);
  if (S.tool !== "select") return startDraw(e, mx, my);
  if (target.closest(`.${NS}-rothandle`)) return startRotate(e);
  const handle = target.closest(`.${NS}-handle`);
  if (handle) return startResize(e, handle.dataset.handle);
  const node = target.closest(`.${NS}-item`) || target.closest(`.${NS}-selbox`);
  const id = node?.dataset.id;
  const item = id && findItem(id);
  if (item && !item.locked) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const members = groupMembers(id);
      if (S.selection.includes(id)) select(S.selection.filter((x) => !members.includes(x)));
      else select([...S.selection, ...members]);
      return;
    }
    if (!S.selection.includes(id)) select(groupMembers(id));
    return startMove(e, mx, my);
  }
  if (item && item.locked) {
    select([id]);
    return;
  }
  startMarquee(e, mx, my);
}

function capture(e, move, up) {
  const el0 = S.ui.canvas;
  el0.setPointerCapture?.(e.pointerId);
  const onMove = (ev) => move(ev);
  const onUp = (ev) => {
    el0.removeEventListener("pointermove", onMove);
    el0.removeEventListener("pointerup", onUp);
    el0.removeEventListener("pointercancel", onUp);
    el0.releasePointerCapture?.(e.pointerId);
    up(ev);
  };
  el0.addEventListener("pointermove", onMove);
  el0.addEventListener("pointerup", onUp);
  el0.addEventListener("pointercancel", onUp);
}

function startPan(e) {
  const sc = S.ui.scroll;
  const sx = e.clientX;
  const sy = e.clientY;
  const l = sc.scrollLeft;
  const t = sc.scrollTop;
  S.ui.canvas.classList.add("panning");
  capture(
    e,
    (ev) => {
      sc.scrollLeft = l - (ev.clientX - sx);
      sc.scrollTop = t - (ev.clientY - sy);
    },
    () => S.ui.canvas.classList.remove("panning"),
  );
}

function startMove(e, mx, my) {
  const items = selectedItems().filter((i) => !i.locked);
  if (!items.length) return;
  const start = items.map((i) => ({ i, x: i.x, y: i.y }));
  const bb = bboxOf(items);
  let moved = false;
  let snapshot = null;
  const ids = items.map((i) => i.id);
  capture(
    e,
    (ev) => {
      const [x, y] = toMM(ev);
      let dx = x - mx;
      let dy = y - my;
      if (!moved && Math.hypot(dx, dy) * S.zoom < 3) return;
      if (!moved) {
        snapshot = JSON.stringify(S.doc);
        moved = true;
      }
      if (ev.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      let nx = bb.x + dx;
      let ny = bb.y + dy;
      let gx = [];
      let gy = [];
      if (!ev.altKey) {
        const s = snapPoint(nx, ny, ids, { edgesX: [0, bb.w / 2, bb.w], edgesY: [0, bb.h / 2, bb.h] });
        nx = s.x;
        ny = s.y;
        gx = s.gx;
        gy = s.gy;
      }
      for (const st of start) {
        st.i.x = round(st.x + (nx - bb.x), 3);
        st.i.y = round(st.y + (ny - bb.y), 3);
      }
      showGuides(gx, gy);
      renderPaper(ids);
      renderSelection();
      drawRulers();
    },
    () => {
      showGuides([], []);
      if (moved) {
        S.history.push(snapshot);
        S.future = [];
        saveLibrary();
        renderProps();
        scheduleOverlayRefresh();
      }
    },
  );
}

function startResize(e, h) {
  const item = selectedItems()[0];
  if (!item) return;
  const o = { x: item.x, y: item.y, w: item.w, h: item.h };
  const ratio = o.w / o.h;
  const snapshot = JSON.stringify(S.doc);
  let changed = false;
  capture(
    e,
    (ev) => {
      let [x, y] = toMM(ev);
      if (!ev.altKey) {
        const s = snapPoint(x, y, [item.id]);
        x = s.x;
        y = s.y;
        showGuides(s.gx, s.gy);
      }
      let { x: nx, y: ny, w: nw, h: nh } = o;
      if (h.includes("e")) nw = Math.max(1, x - o.x);
      if (h.includes("s")) nh = Math.max(1, y - o.y);
      if (h.includes("w")) {
        nw = Math.max(1, o.x + o.w - x);
        nx = o.x + o.w - nw;
      }
      if (h.includes("n")) {
        nh = Math.max(1, o.y + o.h - y);
        ny = o.y + o.h - nh;
      }
      const keepRatio = ev.shiftKey || item.type === "north" || (item.type === "image" && !ev.ctrlKey && item.props.fit !== "fill" && false);
      if (keepRatio && h.length === 2) {
        if (nw / nh > ratio) nh = nw / ratio;
        else nw = nh * ratio;
        if (h.includes("w")) nx = o.x + o.w - nw;
        if (h.includes("n")) ny = o.y + o.h - nh;
      }
      Object.assign(item, { x: round(nx, 3), y: round(ny, 3), w: round(nw, 3), h: round(nh, 3) });
      changed = true;
      renderPaper([item.id, ...dependentsOf(item.id)]);
      renderSelection();
      drawRulers();
    },
    () => {
      showGuides([], []);
      if (changed) {
        S.history.push(snapshot);
        S.future = [];
        if (item.type === "map" && item.props.scaleLock) item.props.view.zoom = zoomForScale(item.props.scaleLock, item.props.view.center[1]);
        saveLibrary();
        renderAll();
      }
    },
  );
}
function dependentsOf(id) {
  return S.doc.items.filter((i) => i.id !== id && (i.type === "scalebar" || i.type === "north" || i.type === "text" || i.type === "table" || (i.type === "map" && i.props.overview?.source === id))).map((i) => i.id);
}

function startMarquee(e, mx, my) {
  const box = el("div", { class: `${NS}-marquee` });
  S.ui.guides.appendChild(box);
  const Z = S.zoom;
  let x2 = mx;
  let y2 = my;
  capture(
    e,
    (ev) => {
      [x2, y2] = toMM(ev);
      Object.assign(box.style, {
        left: `${Math.min(mx, x2) * Z}px`,
        top: `${Math.min(my, y2) * Z}px`,
        width: `${Math.abs(x2 - mx) * Z}px`,
        height: `${Math.abs(y2 - my) * Z}px`,
      });
    },
    (ev) => {
      box.remove();
      const r = { x1: Math.min(mx, x2), y1: Math.min(my, y2), x2: Math.max(mx, x2), y2: Math.max(my, y2) };
      if (r.x2 - r.x1 < 0.5 && r.y2 - r.y1 < 0.5) {
        if (!ev.shiftKey) select([]);
        S.tab = S.selection.length ? "item" : "page";
        renderProps();
        return;
      }
      const hits = S.doc.items.filter((i) => !i.hidden && !i.locked && i.x < r.x2 && i.x + i.w > r.x1 && i.y < r.y2 && i.y + i.h > r.y1).map((i) => i.id);
      select(ev.shiftKey ? [...new Set([...S.selection, ...hits])] : hits);
    },
  );
}

function startDraw(e, mx, my) {
  const box = el("div", { class: `${NS}-marquee draw` });
  S.ui.guides.appendChild(box);
  const Z = S.zoom;
  const s0 = snapPoint(mx, my, []);
  let x2 = s0.x;
  let y2 = s0.y;
  capture(
    e,
    (ev) => {
      const [x, y] = toMM(ev);
      const s = snapPoint(x, y, []);
      x2 = s.x;
      y2 = s.y;
      showGuides(s.gx, s.gy);
      Object.assign(box.style, {
        left: `${Math.min(s0.x, x2) * Z}px`,
        top: `${Math.min(s0.y, y2) * Z}px`,
        width: `${Math.abs(x2 - s0.x) * Z}px`,
        height: `${Math.abs(y2 - s0.y) * Z}px`,
      });
    },
    () => {
      box.remove();
      showGuides([], []);
      const w = Math.abs(x2 - s0.x);
      const h = Math.abs(y2 - s0.y);
      const rect = w > 2 && h > 2 ? { x: Math.min(s0.x, x2), y: Math.min(s0.y, y2), w, h } : { x: s0.x, y: s0.y };
      addItemFromTool(S.tool, rect, S.toolVariant);
      setTool("select");
    },
  );
}

function addItemFromTool(tool, rect, variant) {
  let item;
  const type = tool === "inset" ? "map" : tool === "title" ? "text" : tool;
  item = newItem(type, rect.x, rect.y);
  if (rect.w) {
    item.w = round(rect.w, 2);
    item.h = round(rect.h, 2);
  }
  if (tool === "title") {
    item.name = "Title";
    item.w = rect.w || 120;
    item.h = rect.h || 14;
    item.props.text = "{title}";
    item.props.font = font({ size: 20, bold: true });
    item.props.align = "center";
    item.props.textCase = "upper";
  }
  if (tool === "north" && variant) item.props.variant = variant;
  if (tool === "shape" && variant) {
    item.props.shape = variant;
    if (variant.startsWith("line")) {
      item.props.strokeWidth = 0.6;
      if (!rect.w) item.h = variant === "line-h" || variant === "arrow-line" ? 4 : item.h;
    }
  }
  if (tool === "scalebar" && variant) item.props.style = variant;
  if (tool === "marker" && variant) item.props.symbol = variant;
  if (type === "map") {
    viewFromGeoLibre(item);
    if (tool === "inset") {
      item.name = `Inset Map ${mapItems().length}`;
      if (!rect.w) {
        item.w = 50;
        item.h = 40;
      }
      item.props.basemap = "positron";
      const main = mapItems()[0];
      if (main) {
        item.props.overview.source = main.id;
        // zoom out so the locator box sits in context
        item.props.view.center = [...main.props.view.center];
        item.props.view.zoom = main.props.view.zoom - 4 + Math.log2(item.w / main.w);
      }
    }
  }
  if (type === "latex") loadMathJax().catch(() => {});
  if (type === "colorbar") {
    const src = colorbarSourceOptions().find(([id]) => id);
    if (src) {
      item.props.source = src[0];
      readColorbarFromLayer(item.props);
    }
  }
  if (type === "legend") {
    item.props.linkedMap = mapItems()[0]?.id || "";
    syncLegendEntries(item);
  }
  if (type === "image" && !rect.w) {
    item.w = 25;
    item.h = 25;
  }
  commit(() => S.doc.items.push(item));
  select([item.id]);
  if (type === "image") pickImage(item);
}

// Topmost layout item under the cursor (event targets are unreliable after pointer capture).
function itemNodeAt(x, y) {
  for (const n of document.elementsFromPoint(x, y)) {
    const node = n.closest?.(`.${NS}-item`);
    if (node && S.ui.items.contains(node)) return node;
  }
  return null;
}
function onDblClick(e) {
  if (S.tool === "pen") {
    // the double-click's second press already added a point
    if (S.pen?.pts.length > 2) S.pen.pts.pop();
    return finishPen(false);
  }
  const node = e.target.closest(`.${NS}-item`) || itemNodeAt(e.clientX, e.clientY);
  const item = node && findItem(node.dataset.id);
  if (!item) return;
  if (item.type === "map") enterContentMode(item.id);
  else if (item.type === "text") {
    select([item.id]);
    startInlineEdit(item);
  } else if (item.type === "table") {
    select([item.id]);
    setTimeout(() => S.ui.props.querySelector("textarea")?.focus(), 30);
  } else if (item.type === "image") pickImage(item);
}

// ---------------------------------------------------------------- keyboard
function onKey(e) {
  if (!S.open) return;
  const t = e.target;
  const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  if (e.key === " " && !typing) {
    if (e.type === "keydown") {
      S.spaceDown = true;
      S.ui.canvas.classList.add("space");
    } else {
      S.spaceDown = false;
      S.ui.canvas.classList.remove("space");
    }
    e.preventDefault();
    return;
  }
  if (e.type !== "keydown") return;
  if (typing) {
    if (e.key === "Escape") t.blur();
    return;
  }
  const ctrl = e.ctrlKey || e.metaKey;
  if (S.tool === "pen" && S.pen) {
    if (e.key === "Enter") finishPen(false);
    else if (e.key === "Escape") {
      S.pen = null;
      drawPenPreview();
      setTool("select");
    } else if (e.key === "Backspace") {
      S.pen.pts.pop();
      drawPenPreview();
    } else return;
    e.preventDefault();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "g") {
    e.preventDefault();
    return e.shiftKey ? ungroupSelection() : groupSelection();
  }
  const k = e.key.toLowerCase();
  if (k === "escape") {
    if (S.contentMode) exitContentMode();
    else if (S.ui.popover) closePopover();
    else if (S.tool !== "select") setTool("select");
    else select([]);
  } else if (ctrl && k === "z" && !e.shiftKey) undo();
  else if (ctrl && (k === "y" || (k === "z" && e.shiftKey))) redo();
  else if (ctrl && k === "d") duplicateSelection();
  else if (ctrl && k === "c") S.clipboard = JSON.stringify(selectedItems());
  else if (ctrl && k === "v") pasteClipboard();
  else if (ctrl && k === "a") select(S.doc.items.filter((i) => !i.hidden && !i.locked).map((i) => i.id));
  else if (ctrl && (k === "=" || k === "+")) setZoom(S.zoom * 1.2);
  else if (ctrl && k === "-") setZoom(S.zoom / 1.2);
  else if (ctrl && k === "0") fitPage();
  else if (e.shiftKey && (k === "2" || k === "@")) zoomToSelection();
  else if (e.shiftKey && (k === "1" || k === "!")) fitPage();
  else if (ctrl && k === "s") exportJSON();
  else if (k === "enter" && selectedItems().length === 1 && selectedItems()[0].type === "text") startInlineEdit(selectedItems()[0]);
  else if (k === "delete" || k === "backspace") deleteSelection();
  else if (k === "v") setTool("select");
  else if (k === "h") setTool("pan");
  else if (k === "c" && !ctrl) setTool("content");
  else if (k.startsWith("arrow")) {
    const items = selectedItems().filter((i) => !i.locked);
    if (!items.length) return;
    const d = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    commit(() => {
      for (const i of items) {
        if (k === "arrowleft") i.x = round(i.x - d, 3);
        if (k === "arrowright") i.x = round(i.x + d, 3);
        if (k === "arrowup") i.y = round(i.y - d, 3);
        if (k === "arrowdown") i.y = round(i.y + d, 3);
      }
    });
  } else return;
  e.preventDefault();
}

// ---------------------------------------------------------------- edit operations
function deleteSelection() {
  const ids = S.selection.filter((id) => !findItem(id)?.locked);
  if (!ids.length) return;
  commit(() => {
    S.doc.items = S.doc.items.filter((i) => !ids.includes(i.id));
    for (const it of S.doc.items) {
      if (ids.includes(it.props.linkedMap)) it.props.linkedMap = "";
      if (it.type === "map" && ids.includes(it.props.overview?.source)) it.props.overview.source = "";
    }
  });
  select([]);
}
function cloneItems(items, offset = 5) {
  const idMap = new Map();
  const out = items.map((i) => {
    const c = clone(i);
    c.id = uid(i.type);
    idMap.set(i.id, c.id);
    c.x += offset;
    c.y += offset;
    c.name = `${i.name} (copy)`;
    return c;
  });
  for (const c of out) {
    if (idMap.has(c.props.linkedMap)) c.props.linkedMap = idMap.get(c.props.linkedMap);
    if (c.type === "map" && idMap.has(c.props.overview?.source)) c.props.overview.source = idMap.get(c.props.overview.source);
  }
  return out;
}
function duplicateSelection() {
  const items = selectedItems();
  if (!items.length) return;
  const copies = cloneItems(items);
  commit(() => S.doc.items.push(...copies));
  select(copies.map((c) => c.id));
}
function pasteClipboard() {
  if (!S.clipboard) return;
  const items = JSON.parse(S.clipboard);
  if (!items.length) return;
  const copies = cloneItems(items);
  commit(() => S.doc.items.push(...copies));
  select(copies.map((c) => c.id));
}
function arrange(dir) {
  const ids = S.selection;
  if (!ids.length) return;
  commit(() => {
    const items = S.doc.items;
    if (dir === "top" || dir === "bottom") {
      const sel = items.filter((i) => ids.includes(i.id));
      const rest = items.filter((i) => !ids.includes(i.id));
      S.doc.items = dir === "top" ? [...rest, ...sel] : [...sel, ...rest];
    } else if (dir === "up") {
      for (let i = items.length - 2; i >= 0; i--) if (ids.includes(items[i].id) && !ids.includes(items[i + 1].id)) [items[i], items[i + 1]] = [items[i + 1], items[i]];
    } else {
      for (let i = 1; i < items.length; i++) if (ids.includes(items[i].id) && !ids.includes(items[i - 1].id)) [items[i], items[i - 1]] = [items[i - 1], items[i]];
    }
  });
}
function align(mode) {
  const items = selectedItems().filter((i) => !i.locked);
  if (!items.length) return;
  const pg = S.doc.page;
  const ref = items.length === 1 ? { x: 0, y: 0, w: pg.width, h: pg.height } : bboxOf(items);
  commit(() => {
    if (mode === "distH" || mode === "distV") {
      if (items.length < 3) return;
      const horiz = mode === "distH";
      const sorted = [...items].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y));
      const total = sorted.reduce((s, i) => s + (horiz ? i.w : i.h), 0);
      const span = horiz ? ref.w : ref.h;
      const gap = (span - total) / (sorted.length - 1);
      let pos = horiz ? ref.x : ref.y;
      for (const i of sorted) {
        if (horiz) i.x = round(pos, 3);
        else i.y = round(pos, 3);
        pos += (horiz ? i.w : i.h) + gap;
      }
      return;
    }
    const first = items[0];
    for (const i of items) {
      if (mode === "left") i.x = ref.x;
      if (mode === "right") i.x = round(ref.x + ref.w - i.w, 3);
      if (mode === "hcenter") i.x = round(ref.x + (ref.w - i.w) / 2, 3);
      if (mode === "top") i.y = ref.y;
      if (mode === "bottom") i.y = round(ref.y + ref.h - i.h, 3);
      if (mode === "vcenter") i.y = round(ref.y + (ref.h - i.h) / 2, 3);
      if (mode === "sameW") i.w = first.w;
      if (mode === "sameH") i.h = first.h;
    }
  });
}

function pickImage(item) {
  const input = el("input", { type: "file", accept: "image/*" });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        commit(() => {
          item.props.src = reader.result;
          // keep the logo's aspect ratio
          const ar = img.naturalWidth / img.naturalHeight;
          if (ar > 0) item.h = round(item.w / ar, 2);
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

// ---------------------------------------------------------------- layouts (manager)
function switchLayout(id) {
  if (!S.library.layouts[id]) return;
  exitContentMode();
  destroyAllLiveMaps();
  for (const n of S.ui.itemEls.values()) n.remove();
  S.ui.itemEls.clear();
  S.doc = S.library.layouts[id];
  S.library.active = id;
  S.selection = [];
  S.history = [];
  S.future = [];
  saveLibrary();
  renderAll();
  fitPage();
}
function newLayout(doc) {
  const d = doc || newDoc(`Layout ${Object.keys(S.library.layouts).length + 1}`);
  S.library.layouts[d.id] = d;
  switchLayout(d.id);
}
function duplicateLayout() {
  const d = clone(S.doc);
  d.id = uid("lay");
  d.name = `${S.doc.name} (copy)`;
  newLayout(d);
}
function renameLayout() {
  const name = prompt("Layout name:", S.doc.name);
  if (!name) return;
  S.doc.name = name.trim();
  saveLibrary();
  renderLayoutSelect();
}
function deleteLayout() {
  const ids = Object.keys(S.library.layouts);
  if (!confirm(`Delete layout "${S.doc.name}"? This cannot be undone.`)) return;
  delete S.library.layouts[S.doc.id];
  if (ids.length <= 1) {
    const d = newDoc();
    S.library.layouts[d.id] = d;
  }
  switchLayout(Object.keys(S.library.layouts)[0]);
}
function exportJSON() {
  const blob = new Blob([JSON.stringify({ format: "geolibre-layout", version: 1, layout: S.doc }, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${safeName(S.doc.name)}.layout.json`);
  toast("Layout saved to a .json file");
}
function importJSON() {
  const input = el("input", { type: "file", accept: ".json,application/json" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const doc = data.layout || data;
      if (!doc.page || !Array.isArray(doc.items)) throw new Error("Not a layout file");
      doc.id = uid("lay");
      newLayout(doc);
      toast(`Layout "${doc.name}" loaded`);
    } catch (e) {
      toast(`Could not open: ${e.message}`, "warn");
    }
  });
  input.click();
}
