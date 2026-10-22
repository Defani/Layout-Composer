// ---------------------------------------------------------------- dual-unit scale bar
// One bar, two unit axes: ground distance below, a second unit above (paper
// centimetres by default, as on topographic sheets). The first segment of each
// axis is split in two: 0 · ½ · 1 · 2 · 3 …
SCALEBAR_STYLES.splice(SCALEBAR_STYLES.findIndex((s) => s.id === "numeric"), 0, { id: "dual", name: "Dual units" });

const SCALE_UNITS = {
  km: { label: "km", perMeter: 1 / 1000 },
  m: { label: "m", perMeter: 1 },
  mi: { label: "mi", perMeter: 1 / 1609.344 },
  nmi: { label: "nmi", perMeter: 1 / 1852 },
  papercm: { label: "cm", paper: true },
};

// The second unit of any scale bar style: "none" or a SCALE_UNITS key. The
// "dual" style falls back to its own dualUnit (paper cm) when none is set.
function scaleSecondUnit(p) {
  if (p.secondUnit && p.secondUnit !== "none" && SCALE_UNITS[p.secondUnit]) return p.secondUnit;
  return p.style === "dual" ? (SCALE_UNITS[p.dualUnit] ? p.dualUnit : "papercm") : null;
}
const scaleAxisHeight = (p) => p.font.size * PT + 1.6;

// Second-unit axis along a bar of length L (mm) starting at x0. side "top":
// ticks rise from y with labels above; "bottom": ticks drop from y, labels below.
function scaleSecondAxis(p, unit, mPerMm, x0, L, y, side) {
  const f = p.font;
  const fh = f.size * PT;
  const lw = p.lineWidth;
  const c1 = esc(p.color1);
  const su = SCALE_UNITS[unit];
  const perMm = su.paper ? 0.1 : mPerMm * su.perMeter;
  const total = L * perMm;
  const step = niceFloor(total / Math.max(2, Math.round(p.segments)));
  const fmt = (v) => fmtNumber(v, Math.abs(v % 1) > 1e-9 ? ((v * 10) % 1 ? 2 : 1) : 0);
  // the half step only when its label has room
  const halfRoom = step / 2 / perMm > textWidthMm(fmt(step / 2), f) + 1;
  const ticks = halfRoom ? [0, step / 2] : [0];
  for (let v = step; v <= total + step * 1e-6; v += step) ticks.push(round(v, 9));
  const tick = 1;
  const y2 = side === "top" ? y - tick : y + tick;
  const ty = side === "top" ? y - tick - 0.5 : y + tick + 0.4 + fh * 0.8;
  let out = "";
  for (const v of ticks) {
    const x = x0 + v / perMm;
    out += `<line x1="${round(x, 3)}" y1="${round(y, 3)}" x2="${round(x, 3)}" y2="${round(y2, 3)}" stroke="${c1}" stroke-width="${lw}"/>`;
    out += `<text x="${round(x, 3)}" y="${round(ty, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(fmt(v))}</text>`;
  }
  const last = ticks[ticks.length - 1];
  out += `<text x="${round(x0 + last / perMm + textWidthMm(fmt(last), f) / 2 + 1, 3)}" y="${round(ty, 3)}" ${fontAttrs(f)}>${esc(p.dualLabel || su.label)}</text>`;
  return out;
}

// Nice paper segment lengths (cm) for the KLHK-style bar.
const PAPER_STEPS_CM = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20];

