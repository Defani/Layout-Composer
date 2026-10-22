// ---------------------------------------------------------------- Map Series (atlas)
// One layout, one page per feature of an index layer (ArcGIS Pro "Map Series"):
// the chosen map frame zooms to each feature (or keeps its scale and centres on
// it), text picks up {series_name}, {series_page}, {series_count} and
// {series:FIELD}, and the whole series exports as one multi-page PDF or one
// image per page.

function seriesCfg() {
  return S.doc?.series || null;
}
function seriesOn() {
  const c = seriesCfg();
  return !!(c?.enabled && c.layer && seriesFeatures().length);
}
// index features with a geometry, in series order
function seriesFeatures() {
  const c = seriesCfg();
  if (!c?.layer) return [];
  let feats = (layerFeatures(c.layer) || []).filter((f) => f?.geometry && mtBBox([f]));
  if (c.filterField && c.filterValue !== "" && c.filterValue != null) feats = feats.filter((f) => String(f.properties?.[c.filterField] ?? "") === String(c.filterValue));
  const key = c.sortField || c.nameField;
  if (key) feats = [...feats].sort((a, b) => String(a.properties?.[key] ?? "").localeCompare(String(b.properties?.[key] ?? ""), undefined, { numeric: true }) * (c.sortDesc ? -1 : 1));
  return feats;
}
function seriesFeature(i = seriesCfg()?.index || 0) {
  const feats = seriesFeatures();
  return feats.length ? feats[clamp(i, 0, feats.length - 1)] : null;
}
function seriesName(f) {
  const c = seriesCfg();
  if (!f) return "";
  const v = c?.nameField ? f.properties?.[c.nameField] : null;
  return v != null && v !== "" ? String(v) : `Page ${(c?.index || 0) + 1}`;
}
// text variables: {series_name} {series_page} {series_count} {series:FIELD}
function seriesVar(k, arg) {
  if (!seriesOn()) return null;
  const c = seriesCfg();
  const f = seriesFeature();
  if (k === "series_name" || k === "nama_seri") return seriesName(f);
  if (k === "series_page") return String((c.index || 0) + 1);
  if (k === "series_count") return String(seriesFeatures().length);
  if (k === "series" && arg) {
    const v = f?.properties?.[arg];
    return v == null ? "" : typeof v === "number" ? fmtNumber(v, Number.isInteger(v) ? 0 : 2) : String(v);
  }
  return null;
}
// move the frame to page i (no undo step: paging is navigation, not an edit)
function seriesApply(i) {
  const c = seriesCfg();
  if (!c) return;
  const feats = seriesFeatures();
  if (!feats.length) return;
  c.index = clamp(i, 0, feats.length - 1);
  const map = S.doc.items.find((m) => m.id === c.mapId && m.type === "map") || mapItems()[0];
  const f = feats[c.index];
  const b = mtBBox([f]);
  if (map && b) {
    const center = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    if (c.extent === "center") map.props.view = { ...map.props.view, center };
    else {
      const m = (c.margin ?? 10) / 100;
      const pw = (b[2] - b[0]) * m || 0.005;
      const ph = (b[3] - b[1]) * m || 0.005;
      const bb = { west: b[0] - pw, east: b[2] + pw, south: b[1] - ph, north: b[3] + ph };
      let zoom = zoomForBounds(bb, map.w, map.h);
      // optional round scale: the nearest larger round scale that still fits
      if (c.roundScale) {
        const sc = (EARTH_CIRC * Math.cos((center[1] * Math.PI) / 180)) / (WORLD * 2 ** zoom) * 1000 * PX96;
        const steps = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 5000000];
        const r = steps.find((s) => s >= sc) || sc;
        zoom = zoomForScale(r, center[1]);
      }
      map.props.view = { ...map.props.view, center, zoom, bearing: 0 };
      if (map.props.scaleLock) map.props.scaleLock = mapScale(map);
    }
  }
  saveLibrary();
  refreshCanvas();
  scheduleOverlayRefresh();
  renderSeriesNav();
  renderQuickBar();
}
function seriesStep(d) {
  const c = seriesCfg();
  if (!c) return;
  seriesApply((c.index || 0) + d);
}

