// ---------------------------------------------------------------- guided tour for new users
// A spotlight walks through the workspace: the target is cut out of a dimmed
// screen and a card explains it (Back / Next / Skip, ← → Esc). Shown once on
// first use; "?" in the top bar, the main menu and the Layout Composer menu can replay it.

ICON_PATHS.help = "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01";
ICON_PATHS.keyboard = "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10";

const TOUR_KEY = "glc:tour";
const TOURS = {
  layout: () => [
    { title: "Welcome to Layout Composer", text: "Make print-ready maps from your GeoLibre layers. This short tour shows where everything is — about a minute. You can replay it any time with the ? button." },
    { sel: `.${NS}-rtab[data-rtab="insert"]`, before: () => setRibbonTab("insert"), title: "Insert", text: "Every element lives here: map frames, insets, legend, scale bar, north arrow, text, tables, symbols, charts, diagrams and pictures." },
    { sel: `.${NS}-ribbon .${NS}-rbig`, before: () => setRibbonTab("insert"), title: "Add a map frame", text: "Click Map, then drag a box on the page (or just click once for a standard size). Shift keeps the proportions, Alt draws from the centre, Esc cancels." },
    { sel: `.${NS}-rtab[data-rtab="format"]`, title: "Format", text: "Select anything on the page and its settings appear here, Word-style: fonts, colours, borders, size and position, effects, arrange and align. Maps and tables get extra tabs (Map Frame · Grid, Table Design · Table Layout)." },
    { sel: `.${NS}-paper`, pad: 4, title: "The page", text: "Drag items to move them. Corner handles resize in proportion (text grows with them); side handles change the frame only. Double-click text to type, a map to move its content." },
    { sel: `.${NS}-top .${NS}-toolgrp`, title: "Select and Hand", text: "Select (V) picks and moves items. The Hand (H) moves what is inside a map frame — drag to pan, scroll to zoom — and pans the page outside a frame." },
    { sel: `.${NS}-layersbtn`, title: "Layers", text: "The list of everything on the page. Drag rows up or down to change what is drawn on top; hide or lock items with the eye and lock." },
    LC_GENERAL ? null : { sel: `.${NS}-rtab[data-rtab="maptools"]`, title: "Map Tools", text: "Coordinates (MGRS, UTM, DMS), go to a place, features from coordinates or spreadsheets, category colours for a layer, map chips." },
    { sel: `.${NS}-zoompill`, title: "Zoom", text: "Zoom the page with these buttons, the mouse wheel or Ctrl + / −. Ctrl 0 fits the page, Ctrl 1 shows it at 100 %." },
    { sel: `.${NS}-status .${NS}-pagetools`, title: "Page", text: "Orientation and page border here; canvas grid, guides, snapping and the look of the selection frame next to them. Page size and margins are in the Page panel." },
    { sel: `.${NS}-exportbtn`, title: "Export", text: "PNG, JPG, PDF, vector PDF, GeoPDF or SVG at the resolution you need. On the desktop app you choose the folder to save in." },
    { sel: `[title^="Save layout file"]`, title: "Save your layout", text: "Layouts are kept automatically; save a .json file to share or back them up. Done — you are ready to make your first map!", last: true },
  ],
  data: () => [
    { title: "Map Tools", text: "This ribbon above the map gathers the everyday map tools. A quick look at its tabs — four steps." },
    { sel: `.${NS}-mtdocktabs`, title: "Tabs", text: "Map (navigate, coordinates, category colours), Create (features from coordinates, CSV or WKT), Edit (add to a layer, move, delete) and Share (map chips, Layout Composer)." },
    { sel: `.${NS}-mtdock .${NS}-rgroup`, title: "Go to a coordinate", text: "Type or paste a coordinate in MGRS, UTM, DD or DMS and the map flies there. Right-click on the map copies the coordinate under the pointer." },
    { sel: `.${NS}-mtdocktabs .${NS}-qbtn`, title: "Make room", text: "Collapse the ribbon to its tabs, or hide it (the Layout Composer menu brings it back). Open Layout Composer from the Share tab or that menu to design your print map.", last: true },
  ],
};
let tourState = null;
function tourDone(kind) {
  try {
    return !!JSON.parse(localStorage.getItem(TOUR_KEY) || "{}")[kind];
  } catch {
    return false;
  }
}
function markTour(kind) {
  try {
    const t = JSON.parse(localStorage.getItem(TOUR_KEY) || "{}");
    t[kind] = true;
    localStorage.setItem(TOUR_KEY, JSON.stringify(t));
  } catch {}
}
function startTour(kind = "layout", force = false) {
  if (!force && tourDone(kind)) return;
  endTour(false);
  closePopover?.();
  const host = kind === "layout" ? S.ui.root : mtRoot();
  if (!host) return;
  const shade = el("div", { class: `${NS}-tourshade` });
  const hole = el("div", { class: `${NS}-tourhole` });
  const card = el("div", { class: `${NS}-tourcard`, role: "dialog", "aria-live": "polite" });
  const layer = el("div", { class: `${NS}-tour` }, shade, hole, card);
  host.appendChild(layer);
  const onKey = (e) => {
    if (e.key === "Escape") endTour(true);
    else if (e.key === "ArrowRight" || e.key === "Enter") tourGo(1);
    else if (e.key === "ArrowLeft") tourGo(-1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener("keydown", onKey, true);
  const onResize = () => tourShow();
  window.addEventListener("resize", onResize);
  tourState = { kind, steps: TOURS[kind]().filter(Boolean), i: 0, layer, hole, card, shade, onKey, onResize };
  tourShow();
}
function tourGo(d) {
  if (!tourState) return;
  const n = tourState.i + d;
  if (n >= tourState.steps.length) return endTour(true);
  tourState.i = clamp(n, 0, tourState.steps.length - 1);
  tourShow();
}
function endTour(finished) {
  if (!tourState) return;
  if (finished) markTour(tourState.kind);
  document.removeEventListener("keydown", tourState.onKey, true);
  window.removeEventListener("resize", tourState.onResize);
  tourState.layer.remove();
  tourState = null;
}
function tourShow() {
  const t = tourState;
  if (!t) return;
  const step = t.steps[t.i];
  try {
    step.before?.();
  } catch {}
  // the target may be re-rendered by before(): look it up after a frame
  requestAnimationFrame(() => {
    if (tourState !== t) return;
    const target = step.sel ? [...document.querySelectorAll(step.sel)].find((n) => n.getClientRects().length && n.offsetParent !== null) : null;
    const base = t.layer.getBoundingClientRect();
    const pad = step.pad ?? 6;
    if (target) {
      const r = target.getBoundingClientRect();
      Object.assign(t.hole.style, { display: "block", left: `${r.left - base.left - pad}px`, top: `${r.top - base.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      t.shade.style.background = "transparent";
    } else {
      t.hole.style.display = "none";
      t.shade.style.background = "rgb(0 0 0 / 0.5)";
    }
    const total = t.steps.length;
    t.card.replaceChildren(
      el("div", { class: `${NS}-tourstep` }, `${t.i + 1} / ${total}`),
      el("div", { class: `${NS}-tourtitle` }, step.title),
      el("p", { class: `${NS}-tourtext` }, step.text),
      el("div", { class: `${NS}-tourdots` }, ...t.steps.map((_, k) => el("i", { class: k === t.i ? "on" : "" }))),
      el("div", { class: `${NS}-tourbtns` },
        el("button", { type: "button", class: `${NS}-btn ${NS}-tourskip`, onclick: () => endTour(true) }, step.last ? "Close" : "Skip tour"),
        el("span", { style: { flex: "1" } }),
        t.i > 0 ? el("button", { type: "button", class: `${NS}-btn`, onclick: () => tourGo(-1) }, "Back") : null,
        el("button", { type: "button", class: `${NS}-btn primary`, onclick: () => tourGo(1) }, step.last || t.i === total - 1 ? "Finish" : "Next"),
      ),
    );
    // place the card beside the target (below, above, then centred)
    const cw = 340;
    const ch = t.card.offsetHeight || 190;
    let x = (base.width - cw) / 2;
    let y = (base.height - ch) / 2;
    if (target) {
      const r = target.getBoundingClientRect();
      const L = r.left - base.left;
      const T = r.top - base.top;
      x = clamp(L + r.width / 2 - cw / 2, 12, base.width - cw - 12);
      if (T + r.height + 14 + ch < base.height - 8) y = T + r.height + 14;
      else if (T - 14 - ch > 8) y = T - 14 - ch;
      else {
        y = clamp(T, 12, base.height - ch - 12);
        x = L + r.width + 14 + cw < base.width ? L + r.width + 14 : clamp(L - cw - 14, 12, base.width - cw - 12);
      }
    }
    Object.assign(t.card.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px`, width: `${cw}px` });
    t.card.querySelector(".primary")?.focus();
  });
}

// ---------------------------------------------------------------- keyboard shortcut sheet
function openShortcuts() {
  const rows = [
    ["V / H", "Select / Hand (move map content, pan the page)"],
    ["Space (hold)", "Pan the page"],
    ["Ctrl + / − / 0 / 1", "Zoom in / out / fit page / 100 %"],
    ["Wheel · middle drag", "Zoom · pan"],
    ["Arrows (Shift ×10, Alt ×0.1)", "Nudge 1 mm"],
    ["Ctrl Z / Ctrl Y", "Undo / redo"],
    ["Ctrl C / V / D", "Copy / paste / duplicate"],
    ["Ctrl A", "Select all"],
    ["Ctrl G / Ctrl Shift G", "Group / ungroup"],
    ["Delete", "Delete"],
    ["Enter · double-click", "Edit the selected text"],
    ["Shift / Alt while drawing", "Keep proportions / from the centre"],
    ["Page Up / Page Down", "Previous / next map series page"],
    ["Esc", "Cancel, close, deselect"],
  ];
  const overlay = el("div", { class: `${NS}-modal` });
  const close = () => overlay.remove();
  overlay.appendChild(el("div", { class: `${NS}-dlg`, role: "dialog", "aria-label": "Keyboard shortcuts" },
    el("div", { class: `${NS}-dlghead` }, el("div", { class: `${NS}-dlgtitle` }, "Keyboard shortcuts"), iconBtn("close", "Close", close)),
    el("div", { class: `${NS}-dlgbody` }, el("div", { class: `${NS}-kbdlist` }, ...rows.flatMap(([k, v]) => [el("kbd", {}, k), el("span", {}, v)]))),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
}
