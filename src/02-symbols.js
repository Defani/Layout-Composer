// ---------------------------------------------------------------- north arrows
// Each variant draws into a 100x100 box, north up. c1 = primary (ink),
// c2 = secondary (paper), L = label ("U" / "N"), F = label font family.
function star(cx, cy, rOut, rIn, n, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${round(cx + r * Math.cos(a), 2)},${round(cy + r * Math.sin(a), 2)}`);
  }
  return pts.join(" ");
}
// A split (two-tone) compass point from centre toward angle `deg`.
function splitPoint(deg, len, half, c1, c2, sw = 0.8) {
  const a = ((deg - 90) * Math.PI) / 180;
  const tip = [50 + len * Math.cos(a), 50 + len * Math.sin(a)];
  const l = [50 + half * Math.cos(a - Math.PI / 2), 50 + half * Math.sin(a - Math.PI / 2)];
  const r = [50 + half * Math.cos(a + Math.PI / 2), 50 + half * Math.sin(a + Math.PI / 2)];
  const p = (pt) => `${round(pt[0], 2)},${round(pt[1], 2)}`;
  return (
    `<polygon points="50,50 ${p(tip)} ${p(l)}" fill="${c1}" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<polygon points="50,50 ${p(tip)} ${p(r)}" fill="${c2}" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="round"/>`
  );
}
// Letter size factor of the arrow being drawn (north item's labelScale, set by its renderer).
let nLabelScale = 1;
function nLabel(L, F, c1, x = 50, y = 13, size = 16, weight = "bold") {
  if (!L) return "";
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial, sans-serif" font-size="${round(size * nLabelScale, 2)}" font-weight="${weight}" fill="${c1}">${esc(L)}</text>`;
}

