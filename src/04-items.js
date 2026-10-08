// ---------------------------------------------------------------- item types
const DEFAULT_FONT = { family: "Arial", size: 9, bold: false, italic: false, color: "#111111", spacing: 0 };
const font = (o = {}) => ({ ...DEFAULT_FONT, ...o });

const ITEM_TYPES = {
  map: {
    label: "Map",
    icon: "map",
    size: [150, 110],
    defaults: () => ({
      source: "live",
      view: { center: [106.8, -6.2], zoom: 10, bearing: 0 },
      scaleLock: 0,
      basemap: "geolibre",
      background: "#ffffff",
      frame: { show: true, color: "#000000", width: 0.5 },
      frameShape: "rect",
      frameRadius: 4,
      frameImage: "",
      grid: {
        show: false,
        type: "dms",
        interval: 0,
        lang: "en",
        style: "lines",
        color: "#555555",
        width: 0.15,
        dash: "solid",
        opacity: 0.85,
        crossSize: 2.5,
        labels: { top: true, bottom: true, left: true, right: true },
        labelPos: "outside",
        rotateSide: true,
        gap: 1,
        font: font({ size: 6, color: "#222222" }),
        decimals: 2,
        frameStyle: "none",
        zebraWidth: 1.5,
        zebraColor: "#000000",
        tickLen: 2,
        zone: 0,
        utmUnit: "m",
      },
      overview: { source: "", color: "#e11d48", width: 0.6, fill: "#e11d48", fillOpacity: 0.12, marker: "rect" },
    }),
  },
  legend: {
    label: "Legend",
    icon: "list",
    size: [60, 50],
    defaults: () => ({
      title: "LEGEND",
      titleFont: font({ size: 10, bold: true }),
      titleAlign: "left",
      groupFont: font({ size: 7.5, bold: true }),
      itemFont: font({ size: 7.5 }),
      columns: 1,
      colGap: 5,
      rowGap: 1.4,
      patchW: 7,
      patchH: 4,
      padding: 3,
      background: "#ffffff",
      bgOpacity: 1,
      border: { show: false, color: "#333333", width: 0.3, radius: 0 },
      linkedMap: "",
      showGroups: true,
      autoSync: true,
      autoHeight: true,
      entries: [],
    }),
  },
  scalebar: {
    label: "Scale bar",
    icon: "scalebar",
    size: [70, 12],
    defaults: () => ({
      style: "single",
      units: "auto",
      segments: 4,
      leftSegments: 1,
      segmentValue: 0,
      barHeight: 2,
      color1: "#000000",
      color2: "#ffffff",
      lineWidth: 0.3,
      font: font({ size: 7 }),
      unitLabel: "",
      linkedMap: "",
      numericPrefix: "Scale ",
      dualUnit: "papercm",
      dualLabel: "",
      showNumeric: false,
      align: "left",
    }),
  },
  north: {
    label: "North Arrow",
    icon: "north",
    size: [16, 22],
    defaults: () => ({
      variant: "classic",
      color1: "#111111",
      color2: "#ffffff",
      label: "N",
      fontFamily: "Arial",
      rotateWithMap: true,
      linkedMap: "",
      rotation: 0,
    }),
  },
  text: {
    label: "Text",
    icon: "text",
    size: [60, 12],
    defaults: () => ({
      text: "New text",
      font: font({ size: 11 }),
      align: "left",
      valign: "middle",
      lineHeight: 1.2,
      padding: 1,
      background: "",
      bgOpacity: 1,
      border: { show: false, color: "#000000", width: 0.3, style: "solid", radius: 0 },
      textCase: "none",
      halo: false,
      haloColor: "#ffffff",
      haloWidth: 0.6,
      wrap: true,
    }),
  },
  image: {
    label: "Image / Logo",
    icon: "image",
    size: [25, 25],
    defaults: () => ({ src: "", fit: "contain", opacity: 1, border: { show: false, color: "#000000", width: 0.3, radius: 0 } }),
  },
  shape: {
    label: "Shape",
    icon: "shape",
    size: [40, 25],
    defaults: () => ({
      shape: "rect",
      fill: "#ffffff",
      fillOpacity: 1,
      stroke: "#000000",
      strokeWidth: 0.4,
      strokeStyle: "solid",
      radius: 3,
      shadow: false,
      fillType: "solid",
      fill2: "#cbd5e1",
      gradientAngle: 90,
      pattern: "/",
      patternColor: "#111111",
      patternSpacing: 2,
      patternWidth: 0.2,
      patternBg: false,
    }),
  },
  table: {
    label: "Table / Info box",
    icon: "table",
    size: [70, 30],
    defaults: () => ({
      rows: [
        ["Data source", "{source}"],
        ["Projection", "{projection}"],
        ["Prepared by", "{author}"],
        ["Date", "{date}"],
      ],
      header: false,
      colWidths: "35,65",
      font: font({ size: 7 }),
      headerFont: font({ size: 7.5, bold: true }),
      headerBg: "#e5e7eb",
      zebra: false,
      zebraColor: "#f3f4f6",
      borderColor: "#333333",
      borderWidth: 0.25,
      outerBorder: true,
      innerBorder: true,
      padding: 1.2,
      background: "#ffffff",
      align: "left",
    }),
  },
};

function newItem(type, x, y, extra = {}) {
  const def = ITEM_TYPES[type];
  const count = (S.doc?.items.filter((i) => i.type === type).length || 0) + 1;
  const item = {
    id: uid(type),
    type,
    name: `${def.label} ${count}`,
    x,
    y,
    w: def.size[0],
    h: def.size[1],
    rot: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    props: def.defaults(),
  };
  if (extra.props) item.props = deepMerge(item.props, extra.props);
  const { props, ...rest } = extra;
  Object.assign(item, rest);
  return item;
}

// The map an item (scale bar, north arrow, legend) follows: its explicit link,
// or the first map on the page.
function linkedMapOf(item) {
  const id = item.props.linkedMap;
  return (id && findItem(id)) || mapItems()[0] || null;
}

// A captured GeoLibre view fills the frame (cover); keep the frame's view in
// step with it so grids, scale bars and insets stay exact.
function syncSnapshotView(item) {
  const sn = item.props.snapshot;
  const W = item.w * PX96;
  const H = item.h * PX96;
  const k = Math.max(W / sn.cw, H / sn.ch);
  item.props.view = { center: [...sn.center], zoom: sn.zoom + Math.log2(k), bearing: sn.bearing || 0 };
  const iw = (sn.cw * k) / PX96;
  const ih = (sn.ch * k) / PX96;
  return { src: sn.src, w: iw, h: ih, x: (item.w - iw) / 2, y: (item.h - ih) / 2 };
}