// ---- set-up dialog
function openSeriesSetup() {
  const c = S.doc.series || { enabled: true, layer: "", nameField: "", sortField: "", mapId: mapItems()[0]?.id || "", extent: "fit", margin: 10, index: 0, roundScale: false };
  const layers = dataLayerOptions("Choose the index layer…");
  const maps = mapItems();
  if (!maps.length) return toast("Add a map frame first: the series moves a map frame from page to page.", "warn");
  const sel = (opts, v) => el("select", { class: `${NS}-input` }, ...opts.map(([k, l]) => el("option", { value: k, selected: String(k) === String(v) }, l)));
  const layer = sel(layers, c.layer);
  const nameF = el("select", { class: `${NS}-input` });
  const sortF = el("select", { class: `${NS}-input` });
  const fillFields = () => {
    const f = layerFields(layer.value).map((x) => [x.name, x.name]);
    nameF.replaceChildren(...[["", "(page number)"], ...f].map(([k, l]) => el("option", { value: k, selected: k === c.nameField }, l)));
    sortF.replaceChildren(...[["", "Same as the name"], ...f].map(([k, l]) => el("option", { value: k, selected: k === c.sortField }, l)));
    if (!c.nameField) {
      const guess = f.find(([k]) => /name|nama|kec|desa|label|title/i.test(k));
      if (guess) nameF.value = guess[0];
    }
  };
  layer.addEventListener("change", fillFields);
  fillFields();
  const desc = el("input", { type: "checkbox", checked: !!c.sortDesc });
  const map = sel(maps.map((m) => [m.id, m.name]), c.mapId || maps[0].id);
  const extent = sel([["fit", "Zoom to each feature (best fit)"], ["center", "Keep the scale, centre on each feature"]], c.extent);
  const margin = el("input", { type: "number", class: `${NS}-input`, value: c.margin ?? 10, min: 0, max: 200, step: 5 });
  const rnd = el("input", { type: "checkbox", checked: !!c.roundScale });
  const count = el("p", { class: `${NS}-muted` });
  const updCount = () => {
    const n = (layerFeatures(layer.value) || []).filter((f) => f?.geometry).length;
    count.textContent = layer.value ? `${n} page${n === 1 ? "" : "s"} — one per feature.` : "";
  };
  layer.addEventListener("change", updCount);
  updCount();
  const overlay = el("div", { class: `${NS}-modal` });
  const close = () => overlay.remove();
  const f2 = (label, ctl, hint) => el("label", { class: `${NS}-dlgfield` }, el("span", {}, label), ctl, hint ? el("small", { class: `${NS}-muted` }, hint) : null);
  overlay.appendChild(el("div", { class: `${NS}-dlg`, role: "dialog", "aria-label": "Map Series" },
    el("div", { class: `${NS}-dlghead` }, el("div", {}, el("div", { class: `${NS}-dlgtitle` }, "Map Series"), el("div", { class: `${NS}-dlgsub` }, "One page per feature of an index layer — like ArcGIS Pro's Map Series")), iconBtn("close", "Close", close)),
    el("div", { class: `${NS}-dlgbody ${NS}-mtbody` },
      f2("Index layer", layer, "e.g. district or village boundaries; each feature becomes a page"),
      count,
      el("div", { class: `${NS}-grid2` }, f2("Page name from", nameF), f2("Sort pages by", sortF)),
      el("label", { class: `${NS}-check` }, desc, el("span", {}, "Descending order")),
      f2("Map frame that follows the pages", map),
      f2("Extent", extent),
      el("div", { class: `${NS}-grid2` }, f2("Margin around the feature (%)", margin), el("label", { class: `${NS}-check`, style: { alignSelf: "end" } }, rnd, el("span", {}, "Round scale (1:25.000, 1:50.000 …)"))),
      el("p", { class: `${NS}-muted` }, "In text use {series_name}, {series_page}, {series_count} or {series:FIELD} (any column of the index layer)."),
    ),
    el("div", { class: `${NS}-dlgfoot` },
      c.enabled && S.doc.series ? el("button", { type: "button", class: `${NS}-btn`, onclick: () => {
        commit(() => (S.doc.series.enabled = false));
        close();
        renderSeriesNav();
        renderQuickBar();
      } }, "Turn off") : null,
      el("button", { type: "button", class: `${NS}-btn`, onclick: close }, "Cancel"),
      el("button", { type: "button", class: `${NS}-btn primary`, onclick: () => {
        if (!layer.value) return toast("Choose the index layer.", "warn");
        commit(() => (S.doc.series = { enabled: true, layer: layer.value, nameField: nameF.value, sortField: sortF.value, sortDesc: desc.checked, mapId: map.value, extent: extent.value, margin: parseFloat(margin.value) || 0, roundScale: rnd.checked, index: 0 }));
        close();
        seriesApply(0);
        toast(`Map series on: ${seriesFeatures().length} pages`);
      } }, "Apply"),
    ),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
}

// ---- page navigator (status bar) and ribbon group
function renderSeriesNav() {
  const host = S.ui.root?.querySelector(`.${NS}-seriesnav`);
  if (!host) return;
  host.replaceChildren();
  if (!seriesOn()) return;
  const c = seriesCfg();
  const n = seriesFeatures().length;
  host.append(
    el("button", { type: "button", class: `${NS}-vtog`, title: "Previous page (Page Up)", onclick: () => seriesStep(-1), disabled: c.index <= 0 }, "◀"),
    el("span", { class: `${NS}-seriesname`, title: "Map series page" }, `${seriesName(seriesFeature())} · ${c.index + 1}/${n}`),
    el("button", { type: "button", class: `${NS}-vtog`, title: "Next page (Page Down)", onclick: () => seriesStep(1), disabled: c.index >= n - 1 }, "▶"),
  );
}
function seriesRibbonGroup() {
  const on = seriesOn();
  const c = seriesCfg();
  const feats = on ? seriesFeatures() : [];
  const big = (ic, label, title, fn) => el("button", { type: "button", class: `${NS}-rbig`, title, html: `${icon(ic, 18)}<span>${esc(label)}</span>`, onclick: fn });
  const pick = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Go to page", disabled: !on }, ...(on ? feats.map((f, i) => el("option", { value: i, selected: i === c.index }, `${i + 1}. ${seriesName(f)}`)) : [el("option", {}, "No series")]));
  pick.addEventListener("change", () => seriesApply(parseInt(pick.value, 10)));
  const nav = (txt, title, d, dis) => el("button", { type: "button", class: `${NS}-qbtn`, title, disabled: dis, onclick: () => seriesStep(d) }, txt);
  return el("div", { class: `${NS}-rgroup` },
    el("div", { class: `${NS}-rrow ${NS}-rbigrow` },
      big("layers", on ? "Series…" : "Map Series", "Set up the map series: one page per feature", openSeriesSetup),
      el("div", { class: `${NS}-rstack` },
        el("div", { class: `${NS}-rrow` }, nav("⏮", "First page", -1e9, !on || c.index <= 0), nav("◀", "Previous page", -1, !on || c.index <= 0), nav("▶", "Next page", 1, !on || c.index >= feats.length - 1), nav("⏭", "Last page", 1e9, !on || c.index >= feats.length - 1)),
        el("div", { class: `${NS}-rrow` }, pick),
      ),
      big("download", "Export Series", "Export every page: one PDF, or one image per page", () => (on ? openSeriesExport() : toast("Set up the map series first.", "warn"))),
    ),
    el("div", { class: `${NS}-rcap` }, "Map Series"));
}

// ---- export all pages
function openSeriesExport() {
  const n = seriesFeatures().length;
  const fmt = el("select", { class: `${NS}-input` }, el("option", { value: "pdf" }, "One PDF with every page"), el("option", { value: "png" }, "PNG — one image per page"), el("option", { value: "jpg" }, "JPG — one image per page"));
  const dpi = el("select", { class: `${NS}-input` }, ...[96, 150, 200, 300].map((d) => el("option", { value: d, selected: d === Math.min(S.exportDpi || 200, 300) }, `${d} dpi`)));
  const from = el("input", { type: "number", class: `${NS}-input`, value: 1, min: 1, max: n });
  const to = el("input", { type: "number", class: `${NS}-input`, value: n, min: 1, max: n });
  const status = el("p", { class: `${NS}-muted` }, `${n} pages.`);
  const bar = el("div", { class: `${NS}-seriesprog` }, el("i", { style: { width: "0%" } }));
  const overlay = el("div", { class: `${NS}-modal` });
  let running = false;
  let cancel = false;
  const close = () => {
    if (running) {
      cancel = true;
      return;
    }
    overlay.remove();
  };
  const go = async () => {
    if (running) return;
    running = true;
    cancel = false;
    goBtn.disabled = true;
    try {
      await exportSeries({ fmt: fmt.value, dpi: parseInt(dpi.value, 10), from: parseInt(from.value, 10) - 1, to: parseInt(to.value, 10) - 1 }, (txt, f) => {
        status.textContent = txt;
        bar.firstChild.style.width = `${Math.round(f * 100)}%`;
      }, () => cancel);
    } catch (e) {
      status.textContent = `Export failed: ${e.message || e}`;
    } finally {
      running = false;
      goBtn.disabled = false;
    }
  };
  const goBtn = el("button", { type: "button", class: `${NS}-btn primary`, onclick: go }, "Export");
  overlay.appendChild(el("div", { class: `${NS}-dlg`, role: "dialog", "aria-label": "Export map series" },
    el("div", { class: `${NS}-dlghead` }, el("div", {}, el("div", { class: `${NS}-dlgtitle` }, "Export map series"), el("div", { class: `${NS}-dlgsub` }, S.doc.name)), iconBtn("close", "Close / stop", close)),
    el("div", { class: `${NS}-dlgbody ${NS}-mtbody` },
      el("div", { class: `${NS}-grid2` }, el("label", { class: `${NS}-dlgfield` }, el("span", {}, "Format"), fmt), el("label", { class: `${NS}-dlgfield` }, el("span", {}, "Resolution"), dpi)),
      el("div", { class: `${NS}-grid2` }, el("label", { class: `${NS}-dlgfield` }, el("span", {}, "From page"), from), el("label", { class: `${NS}-dlgfield` }, el("span", {}, "To page"), to)),
      bar, status),
    el("div", { class: `${NS}-dlgfoot` }, el("button", { type: "button", class: `${NS}-btn`, onclick: close }, "Close"), goBtn),
  ));
  S.ui.root.appendChild(overlay);
}
async function exportSeries({ fmt, dpi, from, to }, report, cancelled) {
  const c = seriesCfg();
  const feats = seriesFeatures();
  const a = clamp(Math.min(from, to), 0, feats.length - 1);
  const b = clamp(Math.max(from, to), 0, feats.length - 1);
  const keep = c.index || 0;
  const pg = S.doc.page;
  const base = safeName(S.exportName || S.doc.name);
  exitContentMode();
  // images: on the desktop, pick the folder once and write every page into it
  let dir = null;
  if (fmt !== "pdf" && IS_DESKTOP && window.showDirectoryPicker) {
    try {
      dir = await window.showDirectoryPicker({ id: "glc-series", mode: "readwrite", startIn: "documents" });
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  const JsPDF = fmt === "pdf" ? await loadJsPDF() : null;
  let pdf = null;
  const gfams = docFontFamilies().filter(isGoogleFont);
  const fontCss = gfams.length ? await embeddedFontCss(gfams) : "";
  if (S.doc.items.some((i) => !i.hidden && (i.type === "latex" || JSON.stringify(i.props).includes("$")))) await loadMathJax().catch(() => {});
  try {
    for (let i = a; i <= b; i++) {
      if (cancelled()) {
        report(`Stopped after ${i - a} page(s).`, (i - a) / (b - a + 1));
        break;
      }
      seriesApply(i);
      const name = seriesName(feats[i]);
      report(`Page ${i + 1} of ${feats.length}: ${name}`, (i - a) / (b - a + 1));
      const mapImages = new Map();
      for (const m of S.doc.items.filter((x) => x.type === "map" && !x.hidden && x.props.source !== "snapshot")) {
        const img = await renderMapImage(m, dpi);
        if (img) mapImages.set(m.id, img);
      }
      const svg = composePageSVG(mapImages, { background: "page", fontCss });
      const canvas = await rasterize(svg, dpi, fmt === "png" ? null : "#ffffff");
      if (pdf || fmt === "pdf") {
        if (!pdf) pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
        else pdf.addPage([pg.width, pg.height], pg.width > pg.height ? "landscape" : "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pg.width, pg.height, undefined, "FAST");
      } else {
        const blob = await new Promise((r) => canvas.toBlob(r, fmt === "jpg" ? "image/jpeg" : "image/png", 0.93));
        const file = `${base}_${String(i + 1).padStart(String(feats.length).length, "0")}_${safeName(name)}.${fmt}`;
        if (dir) {
          const h = await dir.getFileHandle(file, { create: true });
          const wr = await h.createWritable();
          await wr.write(blob);
          await wr.close();
        } else browserDownload(blob, file);
      }
    }
    if (pdf) {
      pdf.setProperties({ title: `${S.doc.vars?.title || S.doc.name} — map series`, creator: "Layout Composer" });
      report("Writing the PDF…", 0.98);
      downloadBlob(pdf.output("blob"), `${base}_series.pdf`);
    }
    report(`Done: ${b - a + 1} page(s)${dir ? ` in ${dir.name}` : ""}.`, 1);
  } finally {
    seriesApply(keep);
  }
}
