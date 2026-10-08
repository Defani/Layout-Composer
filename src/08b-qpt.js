// ---------------------------------------------------------------- QGIS layout templates (.qpt)
// Export writes a QGIS print layout template: labels, maps (extent in
// EPSG:3857), pictures, shapes, scale bars and legends become native QGIS
// items; everything QGIS has no equivalent for (color bars, charts, LaTeX,
// north arrows, icons, drawings, tables) is embedded as an SVG picture so the
// page looks the same. Import reads the same item types back.

const QGIS_TYPES = { page: 65638, map: 65639, picture: 65640, label: 65641, legend: 65642, shape: 65643, polygon: 65644, polyline: 65645, scalebar: 65646 };
const MERC_R = 6378137;

const xmlEsc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "&#10;");
function qColor(hex, alpha = 255) {
  const [r, g, b] = hexToRgb(hex || "#000000");
  return `${r},${g},${b},${Math.round(alpha)}`;
}
function qColorEl(tag, hex, alpha = 255) {
  const [r, g, b] = hexToRgb(hex || "#000000");
  return `<${tag} red="${r}" green="${g}" blue="${b}" alpha="${Math.round(alpha)}"/>`;
}
// CRS element QGIS can read without a lookup (authid + proj4).
function qCrs(code) {
  let proj4;
  let desc;
  if (code === 3857) {
    proj4 = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs";
    desc = "WGS 84 / Pseudo-Mercator";
  } else if (code === 4326) {
    proj4 = "+proj=longlat +datum=WGS84 +no_defs";
    desc = "WGS 84";
  } else {
    const zone = code % 100;
    const south = code > 32700;
    proj4 = `+proj=utm +zone=${zone}${south ? " +south" : ""} +datum=WGS84 +units=m +no_defs`;
    desc = `WGS 84 / UTM zone ${zone}${south ? "S" : "N"}`;
  }
  return `<crs>${qSrs(code, proj4, desc)}</crs>`;
}
function qSrs(code, proj4, desc) {
  if (!proj4) {
    const c = qCrs(code);
    return c.slice(5, -6);
  }
  return `<spatialrefsys nativeFormat="Wkt"><wkt></wkt><proj4>${proj4}</proj4><srid>${code}</srid><authid>EPSG:${code}</authid><description>${desc}</description><projectionacronym>${code === 4326 ? "longlat" : code === 3857 ? "merc" : "utm"}</projectionacronym><ellipsoidacronym>EPSG:7030</ellipsoidacronym><geographicflag>${code === 4326 ? "true" : "false"}</geographicflag></spatialrefsys>`;
}
function qUuid() {
  return `{${crypto.randomUUID ? crypto.randomUUID() : uid("q")}}`;
}
function qFontDesc(f) {
  // Qt font description: family,pointSize,pixelSize,styleHint,weight,italic,…
  return `${f.family},${f.size},-1,5,${f.bold ? 75 : 50},${f.italic ? 1 : 0},0,0,0,0`;
}
function qTextStyle(f) {
  return `<text_style fontFamily="${xmlEsc(f.family)}" fontSize="${f.size}" fontSizeUnit="Point" fontWeight="${f.bold ? 75 : 50}" fontItalic="${f.italic ? 1 : 0}" textColor="${qColor(f.color)}" textOpacity="1" fontLetterSpacing="0" fontWordSpacing="0" multilineHeight="1" multilineHeightUnit="Percentage" namedStyle="" blendMode="0" allowHtml="0" capitalization="0" previewBkgrdColor="255,255,255,255"><text-buffer bufferDraw="0" bufferSize="1" bufferColor="255,255,255,255" bufferSizeUnits="MM"/></text_style>`;
}
function qFillSymbol(fill, stroke, strokeW, fillAlpha = 255) {
  const noFill = !fill;
  const noStroke = !stroke || !(strokeW > 0);
  return `<symbol type="fill" name="" alpha="1" clip_to_extent="1" force_rhr="0"><layer class="SimpleFill" enabled="1" locked="0" pass="0"><Option type="Map">` +
    `<Option name="color" value="${noFill ? "0,0,0,0" : qColor(fill, fillAlpha)}" type="QString"/>` +
    `<Option name="style" value="${noFill ? "no" : "solid"}" type="QString"/>` +
    `<Option name="outline_color" value="${noStroke ? "0,0,0,0" : qColor(stroke)}" type="QString"/>` +
    `<Option name="outline_style" value="${noStroke ? "no" : "solid"}" type="QString"/>` +
    `<Option name="outline_width" value="${noStroke ? 0 : strokeW}" type="QString"/>` +
    `<Option name="outline_width_unit" value="MM" type="QString"/>` +
    `<Option name="joinstyle" value="miter" type="QString"/></Option></layer></symbol>`;
}
// Common LayoutItem attributes.
function qItemAttrs(item, z, { frame = false, frameColor = "#000000", frameW = 0.3, bg = null, uuid = qUuid() } = {}) {
  // QGIS links items in a template by templateUuid, so it must equal uuid
  return {
    attrs: `uuid="${uuid}" id="${xmlEsc(item.name || item.type)}" position="${round(item.x, 4)},${round(item.y, 4)},mm" positionOnPage="${round(item.x, 4)},${round(item.y, 4)},mm" size="${round(item.w, 4)},${round(item.h, 4)},mm" referencePoint="0" itemRotation="${round(item.rot || 0, 3)}" zValue="${z}" visibility="${item.hidden ? 0 : 1}" positionLock="${item.locked ? "true" : "false"}" opacity="${item.opacity ?? 1}" frame="${frame ? "true" : "false"}" frameJoinStyle="miter" outlineWidthM="${frameW},mm" background="${bg ? "true" : "false"}" blendMode="0" excludeFromExports="0" groupUuid="" templateUuid="${uuid}"`,
    children: qColorEl("FrameColor", frameColor) + qColorEl("BackgroundColor", bg || "#ffffff", bg ? 255 : 0),
  };
}
// Map frame extent in EPSG:3857 metres (unrotated, as QGIS stores it).
function mercExtent(item) {
  const v = item.props.view;
  const cx = (v.center[0] * Math.PI * MERC_R) / 180;
  const phi = (clamp(v.center[1], -85.0511, 85.0511) * Math.PI) / 180;
  const cy = MERC_R * Math.log(Math.tan(Math.PI / 4 + phi / 2));
  const mPerPx = (2 * Math.PI * MERC_R) / (WORLD * 2 ** v.zoom);
  const hw = (item.w * PX96 * mPerPx) / 2;
  const hh = (item.h * PX96 * mPerPx) / 2;
  return { xmin: cx - hw, ymin: cy - hh, xmax: cx + hw, ymax: cy + hh };
}
// An item as a standalone SVG (used for items QGIS cannot draw natively).
function itemAsSvg(item, mapImages) {
  const body = renderItem(item, { export: true, mapImages });
  return qtSafeSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${item.w}mm" height="${item.h}mm" viewBox="0 0 ${item.w} ${item.h}">${body}</svg>`);
}
// QGIS draws SVG pictures with QtSvg (SVG Tiny 1.2): no nested <svg>, no
// dominant-baseline, no x/y on <tspan>, no rgba(). Rewrite those.
function qtSafeSvg(src) {
  const dom = new DOMParser().parseFromString(src, "image/svg+xml");
  const root = dom.documentElement;
  if (root.nodeName === "parsererror" || dom.querySelector("parsererror")) return src;
  const NSS = "http://www.w3.org/2000/svg";
  // nested <svg> → <g transform>
  for (const sv of [...root.querySelectorAll("svg")].reverse()) {
    const x = Number(sv.getAttribute("x") || 0);
    const y = Number(sv.getAttribute("y") || 0);
    const w = Number(sv.getAttribute("width") || 0);
    const h = Number(sv.getAttribute("height") || 0);
    let t = `translate(${x} ${y})`;
    const vb = (sv.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0 && w > 0 && h > 0) {
      const par = sv.getAttribute("preserveAspectRatio") || "xMidYMid meet";
      let sx = w / vb[2];
      let sy = h / vb[3];
      let dx = 0;
      let dy = 0;
      if (!/none/.test(par)) {
        const k = /slice/.test(par) ? Math.max(sx, sy) : Math.min(sx, sy);
        if (/xMid/.test(par)) dx = (w - vb[2] * k) / 2;
        else if (/xMax/.test(par)) dx = w - vb[2] * k;
        if (/YMid/.test(par)) dy = (h - vb[3] * k) / 2;
        else if (/YMax/.test(par)) dy = h - vb[3] * k;
        sx = sy = k;
      }
      t += ` translate(${dx} ${dy}) scale(${sx} ${sy}) translate(${-vb[0]} ${-vb[1]})`;
    }
    const g = dom.createElementNS(NSS, "g");
    g.setAttribute("transform", t);
    while (sv.firstChild) g.appendChild(sv.firstChild);
    sv.replaceWith(g);
  }
  const fsOf = (n) => {
    for (let e = n; e && e.getAttribute; e = e.parentNode) {
      const v = parseFloat(e.getAttribute("font-size"));
      if (v > 0) return v;
    }
    return 3;
  };
  const shiftFor = (n, fs) => {
    const db = n.getAttribute("dominant-baseline");
    n.removeAttribute("dominant-baseline");
    return db === "central" || db === "middle" ? fs * 0.35 : db === "hanging" ? fs * 0.8 : 0;
  };
  for (const tx of [...root.querySelectorAll("text")]) {
    const fs = fsOf(tx);
    const shift = shiftFor(tx, fs);
    if (shift && tx.hasAttribute("y")) tx.setAttribute("y", Number(tx.getAttribute("y")) + shift);
    else if (shift) tx.setAttribute("transform", `${tx.getAttribute("transform") || ""} translate(0 ${shift})`.trim());
    // <tspan x y> lines → one <text> per line
    const lines = [...tx.children].filter((c) => c.nodeName === "tspan" && (c.hasAttribute("x") || c.hasAttribute("y")));
    if (lines.length) {
      for (const ts of lines) {
        const nt = tx.cloneNode(false);
        nt.removeAttribute("transform");
        if (tx.getAttribute("transform")) nt.setAttribute("transform", tx.getAttribute("transform"));
        nt.setAttribute("x", ts.getAttribute("x") ?? tx.getAttribute("x") ?? 0);
        nt.setAttribute("y", Number(ts.getAttribute("y") ?? tx.getAttribute("y") ?? 0) + (ts.hasAttribute("y") ? shift : 0));
        for (const a of ["fill", "font-weight", "font-style", "font-size"]) if (ts.getAttribute(a)) nt.setAttribute(a, ts.getAttribute(a));
        nt.textContent = ts.textContent;
        tx.parentNode.insertBefore(nt, tx);
      }
      tx.remove();
    }
  }
  // mixed runs (<text>name<tspan fill>value</tspan></text>): QtSvg drops the
  // space between them, so place each run as its own <text>
  const ctx2 = document.createElement("canvas").getContext("2d");
  const widthOf = (str, el) => {
    const fs = fsOf(el);
    const fam = el.getAttribute("font-family") || "Arial";
    const fw = el.getAttribute("font-weight") || "normal";
    const fst = el.getAttribute("font-style") || "normal";
    ctx2.font = `${fst} ${fw} 100px ${fam}`;
    return (ctx2.measureText(str).width * fs) / 100;
  };
  for (const tx of [...root.querySelectorAll("text")]) {
    const kids = [...tx.childNodes];
    if (!kids.some((k) => k.nodeName === "tspan") || (tx.getAttribute("text-anchor") || "start") !== "start") continue;
    let x = Number(tx.getAttribute("x") || 0);
    for (const k of kids) {
      const str = k.textContent;
      if (!str) continue;
      const nt = tx.cloneNode(false);
      nt.setAttribute("x", x);
      if (k.nodeName === "tspan") for (const a of ["fill", "font-weight", "font-style", "font-size"]) if (k.getAttribute(a)) nt.setAttribute(a, k.getAttribute(a));
      nt.textContent = str.replace(/^ +/, "");
      x += widthOf(str.startsWith(" ") ? str : str, nt);
      tx.parentNode.insertBefore(nt, tx);
    }
    tx.remove();
  }
  // rgba() → rgb + opacity
  for (const n of root.querySelectorAll("*")) {
    for (const a of ["fill", "stroke"]) {
      const m = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(n.getAttribute(a) || "");
      if (m) {
        n.setAttribute(a, `rgb(${m[1]},${m[2]},${m[3]})`);
        n.setAttribute(`${a}-opacity`, m[4]);
      }
    }
    n.removeAttribute("paint-order");
    if (n.getAttribute("overflow")) n.removeAttribute("overflow");
  }
  return new XMLSerializer().serializeToString(root);
}
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