// ---- text effects (Canva-style): shadow, lift, hollow, outline, highlight, neon
const TEXT_EFFECTS = { none: "None", shadow: "Shadow", lift: "Lift", hollow: "Hollow", outline: "Outline", highlight: "Highlight", neon: "Neon", echo: "Echo" };
function textEffect(item, lines, x, y0, lh, anchor) {
  const p = item.props;
  const e = p.effect || "none";
  const c = esc(p.effectColor || "#000000");
  const k = (p.effectStrength ?? 50) / 50; // 0..2
  const id = item.id.replace(/[^\w]/g, "");
  const f = p.font;
  const res = { defs: "", before: "", groupAttr: "", textAttr: "" };
  if (e === "shadow") {
    res.defs = `<defs><filter id="tfx-${id}" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="${round(0.35 * k, 3)}" dy="${round(0.35 * k, 3)}" stdDeviation="${round(0.25 * k, 3)}" flood-color="${c}" flood-opacity="0.55"/></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "lift") {
    res.defs = `<defs><filter id="tfx-${id}" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="${round(0.5 * k, 3)}" stdDeviation="${round(0.9 * k, 3)}" flood-color="#000000" flood-opacity="0.35"/></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "neon") {
    res.defs = `<defs><filter id="tfx-${id}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="${round(0.6 * k, 3)}" result="b"/><feFlood flood-color="${c}" flood-opacity="0.95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    res.groupAttr = ` filter="url(#tfx-${id})"`;
  } else if (e === "hollow") {
    res.textAttr = `fill="none" stroke="${esc(f.color)}" stroke-width="${round(0.12 * Math.max(k, 0.3) * (f.size / 10), 3)}"`;
  } else if (e === "outline") {
    res.textAttr = `stroke="${c}" stroke-width="${round(0.25 * Math.max(k, 0.3) * (f.size / 10), 3)}" paint-order="stroke" stroke-linejoin="round"`;
  } else if (e === "echo") {
    const dx = 0.45 * k;
    const dyy = 0.45 * k;
    res.before = `<text text-anchor="${anchor}" ${fontAttrs({ ...f, color: p.effectColor || "#999999" })} opacity="0.45">${lines.map((ln, i) => `<tspan x="${round(x + dx * 2, 3)}" y="${round(y0 + i * lh + dyy * 2, 3)}">${esc(ln)}</tspan>`).join("")}</text>` + `<text text-anchor="${anchor}" ${fontAttrs({ ...f, color: p.effectColor || "#999999" })} opacity="0.7">${lines.map((ln, i) => `<tspan x="${round(x + dx, 3)}" y="${round(y0 + i * lh + dyy, 3)}">${esc(ln)}</tspan>`).join("")}</text>`;
  } else if (e === "highlight") {
    const fh = f.size * PT;
    res.before = lines
      .map((ln, i) => {
        const w = textWidthMm(ln, f);
        if (!w) return "";
        const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
        const pad = fh * 0.18 * Math.max(k, 0.5);
        return `<rect x="${round(x0 - pad, 3)}" y="${round(y0 + i * lh - fh * 0.82 - pad / 2, 3)}" width="${round(w + pad * 2, 3)}" height="${round(fh * 1.05 + pad, 3)}" rx="${round(pad, 3)}" fill="${esc(p.effectColor || "#fde047")}"/>`;
      })
      .join("");
  }
  return res;
}

// ---- map frame shapes (circle, triangle, … or an image used as a mask)
const MAP_FRAME_SHAPES = [
  ["rect", "Rectangle"], ["rounded", "Rounded rectangle"], ["circle", "Circle / ellipse"], ["triangle", "Triangle"],
  ["diamond", "Diamond"], ["pentagon", "Pentagon"], ["hexagon", "Hexagon"], ["octagon", "Octagon"],
  ["star", "Star"], ["heart", "Heart"], ["shield", "Shield"], ["arch", "Arch"], ["image", "Image (mask)…"],
];
// SVG path of a map frame shape in a w × h box, or null for a plain rectangle.
function mapFramePath(p, w, h) {
  const s = p.frameShape || "rect";
  const r = clamp(p.frameRadius ?? 4, 0, Math.min(w, h) / 2);
  const R = (v) => round(v, 3);
  switch (s) {
    case "rounded":
      return `M${R(r)},0H${R(w - r)}A${R(r)},${R(r)} 0 0 1 ${R(w)},${R(r)}V${R(h - r)}A${R(r)},${R(r)} 0 0 1 ${R(w - r)},${R(h)}H${R(r)}A${R(r)},${R(r)} 0 0 1 0,${R(h - r)}V${R(r)}A${R(r)},${R(r)} 0 0 1 ${R(r)},0Z`;
    case "circle":
      return `M0,${R(h / 2)}A${R(w / 2)},${R(h / 2)} 0 1 0 ${R(w)},${R(h / 2)}A${R(w / 2)},${R(h / 2)} 0 1 0 0,${R(h / 2)}Z`;
    case "triangle":
      return `M${R(w / 2)},0L${R(w)},${R(h)}L0,${R(h)}Z`;
    case "diamond":
      return `M${R(w / 2)},0L${R(w)},${R(h / 2)}L${R(w / 2)},${R(h)}L0,${R(h / 2)}Z`;
    case "pentagon":
      return shapePath({ poly: 5 }, w, h);
    case "hexagon":
      return shapePath({ poly: 6 }, w, h);
    case "octagon":
      return shapePath({ poly: 8 }, w, h);
    case "star":
      return shapePath({ star: [5, 0.5] }, w, h);
    case "heart":
      return SHAPES.find((x) => x.id === "heart")?.d(w, h) || null;
    case "shield":
      return `M0,0H${R(w)}V${R(h * 0.45)}C${R(w)},${R(h * 0.75)} ${R(w * 0.75)},${R(h * 0.9)} ${R(w / 2)},${R(h)}C${R(w * 0.25)},${R(h * 0.9)} 0,${R(h * 0.75)} 0,${R(h * 0.45)}Z`;
    case "arch":
      return `M0,${R(h)}V${R(Math.min(w / 2, h))}A${R(w / 2)},${R(Math.min(w / 2, h))} 0 0 1 ${R(w)},${R(Math.min(w / 2, h))}V${R(h)}Z`;
    default:
      return null;
  }
}
function mapFrameIsImage(p) {
  return p.frameShape === "image" && !!p.frameImage;
}

