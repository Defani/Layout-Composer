// ---------------------------------------------------------------- export
function composePageSVG(mapImages, { background = "page", fontCss = "" } = {}) {
  const pg = S.doc.page;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pg.width}mm" height="${pg.height}mm" viewBox="0 0 ${pg.width} ${pg.height}">`;
  // web fonts (Google Fonts) inlined, so an SVG drawn as an image keeps them
  if (fontCss) s += `<defs><style>${fontCss}</style></defs>`;
  s += pageDecorSVG(true, background);
  S.doc.items.forEach((item, index) => {
    if (item.hidden) return;
    const fx = fxExportParts(item, index, mapImages);
    if (fx.defs) s += `<defs>${fx.defs}</defs>`;
    s += fx.backdrop;
    const flip = item.flipX || item.flipY ? ` translate(${item.flipX ? item.w : 0} ${item.flipY ? item.h : 0}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1})` : "";
    const t = `translate(${item.x} ${item.y})${item.rot ? ` rotate(${item.rot} ${item.w / 2} ${item.h / 2})` : ""}${flip}`;
    s += `<g${fx.filterAttr} opacity="${item.opacity ?? 1}"><g transform="${t}"><svg x="0" y="0" width="${item.w}" height="${item.h}" viewBox="0 0 ${item.w} ${item.h}" overflow="visible">`;
    s += renderItem(item, { export: true, mapImages });
    s += `</svg></g></g>`;
  });
  return `${s}</svg>`;
}

function rasterize(svg, dpi, background) {
  const pg = S.doc.page;
  const W = Math.round((pg.width / 25.4) * dpi);
  const H = Math.round((pg.height / 25.4) * dpi);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext("2d");
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);
        resolve(cv);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Page SVG failed to render"));
    };
    img.src = url;
  });
}

let jsPdfPromise = null;
function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPdfPromise) {
    jsPdfPromise = loadVendorScript("jspdf").then(() => {
      if (!window.jspdf?.jsPDF) throw new Error("jsPDF is not available");
      return window.jspdf.jsPDF;
    });
    jsPdfPromise.catch(() => (jsPdfPromise = null));
  }
  return jsPdfPromise;
}