function layoutToQpt(doc) {
  const pg = doc.page;
  const maps = new Map();
  let out = `<!DOCTYPE qgis-layout>\n<Layout name="${xmlEsc(doc.name)}" units="mm" printResolution="300" worldFileMap="">\n`;
  out += `<Snapper tolerance="5" snapToGrid="0" snapToGuides="1" snapToItems="1"/>\n<Grid resUnits="mm" resolution="10" offsetX="0" offsetY="0" offsetUnits="mm"/>\n`;
  out += `<PageCollection>\n<symbol type="fill" name="" alpha="1"><layer class="SimpleFill" enabled="1"><Option type="Map"><Option name="color" value="${qColor(pg.background || "#ffffff")}" type="QString"/><Option name="style" value="solid" type="QString"/><Option name="outline_style" value="no" type="QString"/></Option></layer></symbol>\n`;
  out += `<LayoutItem type="${QGIS_TYPES.page}" size="${pg.width},${pg.height},mm" position="0,0,mm" positionOnPage="0,0,mm" referencePoint="0" uuid="${qUuid()}" id="" zValue="0" visibility="1" frame="false" background="true"/>\n</PageCollection>\n`;
  // uuids of map frames first, so legends and scale bars can point at them
  for (const it of doc.items) if (it.type === "map") maps.set(it.id, qUuid());
  let z = 1;
  let embedded = 0;
  for (const it of doc.items) {
    const p = it.props || {};
    z += 1;
    if (it.type === "text" && !hasMath(p.text || "")) {
      const a = qItemAttrs(it, z, { frame: !!p.border?.show, frameColor: p.border?.color, frameW: p.border?.width || 0.3, bg: p.background || null });
      const halign = p.align === "center" ? 4 : p.align === "right" ? 2 : p.align === "justify" ? 8 : 1;
      const valign = p.valign === "middle" ? 128 : p.valign === "bottom" ? 64 : 32;
      let text = p.text || "";
      if (p.textCase === "upper") text = text.toUpperCase();
      text = text.replace(/\{(\w+)\}/g, (m, k) => (k === "date" ? "[% format_date(now(), 'dd MMMM yyyy') %]" : k === "title" ? "[% @layout_name %]" : resolveVars(m, it)));
      out += `<LayoutItem type="${QGIS_TYPES.label}" ${a.attrs} labelText="${xmlEsc(text)}" htmlState="0" marginX="${p.padding || 0}" marginY="${p.padding || 0}" halign="${halign}" valign="${valign}">${a.children}<LabelFont description="${xmlEsc(qFontDesc(p.font))}" style=""/>${qColorEl("FontColor", p.font.color)}${qTextStyle(p.font)}</LayoutItem>\n`;
      continue;
    }
    if (it.type === "map") {
      const e = mercExtent(it);
      const a = qItemAttrs(it, z, { frame: !!p.frame?.show, frameColor: p.frame?.color, frameW: p.frame?.width || 0.3, bg: p.background || "#ffffff", uuid: maps.get(it.id) });
      out += `<LayoutItem type="${QGIS_TYPES.map}" ${a.attrs} keepLayerSet="false" followPreset="false" followPresetName="" mapRotation="${round(-(p.view.bearing || 0), 4)}" drawCanvasItems="true" isTemporal="0" labelMargin="0,mm" mapFlags="03">${a.children}`;
      out += `<Extent xmin="${round(e.xmin, 3)}" ymin="${round(e.ymin, 3)}" xmax="${round(e.xmax, 3)}" ymax="${round(e.ymax, 3)}"/>`;
      out += `${qCrs(3857)}<LayerSet/>`;
      if (p.grid?.show) {
        const g = p.grid;
        const dms = g.type !== "utm";
        const bnd = mapGeom(it).bounds();
        const iv = g.interval > 0 ? g.interval : g.type === "utm" ? niceStep((bnd.east - bnd.west) * 111320 * Math.cos((p.view.center[1] * Math.PI) / 180), 4) : niceDegStep((bnd.east - bnd.west) / 4);
        out += `<ComposerMapGrid uuid="${qUuid()}" name="Grid 1" show="1" position="3" gridStyle="${g.style === "lines" ? 0 : 1}" intervalX="${iv}" intervalY="${iv}" offsetX="0" offsetY="0" crossLength="3" gridFrameStyle="${{ zebra: 1, "ticks-in": 2, "ticks-out": 3, "ticks-cross": 4, line: 5 }[g.frameStyle] ?? 0}" gridFrameSideFlags="15" gridFrameWidth="${g.zebraWidth || 1.5}" gridFrameMargin="0" gridFramePenThickness="0.2" gridFramePenColor="${qColor(g.zebraColor || "#000000")}" frameFillColor1="255,255,255,255" frameFillColor2="${qColor(g.zebraColor || "#000000")}" showAnnotation="1" annotationFormat="${g.type === "utm" ? 0 : g.type === "dd" ? 3 : 2}" annotationPrecision="${g.type === "dd" ? g.decimals ?? 2 : 0}" minimumIntervalWidth="50" maximumIntervalWidth="100" topFrameDivisions="0" bottomFrameDivisions="0" leftFrameDivisions="0" rightFrameDivisions="0" leftAnnotationDisplay="${g.labels?.left === false ? 3 : 0}" rightAnnotationDisplay="${g.labels?.right === false ? 3 : 0}" topAnnotationDisplay="${g.labels?.top === false ? 3 : 0}" bottomAnnotationDisplay="${g.labels?.bottom === false ? 3 : 0}" leftAnnotationPosition="1" rightAnnotationPosition="1" topAnnotationPosition="1" bottomAnnotationPosition="1" leftAnnotationDirection="${g.rotateSide ? 1 : 0}" rightAnnotationDirection="${g.rotateSide ? 1 : 0}" topAnnotationDirection="0" bottomAnnotationDirection="0" frameAnnotationDistance="1" unit="0" blendMode="0"><lineStyle><symbol type="line" name="" alpha="1"><layer class="SimpleLine" enabled="1"><Option type="Map"><Option name="line_color" value="${qColor(g.color || "#000000")}" type="QString"/><Option name="line_width" value="${g.width || 0.2}" type="QString"/><Option name="line_style" value="solid" type="QString"/><Option name="capstyle" value="flat" type="QString"/><Option name="line_width_unit" value="MM" type="QString"/></Option></layer></symbol></lineStyle>${qSrs(g.type === "utm" ? (p.view.center[1] < 0 ? 32700 : 32600) + (g.zone || UTM.zoneOf(p.view.center[0])) : 4326)}<text-style fontFamily="${xmlEsc(g.font?.family || "Arial")}" fontSize="${g.font?.size || 6}" fontSizeUnit="Point" fontWeight="${g.font?.bold ? 75 : 50}" fontItalic="0" textColor="${qColor(g.font?.color || "#222222")}" textOpacity="1" multilineHeight="1" multilineHeightUnit="Percentage" namedStyle="" blendMode="0" allowHtml="0" capitalization="0"/></ComposerMapGrid>`;
      }
      out += `<AtlasMap atlasDriven="0" scalingMode="2" margin="0.1"/><labelBlockingItems/></LayoutItem>\n`;
      continue;
    }
    if (it.type === "image" && p.src) {
      const a = qItemAttrs(it, z, { frame: !!p.border?.show, frameColor: p.border?.color, frameW: p.border?.width || 0.3 });
      const data = String(p.src).replace(/^data:[^;]+;base64,/, "");
      out += `<LayoutItem type="${QGIS_TYPES.picture}" ${a.attrs} file="base64:${data}" pictureWidth="${it.w}" pictureHeight="${it.h}" resizeMode="${p.fit === "fill" ? 1 : p.fit === "cover" ? 4 : 0}" anchorPoint="4" svgFillColor="255,255,255,255" svgBorderColor="0,0,0,255" svgBorderWidth="0.2" mode="1" pictureRotation="0" northMode="0" northOffset="0">${a.children}</LayoutItem>\n`;
      continue;
    }
    if (it.type === "shape" && ["rect", "rounded", "ellipse", "circle", "triangle"].includes(p.shape)) {
      const a = qItemAttrs(it, z);
      const st = p.shape === "ellipse" || p.shape === "circle" ? 0 : p.shape === "triangle" ? 2 : 1;
      const fill = p.fillType && p.fillType !== "solid" ? p.fill : p.fill;
      out += `<LayoutItem type="${QGIS_TYPES.shape}" ${a.attrs} shapeType="${st}" cornerRadiusMeasure="${p.shape === "rounded" ? p.radius || 2 : 0},mm">${a.children}${qFillSymbol(fill, p.stroke, p.strokeWidth, 255 * (p.fillOpacity ?? 1))}</LayoutItem>\n`;
      continue;
    }
    if (it.type === "scalebar" && p.style !== "dual") {
      const a = qItemAttrs(it, z);
      const m = linkedMapOf(it);
      const style = p.style === "numeric" ? "Numeric" : /line/.test(p.style || "") ? "Line Ticks Middle" : p.style === "double" ? "Double Box" : "Single Box";
      let unit = p.units === "m" ? "m" : p.units === "km" ? "km" : "";
      let segVal = p.segmentValue || 0;
      if (m && !segVal) {
        const mPerMm = metersPerMm(m);
        const avail = Math.max(5, it.w - textWidthMm("00000 km", p.font) * 0.75);
        const rawM = (avail * mPerMm) / ((p.segments || 4) + (p.leftSegments ? 1 : 0));
        if (!unit) unit = rawM >= 500 ? "km" : "m";
        segVal = niceFloor(rawM / (unit === "km" ? 1000 : 1));
      }
      if (!unit) unit = "km";
      out += `<LayoutItem type="${QGIS_TYPES.scalebar}" ${a.attrs} mapUuid="${m ? maps.get(m.id) : ""}" style="${style}" unitType="${unit}" unitLabel="${xmlEsc(p.unitLabel || unit)}" numSegments="${p.segments || 4}" numSegmentsLeft="${p.leftSegments ? 1 : 0}" numUnitsPerSegment="${segVal}" segmentSizeMode="0" minBarWidth="10" maxBarWidth="${it.w}" numMapUnitsPerScaleBarUnit="1" height="${p.barHeight || 2}" labelBarSpace="1" boxContentSpace="0.5" alignment="0">${a.children}${qTextStyle(p.font)}</LayoutItem>\n`;
      continue;
    }
    if (it.type === "legend") {
      const a = qItemAttrs(it, z, { frame: !!p.border?.show, frameColor: p.border?.color, bg: p.background || null });
      const m = linkedMapOf(it);
      out += `<LayoutItem type="${QGIS_TYPES.legend}" ${a.attrs} title="${xmlEsc(p.title || "")}" map_uuid="${m ? maps.get(m.id) : ""}" columnCount="${p.columns || 1}" splitLayer="0" equalColumnWidth="0" symbolWidth="${p.patchW || 7}" symbolHeight="${p.patchH || 4}" wmsLegendWidth="50" wmsLegendHeight="25" wrapChar="" fontColor="#000000" legendFilterByAtlas="0" resizeToContents="1" titleAlignment="1">${a.children}</LayoutItem>\n`;
      continue;
    }
    // anything else: an embedded SVG picture that looks exactly like the composer item
    const a = qItemAttrs(it, z);
    out += `<LayoutItem type="${QGIS_TYPES.picture}" ${a.attrs} file="base64:${b64(itemAsSvg(it))}" pictureWidth="${it.w}" pictureHeight="${it.h}" resizeMode="1" anchorPoint="0" svgFillColor="255,255,255,255" svgBorderColor="0,0,0,255" svgBorderWidth="0" mode="0" pictureRotation="0" northMode="0" northOffset="0">${a.children}</LayoutItem>\n`;
    embedded += 1;
  }
  out += `<customproperties/>\n</Layout>\n`;
  return { xml: out, embedded };
}
function exportQpt() {
  const { xml, embedded } = layoutToQpt(S.doc);
  downloadBlob(new Blob([xml], { type: "application/xml" }), `${safeName(S.doc.name)}.qpt`);
  toast(`QGIS template saved${embedded ? `; ${embedded} item${embedded > 1 ? "s" : ""} without a QGIS equivalent embedded as SVG pictures` : ""}.`);
}