// ---- image adjustments + masks
function imageMaskShape(item, r) {
  const p = item.props;
  const m = p.mask || "none";
  const { w, h } = item;
  if (m === "circle") return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (m === "hexagon") return `<path d="${shapePath({ poly: 6 }, w, h)}"/>`;
  if (m === "star") return `<path d="${shapePath({ star: [5, 0.45] }, w, h)}"/>`;
  if (m === "heart") return `<path d="${SHAPES.find((x) => x.id === "heart").d(w, h)}"/>`;
  if (m === "blob") return `<path d="M${w * 0.5},0C${w * 0.85},0 ${w},${h * 0.2} ${w},${h * 0.5}S${w * 0.8},${h} ${w * 0.45},${h}S0,${h * 0.75} 0,${h * 0.45}S${w * 0.2},0 ${w * 0.5},0Z"/>`;
  return `<rect width="${w}" height="${h}" rx="${r}"/>`;
}
function imageFilter(item) {
  const a = item.props.adjust || {};
  const b = (a.brightness || 0) / 100;
  const c = 1 + (a.contrast || 0) / 100;
  const sat = Math.max(0, 1 + (a.saturation || 0) / 100) * (1 - (a.grayscale || 0) / 100);
  const hue = a.hue || 0;
  const blur = a.blur || 0;
  const sepia = (a.sepia || 0) / 100;
  if (!b && c === 1 && sat === 1 && !hue && !blur && !sepia) return { defs: "", attr: "" };
  const id = `imf-${item.id.replace(/[^\w]/g, "")}`;
  const slope = round(c, 4);
  const icept = round(-(0.5 * c) + 0.5 + b, 4);
  const sepiaM = sepia
    ? `<feColorMatrix type="matrix" values="${[0.393 + 0.607 * (1 - sepia), 0.769 - 0.769 * (1 - sepia), 0.189 - 0.189 * (1 - sepia), 0, 0, 0.349 - 0.349 * (1 - sepia), 0.686 + 0.314 * (1 - sepia), 0.168 - 0.168 * (1 - sepia), 0, 0, 0.272 - 0.272 * (1 - sepia), 0.534 - 0.534 * (1 - sepia), 0.131 + 0.869 * (1 - sepia), 0, 0, 0, 0, 0, 1, 0].map((v) => round(v, 4)).join(" ")}"/>`
    : "";
  return {
    defs:
      `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
      `<feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${icept}"/><feFuncG type="linear" slope="${slope}" intercept="${icept}"/><feFuncB type="linear" slope="${slope}" intercept="${icept}"/></feComponentTransfer>` +
      `<feColorMatrix type="saturate" values="${round(sat, 4)}"/>` +
      (hue ? `<feColorMatrix type="hueRotate" values="${hue}"/>` : "") +
      sepiaM +
      (blur ? `<feGaussianBlur stdDeviation="${round(blur, 3)}"/>` : "") +
      `</filter>`,
    attr: ` filter="url(#${id})"`,
  };
}

// ---------------------------------------------------------------- SVG renderers
// renderItem(item, ctx) -> SVG markup in item-local mm (0..w, 0..h).
// ctx = { export: bool, mapImages: Map(itemId -> dataURL) }
function renderItem(item, ctx = {}) {
  const fn = RENDERERS[item.type];
  if (!fn) return "";
  try {
    return glassUnderlay(item) + fn(item, ctx);
  } catch (e) {
    console.error("[Layout Composer] render", item.type, e);
    return `<rect width="${item.w}" height="${item.h}" fill="#fee2e2"/><text x="2" y="5" font-size="3" fill="#b91c1c">Error: ${esc(e.message)}</text>`;
  }
}

function strokeAttrs(color, width, style) {
  const d = dashArray(style, width);
  return `stroke="${esc(color)}" stroke-width="${width}"${d ? ` stroke-dasharray="${d}"` : ""}`;
}