const NORTH_ARROWS = [
  {
    id: "classic",
    name: "Classic two-tone",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 66,90 50,78" fill="${c2}" stroke="${c1}" stroke-width="2" stroke-linejoin="round"/>` +
      `<polygon points="50,24 34,90 50,78" fill="${c1}" stroke="${c1}" stroke-width="2" stroke-linejoin="round"/>` +
      nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "solid",
    name: "Solid arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 70,92 50,80 30,92" fill="${c1}"/>` + nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "outline",
    name: "Outline arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 70,92 50,80 30,92" fill="${c2}" stroke="${c1}" stroke-width="3" stroke-linejoin="round"/>` +
      nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "esri",
    name: "Split arrow",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,26 64,74 50,64" fill="${c1}"/><polygon points="50,26 36,74 50,64" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
      `<polygon points="50,94 36,74 50,80 64,74" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 12, 17),
  },
  {
    id: "needle",
    name: "Compass needle",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="56" r="34" fill="none" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,24 57,56 43,56" fill="${c1}"/><polygon points="50,88 57,56 43,56" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
      `<circle cx="50" cy="56" r="3" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "star4",
    name: "4-point star",
    svg: (c1, c2, L, F) =>
      [0, 90, 180, 270].map((d) => splitPoint(d, 34, 8, c1, c2)).join("") +
      nLabel(L, F, c1, 50, 8, 14),
  },
  {
    id: "rose8",
    name: "8-point compass rose",
    svg: (c1, c2, L, F) =>
      [45, 135, 225, 315].map((d) => splitPoint(d, 24, 6, c1, c2, 0.6)).join("") +
      [0, 90, 180, 270].map((d) => splitPoint(d, 38, 8, c1, c2, 0.6)).join("") +
      nLabel(L, F, c1, 50, 6, 11),
  },
  {
    id: "rose16",
    name: "16-point compass rose",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="50" r="27" fill="none" stroke="${c1}" stroke-width="0.8"/>` +
      [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((d) => splitPoint(d, 20, 3.5, c1, c2, 0.4)).join("") +
      [45, 135, 225, 315].map((d) => splitPoint(d, 28, 6, c1, c2, 0.5)).join("") +
      [0, 90, 180, 270].map((d) => splitPoint(d, 40, 8, c1, c2, 0.5)).join("") +
      nLabel(L, F, c1, 50, 5, 10),
  },
  {
    id: "rose-ring",
    name: "Ringed compass rose",
    svg: (c1, c2, L, F) => {
      let ticks = "";
      for (let i = 0; i < 72; i++) {
        const a = (i * 5 * Math.PI) / 180;
        const r1 = 36;
        const r2 = i % 18 === 0 ? 31 : i % 2 === 0 ? 33 : 34.5;
        ticks += `<line x1="${round(50 + r1 * Math.sin(a), 2)}" y1="${round(54 - r1 * Math.cos(a), 2)}" x2="${round(50 + r2 * Math.sin(a), 2)}" y2="${round(54 - r2 * Math.cos(a), 2)}" stroke="${c1}" stroke-width="0.6"/>`;
      }
      return (
        `<g transform="translate(0,4)"><circle cx="50" cy="50" r="38" fill="${c2}" stroke="${c1}" stroke-width="1.2"/><circle cx="50" cy="50" r="36" fill="none" stroke="${c1}" stroke-width="0.5"/></g>` +
        ticks +
        `<g transform="translate(0,4)">` +
        [45, 135, 225, 315].map((d) => splitPoint(d, 20, 5, c1, c2, 0.5)).join("") +
        [0, 90, 180, 270].map((d) => splitPoint(d, 30, 7, c1, c2, 0.5)).join("") +
        `</g>` +
        nLabel(L, F, c1, 50, 6, 11)
      );
    },
  },
  {
    id: "circle-n",
    name: "Circle + arrow",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="55" r="36" fill="${c2}" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,26 66,78 50,68 34,78" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 8, 15),
  },
  {
    id: "circle-filled",
    name: "Filled circle",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="55" r="36" fill="${c1}"/>` +
      `<polygon points="50,24 64,76 50,66 36,76" fill="${c2}"/>` +
      nLabel(L, F, c1, 50, 8, 15),
  },
  {
    id: "triangle",
    name: "Triangle + letter",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,8 86,92 14,92" fill="${c1}"/>` +
      (L ? `<text x="50" y="70" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="30" font-weight="bold" fill="${c2}">${esc(L)}</text>` : ""),
  },
  {
    id: "chevron",
    name: "Chevron",
    svg: (c1, c2, L, F) =>
      `<polyline points="24,62 50,30 76,62" fill="none" stroke="${c1}" stroke-width="9" stroke-linejoin="miter" stroke-linecap="square"/>` +
      `<polyline points="24,88 50,56 76,88" fill="none" stroke="${c1}" stroke-width="9" stroke-linejoin="miter" stroke-linecap="square" opacity="0.45"/>` +
      nLabel(L, F, c1, 50, 12, 18),
  },
  {
    id: "minimal",
    name: "Minimal line",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="30" x2="50" y2="94" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,24 58,42 50,38 42,42" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 12, 18, "normal"),
  },
  {
    id: "arrow-base",
    name: "Arrow with base",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,24 66,70 54,66 54,92 46,92 46,66 34,70" fill="${c1}"/>` + nLabel(L, F, c1, 50, 11, 18),
  },
  {
    id: "double",
    name: "Double arrow (N–S)",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,20 62,50 50,44 38,50" fill="${c1}"/><polygon points="50,80 62,50 50,56 38,50" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      nLabel(L, F, c1, 50, 9, 14) +
      `<text x="50" y="92" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="12" fill="${c1}">${L ? "S" : ""}</text>`,
  },
  {
    id: "cross",
    name: "Cardinal cross (N/E/S/W)",
    svg: (c1, c2, L, F) => {
      const id = L === "U" ? ["U", "T", "S", "B"] : ["N", "E", "S", "W"];
      const t = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="11" font-weight="bold" fill="${c1}">${s}</text>`;
      return (
        `<line x1="50" y1="18" x2="50" y2="82" stroke="${c1}" stroke-width="1.5"/><line x1="18" y1="50" x2="82" y2="50" stroke="${c1}" stroke-width="1.5"/>` +
        `<polygon points="50,16 56,38 50,34 44,38" fill="${c1}"/>` +
        `<circle cx="50" cy="50" r="5" fill="${c2}" stroke="${c1}" stroke-width="1.5"/>` +
        (L ? t(50, 7, id[0]) + t(93, 50, id[1]) + t(50, 93, id[2]) + t(7, 50, id[3]) : "")
      );
    },
  },
  {
    id: "true-north",
    name: "True north star",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="32" x2="50" y2="96" stroke="${c1}" stroke-width="2.5"/>` +
      `<polygon points="${star(50, 22, 12, 5, 5)}" fill="${c1}"/>` +
      `<polygon points="50,40 58,62 50,56 42,62" fill="${c1}"/>`,
  },
  {
    id: "military",
    name: "Topographic (GN/MN)",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="30" x2="50" y2="94" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 56,40 44,40" fill="${c1}"/>` +
      `<line x1="50" y1="94" x2="64" y2="40" stroke="${c1}" stroke-width="1.4"/>` +
      `<text x="67" y="36" font-family="${esc(F)}, Arial" font-size="9" fill="${c1}">GN</text>` +
      `<line x1="50" y1="94" x2="38" y2="44" stroke="${c1}" stroke-width="1.4" stroke-dasharray="3 2"/>` +
      `<text x="26" y="40" font-family="${esc(F)}, Arial" font-size="9" fill="${c1}">MN</text>` +
      nLabel(L, F, c1, 50, 12, 14),
  },
  {
    id: "diamond",
    name: "Diamond",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,22 64,58 50,94 36,58" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 64,58 36,58" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "kite",
    name: "Kite",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,22 68,52 50,94 32,52" fill="${c2}" stroke="${c1}" stroke-width="2"/>` +
      `<polygon points="50,22 68,52 50,94" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 10, 16),
  },
  {
    id: "badge",
    name: "Square badge",
    svg: (c1, c2, L, F) =>
      `<rect x="14" y="10" width="72" height="84" rx="10" fill="${c1}"/>` +
      `<polygon points="50,40 64,82 50,74 36,82" fill="${c2}"/>` +
      (L ? `<text x="50" y="26" text-anchor="middle" dominant-baseline="central" font-family="${esc(F)}, Arial" font-size="18" font-weight="bold" fill="${c2}">${esc(L)}</text>` : ""),
  },
  {
    id: "hex",
    name: "Hexagon",
    svg: (c1, c2, L, F) =>
      `<polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="${c2}" stroke="${c1}" stroke-width="3"/>` +
      `<polygon points="50,34 62,76 50,68 38,76" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 22, 14),
  },
  {
    id: "fancy",
    name: "Ornate classic",
    svg: (c1, c2, L, F) =>
      `<circle cx="50" cy="58" r="22" fill="none" stroke="${c1}" stroke-width="1"/><circle cx="50" cy="58" r="18" fill="none" stroke="${c1}" stroke-width="0.5"/>` +
      `<g transform="translate(0,8)">` +
      [45, 135, 225, 315].map((d) => splitPoint(d, 16, 4, c1, c2, 0.5)).join("") +
      `</g>` +
      `<polygon points="50,18 56,58 50,96 44,58" fill="${c2}" stroke="${c1}" stroke-width="0.8"/>` +
      `<polygon points="50,18 56,58 50,58" fill="${c1}"/><polygon points="50,96 44,58 50,58" fill="${c1}"/>` +
      `<polygon points="28,58 50,52 72,58 50,64" fill="${c2}" stroke="${c1}" stroke-width="0.8"/>` +
      nLabel(L, F, c1, 50, 8, 13),
  },
  {
    id: "half-circle",
    name: "Half circle",
    svg: (c1, c2, L, F) =>
      `<path d="M14,78 A36,36 0 0 1 86,78 Z" fill="${c2}" stroke="${c1}" stroke-width="2.5"/>` +
      `<polygon points="50,26 60,78 50,70 40,78" fill="${c1}"/>` +
      nLabel(L, F, c1, 50, 90, 13),
  },
  {
    id: "text-only",
    name: "Letter + line",
    svg: (c1, c2, L, F) =>
      `<line x1="50" y1="46" x2="50" y2="96" stroke="${c1}" stroke-width="2"/><polygon points="50,40 55,52 45,52" fill="${c1}"/>` +
      nLabel(L || "N", F, c1, 50, 22, 34),
  },
];

