// ---------------------------------------------------------------- icon catalog
// Icons (Maki, Temaki — both CC0) load from jsDelivr on first use and are then
// stored inline in the item, so layouts keep working offline and export cleanly.

// ---- icon item
ITEM_TYPES.icon = {
  label: "Icon",
  icon: "library",
  size: [10, 10],
  defaults: () => ({ set: "maki", name: "marker", svg: "", viewBox: "0 0 15 15", color: "#111111", label: "", labelPos: "right", font: font({ size: 8 }) }),
};
RENDERERS.icon = function iconItem(item, ctx) {
  const p = item.props;
  if (!p.svg) return ctx.export ? "" : placeholder(item, "Loading icon…");
  const hasLabel = !!String(p.label || "").trim();
  const s = Math.min(item.h, hasLabel ? item.h : item.w);
  let out = `<svg x="0" y="${round((item.h - s) / 2, 3)}" width="${round(s, 3)}" height="${round(s, 3)}" viewBox="${esc(p.viewBox)}" overflow="visible"><g fill="${esc(p.color)}" color="${esc(p.color)}">${p.svg}</g></svg>`;
  if (hasLabel) out += richLine(resolveVars(p.label, item), s + 1, item.h / 2 + p.font.size * PT * 0.35, p.font, "start").svg;
  return out;
};
const iconCache = new Map();
async function fetchIconSvg(set, name) {
  const key = `${set}/${name}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const url = CATALOG.iconSets[set].url.replace("{name}", name.split("/").map(encodeURIComponent).join("/"));
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((txt) => {
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) throw new Error("Not an SVG");
      // keep shapes only; drop scripts / event attributes; let the item color fill them
      svg.querySelectorAll("script,foreignObject").forEach((n) => n.remove());
      svg.querySelectorAll("*").forEach((n) => {
        for (const a of [...n.attributes]) if (/^on/i.test(a.name)) n.removeAttribute(a.name);
        if (n.getAttribute("fill") && n.getAttribute("fill") !== "none") n.removeAttribute("fill");
      });
      const vb = svg.getAttribute("viewBox") || `0 0 ${parseFloat(svg.getAttribute("width")) || 15} ${parseFloat(svg.getAttribute("height")) || 15}`;
      return { svg: svg.innerHTML, viewBox: vb };
    });
  iconCache.set(key, p);
  p.catch(() => iconCache.delete(key));
  return p;
}
async function addIconItem(set, name) {
  const pg = S.doc.page;
  const item = newItem("icon", pg.width / 2 - 5, pg.height / 2 - 5);
  item.name = name.split("/").pop().replace(/-fill$/, " (filled)").replace(/[-_]/g, " ");
  item.props.set = set;
  item.props.name = name;
  commit(() => S.doc.items.push(item));
  select([item.id]);
  try {
    const ic = await fetchIconSvg(set, name);
    item.props.svg = ic.svg;
    item.props.viewBox = ic.viewBox;
    saveLibrary();
    renderAll();
  } catch (e) {
    toast(`Could not load icon “${name}”: ${e.message}`, "warn");
  }
}

// ---- catalog browser: Maki / Temaki (CC0) and Google Material Symbols (Apache-2.0), all from jsDelivr
const ICON_SET_LABELS = { maki: "Maki", temaki: "Temaki", google: "Google" };
const ICON_GROUP_ORDER = {
  default: ["Basic symbols", "Water & hydrology", "Terrain & nature", "Vegetation & forest", "Transport", "Government & public", "Health", "Education & culture", "Religion", "Tourism & recreation", "Sports", "Food & shops", "Utilities & industry", "Hazards & warnings", "Other"],
  google: ["Maps", "Travel", "Transit", "Home", "Household", "Activities", "Business", "Social", "Communicate", "Actions", "UI actions", "Images", "Text", "Hardware", "Audio and video", "Privacy", "Android"],
};
const CATALOG_BATCH = 60;
function openCatalog(anchor) {
  const tabs = el("div", { class: `${NS}-seg ${NS}-segfull` });
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search icons (water, mountain, airport…)" });
  const styleBar = el("div", { class: `${NS}-catstyle` });
  const body = el("div", { class: `${NS}-catbody` });
  let tab = S.catalogTab && ICON_SET_LABELS[S.catalogTab] ? S.catalogTab : "maki";
  S.catalogStyle = S.catalogStyle || { style: "outlined", fill: false };
  const expanded = new Set();
  const iconName = (n) => (tab === "google" ? `${S.catalogStyle.style}/${n}${S.catalogStyle.fill ? "-fill" : ""}` : n);
  const iconBtnFor = (set, n) => {
    const full = iconName(n);
    const b = el("button", { type: "button", class: `${NS}-iconbtn ${NS}-remote`, title: n.replace(/_/g, " ") });
    b.appendChild(el("img", { src: set.url.replace("{name}", full.split("/").map(encodeURIComponent).join("/")), alt: n, loading: "lazy", decoding: "async" }));
    b.addEventListener("click", () => {
      closePopover();
      addIconItem(tab, full);
    });
    return b;
  };
  const drawStyle = () => {
    styleBar.innerHTML = "";
    if (tab !== "google") return;
    const seg = el("span", { class: `${NS}-seg` });
    for (const st of CATALOG.iconSets.google.styles) {
      const b = el("button", { type: "button", class: st === S.catalogStyle.style ? "active" : "" }, st[0].toUpperCase() + st.slice(1));
      b.addEventListener("click", () => {
        S.catalogStyle.style = st;
        drawStyle();
        draw();
      });
      seg.appendChild(b);
    }
    const fill = el("input", { type: "checkbox", checked: S.catalogStyle.fill });
    fill.addEventListener("change", () => {
      S.catalogStyle.fill = fill.checked;
      draw();
    });
    styleBar.append(seg, el("label", { class: `${NS}-check` }, fill, el("span", {}, "Filled")));
  };
  const draw = () => {
    S.catalogTab = tab;
    for (const b of tabs.children) b.classList.toggle("active", b.dataset.v === tab);
    body.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    const set = CATALOG.iconSets[tab];
    const lic = set.license === "CC0-1.0" ? "CC0 (public domain)" : set.license;
    body.append(el("p", { class: `${NS}-muted` }, `${set.title || set.label} icons · ${lic}. Click to place on the page.`));
    const order = ICON_GROUP_ORDER[tab] || ICON_GROUP_ORDER.default;
    const groups = [...order.filter((g) => set.groups[g]), ...Object.keys(set.groups).filter((g) => !order.includes(g))];
    const words = q.split(/\s+/).filter(Boolean);
    const match = (n) => !words.length || words.every((w) => n.includes(w) || n.includes(w.replace(/-/g, "_")) || n.replace(/[_-]/g, " ").includes(w));
    let shown = 0;
    for (const gname of groups) {
      const names = (set.groups[gname] || []).filter(match);
      if (!names.length) continue;
      const grid = el("div", { class: `${NS}-icongrid` });
      const limit = expanded.has(gname) ? names.length : CATALOG_BATCH;
      const det = el("details", { class: `${NS}-catgrp`, open: !!q || groups.indexOf(gname) < 2 || expanded.has(gname) }, el("summary", {}, gname, el("small", {}, String(names.length))), grid);
      // fill the grid only when the group is open (thousands of icons stay cheap)
      const fillGrid = () => {
        if (grid.childElementCount) return;
        for (const n of names.slice(0, limit)) grid.appendChild(iconBtnFor(set, n));
        if (names.length > limit) {
          const more = el("button", { type: "button", class: `${NS}-catmore` }, `Show all ${names.length}`);
          more.addEventListener("click", () => {
            expanded.add(gname);
            more.remove();
            for (const n of names.slice(limit)) grid.appendChild(iconBtnFor(set, n));
          });
          grid.appendChild(more);
        }
      };
      if (det.open) fillGrid();
      det.addEventListener("toggle", () => det.open && fillGrid());
      body.appendChild(det);
      shown += names.length;
    }
    if (!shown) body.append(el("p", { class: `${NS}-muted` }, `No icon matches “${q}”. Try another word, or another set.`));
  };
  for (const [v, label] of Object.entries(ICON_SET_LABELS)) {
    if (!CATALOG.iconSets[v]) continue;
    const b = el("button", { type: "button", "data-v": v }, label);
    b.addEventListener("click", () => {
      tab = v;
      expanded.clear();
      drawStyle();
      draw();
    });
    tabs.appendChild(b);
  }
  let timer = 0;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(draw, 180);
  });
  search.addEventListener("keydown", (e) => e.stopPropagation());
  drawStyle();
  draw();
  const pop = popoverAt(anchor, el("div", { class: `${NS}-catalog` }, el("div", { class: `${NS}-ptitle` }, "Icon catalog"), tabs, styleBar, search, body), `${NS}-catpop`);
  setTimeout(() => search.focus(), 30);
  return pop;
}