const RENDERERS = {
  // ---------------------------------------------------- map
  map(item, ctx) {
    const p = item.props;
    const { w, h } = item;
    const clipId = `clip-${item.id}`;
    const shapeD = mapFramePath(p, w, h);
    const imgMask = mapFrameIsImage(p);
    const clipShape = shapeD ? `<path d="${shapeD}"/>` : `<rect width="${w}" height="${h}"/>`;
    let out = `<defs><clipPath id="${clipId}">${clipShape}</clipPath>`;
    if (imgMask) out += `<mask id="mk-${item.id}" mask-type="alpha" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><image href="${esc(p.frameImage)}" width="${w}" height="${h}" preserveAspectRatio="none"/></mask>`;
    out += `</defs>`;
    const snap = p.source === "snapshot" && p.snapshot?.src ? syncSnapshotView(item) : null;
    out += imgMask ? `<g mask="url(#mk-${item.id})">` : `<g clip-path="url(#${clipId})">`;
    if (ctx.export || snap) out += `<rect width="${w}" height="${h}" fill="${esc(p.background || "#fff")}"/>`;
    if (snap) {
      out += `<image href="${snap.src}" x="${round(snap.x, 3)}" y="${round(snap.y, 3)}" width="${round(snap.w, 3)}" height="${round(snap.h, 3)}" preserveAspectRatio="none"/>`;
    } else if (ctx.export) {
      const img = ctx.mapImages?.get(item.id);
      if (img) out += `<image href="${img}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
    }
    // overview / locator rectangles of other maps
    if (p.overview?.source) {
      const src = findItem(p.overview.source);
      if (src && src.type === "map") out += renderOverview(item, src, p.overview);
    }
    if (p.grid?.show && p.grid.style !== "none") out += renderGridLines(item);
    out += `</g>`;
    if (p.grid?.show && !shapeD && !imgMask) out += renderGridFrame(item);
    if (p.frame?.show && !imgMask) {
      out += shapeD
        ? `<path d="${shapeD}" fill="none" stroke="${esc(p.frame.color)}" stroke-width="${p.frame.width}" stroke-linejoin="round"/>`
        : `<rect width="${w}" height="${h}" fill="none" stroke="${esc(p.frame.color)}" stroke-width="${p.frame.width}"/>`;
    }
    return out;
  },

  // ---------------------------------------------------- legend
  legend(item) {
    const lay = layoutLegend(item);
    S.legendCache.set(item.id, lay.height);
    const p = item.props;
    if (p.autoHeight && Math.abs(item.h - lay.height) > 0.2) item.h = round(lay.height, 2);
    let out = "";
    if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
    out += lay.svg;
    if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
    return out;
  },

  // ---------------------------------------------------- scale bar
  scalebar(item, ctx) {
    const p = item.props;
    const map = linkedMapOf(item);
    if (!map) return ctx.export ? "" : placeholder(item, "Add a map first");
    const scale = mapScale(map);
    const f = p.font;
    const fh = f.size * PT;
    if (p.style === "numeric") {
      const txt = `${p.numericPrefix || ""}1 : ${fmtNumber(scale)}`;
      const x = p.align === "center" ? item.w / 2 : p.align === "right" ? item.w : 0;
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      return `<text x="${x}" y="${item.h / 2}" text-anchor="${anchor}" dominant-baseline="central" ${fontAttrs(f)}>${esc(txt)}</text>`;
    }
    if (p.style === "dual") return renderDualScalebar(item, p, map);
    const mPerMm = metersPerMm(map);
    const segs = Math.max(1, Math.round(p.segments));
    const left = p.leftSegments ? 1 : 0;
    // leave room for the last label + unit text
    const reserve = textWidthMm("00000 km", f) * 0.75;
    const avail = Math.max(5, item.w - reserve);
    let unit = p.units === "m" ? 1 : p.units === "km" ? 1000 : 0;
    let segVal = p.segmentValue > 0 ? p.segmentValue : 0;
    if (!segVal) {
      const rawM = (avail * mPerMm) / (segs + left);
      if (!unit) unit = rawM >= 500 ? 1000 : 1;
      segVal = niceFloor(rawM / unit);
    } else if (!unit) unit = segVal * 1 >= 1000 ? 1000 : 1;
    const unitTxt = p.unitLabel || (unit === 1000 ? "km" : "m");
    const segLen = (segVal * unit) / mPerMm;
    const x0 = left ? segLen : 0;
    const bh = p.barHeight;
    const lw = p.lineWidth;
    const c1 = esc(p.color1);
    const c2 = esc(p.color2);
    const labelAbove = ["line-down"].includes(p.style);
    const barY = labelAbove ? fh + 1.2 : 0.4;
    const labelY = labelAbove ? fh * 0.8 : barY + bh + 1 + fh * 0.8;
    let out = "";
    const lbl = (x, v, anchor = "middle") =>
      `<text x="${round(x, 3)}" y="${round(labelY, 3)}" text-anchor="${anchor}" ${fontAttrs(f)}>${esc(v)}</text>`;
    const fmtV = (v) => fmtNumber(v, v % 1 ? (v * 10) % 1 ? 2 : 1 : 0);
    const total = segs + left;
    const boxes = (y, height, invert = false) => {
      let s = "";
      // left (subdivided) segment
      if (left) {
        const sub = 4;
        for (let i = 0; i < sub; i++) {
          const fill = (i % 2 === 0) !== invert ? c1 : c2;
          s += `<rect x="${round((segLen / sub) * i, 3)}" y="${y}" width="${round(segLen / sub, 3)}" height="${height}" fill="${fill}" stroke="${c1}" stroke-width="${lw}"/>`;
        }
      }
      for (let i = 0; i < segs; i++) {
        const fill = (i % 2 === 0) !== invert ? c1 : c2;
        s += `<rect x="${round(x0 + segLen * i, 3)}" y="${y}" width="${round(segLen, 3)}" height="${height}" fill="${fill}" stroke="${c1}" stroke-width="${lw}"/>`;
      }
      return s;
    };
    switch (p.style) {
      case "double":
        out += boxes(barY, bh / 2) + boxes(barY + bh / 2, bh / 2, true);
        break;
      case "hollow":
        out += `<rect x="0" y="${barY}" width="${round(segLen * total, 3)}" height="${bh}" fill="${c2}" stroke="${c1}" stroke-width="${lw}"/>`;
        for (let i = 0; i < segs; i++) {
          if (i % 2 === 0) out += `<rect x="${round(x0 + segLen * i, 3)}" y="${barY + bh * 0.3}" width="${round(segLen, 3)}" height="${bh * 0.4}" fill="${c1}"/>`;
        }
        if (left) out += `<rect x="0" y="${barY + bh * 0.3}" width="${round(segLen / 2, 3)}" height="${bh * 0.4}" fill="${c1}"/>`;
        break;
      case "line-up":
      case "line-down":
      case "line-mid":
      case "ruler": {
        const yLine = p.style === "line-up" ? barY + bh : p.style === "line-down" ? barY : barY + bh / 2;
        out += `<line x1="0" y1="${yLine}" x2="${round(segLen * total, 3)}" y2="${yLine}" stroke="${c1}" stroke-width="${lw * 1.6}"/>`;
        const ticks = [];
        if (left) for (let i = 0; i < 4; i++) ticks.push([(segLen / 4) * i, 0.6]);
        for (let i = 0; i <= segs; i++) ticks.push([x0 + segLen * i, 1]);
        if (p.style === "ruler") {
          for (let i = 0; i < segs; i++) for (let k = 1; k < 10; k++) ticks.push([x0 + segLen * i + (segLen / 10) * k, k === 5 ? 0.65 : 0.4]);
        }
        for (const [x, t] of ticks) {
          let y1 = barY;
          let y2 = barY + bh;
          if (p.style === "line-up") y1 = barY + bh - bh * t;
          else if (p.style === "line-down") y2 = barY + bh * t;
          else if (p.style === "ruler") {
            y1 = barY;
            y2 = barY + bh * t;
          } else {
            y1 = barY + bh / 2 - (bh / 2) * t;
            y2 = barY + bh / 2 + (bh / 2) * t;
          }
          out += `<line x1="${round(x, 3)}" y1="${round(y1, 3)}" x2="${round(x, 3)}" y2="${round(y2, 3)}" stroke="${c1}" stroke-width="${lw * 1.4}"/>`;
        }
        if (p.style === "ruler") out += `<rect x="0" y="${barY}" width="${round(segLen * total, 3)}" height="${bh}" fill="none" stroke="${c1}" stroke-width="${lw}"/>`;
        break;
      }
      case "stepped": {
        let d = `M0,${barY + bh}`;
        for (let i = 0; i < total; i++) {
          const y = i % 2 === 0 ? barY + bh : barY;
          const x1 = segLen * i;
          d += `L${round(x1, 3)},${y}L${round(x1 + segLen, 3)},${y}`;
          if (i < total - 1) d += `L${round(x1 + segLen, 3)},${i % 2 === 0 ? barY : barY + bh}`;
        }
        out += `<path d="${d}" fill="none" stroke="${c1}" stroke-width="${lw * 2}"/>`;
        break;
      }
      case "alt-line": {
        for (let i = 0; i < total; i++) {
          const col = i % 2 === 0 ? c1 : c2;
          out += `<line x1="${round(segLen * i, 3)}" y1="${barY + bh / 2}" x2="${round(segLen * (i + 1), 3)}" y2="${barY + bh / 2}" stroke="${col}" stroke-width="${bh * 0.7}"/>`;
        }
        out += `<rect x="0" y="${barY + bh * 0.15}" width="${round(segLen * total, 3)}" height="${bh * 0.7}" fill="none" stroke="${c1}" stroke-width="${lw}"/>`;
        break;
      }
      default:
        out += boxes(barY, bh);
    }
    if (left) out += lbl(0, fmtV(segVal));
    for (let i = 0; i <= segs; i++) {
      const v = segVal * i;
      const isLast = i === segs;
      out += lbl(x0 + segLen * i, fmtV(v));
      if (isLast) {
        const tw = textWidthMm(fmtV(v), f);
        out += `<text x="${round(x0 + segLen * i + tw / 2 + 1, 3)}" y="${round(labelY, 3)}" text-anchor="start" ${fontAttrs(f)}>${esc(unitTxt)}</text>`;
      }
    }
    if (p.showNumeric) {
      const ny = Math.max(labelY, barY + bh) + fh * 1.3;
      out += `<text x="${round((segLen * total) / 2, 3)}" y="${round(ny, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(`${p.numericPrefix || ""}1 : ${fmtNumber(scale)}`)}</text>`;
    }
    return out;
  },

  // ---------------------------------------------------- north arrow
  north(item) {
    const p = item.props;
    const variant = NORTH_ARROWS.find((v) => v.id === p.variant) || NORTH_ARROWS[0];
    let rot = p.rotation || 0;
    if (p.rotateWithMap) {
      const map = linkedMapOf(item);
      if (map) rot -= map.props.view.bearing || 0;
    }
    return (
      `<svg x="0" y="0" width="${item.w}" height="${item.h}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
      `<g transform="rotate(${round(rot, 2)} 50 50)">${variant.svg(esc(p.color1), esc(p.color2), p.label, p.fontFamily || "Arial")}</g></svg>`
    );
  },

  // ---------------------------------------------------- text
  text(item) {
    const p = item.props;
    const f = p.font;
    const pad = p.padding || 0;
    let out = "";
    const r = p.border?.radius || 0;
    if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${r}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
    const content = applyCase(resolveVars(p.text, item), p.textCase);
    const lines = hasMath(content) ? content.split("\n") : wrapText(content, f, p.wrap ? item.w - pad * 2 : 0);
    const lh = f.size * PT * (p.lineHeight || 1.2);
    const blockH = lh * lines.length;
    const asc = f.size * PT * 0.8;
    let y0 = pad + asc + (lh - f.size * PT) / 2;
    if (p.valign === "middle") y0 = (item.h - blockH) / 2 + asc + (lh - f.size * PT) / 2;
    if (p.valign === "bottom") y0 = item.h - pad - blockH + asc + (lh - f.size * PT) / 2;
    const x = p.align === "center" ? item.w / 2 : p.align === "right" ? item.w - pad : pad;
    const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
    const tfx = textEffect(item, lines, x, y0, lh, anchor);
    out += tfx.defs + tfx.before + `<g${tfx.groupAttr}>`;
    if (hasMath(content)) {
      // $...$ math: one MathJax line per text line (no automatic wrapping)
      content.split("\n").forEach((ln, i) => {
        out += richLine(ln, x, y0 + i * lh, f, anchor, tfx.textAttr || haloAttrs({ ...p, halo: p.halo })).svg;
      });
    } else {
      const deco = p.decoration && p.decoration !== "none" ? ` text-decoration="${p.decoration}"` : "";
      out += `<text text-anchor="${anchor}" ${fontAttrs(f)}${deco} ${tfx.textAttr || haloAttrs({ ...p, halo: p.halo })}>`;
      lines.forEach((ln, i) => {
        out += `<tspan x="${round(x, 3)}" y="${round(y0 + i * lh, 3)}">${esc(ln) || " "}</tspan>`;
      });
      out += `</text>`;
    }
    out += `</g>`;
    if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${r}" fill="none" ${strokeAttrs(p.border.color, p.border.width, p.border.style)}/>`;
    return out;
  },

  // ---------------------------------------------------- image
  image(item, ctx) {
    const p = item.props;
    if (!p.src) return ctx.export ? "" : placeholder(item, "Double-click to choose a logo");
    const par = p.fit === "cover" ? "xMidYMid slice" : p.fit === "fill" ? "none" : "xMidYMid meet";
    const r = p.border?.radius || 0;
    const clipId = `imgclip-${item.id}`;
    const mask = imageMaskShape(item, r);
    const filt = imageFilter(item);
    let out = `<defs><clipPath id="${clipId}">${mask}</clipPath>${filt.defs}</defs>`;
    out += `<image href="${esc(p.src)}" width="${item.w}" height="${item.h}" preserveAspectRatio="${par}" opacity="${p.opacity ?? 1}" clip-path="url(#${clipId})"${filt.attr}/>`;
    if (p.border?.show) out += mask.replace("/>", ` fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`);
    return out;
  },

  // ---------------------------------------------------- shape
  shape(item) {
    const p = item.props;
    const shape = SHAPES.find((s) => s.id === p.shape) || SHAPES[0];
    const { w, h } = item;
    const sw = p.strokeWidth || 0;
    const stroke = sw > 0 ? strokeAttrs(p.stroke, sw, p.strokeStyle) : `stroke="none"`;
    const paint = fillPaint(item, p);
    const fill = paint.attr;
    let out = paint.defs ? `<defs>${paint.defs}</defs>` : "";
    if (p.shadow) out += `<defs><filter id="sh-${item.id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.8" dy="0.8" stdDeviation="0.8" flood-opacity="0.35"/></filter></defs>`;
    const filt = p.shadow ? ` filter="url(#sh-${item.id})"` : "";
    if (shape.line) {
      let x1 = 0;
      let y1 = h / 2;
      let x2 = w;
      let y2 = h / 2;
      if (shape.line === "v") [x1, y1, x2, y2] = [w / 2, 0, w / 2, h];
      if (shape.line === "d") [x1, y1, x2, y2] = [0, h, w, 0];
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${strokeAttrs(p.stroke, Math.max(sw, 0.1), p.strokeStyle)} stroke-linecap="round"${filt}/>`;
      if (shape.line === "arrow") {
        const a = Math.max(sw * 4, 2);
        out += `<polygon points="${w},${h / 2} ${w - a * 1.4},${h / 2 - a / 2} ${w - a * 1.4},${h / 2 + a / 2}" fill="${esc(p.stroke)}"/>`;
      }
      return out;
    }
    if (shape.ellipse) return out + `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${fill} ${stroke}${filt}/>`;
    if (shape.rounded) return out + `<rect width="${w}" height="${h}" rx="${p.radius || 0}" ${fill} ${stroke}${filt}/>`;
    return out + `<path d="${shapePath(shape, w, h)}" ${fill} ${stroke} stroke-linejoin="round"${filt}/>`;
  },

  // ---------------------------------------------------- table
  table(item, ctx) {
    const p = item.props;
    const rows = (p.rows || []).filter((r) => Array.isArray(r));
    if (!rows.length) return ctx.export ? "" : placeholder(item, "Empty table");
    const nCols = Math.max(...rows.map((r) => r.length));
    let widths = String(p.colWidths || "")
      .split(",")
      .map((v) => parseFloat(v))
      .filter((v) => v > 0);
    while (widths.length < nCols) widths.push(widths.length ? widths[widths.length - 1] : 1);
    widths = widths.slice(0, nCols);
    const sum = widths.reduce((a, b) => a + b, 0);
    const colW = widths.map((v) => (v / sum) * item.w);
    const pad = p.padding;
    // row heights from wrapped text
    const rowsLaid = rows.map((r, ri) => {
      const f = p.header && ri === 0 ? p.headerFont : p.font;
      const cells = colW.map((cw, ci) => wrapText(resolveVars(r[ci] ?? "", item), f, cw - pad * 2));
      const lh = f.size * PT * 1.25;
      const height = Math.max(...cells.map((c) => c.length)) * lh + pad * 2;
      return { cells, f, lh, height };
    });
    const natural = rowsLaid.reduce((a, r) => a + r.height, 0);
    const stretch = natural < item.h ? item.h / natural : 1;
    let out = p.background ? `<rect width="${item.w}" height="${item.h}" fill="${esc(p.background)}"/>` : "";
    let y = 0;
    rowsLaid.forEach((row, ri) => {
      const rh = row.height * stretch;
      if (p.header && ri === 0 && p.headerBg) out += `<rect x="0" y="${round(y, 3)}" width="${item.w}" height="${round(rh, 3)}" fill="${esc(p.headerBg)}"/>`;
      else if (p.zebra && ri % 2 === (p.header ? 0 : 1)) out += `<rect x="0" y="${round(y, 3)}" width="${item.w}" height="${round(rh, 3)}" fill="${esc(p.zebraColor)}"/>`;
      let x = 0;
      row.cells.forEach((lines, ci) => {
        const cw = colW[ci];
        const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
        const tx = p.align === "center" ? x + cw / 2 : p.align === "right" ? x + cw - pad : x + pad;
        const textH = lines.length * row.lh;
        const ty = y + (rh - textH) / 2 + row.f.size * PT * 0.85;
        out += `<text text-anchor="${anchor}" ${fontAttrs(row.f)}>`;
        lines.forEach((ln, li) => (out += `<tspan x="${round(tx, 3)}" y="${round(ty + li * row.lh, 3)}">${esc(ln) || " "}</tspan>`));
        out += `</text>`;
        if (p.innerBorder && ci > 0) out += `<line x1="${round(x, 3)}" y1="${round(y, 3)}" x2="${round(x, 3)}" y2="${round(y + rh, 3)}" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth}"/>`;
        x += cw;
      });
      if (p.innerBorder && ri > 0) out += `<line x1="0" y1="${round(y, 3)}" x2="${item.w}" y2="${round(y, 3)}" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth}"/>`;
      y += rh;
    });
    if (p.outerBorder) out += `<rect width="${item.w}" height="${round(Math.max(y, item.h), 3)}" fill="none" stroke="${esc(p.borderColor)}" stroke-width="${p.borderWidth * 1.6}"/>`;
    S.legendCache.set(item.id, natural);
    return out;
  },
};

