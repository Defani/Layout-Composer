// ---------------------------------------------------------------- HTML and Mermaid items
// HTML: a block of the user's own HTML + CSS, drawn with an SVG foreignObject
// (sanitised: no scripts, event handlers or outside resources).
// Mermaid: a diagram from Mermaid text (flowchart, sequence, gantt, pie, …),
// rendered to plain SVG by the bundled Mermaid library.

ICON_PATHS.code = "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16";
ICON_PATHS.flow = "M3 4h7v5H3zM14 15h7v5h-7zM6.5 9v3.5h11V15";
ICON_PATHS.link = "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1";

ITEM_TYPES.html = {
  label: "HTML",
  icon: "code",
  size: [70, 40],
  defaults: () => ({
    html: '<h3 style="margin:0 0 6px;color:#1f3864">Title</h3>\n<p style="margin:0">Write <b>HTML</b> here: <i>text</i>, <span style="color:#c00">color</span>, lists, tables…</p>',
    css: "",
    background: "",
    padding: 2,
    fontFamily: "Arial",
    fontSize: 12,
    color: "#111111",
    border: { show: false, color: "#333333", width: 0.3, radius: 0 },
  }),
};
ITEM_TYPES.mermaid = {
  label: "Mermaid diagram",
  icon: "flow",
  size: [90, 60],
  defaults: () => ({
    code: "flowchart LR\n  A[Field data] --> B{Validation}\n  B -->|valid| C[Spatial analysis]\n  B -->|invalid| D[Re-survey]\n  C --> E[Final map]",
    theme: "neutral",
    background: "",
    padding: 1,
    border: { show: false, color: "#333333", width: 0.3, radius: 0 },
  }),
};