// ---- import
const UNIT_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8, pt: 25.4 / 72, pica: 25.4 / 6, px: 25.4 / 96 };
function qMeasure(s) {
  const [a, b, u = "mm"] = String(s || "").split(",");
  const k = UNIT_MM[u] || 1;
  return [Number(a) * k, Number(b) * k];
}
function qLen(s, dflt) {
  if (s == null || s === "") return dflt;
  const [v, u = "mm"] = String(s).split(",");
  return Number(v) * (UNIT_MM[u] || 1);
}
function qHex(node) {
  if (!node) return null;
  const c = [node.getAttribute("red"), node.getAttribute("green"), node.getAttribute("blue")].map(Number);
  return rgbToHex(c);
}
function qHexStr(s) {
  const c = String(s || "").split(",").map(Number);
  return c.length >= 3 && c.every(Number.isFinite) ? rgbToHex(c) : null;
}
function qFont(node) {
  const ts = node.querySelector(":scope > text_style");
  if (ts) {
    return font({
      family: ts.getAttribute("fontFamily") || "Arial",
      size: Number(ts.getAttribute("fontSize")) || 10,
      bold: Number(ts.getAttribute("fontWeight")) >= 63,
      italic: ts.getAttribute("fontItalic") === "1",
      color: qHexStr(ts.getAttribute("textColor")) || "#000000",
    });
  }
  const lf = node.querySelector(":scope > LabelFont");
  const d = (lf?.getAttribute("description") || "Arial,10").split(",");
  return font({ family: d[0] || "Arial", size: Number(d[1]) > 0 ? Number(d[1]) : 10, bold: Number(d[4]) >= 63, italic: d[5] === "1", color: qHex(node.querySelector(":scope > FontColor")) || "#000000" });
}
// Map extent to {center, zoom} for a frame w × h mm.
function qExtentToView(ext, authid, w, h) {
  const n = (k) => Number(ext.getAttribute(k));
  const [x0, y0, x1, y1] = [n("xmin"), n("ymin"), n("xmax"), n("ymax")];
  const code = Number(String(authid || "").replace(/^EPSG:/i, ""));
  let toLL;
  if (code === 3857 || code === 900913) toLL = (x, y) => [(x / MERC_R) * (180 / Math.PI), (2 * Math.atan(Math.exp(y / MERC_R)) - Math.PI / 2) * (180 / Math.PI)];
  else if ((code > 32600 && code <= 32660) || (code > 32700 && code <= 32760)) toLL = (x, y) => UTM.inverse(x, y, code % 100, code > 32700);
  else if (code >= 23830 && code <= 23845) toLL = (x, y) => UTM.inverse(x, y, code - 23830 + 46 - (code >= 23838 ? 8 : 0), code >= 23838); // DGN95 / UTM
  else toLL = (x, y) => [x, y]; // EPSG:4326 and geographic CRSs
  const sw = toLL(x0, y0);
  const ne = toLL(x1, y1);
  const b = { west: sw[0], south: sw[1], east: ne[0], north: ne[1] };
  if (![b.west, b.south, b.east, b.north].every(Number.isFinite)) return null;
  const c = toLL((x0 + x1) / 2, (y0 + y1) / 2);
  return { center: [c[0], c[1]], zoom: zoomForBounds(b, w, h) };
}
function qptToLayout(xmlText, fileName) {
  const dom = new DOMParser().parseFromString(xmlText, "application/xml");
  if (dom.querySelector("parsererror")) throw new Error("not a valid XML file");
  const root = dom.querySelector("Layout") || dom.querySelector("Composer");
  if (!root) throw new Error("no <Layout> element (QGIS 3 template expected)");
  const doc = newDoc(root.getAttribute("name") || String(fileName || "QGIS layout").replace(/\.qpt$/i, ""));
  const page = root.querySelector(`PageCollection > LayoutItem[type="${QGIS_TYPES.page}"]`);
  if (page) {
    const [w, h] = qMeasure(page.getAttribute("size"));
    if (w > 0 && h > 0) Object.assign(doc.page, { size: "Custom", orientation: w >= h ? "landscape" : "portrait", width: round(w, 2), height: round(h, 2) });
    const bg = qHexStr(page.querySelector("Option[name=color]")?.getAttribute("value"));
    if (bg) doc.page.background = bg;
  }
  const pageH = doc.page.height;
  const uuidToId = new Map();
  const counts = {};
  const later = [];
  let skipped = 0;
  const nodes = [...root.querySelectorAll(":scope > LayoutItem")].sort((a, b) => Number(a.getAttribute("zValue") || 0) - Number(b.getAttribute("zValue") || 0));
  for (const n of nodes) {
    const type = Number(n.getAttribute("type"));
    let [x, y] = qMeasure(n.getAttribute("position"));
    const [w, h] = qMeasure(n.getAttribute("size"));
    const ref = Number(n.getAttribute("referencePoint") || 0);
    x -= (w * (ref % 3)) / 2;
    y -= (h * Math.floor(ref / 3)) / 2;
    if (y >= pageH + 5) {
      skipped += 1; // items on later pages
      continue;
    }
    const base = (t) => {
      const it = newItem(t, round(x, 2), round(y, 2));
      Object.assign(it, { w: round(Math.max(w, 1), 2), h: round(Math.max(h, 1), 2), rot: Number(n.getAttribute("itemRotation") || 0), hidden: n.getAttribute("visibility") === "0" });
      const name = n.getAttribute("id");
      counts[t] = (counts[t] || 0) + 1;
      it.name = name || `${ITEM_TYPES[t].label} ${counts[t]}`;
      return it;
    };
    const frameOn = n.getAttribute("frame") === "true";
    const frameColor = qHex(n.querySelector(":scope > FrameColor")) || "#000000";
    const frameW = qLen(n.getAttribute("outlineWidthM"), 0.3);
    const bgOn = n.getAttribute("background") === "true";
    const bgColor = qHex(n.querySelector(":scope > BackgroundColor"));
    let it = null;
    if (type === QGIS_TYPES.label) {
      it = base("text");
      const p = it.props;
      p.text = (n.getAttribute("labelText") || "").replace(/\[%\s*@layout_name\s*%\]/g, "{title}").replace(/\[%[^%]*format_date[^%]*%\]/g, "{date}");
      p.font = qFont(n);
      const ha = Number(n.getAttribute("halign") || 1);
      p.align = ha & 4 ? "center" : ha & 2 ? "right" : ha & 8 ? "justify" : "left";
      const va = Number(n.getAttribute("valign") || 32);
      p.valign = va & 128 ? "middle" : va & 64 ? "bottom" : "top";
      p.padding = qLen(n.getAttribute("marginX"), 0);
      p.wrap = true;
      p.background = bgOn && bgColor ? bgColor : "";
      if (p.border) Object.assign(p.border, { show: frameOn, color: frameColor, width: frameW });
    } else if (type === QGIS_TYPES.map) {
      it = base("map");
      const ext = n.querySelector(":scope > Extent");
      const crs = n.querySelector(":scope > crs authid")?.textContent;
      const v = ext && qExtentToView(ext, crs || "EPSG:3857", it.w, it.h);
      if (v) it.props.view = { center: v.center, zoom: v.zoom, bearing: -Number(n.getAttribute("mapRotation") || 0) };
      else viewFromGeoLibre(it);
      Object.assign(it.props.frame, { show: frameOn, color: frameColor, width: frameW });
      if (bgColor) it.props.background = bgColor;
      if (n.querySelector(":scope > ComposerMapGrid[show='1']")) it.props.grid.show = true;
      uuidToId.set(n.getAttribute("uuid"), it.id);
    } else if (type === QGIS_TYPES.picture) {
      const file = n.getAttribute("file") || "";
      it = base("image");
      if (/^base64:/.test(file)) {
        const data = file.slice(7);
        const isSvg = /^PD94|^PHN2/.test(data);
        it.props.src = `data:${isSvg ? "image/svg+xml" : "image/png"};base64,${data}`;
      } else if (/^data:/.test(file)) it.props.src = file;
      else if (/north|arrow/i.test(file)) {
        it = base("north");
      } else it.name = `${it.name} (${file.split(/[\\/]/).pop() || "picture"} — replace the image)`;
      if (it.type === "image") it.props.fit = "contain";
    } else if (type === QGIS_TYPES.shape) {
      it = base("shape");
      const st = Number(n.getAttribute("shapeType") || 1);
      const radius = qLen(n.getAttribute("cornerRadiusMeasure"), 0);
      it.props.shape = st === 0 ? "ellipse" : st === 2 ? "triangle" : radius > 0 ? "rounded" : "rect";
      const fill = n.querySelector("symbol Option[name=color]")?.getAttribute("value");
      const fstyle = n.querySelector("symbol Option[name=style]")?.getAttribute("value");
      const oc = n.querySelector("symbol Option[name=outline_color]")?.getAttribute("value");
      const ow = n.querySelector("symbol Option[name=outline_width]")?.getAttribute("value");
      const ostyle = n.querySelector("symbol Option[name=outline_style]")?.getAttribute("value");
      it.props.fill = fstyle === "no" ? "" : qHexStr(fill) || it.props.fill;
      it.props.stroke = qHexStr(oc) || it.props.stroke;
      it.props.strokeWidth = ostyle === "no" ? 0 : Number(ow) || it.props.strokeWidth;
    } else if (type === QGIS_TYPES.scalebar) {
      it = base("scalebar");
      const style = n.getAttribute("style") || "";
      it.props.style = /numeric/i.test(style) ? "numeric" : /double/i.test(style) ? "double" : /line/i.test(style) ? "line-up" : "single";
      if (!SCALEBAR_STYLES.some((s) => s.id === it.props.style)) it.props.style = SCALEBAR_STYLES[0].id;
      it.props.segments = Number(n.getAttribute("numSegments")) || it.props.segments;
      it.props.leftSegments = Number(n.getAttribute("numSegmentsLeft")) > 0;
      it.props.units = n.getAttribute("unitType") === "m" ? "m" : "km";
      it.props.unitLabel = n.getAttribute("unitLabel") || "";
      it.props.font = qFont(n);
      later.push(() => (it.props.linkedMap = uuidToId.get(n.getAttribute("mapUuid")) || ""));
    } else if (type === QGIS_TYPES.legend) {
      it = base("legend");
      it.props.title = n.getAttribute("title") ?? "Legend";
      // QGIS sizes legends to their content; give ours a usable box
      if (it.w < 20) it.w = 55;
      if (it.h < 20) it.h = 60;
      it.props.autoHeight = true;
      it.props.columns = Number(n.getAttribute("columnCount")) || 1;
      if (it.props.border) Object.assign(it.props.border, { show: frameOn, color: frameColor, width: frameW });
      it.props.background = bgOn && bgColor ? bgColor : "";
      later.push(() => (it.props.linkedMap = uuidToId.get(n.getAttribute("map_uuid")) || ""));
    } else if (type === QGIS_TYPES.polygon || type === QGIS_TYPES.polyline) {
      const pts = [...n.querySelectorAll(":scope > nodes > node")].map((nd) => [Number(nd.getAttribute("x")), Number(nd.getAttribute("y"))]);
      if (pts.length >= 2 && ITEM_TYPES.path) {
        it = base("path");
        it.props.points = pts.map(([px, py]) => [round(px / it.w, 4), round(py / it.h, 4)]);
        it.props.closed = type === QGIS_TYPES.polygon;
      } else skipped += 1;
    } else {
      skipped += 1; // HTML frames, attribute tables (multi frames), 3D maps, elevation profiles…
    }
    if (it) doc.items.push(it);
  }
  later.forEach((f) => f());
  const multi = root.querySelectorAll(":scope > LayoutMultiFrame").length;
  return { doc, skipped: skipped + multi };
}
function importQpt() {
  const input = el("input", { type: "file", accept: ".qpt,application/xml,text/xml" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const { doc, skipped } = qptToLayout(await file.text(), file.name);
      newLayout(doc);
      for (const lg of doc.items) if (lg.type === "legend") syncLegendEntries(lg);
      renderAll();
      toast(`QGIS template imported: ${doc.items.length} item${doc.items.length === 1 ? "" : "s"}${skipped ? `, ${skipped} not supported (tables, HTML, 3D or extra pages)` : ""}.`);
    } catch (e) {
      toast(`Could not import the QGIS template: ${e.message}`, "warn");
    }
  });
  input.click();
}