function niceFloor(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const n = f >= 5 ? 5 : f >= 2.5 ? 2.5 : f >= 2 ? 2 : 1;
  return n * p;
}

function placeholder(item, msg) {
  return (
    `<rect width="${item.w}" height="${item.h}" fill="#f3f4f6" stroke="#9ca3af" stroke-width="0.3" stroke-dasharray="1.5 1"/>` +
    `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="${round(clamp(Math.min(item.h / 4, (item.w * 0.9) / (msg.length * 0.52)), 0.8, 4), 3)}" fill="#6b7280">${esc(msg)}</text>`
  );
}

// ---------------------------------------------------- map overlays
function renderOverview(item, src, ov) {
  const geomSrc = mapGeom(src);
  const geom = mapGeom(item);
  const pts = [];
  const N = 6;
  for (let i = 0; i < N; i++) pts.push(geomSrc.unproject((src.w * i) / N, 0));
  for (let i = 0; i < N; i++) pts.push(geomSrc.unproject(src.w, (src.h * i) / N));
  for (let i = N; i > 0; i--) pts.push(geomSrc.unproject((src.w * i) / N, src.h));
  for (let i = N; i > 0; i--) pts.push(geomSrc.unproject(0, (src.h * i) / N));
  const proj = pts.map(([lng, lat]) => geom.project(lng, lat));
  const xs = proj.map((p) => p[0]);
  const ys = proj.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  // Too small to see as a box: draw a marker instead.
  if (ov.marker === "point" || (ov.marker === "rect" && Math.max(bw, bh) < 1.2)) {
    return (
      `<circle cx="${round(cx, 3)}" cy="${round(cy, 3)}" r="1.6" fill="${esc(ov.fill)}" fill-opacity="${Math.max(ov.fillOpacity, 0.6)}" stroke="${esc(ov.color)}" stroke-width="${ov.width}"/>` +
      `<circle cx="${round(cx, 3)}" cy="${round(cy, 3)}" r="3.2" fill="none" stroke="${esc(ov.color)}" stroke-width="${ov.width * 0.7}"/>`
    );
  }
  if (ov.marker === "cross") {
    return (
      `<line x1="${round(cx, 3)}" y1="0" x2="${round(cx, 3)}" y2="${item.h}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-dasharray="1.5 1"/>` +
      `<line x1="0" y1="${round(cy, 3)}" x2="${item.w}" y2="${round(cy, 3)}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-dasharray="1.5 1"/>` +
      `<polygon points="${proj.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" fill="${esc(ov.fill)}" fill-opacity="${ov.fillOpacity}" stroke="${esc(ov.color)}" stroke-width="${ov.width}"/>`
    );
  }
  return `<polygon points="${proj.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" fill="${esc(ov.fill)}" fill-opacity="${ov.fillOpacity}" stroke="${esc(ov.color)}" stroke-width="${ov.width}" stroke-linejoin="round"/>`;
}