// Export progress: a bar that fills from left to right, the current step and a
// checklist of steps. set(text, fraction 0..1, stepKey).
function progressView(title, { sub = "", iconName = "download", steps = [] } = {}) {
  const fill = el("div", { class: `${NS}-progfill` });
  const pct = el("span", { class: `${NS}-progpct` }, "0%");
  const step = el("div", { class: `${NS}-progstep` }, "Preparing…");
  const list = el("ol", { class: `${NS}-progsteps` }, ...steps.map(([k, label]) => el("li", { "data-k": k }, el("span", { class: `${NS}-stepdot` }), el("span", {}, label))));
  const bar = el("div", { class: `${NS}-progbar`, role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill);
  const node = el("div", { class: `${NS}-prog` },
    el("div", { class: `${NS}-proghead` },
      el("span", { class: `${NS}-progicon`, html: icon(iconName, 18) }),
      el("div", { class: `${NS}-progtitle` }, el("b", {}, title), sub ? el("small", {}, sub) : null),
      pct,
    ),
    bar,
    step,
    steps.length ? list : null,
  );
  let last = 0;
  let active = null;
  return {
    el: node,
    set(text, frac, key) {
      if (text) step.textContent = text;
      if (key && key !== active) {
        active = key;
        let seen = false;
        for (const li of list.children) {
          const isA = li.dataset.k === key;
          if (isA) seen = true;
          li.classList.toggle("active", isA);
          li.classList.toggle("done", !seen && !isA);
        }
      }
      if (frac != null) {
        last = Math.max(last, clamp(frac, 0, 1));
        fill.style.width = `${(last * 100).toFixed(1)}%`;
        pct.textContent = `${Math.round(last * 100)}%`;
        bar.setAttribute("aria-valuenow", String(Math.round(last * 100)));
        if (last >= 1) {
          node.classList.add("done");
          for (const li of list.children) li.classList.replace("active", "done") || li.classList.add("done");
        }
      }
    },
    close() {},
  };
}
function progressModal(text) {
  const v = progressView(text);
  const m = el("div", { class: `${NS}-modal` }, el("div", { class: `${NS}-dlg ${NS}-dlgsmall` }, el("div", { class: `${NS}-dlgbody` }, v.el)));
  S.ui.root.appendChild(m);
  return { el: v.el, set: v.set, close: () => m.remove() };
}

async function exportLayout(fmt, progIn) {
  if (!S.doc) return;
  exitContentMode();
  const dpi = S.exportDpi || 300;
  const pg = S.doc.page;
  const px = (pg.width / 25.4) * dpi * ((pg.height / 25.4) * dpi);
  if (fmt !== "svg" && px > 160e6) {
    if (!confirm(`${pg.size} at ${dpi} dpi is very large (${Math.round(px / 1e6)} megapixels) and may fail. Continue?`)) return;
  }
  const maps = S.doc.items.filter((i) => i.type === "map" && !i.hidden && i.props.source !== "snapshot");
  const prog = progIn || progressModal("Exporting");
  prog.set("Preparing…", 0.03, "maps");
  const bg = S.exportBg || "page";
  try {
    const mapImages = new Map();
    let n = 0;
    for (const m of maps) {
      n += 1;
      prog.set(`Rendering map ${n} of ${maps.length} (${m.name}) at ${fmt === "svg" ? 200 : dpi} dpi…`, 0.05 + (0.6 * (n - 1)) / maps.length, "maps");
      const img = await renderMapImage(m, fmt === "svg" ? 200 : dpi);
      prog.set(null, 0.05 + (0.6 * n) / maps.length);
      if (img) mapImages.set(m.id, img);
      else toast(`Map "${m.name}" failed to render`, "warn");
    }
    if (S.doc.items.some((i) => !i.hidden && (i.type === "latex" || JSON.stringify(i.props).includes("$")))) {
      prog.set("Typesetting formulas…", 0.68);
      await loadMathJax().catch(() => {});
    }
    const gfams = docFontFamilies().filter(isGoogleFont);
    let fontCss = "";
    if (gfams.length && fmt !== "vpdf") {
      prog.set(`Embedding ${gfams.length} Google font${gfams.length > 1 ? "s" : ""}…`, 0.7, "fonts");
      fontCss = await embeddedFontCss(gfams);
    }
    prog.set("Composing page…", 0.72, "compose");
    const svg = composePageSVG(mapImages, { background: bg, fontCss });
    const base = safeName(S.exportName || S.doc.name);
    if (fmt === "vpdf") {
      prog.set("Building vector PDF…", 0.8, "save");
      await saveVectorPdf(svg, base);
    } else if (fmt === "svg") {
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${base}.svg`);
    } else {
      prog.set("Drawing the page…", 0.78, "compose");
      const canvas = await rasterize(svg, dpi, fmt === "png" && bg === "transparent" ? null : "#ffffff");
      if (fmt === "geopdf") {
        prog.set("Georeferencing PDF…", 0.9, "save");
        const JsPDF = await loadJsPDF();
        const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
        pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "Layout Composer" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pg.width, pg.height, undefined, "FAST");
        const frames = geoFrames();
        if (!frames.length) throw new Error("GeoPDF needs at least one visible, unrotated map frame");
        downloadBlob(new Blob([geoRegister(pdf.output("arraybuffer"), frames)], { type: "application/pdf" }), `${base}_geo.pdf`);
      } else if (fmt === "pdf") {
        prog.set("Creating PDF…", 0.9, "save");
        const JsPDF = await loadJsPDF();
        const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
        pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "Layout Composer" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pg.width, pg.height, undefined, "FAST");
        pdf.save(`${base}.pdf`);
      } else {
        prog.set("Saving image…", 0.92, "save");
        const blob = await new Promise((r) => canvas.toBlob(r, fmt === "jpg" ? "image/jpeg" : "image/png", 0.95));
        if (!blob) throw new Error("Canvas too large for this browser — lower the DPI");
        downloadBlob(blob, `${base}.${fmt}`);
      }
    }
    prog.set("Saved", 1);
    toast(`${{ vpdf: "Vector PDF", geopdf: "GeoPDF" }[fmt] || fmt.toUpperCase()} export finished`);
    return true;
  } catch (e) {
    console.error("[Layout Composer] export failed", e);
    prog.set(`Export failed: ${e.message}`);
    prog.el?.classList.add("failed");
    toast(`Export failed: ${e.message}`, "warn");
    return false;
  } finally {
    if (!progIn) setTimeout(() => prog.close(), 600);
  }
}

function projectName() {
  try {
    const snap = S.app?.getProjectSnapshot?.();
    return snap?.name || snap?.project?.name || "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- vector PDF (svg2pdf)
let svg2pdfPromise = null;
function loadSvg2pdf() {
  if (window.svg2pdf?.svg2pdf) return Promise.resolve(window.svg2pdf.svg2pdf);
  if (!svg2pdfPromise) {
    svg2pdfPromise = loadJsPDF()
      .then(() => loadVendorScript("svg2pdf"))
      .then(() => {
        if (!window.svg2pdf?.svg2pdf) throw new Error("svg2pdf is not available");
        return window.svg2pdf.svg2pdf;
      });
    svg2pdfPromise.catch(() => (svg2pdfPromise = null));
  }
  return svg2pdfPromise;
}
async function saveVectorPdf(svgText, base) {
  const pg = S.doc.page;
  const svg2pdf = await loadSvg2pdf();
  const JsPDF = await loadJsPDF();
  const pdf = new JsPDF({ orientation: pg.width > pg.height ? "landscape" : "portrait", unit: "mm", format: [pg.width, pg.height], compress: true });
  pdf.setProperties({ title: S.doc.vars?.title || S.doc.name, creator: "Layout Composer" });
  // svg2pdf measures text with the live DOM, so mount the page off-screen
  const holder = el("div", { style: { position: "fixed", left: "-30000px", top: "0" } });
  holder.innerHTML = svgText;
  document.body.appendChild(holder);
  try {
    await svg2pdf(holder.firstElementChild, pdf, { x: 0, y: 0, width: pg.width, height: pg.height });
  } finally {
    holder.remove();
  }
  pdf.save(`${base}.pdf`);
}

// ---------------------------------------------------------------- GeoPDF
// ISO 32000 geospatial PDF: each map frame becomes a /Viewport with a
// /Measure /GEO dictionary (WGS 84 corners), appended as an incremental update.
// Ported from GIS Consultant Studio (MIT, same author) and extended to several frames.
const GEO_WKT = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
function geoFrames() {
  const pg = S.doc.page;
  const k = 72 / 25.4;
  return S.doc.items
    .filter((i) => i.type === "map" && !i.hidden && !i.rot)
    .map((item) => {
      if (item.props.source === "snapshot" && item.props.snapshot) syncSnapshotView(item);
      const g = mapGeom(item);
      // lower-left, upper-left, upper-right, lower-right (matches /LPTS)
      const pts = [
        [0, item.h],
        [0, 0],
        [item.w, 0],
        [item.w, item.h],
      ].map(([x, y]) => g.unproject(x, y));
      return {
        name: item.name,
        bbox: [item.x * k, (pg.height - item.y - item.h) * k, (item.x + item.w) * k, (pg.height - item.y) * k],
        gpts: pts.map(([lng, lat]) => `${round(lat, 7)} ${round(lng, 7)}`).join(" "),
      };
    });
}
function geoRegister(buf, frames) {
  const latin1 = (u8, from = 0) => {
    let s = "";
    for (let i = from; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 8192, u8.length)));
    return s;
  };
  const ascii = (s) => {
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  };
  const n = (v) => String(Math.round(v * 1e6) / 1e6);
  const u8 = new Uint8Array(buf);
  const tail = latin1(u8, Math.max(0, u8.length - 2048));
  const all = latin1(u8);
  const sx = tail.match(/startxref\s+(\d+)/g);
  const prev = +sx[sx.length - 1].match(/\d+/)[0];
  const size = +all.match(/\/Size\s+(\d+)/g).pop().match(/\d+/)[0];
  const root = all.match(/\/Root\s+(\d+\s+\d+\s+R)/)[1];
  const m = all.match(/(\d+) 0 obj\s*<<\s*\/Type\s*\/Page\b([\s\S]*?)>>\s*endobj/);
  if (!m) throw new Error("Could not find the PDF page");
  const num = m[1];
  const dict = m[2];
  const esc2 = (t) => String(t).replace(/[()\\]/g, "");
  const vps = frames
    .map(
      (f) =>
        `<< /Type /Viewport /Name (${esc2(f.name)}) /BBox [${f.bbox.map(n).join(" ")}] /Measure << /Type /Measure /Subtype /GEO ` +
        `/Bounds [0 0 0 1 1 1 1 0] /LPTS [0 0 0 1 1 1 1 0] /GPTS [${f.gpts}] /GCS << /Type /GEOGCS /WKT (${GEO_WKT}) >> >> >>`,
    )
    .join(" ");
  const obj = `\n${num} 0 obj\n<< /Type /Page${dict}\n/VP [${vps}]\n>>\nendobj\n`;
  const objOff = u8.length;
  const xrefOff = objOff + obj.length;
  const xref = `xref\n${num} 1\n${String(objOff + 1).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${size} /Root ${root} /Prev ${prev} >>\nstartxref\n${xrefOff}\n%%EOF\n`;
  const out = new Uint8Array(u8.length + obj.length + xref.length);
  out.set(u8, 0);
  out.set(ascii(obj), u8.length);
  out.set(ascii(xref), u8.length + obj.length);
  return out;
}