// KLHK / topographic style: the bar is divided in round centimetres on paper;
// the ground distance is labelled at exactly the same ticks, so both rows start
// at the same 0 and line up (0 1 2 4 6 Cm over 0 2.5 5 10 15 Km).
function renderDualPaperScalebar(item, p, map) {
  const f = p.font;
  const fh = f.size * PT;
  const mPerMm = metersPerMm(map);
  const bh = p.barHeight;
  const lw = p.lineWidth;
  const c1 = esc(p.color1);
  const c2 = esc(p.color2);
  const segs = Math.max(1, Math.round(p.segments));
  const fmt = (v) => {
    const r = Math.round(v * 100) / 100;
    return fmtNumber(r, Math.abs(r % 1) > 1e-9 ? ((r * 10) % 1 ? 2 : 1) : 0);
  };
  // ground unit: km unless the whole bar is under ~2 km
  const roughGround = item.w * mPerMm;
  const prim = p.units === "auto" ? (roughGround > 2000 ? "km" : "m") : p.units;
  const pu = SCALE_UNITS[prim] || SCALE_UNITS.km;
  const groundAt = (cm) => cm * 10 * mPerMm * (pu.paper ? 0.1 / mPerMm : pu.perMeter);
  const topLabel = p.dualLabel || "Cm";
  const botLabel = p.unitLabel || (pu.label === "km" ? "Km" : pu.label === "m" ? "M" : pu.label);
  // room on the right for the last number + unit word
  const reserve = textWidthMm(`${fmt(groundAt((item.w / 10) * 0.9))} ${botLabel}`, f) + 1.5;
  const availCm = Math.max(0.5, (item.w - reserve) / 10);
  const segCm = p.segmentValue > 0 ? p.segmentValue : [...PAPER_STEPS_CM].reverse().find((s) => s * segs <= availCm) ?? PAPER_STEPS_CM[0];
  const L = segCm * segs * 10; // bar length, mm
  const ticks = p.dualSplit ? [0, segCm / 2] : [0];
  for (let i = 1; i <= segs; i++) ticks.push(round(segCm * i, 9));
  const topY = fh + 1.6;
  let out = "";
  for (let i = 0; i < ticks.length - 1; i++) {
    const a = ticks[i] * 10;
    const b = ticks[i + 1] * 10;
    out += `<rect x="${round(a, 3)}" y="${round(topY, 3)}" width="${round(b - a, 3)}" height="${bh}" fill="${i % 2 === 0 ? c1 : c2}" stroke="${c1}" stroke-width="${lw}"/>`;
  }
  const ty = topY - 0.7;
  const by = topY + bh + 0.8 + fh * 0.8;
  // a label that would touch its left neighbour is skipped (the half tick of a
  // split bar on a small scale); 0 and the last value always stay
  const lastRight = { top: -Infinity, bot: -Infinity };
  const label = (row, x, y, text, force) => {
    const w = textWidthMm(text, f);
    if (!force && x - w / 2 < lastRight[row] + 0.8) return "";
    lastRight[row] = x + w / 2;
    return `<text x="${round(x, 3)}" y="${round(y, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(text)}</text>`;
  };
  ticks.forEach((cm, i) => {
    const x = cm * 10;
    const end = i === 0 || i === ticks.length - 1;
    // the tick before the last gives way to the last one
    const nextIsLast = i === ticks.length - 2;
    const fits = (text, row) => !nextIsLast || x + textWidthMm(text, f) / 2 + 0.8 < ticks[ticks.length - 1] * 10 - textWidthMm(row === "top" ? fmt(ticks.at(-1)) : fmt(groundAt(ticks.at(-1))), f) / 2;
    const tt = fmt(cm);
    const bt = fmt(groundAt(cm));
    if (end || fits(tt, "top")) out += label("top", x, ty, tt, end);
    if (end || fits(bt, "bot")) out += label("bot", x, by, bt, end);
  });
  const last = ticks[ticks.length - 1];
  const ux = L + Math.max(textWidthMm(fmt(last), f), textWidthMm(fmt(groundAt(last)), f)) / 2 + 1.2;
  out += `<text x="${round(ux, 3)}" y="${round(ty, 3)}" ${fontAttrs(f)}>${esc(topLabel)}</text>`;
  out += `<text x="${round(ux, 3)}" y="${round(by, 3)}" ${fontAttrs(f)}>${esc(botLabel)}</text>`;
  if (p.showNumeric) {
    out += `<text x="${round(L / 2, 3)}" y="${round(by + fh * 1.3, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(`${p.numericPrefix || ""}1 : ${fmtScale(mapScale(map), p)}`)}</text>`;
  }
  return out;
}

function renderDualScalebar(item, p, map) {
  if ((p.dualBase || "paper") === "paper") return renderDualPaperScalebar(item, p, map);
  const f = p.font;
  const fh = f.size * PT;
  const mPerMm = metersPerMm(map);
  const bh = p.barHeight;
  const lw = p.lineWidth;
  const c1 = esc(p.color1);
  const c2 = esc(p.color2);
  const segs = Math.max(1, Math.round(p.segments));
  // primary (bottom) unit
  const prim = p.units === "auto" ? (mPerMm * item.w > 3000 ? "km" : "m") : p.units;
  const pu = SCALE_UNITS[prim] || SCALE_UNITS.km;
  const perMmP = pu.paper ? 0.1 : mPerMm * pu.perMeter;
  const reserve = textWidthMm("0000 km", f) * 0.7;
  const avail = Math.max(5, item.w - reserve);
  const segVal = p.segmentValue > 0 ? p.segmentValue : niceFloor((avail * perMmP) / segs);
  const L = (segVal * segs) / perMmP; // bar length in mm
  const topY = fh + 1.4; // bar top
  const fmt = (v) => fmtNumber(v, Math.abs(v % 1) > 1e-9 ? ((v * 10) % 1 ? 2 : 1) : 0);
  let out = "";

  // bottom axis ticks: 0, ½, 1, 2 … segments
  const bottom = [0, segVal / 2];
  for (let i = 1; i <= segs; i++) bottom.push(segVal * i);
  for (let i = 0; i < bottom.length - 1; i++) {
    const a = bottom[i] / perMmP;
    const b = bottom[i + 1] / perMmP;
    out += `<rect x="${round(a, 3)}" y="${round(topY, 3)}" width="${round(b - a, 3)}" height="${bh}" fill="${i % 2 === 0 ? c1 : c2}" stroke="${c1}" stroke-width="${lw}"/>`;
  }
  const by = topY + bh + 0.9 + fh * 0.8;
  bottom.forEach((v) => {
    out += `<text x="${round(v / perMmP, 3)}" y="${round(by, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(fmt(v))}</text>`;
  });
  const lastW = textWidthMm(fmt(bottom[bottom.length - 1]), f);
  out += `<text x="${round(L + lastW / 2 + 1, 3)}" y="${round(by, 3)}" ${fontAttrs(f)}>${esc(p.unitLabel || pu.label)}</text>`;

  // top axis ticks: 0, ½, 1, 2 … within the bar length
  out += scaleSecondAxis(p, scaleSecondUnit(p), mPerMm, 0, L, topY, "top");
  if (p.showNumeric) {
    out += `<text x="${round(L / 2, 3)}" y="${round(by + fh * 1.3, 3)}" text-anchor="middle" ${fontAttrs(f)}>${esc(`${p.numericPrefix || ""}1 : ${fmtScale(mapScale(map), p)}`)}</text>`;
  }
  return out;
}