function gridLabel(g, line, utm) {
  if (utm) {
    const km = g.utmUnit === "km";
    const u = km ? "km" : "m";
    const suf = g.lang === "id" ? (line.axis === "x" ? ` ${u}T` : ` ${u}U`) : line.axis === "x" ? ` ${u}E` : ` ${u}N`;
    return `${km ? round(line.value / 1000, 3) : Math.round(line.value)}${suf}`;
  }
  return fmtCoord(line.value, line.axis, g.type, g.lang, g.decimals);
}

function renderGridLines(item) {
  const g = item.props.grid;
  const { lines } = computeGrid(item);
  const st = `stroke="${esc(g.color)}" stroke-width="${g.width}" stroke-opacity="${g.opacity}"${g.dash !== "solid" ? ` stroke-dasharray="${dashArray(g.dash, g.width)}"` : ""} fill="none"`;
  let out = "";
  if (g.style === "lines") {
    for (const ln of lines) out += `<polyline points="${ln.pts.map((p) => `${round(p[0], 3)},${round(p[1], 3)}`).join(" ")}" ${st}/>`;
  } else if (g.style === "cross" || g.style === "dots") {
    // intersections: approximate by intersecting x-lines and y-lines segment-wise
    const xs = lines.filter((l) => l.axis === "x");
    const ys = lines.filter((l) => l.axis === "y");
    const c = g.crossSize / 2;
    for (const a of xs)
      for (const b of ys) {
        const p = polyIntersect(a.pts, b.pts);
        if (!p || p[0] < 0 || p[1] < 0 || p[0] > item.w || p[1] > item.h) continue;
        if (g.style === "dots") out += `<circle cx="${round(p[0], 3)}" cy="${round(p[1], 3)}" r="${g.width * 2}" fill="${esc(g.color)}" fill-opacity="${g.opacity}"/>`;
        else out += `<path d="M${round(p[0] - c, 3)},${round(p[1], 3)}h${2 * c}M${round(p[0], 3)},${round(p[1] - c, 3)}v${2 * c}" ${st}/>`;
      }
  }
  return out;
}
function segIntersect(a, b, c, d) {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  const u = -((a[0] - b[0]) * (a[1] - c[1]) - (a[1] - b[1]) * (a[0] - c[0])) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
function polyIntersect(p1, p2) {
  for (let i = 0; i < p1.length - 1; i++) for (let j = 0; j < p2.length - 1; j++) {
    const r = segIntersect(p1[i], p1[i + 1], p2[j], p2[j + 1]);
    if (r) return r;
  }
  return null;
}

function renderGridFrame(item) {
  const g = item.props.grid;
  const { lines, utm } = computeGrid(item);
  const { w, h } = item;
  const rotated = Math.abs(item.props.view.bearing || 0) > 0.01;
  const f = g.font;
  const fh = f.size * PT;
  let out = "";
  const zw = g.frameStyle === "zebra" ? g.zebraWidth : 0;
  const crossingsByEdge = { top: [], bottom: [], left: [], right: [] };
  for (const ln of lines) {
    for (const c of edgeCrossings(ln.pts, w, h)) {
      const ok = rotated || ((c.edge === "top" || c.edge === "bottom") ? ln.axis === "x" : ln.axis === "y");
      if (ok) crossingsByEdge[c.edge].push({ ...c, line: ln });
    }
  }
  // zebra border
  if (g.frameStyle === "zebra") {
    const zc = esc(g.zebraColor);
    for (const edge of ["top", "bottom", "left", "right"]) {
      const horiz = edge === "top" || edge === "bottom";
      const len = horiz ? w : h;
      const stops = [0, ...crossingsByEdge[edge].map((c) => (horiz ? c.x : c.y)).sort((a, b) => a - b), len];
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        const fill = i % 2 === 0 ? zc : "#ffffff";
        if (edge === "top") out += `<rect x="${round(a, 3)}" y="${-zw}" width="${round(b - a, 3)}" height="${zw}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "bottom") out += `<rect x="${round(a, 3)}" y="${h}" width="${round(b - a, 3)}" height="${zw}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "left") out += `<rect x="${-zw}" y="${round(a, 3)}" width="${zw}" height="${round(b - a, 3)}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
        if (edge === "right") out += `<rect x="${w}" y="${round(a, 3)}" width="${zw}" height="${round(b - a, 3)}" fill="${fill}" stroke="${zc}" stroke-width="0.15"/>`;
      }
    }
    for (const [x, y] of [[-zw, -zw], [w, -zw], [-zw, h], [w, h]]) out += `<rect x="${x}" y="${y}" width="${zw}" height="${zw}" fill="${zc}"/>`;
  }
  // tick marks
  if (g.frameStyle === "ticks-in" || g.frameStyle === "ticks-out" || g.frameStyle === "ticks-cross") {
    const t = g.tickLen;
    for (const edge of Object.keys(crossingsByEdge)) {
      for (const c of crossingsByEdge[edge]) {
        let inn = g.frameStyle !== "ticks-out" ? t : 0;
        let outw = g.frameStyle !== "ticks-in" ? t : 0;
        let d = "";
        if (edge === "top") d = `M${c.x},${-outw}V${inn}`;
        if (edge === "bottom") d = `M${c.x},${h - inn}V${h + outw}`;
        if (edge === "left") d = `M${-outw},${c.y}H${inn}`;
        if (edge === "right") d = `M${w - inn},${c.y}H${w + outw}`;
        out += `<path d="${d}" stroke="${esc(g.color)}" stroke-width="${Math.max(g.width * 1.5, 0.2)}"/>`;
      }
    }
  }
  // labels
  const gap = g.gap + zw + (g.frameStyle === "ticks-out" || g.frameStyle === "ticks-cross" ? g.tickLen : 0);
  const inside = g.labelPos === "inside";
  const fa = `${fontAttrs(f)}${inside ? ` stroke="#ffffff" stroke-width="0.5" paint-order="stroke"` : ""}`;
  for (const edge of Object.keys(crossingsByEdge)) {
    if (!g.labels?.[edge]) continue;
    for (const c of crossingsByEdge[edge]) {
      const txt = esc(gridLabel(g, c.line, utm));
      const tw = textWidthMm(txt, f);
      if (edge === "top" || edge === "bottom") {
        if (c.x < tw / 2 - 0.5 || c.x > w - tw / 2 + 0.5) continue;
        const y = edge === "top" ? (inside ? gap + fh * 0.8 : -gap) : inside ? h - gap : h + gap + fh * 0.8;
        out += `<text x="${round(c.x, 3)}" y="${round(y, 3)}" text-anchor="middle" ${fa}>${txt}</text>`;
      } else {
        const vert = g.rotateSide;
        if (vert && (c.y < tw / 2 - 0.5 || c.y > h - tw / 2 + 0.5)) continue;
        if (!vert && (c.y < fh / 2 || c.y > h - fh / 2)) continue;
        if (vert) {
          const x = edge === "left" ? (inside ? gap + fh * 0.8 : -gap) : inside ? w - gap : w + gap + fh * 0.8;
          const ang = -90;
          out += `<text transform="translate(${round(x, 3)} ${round(c.y, 3)}) rotate(${ang})" text-anchor="middle" ${fa}>${txt}</text>`;
        } else {
          const x = edge === "left" ? (inside ? gap : -gap) : inside ? w - gap : w + gap;
          const anchor = (edge === "left") !== inside ? "end" : "start";
          out += `<text x="${round(x, 3)}" y="${round(c.y, 3)}" text-anchor="${anchor}" dominant-baseline="central" ${fa}>${txt}</text>`;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------- legend layout
function legendPatch(patch, x, y, pw, ph) {
  if (!patch) return "";
  const P = (v) => round(v, 3);
  switch (patch.type) {
    case "line": {
      const sw = clamp(patch.strokeWidth ?? 0.6, 0.2, ph);
      const d = patch.dash ? ` stroke-dasharray="${dashArray(patch.dash, sw)}"` : "";
      return `<line x1="${P(x)}" y1="${P(y + ph / 2)}" x2="${P(x + pw)}" y2="${P(y + ph / 2)}" stroke="${esc(patch.stroke)}" stroke-width="${sw}"${d} stroke-linecap="round"/>`;
    }
    case "point": {
      const r = clamp(patch.radius ?? ph / 3, 0.6, ph / 2);
      return `<circle cx="${P(x + pw / 2)}" cy="${P(y + ph / 2)}" r="${P(r)}" fill="${esc(patch.fill)}" fill-opacity="${patch.fillOpacity ?? 1}" stroke="${esc(patch.stroke || "none")}" stroke-width="${patch.strokeWidth ?? 0.2}"/>`;
    }
    case "gradient": {
      const id = `lg${Math.random().toString(36).slice(2, 8)}`;
      const stops = (patch.colors || []).map((c, i, a) => `<stop offset="${a.length > 1 ? i / (a.length - 1) : 0}" stop-color="${esc(c)}"/>`).join("");
      return `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="url(#${id})" stroke="#666" stroke-width="0.15"/>`;
    }
    case "tile": {
      const src = tileThumb(patch.url);
      const id = `lt${Math.random().toString(36).slice(2, 8)}`;
      if (src) {
        return `<defs><clipPath id="${id}"><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}"/></clipPath></defs><image href="${src}" x="${P(x)}" y="${P(y + ph / 2 - pw / 2)}" width="${P(pw)}" height="${P(pw)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="none" stroke="#666" stroke-width="0.15"/>`;
      }
      // placeholder: a small tiled map
      const cw = pw / 3;
      const chh = ph / 2;
      let cells = "";
      const tones = ["#cfe3c4", "#e8e2d4", "#b9d7ea", "#e8e2d4", "#d9e8cc", "#cfe3c4"];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) cells += `<rect x="${P(x + i * cw)}" y="${P(y + j * chh)}" width="${P(cw)}" height="${P(chh)}" fill="${tones[i * 2 + j]}" stroke="#ffffff" stroke-width="0.12"/>`;
      return `${cells}<path d="M${P(x)},${P(y + ph * 0.7)}C${P(x + pw * 0.3)},${P(y + ph * 0.2)} ${P(x + pw * 0.6)},${P(y + ph * 0.9)} ${P(x + pw)},${P(y + ph * 0.35)}" fill="none" stroke="#f59e0b" stroke-width="0.3"/><rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="none" stroke="#666" stroke-width="0.15"/>`;
    }
    case "raster":
      return `<rect x="${P(x)}" y="${P(y)}" width="${P(pw)}" height="${P(ph)}" fill="${esc(patch.fill || "#9ca3af")}" stroke="#666" stroke-width="0.15"/><path d="M${P(x)},${P(y + ph)}L${P(x + pw * 0.4)},${P(y + ph * 0.35)}L${P(x + pw * 0.6)},${P(y + ph * 0.65)}L${P(x + pw)},${P(y)}" fill="none" stroke="#fff" stroke-width="0.25" opacity="0.6"/>`;
    default: {
      const sw = patch.stroke ? clamp(patch.strokeWidth ?? 0.3, 0.1, 1) : 0;
      return `<rect x="${P(x + sw / 2)}" y="${P(y + sw / 2)}" width="${P(pw - sw)}" height="${P(ph - sw)}" fill="${esc(patch.fill || "none")}" fill-opacity="${patch.fillOpacity ?? 1}" stroke="${esc(patch.stroke || "none")}" stroke-width="${sw}"/>`;
    }
  }
}

function layoutLegend(item) {
  const p = item.props;
  const pad = p.padding;
  let svg = "";
  let y = pad;
  if (p.title) {
    const tf = p.titleFont;
    const lines = hasMath(p.title) ? [p.title] : wrapText(p.title, tf, item.w - pad * 2);
    const lh = tf.size * PT * 1.2;
    const x = p.titleAlign === "center" ? item.w / 2 : pad;
    const anchor = p.titleAlign === "center" ? "middle" : "start";
    for (const ln of lines) {
      y += lh;
      svg += richLine(ln, x, y - lh * 0.22, tf, anchor).svg;
    }
    y += tf.size * PT * 0.5;
  }
  const entries = (p.entries || []).filter((e) => !e.hidden && (p.showGroups || e.kind !== "group"));
  const cols = Math.max(1, Math.round(p.columns));
  const colW = (item.w - pad * 2 - (cols - 1) * p.colGap) / cols;
  // measure entries
  const measured = entries.map((e) => {
    const f = e.kind === "group" ? p.groupFont : p.itemFont;
    const textX = e.kind === "group" ? 0 : p.patchW + 2;
    const lines = hasMath(e.label) ? [e.label] : wrapText(e.label ?? "", f, colW - textX);
    const lh = f.size * PT * 1.2;
    const height = e.kind === "group" ? lines.length * lh + 0.6 : Math.max(p.patchH, lines.length * lh);
    return { e, f, lines, lh, textX, height };
  });
  const totalH = measured.reduce((a, m) => a + m.height + p.rowGap, 0);
  const perCol = totalH / cols;
  let col = 0;
  let cy = y;
  let acc = 0;
  let maxY = y;
  measured.forEach((m, idx) => {
    if (col < cols - 1 && acc > 0 && acc + m.height / 2 > perCol * (col + 1)) {
      col += 1;
      cy = y;
    }
    const x = pad + col * (colW + p.colGap);
    if (m.e.kind !== "group") svg += legendPatch(m.e.patch, x, cy + (m.height - p.patchH) / 2, p.patchW, p.patchH);
    const blockH = m.lines.length * m.lh;
    const ty = cy + (m.height - blockH) / 2 + m.f.size * PT * 0.85;
    if (hasMath(m.e.label)) svg += richLine(m.e.label, x + m.textX, ty, m.f).svg;
    else {
      svg += `<text ${fontAttrs(m.f)}>`;
      m.lines.forEach((ln, i) => (svg += `<tspan x="${round(x + m.textX, 3)}" y="${round(ty + i * m.lh, 3)}">${esc(ln)}</tspan>`));
      svg += `</text>`;
    }
    cy += m.height + p.rowGap;
    acc += m.height + p.rowGap;
    maxY = Math.max(maxY, cy);
  });
  if (!entries.length) {
    svg += `<text x="${pad}" y="${round(y + 4, 3)}" font-family="Arial" font-size="2.6" fill="#9ca3af">(no entries yet — click "Sync from map")</text>`;
    maxY = y + 6;
  }
  return { svg, height: maxY - p.rowGap + pad };
}