// ---- HTML: sanitise, scope the CSS, draw inside a foreignObject
const XHTML_NS = "http://www.w3.org/1999/xhtml";
function sanitizeHtmlNode(src) {
  const doc = new DOMParser().parseFromString(`<div>${src || ""}</div>`, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, base, form, input, button, textarea, select, style").forEach((n) => n.remove());
  for (const n of doc.body.querySelectorAll("*")) {
    for (const a of [...n.attributes]) {
      const v = a.value.trim();
      // no event handlers or script URLs; pictures only as data: URLs (outside files would taint exports)
      if (/^on/i.test(a.name) || /^javascript:/i.test(v) || ((a.name === "src" || a.name === "href" || a.name === "xlink:href") && !/^data:image\//i.test(v) && a.name !== "href")) n.removeAttribute(a.name);
      if (a.name === "style" && /url\(\s*['"]?(?!data:)/i.test(v)) n.setAttribute("style", v.replace(/url\([^)]*\)/gi, "none"));
    }
  }
  return doc.body.firstChild;
}
// prefix every selector with the item's class so the CSS never reaches the app
function scopeCss(css, scope) {
  return String(css || "")
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import[^;]*;/gi, "")
    .replace(/url\(\s*['"]?(?!data:)[^)]*\)/gi, "none")
    .replace(/([^{}]+)\{/g, (m, sel) => {
      if (/^\s*@/.test(sel) || /^\s*(from|to|\d+%)\s*$/.test(sel)) return m;
      return `${sel.split(",").map((s) => `.${scope} ${s.trim()}`).join(", ")} {`;
    });
}
// For exports: lay the HTML out for real off screen, then redraw it as plain SVG
// (text runs, backgrounds, borders, pictures, list markers). A foreignObject
// would taint the export canvas and is ignored by vector PDF.
function htmlToSvg(item, wrap, pad) {
  // off screen (not visibility:hidden, which would hide every element we measure)
  const host = el("div", { style: { position: "fixed", left: "-20000px", top: "0", pointerEvents: "none" } });
  const live = wrap.cloneNode(true);
  live.style.transform = "none";
  host.appendChild(live);
  document.body.appendChild(host);
  const base = live.getBoundingClientRect();
  const k = 1 / PX96;
  const X = (v) => round(pad + (v - base.left) * k, 3);
  const Y = (v) => round(pad + (v - base.top) * k, 3);
  const L = (v) => round(v * k, 3);
  const visible = (c) => c && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c);
  let out = "";
  for (const n of live.querySelectorAll("*")) {
    if (n.tagName === "STYLE") continue;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = n.getBoundingClientRect();
    if (visible(cs.backgroundColor) && r.width && r.height) out += `<rect x="${X(r.left)}" y="${Y(r.top)}" width="${L(r.width)}" height="${L(r.height)}" rx="${L(parseFloat(cs.borderTopLeftRadius) || 0)}" fill="${cs.backgroundColor}"/>`;
    for (const [side, x1, y1, x2, y2] of [["Top", r.left, r.top, r.right, r.top], ["Right", r.right, r.top, r.right, r.bottom], ["Bottom", r.left, r.bottom, r.right, r.bottom], ["Left", r.left, r.top, r.left, r.bottom]]) {
      const bw = parseFloat(cs[`border${side}Width`]) || 0;
      if (bw && cs[`border${side}Style`] !== "none" && visible(cs[`border${side}Color`])) out += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${cs[`border${side}Color`]}" stroke-width="${L(bw)}"${cs[`border${side}Style`] === "dashed" ? ` stroke-dasharray="${L(bw * 3)} ${L(bw * 2)}"` : ""}/>`;
    }
    if (n.tagName === "IMG" && /^data:image\//.test(n.getAttribute("src") || "")) out += `<image href="${esc(n.getAttribute("src"))}" x="${X(r.left)}" y="${Y(r.top)}" width="${L(r.width)}" height="${L(r.height)}" preserveAspectRatio="none"/>`;
    if (n.tagName === "HR") out += `<line x1="${X(r.left)}" y1="${Y(r.top + r.height / 2)}" x2="${X(r.right)}" y2="${Y(r.top + r.height / 2)}" stroke="${cs.color}" stroke-width="${L(1)}"/>`;
    // list markers: bullets and numbers sit left of the item
    if (n.tagName === "LI" && cs.listStyleType !== "none") {
      const list = n.parentElement;
      const idx = [...list.children].filter((c) => c.tagName === "LI").indexOf(n) + 1;
      const fs = parseFloat(cs.fontSize);
      const ordered = list.tagName === "OL";
      const mark = ordered ? listMarker(idx, cs.listStyleType.includes("alpha") ? (cs.listStyleType.includes("upper") ? "A." : "a.") : cs.listStyleType.includes("roman") ? (cs.listStyleType.includes("upper") ? "I." : "i.") : "1.") : cs.listStyleType === "circle" ? "◦" : cs.listStyleType === "square" ? "▪" : "•";
      out += `<text x="${X(r.left - fs * 0.4)}" y="${Y(r.top + fs * 1.05)}" text-anchor="end" font-family="${esc(cs.fontFamily)}" font-size="${L(fs)}" fill="${cs.color}">${esc(mark)}</text>`;
    }
  }
  // text: word by word, grouped into runs that share a line
  const walker = document.createTreeWalker(live, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim() || t.parentElement.closest("style")) continue;
    const cs = getComputedStyle(t.parentElement);
    const fs = parseFloat(cs.fontSize);
    const attrs = `font-family="${esc(cs.fontFamily)}" font-size="${L(fs)}" font-weight="${cs.fontWeight}"${cs.fontStyle === "italic" ? ' font-style="italic"' : ""} fill="${cs.color}"${cs.textDecorationLine.includes("underline") ? ' text-decoration="underline"' : ""}`;
    const words = [...t.textContent.matchAll(/\S+/g)];
    let run = null;
    const flush = () => {
      if (run) out += `<text x="${X(run.x)}" y="${Y(run.base)}" ${attrs} xml:space="preserve">${esc(run.text)}</text>`;
      run = null;
    };
    for (const m of words) {
      range.setStart(t, m.index);
      range.setEnd(t, m.index + m[0].length);
      const r = range.getBoundingClientRect();
      if (!r.width) continue;
      const base = r.top + (r.height + fs * 0.7) / 2;
      if (run && Math.abs(run.top - r.top) < fs * 0.5) {
        const gap = r.left - run.right;
        run.text += " ".repeat(Math.max(1, Math.round(gap / (fs * 0.28)))) + m[0];
        run.right = r.right;
      } else {
        flush();
        run = { x: r.left, top: r.top, right: r.right, base, text: m[0] };
      }
    }
    flush();
  }
  host.remove();
  return out;
}

RENDERERS.html = function html(item, ctx) {
  const p = item.props;
  const scope = `glch-${item.id.replace(/[^\w-]/g, "")}`;
  const pad = p.padding || 0;
  const wPx = (item.w - pad * 2) * PX96;
  const hPx = (item.h - pad * 2) * PX96;
  const wrap = document.createElementNS(XHTML_NS, "div");
  wrap.setAttribute("class", scope);
  // laid out in CSS pixels at 96 dpi, then scaled to the item's millimetres
  wrap.setAttribute("style", `width:${round(wPx, 2)}px;height:${round(hPx, 2)}px;overflow:hidden;transform:scale(${round(1 / PX96, 6)});transform-origin:0 0;font-family:${p.fontFamily || "Arial"},sans-serif;font-size:${p.fontSize || 12}px;color:${p.color || "#111"};line-height:1.35;box-sizing:border-box`);
  if (p.css) {
    const st = document.createElementNS(XHTML_NS, "style");
    st.textContent = scopeCss(p.css, scope);
    wrap.appendChild(st);
  }
  const body = sanitizeHtmlNode(resolveVars(p.html || "", item));
  while (body?.firstChild) wrap.appendChild(document.importNode(body.firstChild, true)) && body.removeChild(body.firstChild);
  let out = "";
  if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}"/>`;
  if (ctx?.export) {
    // exports get plain SVG, clipped to the box like the live view
    const cid = `hclip-${scope}`;
    out += `<defs><clipPath id="${cid}"><rect x="${pad}" y="${pad}" width="${round(item.w - pad * 2, 3)}" height="${round(item.h - pad * 2, 3)}"/></clipPath></defs><g clip-path="url(#${cid})">${htmlToSvg(item, wrap, pad)}</g>`;
  } else out += `<foreignObject x="${pad}" y="${pad}" width="${round(item.w - pad * 2, 3)}" height="${round(item.h - pad * 2, 3)}">${new XMLSerializer().serializeToString(wrap)}</foreignObject>`;
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};

// ---- Mermaid: render once per (code, theme), cache the SVG, refresh when ready
const MERMAID = { cache: new Map(), queue: Promise.resolve(), ready: false, failed: "" };
function loadMermaid() {
  if (MERMAID.ready) return Promise.resolve();
  return loadVendorScript("mermaid").then(() => {
    if (!window.mermaid) throw new Error("Mermaid did not start");
    MERMAID.ready = true;
  });
}
function mermaidKey(p) {
  return `${p.theme || "neutral"}\u0000${p.code || ""}`;
}
function queueMermaid(p) {
  const key = mermaidKey(p);
  if (MERMAID.cache.has(key)) return;
  MERMAID.cache.set(key, { pending: true });
  MERMAID.queue = MERMAID.queue.then(async () => {
    const id = `glcmmd${Math.random().toString(36).slice(2, 9)}`;
    try {
      await loadMermaid();
      // plain SVG text labels (no HTML) so PDF / SVG exports keep them
      window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: p.theme || "neutral", htmlLabels: false, flowchart: { htmlLabels: false }, fontFamily: "Arial, sans-serif" });
      const { svg } = await window.mermaid.render(id, p.code || "");
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const root = doc.documentElement;
      const vb = (root.getAttribute("viewBox") || "0 0 100 100").split(/[\s,]+/).map(Number);
      // Mermaid's own styles are scoped to "#<id>": keep that id on the wrapper
      MERMAID.cache.set(key, { vb, inner: root.innerHTML, id: root.getAttribute("id") || id });
    } catch (e) {
      MERMAID.cache.set(key, { error: String(e?.message || e).split("\n")[0].slice(0, 140) });
      // Mermaid leaves its error drawing in the page body
      document.getElementById(`d${id}`)?.remove();
      document.getElementById(id)?.remove();
    }
    if (S.open) refreshCanvas();
  });
}
RENDERERS.mermaid = function mermaid(item, ctx) {
  const p = item.props;
  const pad = p.padding || 0;
  let out = p.background ? `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}"/>` : "";
  const hit = MERMAID.cache.get(mermaidKey(p));
  if (!hit) queueMermaid(p);
  if (hit?.inner) {
    const [x0, y0, w, h] = hit.vb;
    out += `<svg id="${hit.id}" x="${pad}" y="${pad}" width="${round(item.w - pad * 2, 3)}" height="${round(item.h - pad * 2, 3)}" viewBox="${x0} ${y0} ${w} ${h}" preserveAspectRatio="xMidYMid meet">${hit.inner}</svg>`;
  } else if (!ctx.export) {
    const msg = hit?.error ? `Mermaid: ${hit.error}` : "Drawing the diagram…";
    out += `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="2.8" fill="${hit?.error ? "#b91c1c" : "#666"}">${esc(msg)}</text>`;
  }
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};

const MERMAID_TEMPLATES = [
  ["Flowchart", ITEM_TYPES.mermaid.defaults().code],
  ["Sequence", "sequenceDiagram\n  participant S as Surveyor\n  participant G as GeoLibre\n  S->>G: Upload Kobo data\n  G-->>S: Point distribution map"],
  ["Gantt", "gantt\n  title Work plan\n  dateFormat YYYY-MM-DD\n  section Field\n  Survey      :a1, 2026-01-05, 20d\n  section Analysis\n  Processing  :after a1, 15d\n  Map layout  :10d"],
  ["Pie", 'pie title Land cover\n  "Forest" : 45\n  "Plantation" : 30\n  "Settlement" : 15\n  "Other" : 10'],
  ["Mind map", "mindmap\n  root((Project))\n    Data\n      Vector\n      Raster\n    Analysis\n    Layout"],
  ["Timeline", "timeline\n  title Land cover change\n  2000 : Primary forest\n  2010 : Plantation clearing\n  2020 : Rehabilitation"],
  ["Class", "classDiagram\n  class Layer{\n    +name\n    +geometry\n    +draw()\n  }\n  Layer <|-- Raster\n  Layer <|-- Vector"],
  ["State", "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review\n  Review --> Final\n  Review --> Draft\n  Final --> [*]"],
];

// Code editor dialog for both items: live while typing.
function openCodeEditor(item) {
  closePopover();
  S.ui.root.querySelector(`.${NS}-modal.${NS}-codemodal`)?.remove();
  const p = item.props;
  const isHtml = item.type === "html";
  const overlay = el("div", { class: `${NS}-modal ${NS}-codemodal` });
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDlg, true);
  };
  const onKeyDlg = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener("keydown", onKeyDlg, true);
  const area = (key, rows, placeholder) => {
    const ta = el("textarea", { class: `${NS}-input ${NS}-code`, rows, spellcheck: "false", placeholder });
    ta.value = p[key] || "";
    ta.addEventListener("input", () => liveSet(item, `props.${key}`, ta.value, () => refreshCanvas()));
    ta.addEventListener("keydown", (e) => {
      // Tab types two spaces instead of leaving the editor
      if (e.key === "Tab") {
        e.preventDefault();
        insertAtCaret(ta, "  |");
        ta.dispatchEvent(new Event("input"));
      }
    });
    return ta;
  };
  const body = el("div", { class: `${NS}-dlgbody ${NS}-codebody` });
  if (isHtml) {
    body.append(
      el("div", { class: `${NS}-dlglabel` }, "HTML"), area("html", 12, "<h3>Title</h3><p>Text…</p>"),
      el("div", { class: `${NS}-dlglabel` }, "CSS (only applies inside this box)"), area("css", 5, "p { color: #333 }"),
      el("p", { class: `${NS}-muted` }, "Scripts, event handlers and outside files are removed. Pictures work as data: URLs. Variables such as {date} and {title} are replaced."),
    );
  } else {
    const tpl = el("div", { class: `${NS}-chips` }, el("span", { class: `${NS}-muted` }, "Templates:"), ...MERMAID_TEMPLATES.map(([n, code]) =>
      el("button", { type: "button", class: `${NS}-chip`, onclick: () => { commit(() => (p.code = code)); ta.value = code; } }, n)));
    const ta = area("code", 14, "flowchart LR\n  A --> B");
    body.append(tpl, ta, el("p", { class: `${NS}-muted` }, "Mermaid syntax: flowchart, sequenceDiagram, gantt, pie, mindmap, timeline, classDiagram, stateDiagram, erDiagram, journey, quadrantChart…"));
  }
  overlay.appendChild(el("div", { class: `${NS}-dlg ${NS}-codedlg`, role: "dialog", "aria-label": isHtml ? "Edit HTML" : "Edit Mermaid diagram" },
    el("div", { class: `${NS}-dlghead` }, el("div", { class: `${NS}-dlgtitle` }, isHtml ? "Edit HTML" : "Edit Mermaid diagram"), iconBtn("close", "Close (Esc)", close)),
    body,
    el("div", { class: `${NS}-dlgfoot` }, el("button", { type: "button", class: `${NS}-btn primary`, onclick: close }, "Done")),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
  body.querySelector("textarea")?.focus();
}

// Format tab groups for the two items
function codeItemRibbon(item) {
  const p = item.props;
  const rerender = () => {
    refreshCanvas();
    renderQuickBar();
  };
  const big = el("button", { type: "button", class: `${NS}-rbig`, title: "Edit the code (or double-click the item)", html: `${icon(item.type === "html" ? "code" : "flow", 18)}<span>${item.type === "html" ? "Edit HTML" : "Edit diagram"}</span>`, onclick: () => openCodeEditor(item) });
  const bg = el("button", { type: "button", class: `${NS}-qbtn`, title: "Background", html: `<span class="${NS}-cswatch" style="background:${p.background || "transparent"}"></span>` });
  bg.addEventListener("click", () => openColorWheel(bg, p.background || "#ffffff", (c) => liveSet(item, "props.background", c, rerender)));
  const noBg = el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt`, onclick: () => liveSet(item, "props.background", "", rerender) }, "No fill");
  const border = el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${p.border?.show ? "active" : ""}`, onclick: () => liveSet(item, "props.border.show", !p.border?.show, rerender) }, "Border");
  const groups = [el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrow ${NS}-rbigrow` }, big), el("div", { class: `${NS}-rcap` }, item.type === "html" ? "HTML" : "Mermaid"))];
  const extra = [];
  if (item.type === "mermaid") {
    const th = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Diagram theme" }, ...["neutral", "default", "forest", "base", "dark"].map((t) => el("option", { value: t, selected: (p.theme || "neutral") === t }, t[0].toUpperCase() + t.slice(1))));
    th.addEventListener("change", () => liveSet(item, "props.theme", th.value, rerender));
    extra.push(el("span", { class: `${NS}-qtag` }, "Theme"), th);
  } else {
    const fs = el("input", { type: "number", class: `${NS}-input ${NS}-qsize`, value: p.fontSize || 12, min: 4, step: 1, title: "Base text size (px)" });
    fs.addEventListener("change", () => liveSet(item, "props.fontSize", parseFloat(fs.value) || 12, rerender));
    extra.push(fontPicker(p.fontFamily || "Arial", (n) => liveSet(item, "props.fontFamily", n, rerender), { cls: `${NS}-qfam ${NS}-qfam-s` }), fs);
  }
  groups.push(ribbonGroup("Look", [...extra, bg, noBg, border]));
  return groups;
}