// ---------------------------------------------------------------- shapes
// Shapes draw into the item's own w x h (mm) box.
const SHAPES = [
  { id: "rect", name: "Rectangle", d: (w, h) => `M0,0H${w}V${h}H0Z` },
  { id: "rounded", name: "Rounded rectangle", rounded: true },
  { id: "ellipse", name: "Ellipse", ellipse: true },
  { id: "triangle", name: "Triangle", d: (w, h) => `M${w / 2},0L${w},${h}L0,${h}Z` },
  { id: "rtriangle", name: "Right triangle", d: (w, h) => `M0,0L${w},${h}L0,${h}Z` },
  { id: "diamond", name: "Diamond", d: (w, h) => `M${w / 2},0L${w},${h / 2}L${w / 2},${h}L0,${h / 2}Z` },
  { id: "pentagon", name: "Pentagon", poly: 5 },
  { id: "hexagon", name: "Hexagon", poly: 6 },
  { id: "octagon", name: "Octagon", poly: 8 },
  { id: "star5", name: "5-point star", star: [5, 0.42] },
  { id: "star8", name: "8-point star", star: [8, 0.55] },
  { id: "arrow-r", name: "Arrow right", d: (w, h) => `M0,${h * 0.3}H${w * 0.62}V0L${w},${h / 2}L${w * 0.62},${h}V${h * 0.7}H0Z` },
  { id: "arrow-l", name: "Arrow left", d: (w, h) => `M${w},${h * 0.3}H${w * 0.38}V0L0,${h / 2}L${w * 0.38},${h}V${h * 0.7}H${w}Z` },
  { id: "arrow-u", name: "Arrow up", d: (w, h) => `M${w * 0.3},${h}V${h * 0.38}H0L${w / 2},0L${w},${h * 0.38}H${w * 0.7}V${h}Z` },
  { id: "arrow-2", name: "Double arrow", d: (w, h) => `M0,${h / 2}L${w * 0.25},0V${h * 0.3}H${w * 0.75}V0L${w},${h / 2}L${w * 0.75},${h}V${h * 0.7}H${w * 0.25}V${h}Z` },
  { id: "chevron", name: "Chevron", d: (w, h) => `M0,0H${w * 0.75}L${w},${h / 2}L${w * 0.75},${h}H0L${w * 0.25},${h / 2}Z` },
  { id: "banner", name: "Ribbon / banner", d: (w, h) => `M0,0H${w}L${w * 0.92},${h / 2}L${w},${h}H0L${w * 0.08},${h / 2}Z` },
  { id: "tab", name: "Title tab", d: (w, h) => `M0,${h}V${h * 0.25}Q0,0 ${h * 0.25},0H${w - h * 0.25}Q${w},0 ${w},${h * 0.25}V${h}Z` },
  { id: "callout", name: "Callout", d: (w, h) => `M0,0H${w}V${h * 0.75}H${w * 0.35}L${w * 0.2},${h}V${h * 0.75}H0Z` },
  { id: "cross", name: "Plus sign", d: (w, h) => `M${w * 0.35},0H${w * 0.65}V${h * 0.35}H${w}V${h * 0.65}H${w * 0.65}V${h}H${w * 0.35}V${h * 0.65}H0V${h * 0.35}H${w * 0.35}Z` },
  { id: "parallelogram", name: "Parallelogram", d: (w, h) => `M${w * 0.2},0H${w}L${w * 0.8},${h}H0Z` },
  { id: "trapezoid", name: "Trapezoid", d: (w, h) => `M${w * 0.2},0H${w * 0.8}L${w},${h}H0Z` },
  { id: "line-h", name: "Horizontal line", line: "h" },
  { id: "line-v", name: "Vertical line", line: "v" },
  { id: "line-d", name: "Diagonal line", line: "d" },
  { id: "arrow-line", name: "Arrow line", line: "arrow" },
];
function shapePath(shape, w, h) {
  if (shape.d) return shape.d(w, h);
  if (shape.poly) {
    const n = shape.poly;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n % 2 ? 0 : Math.PI / n);
      pts.push(`${round(w / 2 + (w / 2) * Math.cos(a), 3)},${round(h / 2 + (h / 2) * Math.sin(a), 3)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  if (shape.star) {
    const [n, inner] = shape.star;
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 1 : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push(`${round(w / 2 + (w / 2) * r * Math.cos(a), 3)},${round(h / 2 + (h / 2) * r * Math.sin(a), 3)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  return `M0,0H${w}V${h}H0Z`;
}

// ---------------------------------------------------------------- scale bars
const SCALEBAR_STYLES = [
  { id: "single", name: "Single box" },
  { id: "double", name: "Double box" },
  { id: "line-up", name: "Line, ticks up" },
  { id: "line-down", name: "Line, ticks down" },
  { id: "line-mid", name: "Line, ticks middle" },
  { id: "stepped", name: "Stepped line" },
  { id: "hollow", name: "Hollow box" },
  { id: "alt-line", name: "Alternating line" },
  { id: "ruler", name: "Ruler" },
  { id: "numeric", name: "Numeric (1 : n)" },
];

// Frame/border presets for the page and text boxes.
const BORDER_STYLES = { solid: "Solid", dash: "Dashed", longdash: "Long dash", dot: "Dotted", dashdot: "Dash-dot", longdashdot: "Long dash-dot" };
