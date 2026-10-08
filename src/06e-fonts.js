// ---------------------------------------------------------------- fonts: Google Fonts + installed fonts
// The Google Fonts family list comes from the Fontsource API (keyless, CORS);
// fonts load from Google Fonts CSS2. On export, the fonts in use are embedded
// in the page SVG as data URLs so raster and PDF output keep the right faces.

const GF_LIST_URL = "https://api.fontsource.org/v1/fonts";
const GF_CSS = "https://fonts.googleapis.com/css2";
const GF_KEY = "glc:gfonts:v1";
const GF = { list: null, byFamily: new Map(), loading: null, loaded: new Set(), preview: new Set(), embedded: new Map() };
const GF_CATEGORIES = [["", "All"], ["sans-serif", "Sans"], ["serif", "Serif"], ["display", "Display"], ["handwriting", "Script"], ["monospace", "Mono"]];

function gfIndex(list) {
  GF.list = list;
  GF.byFamily = new Map(list.map((f) => [f.family, f]));
}
// [{family, category, weights, italic}] of every Google font; cached for a week.
function loadGoogleFontList() {
  if (GF.list) return Promise.resolve(GF.list);
  if (GF.loading) return GF.loading;
  try {
    const c = JSON.parse(localStorage.getItem(GF_KEY) || "null");
    if (c && Date.now() - c.t < 7 * 864e5 && Array.isArray(c.fonts) && c.fonts.length > 100) {
      gfIndex(c.fonts.map(([family, category, weights, italic]) => ({ family, category, weights, italic: !!italic })));
      return Promise.resolve(GF.list);
    }
  } catch {}
  GF.loading = fetch(GF_LIST_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((all) => {
      const fonts = all
        .filter((f) => f.type === "google")
        .map((f) => ({ family: f.family, category: f.category, weights: f.weights || [400], italic: (f.styles || []).includes("italic") }))
        .sort((a, b) => a.family.localeCompare(b.family));
      gfIndex(fonts);
      try {
        localStorage.setItem(GF_KEY, JSON.stringify({ t: Date.now(), fonts: fonts.map((f) => [f.family, f.category, f.weights, f.italic ? 1 : 0]) }));
      } catch {}
      return fonts;
    })
    .catch((e) => {
      console.warn("[Layout Composer] Google Fonts list", e);
      GF.loading = null;
      return [];
    });
  return GF.loading;
}
function isGoogleFont(family) {
  return GF.byFamily.has(family);
}
// CSS2 URL for the given weights (default regular + bold), with italics when the family has them.
function gfCssUrl(family, extra = "", want = [400, 700]) {
  const info = GF.byFamily.get(family);
  const ws = info?.weights?.length ? info.weights : [400];
  const pick = (w) => ws.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), ws[0]);
  const weights = [...new Set(want.map(pick))].sort((a, b) => a - b);
  const fam = encodeURIComponent(family).replace(/%20/g, "+");
  const axes = info?.italic ? `:ital,wght@${[0, 1].flatMap((i) => weights.map((w) => `${i},${w}`)).join(";")}` : `:wght@${weights.join(";")}`;
  return `${GF_CSS}?family=${fam}${axes}&display=swap${extra}`;
}
function addStylesheet(href) {
  if (document.querySelector(`link[data-glc-font="${CSS.escape(href)}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.dataset.glcFont = href;
  document.head.appendChild(l);
}
// Make a Google font usable on the canvas (and in text measurement).
async function ensureFont(family) {
  if (!family || GF.loaded.has(family)) return;
  await loadGoogleFontList();
  if (!isGoogleFont(family)) return;
  GF.loaded.add(family);
  // every weight the family has, so the weight menu previews correctly
  addStylesheet(gfCssUrl(family, "", GF.byFamily.get(family)?.weights || [400, 700]));
  try {
    await Promise.all([document.fonts.load(`400 16px "${family}"`), document.fonts.load(`700 16px "${family}"`)]);
  } catch {}
  clearTimeout(ensureFont.t);
  ensureFont.t = setTimeout(() => S.ui?.root && refreshCanvas(), 60);
}
// Every font family used by the current layout.
function docFontFamilies(doc = S.doc) {
  const out = new Set();
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (typeof o.family === "string" && "size" in o) out.add(o.family);
    if (typeof o.fontFamily === "string") out.add(o.fontFamily);
    for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
  };
  for (const it of doc?.items || []) walk(it.props);
  return [...out];
}
// Weights of a family used by the layout (for export embedding).
function docFontWeights(family) {
  const out = new Set();
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o.family === family && "size" in o) out.add(fontWeight(o));
    if (o.fontFamily === family) out.add(700);
    for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
  };
  for (const it of S.doc?.items || []) walk(it.props);
  return out.size ? [...out] : [400];
}
async function ensureDocFonts() {
  await loadGoogleFontList();
  await Promise.all(docFontFamilies().filter(isGoogleFont).map(ensureFont));
}
// @font-face rules with the font files inlined, for the export SVG (latin + latin-ext).
async function embeddedFontCss(families) {
  await loadGoogleFontList();
  const out = [];
  for (const fam of families.filter(isGoogleFont)) {
    if (!GF.embedded.has(fam)) {
      GF.embedded.set(fam, (async () => {
        const css = await fetch(gfCssUrl(fam, "", docFontWeights(fam))).then((r) => (r.ok ? r.text() : ""));
        const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter((b) => /\/\*\s*(latin|latin-ext)\s*\*\//.test(b) || !/\/\*/.test(b));
        const done = [];
        for (const b of blocks) {
          const m = /url\((https:[^)]+)\)/.exec(b);
          if (!m) continue;
          const buf = await fetch(m[1]).then((r) => r.arrayBuffer());
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          done.push(b.replace(m[1], `data:font/woff2;base64,${btoa(bin)}`).replace(/\/\*[^*]*\*\//g, ""));
        }
        return done.join("\n");
      })().catch((e) => {
        console.warn("[Layout Composer] embed font", fam, e);
        GF.embedded.delete(fam);
        return "";
      }));
    }
    out.push(await GF.embedded.get(fam));
  }
  return out.filter(Boolean).join("\n");
}

// ---- font picker (searchable; Google Fonts + installed fonts)
function fontPicker(current, onPick, { cls = "" } = {}) {
  const btn = el("button", { type: "button", class: `${NS}-input ${NS}-fontbtn ${cls}`, title: `Font: ${current}` },
    el("span", { style: { fontFamily: `"${current}", Arial, sans-serif` } }, current),
    el("span", { class: `${NS}-fontcaret`, html: icon("chevron", 12) }),
  );
  btn.addEventListener("click", () => openFontPicker(btn, current, onPick));
  return btn;
}
function openFontPicker(anchor, current, onPick) {
  S.fontTab = S.fontTab || "all";
  S.fontCat = S.fontCat || "";
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search fonts…" });
  const tabs = el("div", { class: `${NS}-seg ${NS}-segfull` });
  const cats = el("div", { class: `${NS}-chips ${NS}-fontcats` });
  const list = el("div", { class: `${NS}-fontlist` });
  const note = el("div", { class: `${NS}-muted ${NS}-fontnote` });
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const fam = e.target.dataset.family;
          io.unobserve(e.target);
          if (isGoogleFont(fam) && !GF.loaded.has(fam) && !GF.preview.has(fam)) {
            GF.preview.add(fam);
            // only the letters of the name: a few hundred bytes per preview
            addStylesheet(`${GF_CSS}?family=${encodeURIComponent(fam).replace(/%20/g, "+")}&text=${encodeURIComponent(fam)}&display=swap`);
          }
        }
      }, { root: list, rootMargin: "120px" })
    : null;
  const installed = () => knownFonts();
  let limit = 120;
  const draw = () => {
    for (const b of tabs.children) b.classList.toggle("active", b.dataset.v === S.fontTab);
    cats.style.display = S.fontTab === "installed" ? "none" : "";
    for (const c of cats.children) c.classList.toggle("active", c.dataset.v === S.fontCat);
    list.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    let rows = [];
    if (S.fontTab !== "google") rows.push(...installed().map((f) => ({ family: f, tag: "Installed" })));
    if (S.fontTab !== "installed" && GF.list) rows.push(...GF.list.filter((f) => !S.fontCat || f.category === S.fontCat).map((f) => ({ family: f.family, tag: GF_CATEGORIES.find(([k]) => k === f.category)?.[1] || f.category })));
    if (S.fontTab === "all" && S.fontCat) rows = rows.filter((r) => r.tag !== "Installed");
    const seen = new Set();
    rows = rows.filter((r) => !seen.has(r.family) && seen.add(r.family) && (!q || r.family.toLowerCase().includes(q)));
    note.textContent = !GF.list && S.fontTab !== "installed" ? "Loading Google Fonts…" : `${rows.length.toLocaleString("en-US")} font${rows.length === 1 ? "" : "s"}${S.fontTab !== "installed" ? " · Google Fonts are open source (OFL / Apache)" : ""}`;
    for (const r of rows.slice(0, limit)) {
      const b = el("button", { type: "button", class: `${NS}-fontitem ${r.family === current ? "active" : ""}`, "data-family": r.family },
        el("span", { class: `${NS}-fontname`, style: { fontFamily: `"${r.family}", Arial, sans-serif` } }, r.family),
        el("small", {}, r.tag),
      );
      b.addEventListener("click", async () => {
        closePopover();
        await ensureFont(r.family);
        onPick(r.family);
      });
      list.appendChild(b);
      io?.observe(b);
    }
    if (rows.length > limit) {
      const more = el("button", { type: "button", class: `${NS}-catmore` }, `Show more (${(rows.length - limit).toLocaleString("en-US")} left)`);
      more.addEventListener("click", () => {
        limit += 200;
        draw();
      });
      list.appendChild(more);
    }
  };
  for (const [v, label] of [["all", "All"], ["google", "Google Fonts"], ["installed", "Installed"]]) {
    const b = el("button", { type: "button", "data-v": v }, label);
    b.addEventListener("click", () => {
      S.fontTab = v;
      limit = 120;
      draw();
    });
    tabs.appendChild(b);
  }
  for (const [v, label] of GF_CATEGORIES) {
    const c = el("button", { type: "button", class: `${NS}-chip`, "data-v": v }, label);
    c.addEventListener("click", () => {
      S.fontCat = v;
      limit = 120;
      draw();
    });
    cats.appendChild(c);
  }
  let t = 0;
  search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      limit = 120;
      draw();
    }, 120);
  });
  search.addEventListener("keydown", (e) => e.stopPropagation());
  const loadLocal = el("button", { type: "button", class: `${NS}-catmore` }, "＋ Load installed fonts from this computer");
  loadLocal.addEventListener("click", async () => {
    await loadInstalledFonts();
    S.fontTab = "installed";
    draw();
  });
  draw();
  if (!GF.list) loadGoogleFontList().then(draw);
  const pop = popoverAt(anchor, el("div", { class: `${NS}-fontpick` }, search, tabs, cats, note, list, loadLocal), `${NS}-fontpop`);
  const prevOff = pop._off;
  pop._off = () => {
    io?.disconnect();
    prevOff?.();
  };
  setTimeout(() => search.focus(), 30);
}
