// ---------------------------------------------------------------- general build
// The registry ("general") build leaves out Ask AI / the Live MCP Bridge API
// (06f, 06g) and the Map Tools on GeoLibre's map (10, 10b). These stand-ins keep
// the shared code paths working without them. See tools/build.py --general.

const AI = { open: false };
function buildAiChat() {
  return null;
}
function setAiOpen() {}
function aiNewSession() {}
function connectAiChat() {}
function aiExportCard() {}

// Map Series needs feature extents; Map Tools defined this helper.
function mtBBox(features) {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      w = Math.min(w, c[0]);
      e = Math.max(e, c[0]);
      s = Math.min(s, c[1]);
      n = Math.max(n, c[1]);
    } else c.forEach(walk);
  };
  for (const f of features) if (f?.geometry?.coordinates) walk(f.geometry.coordinates);
  return Number.isFinite(w) ? [w, s, e, n] : null;
}
function mtRoot() {
  return null;
}
function mtGroups() {
  return [];
}
