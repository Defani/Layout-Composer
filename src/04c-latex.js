// ---------------------------------------------------------------- LaTeX (MathJax)
// Formulas render through MathJax 3 (SVG output, no font cache) so each formula
// becomes self-contained vector paths that work on screen, in PNG/PDF and in SVG.
// MathJax (bundled) starts on first use; until then the plain text is drawn as a stand-in.
const MATH = { promise: null, ready: false, failed: false, cache: new Map() };

function loadMathJax() {
  if (MATH.ready) return Promise.resolve();
  if (MATH.promise) return MATH.promise;
  MATH.promise = new Promise((resolve, reject) => {
    if (window.MathJax?.tex2svg) {
      MATH.ready = true;
      return resolve();
    }
    if (!window.MathJax) {
      // no menu, no extra components: MathJax never fetches anything
      window.MathJax = { loader: { load: [] }, svg: { fontCache: "none" }, startup: { typeset: false }, options: { enableMenu: false } };
    }
    loadVendorScript("mathjax").then(
      () =>
        (window.MathJax.startup?.promise || Promise.resolve()).then(() => {
          MATH.ready = !!window.MathJax?.tex2svg;
          if (MATH.ready) resolve();
          else reject(new Error("MathJax did not start"));
        }),
      (e) => {
        MATH.failed = true;
        MATH.promise = null;
        reject(e);
      },
    );
  });
  MATH.promise.then(
    () => {
      MATH.cache.clear();
      if (S.open) scheduleOverlayRefresh(true);
    },
    (e) => toast(e.message, "warn"),
  );
  return MATH.promise;
}

const hasMath = (s) => /\$[^$]+\$/.test(String(s ?? ""));

// "Area ($km^2$)" -> "\text{Area (}km^2\text{)}"
function textToTex(str) {
  const parts = String(str).split(/(\$[^$]*\$)/);
  return parts
    .map((p) => {
      if (/^\$[^$]*\$$/.test(p)) return p.slice(1, -1);
      if (!p) return "";
      return `\\text{${p.replace(/[{}]/g, "")}}`;
    })
    .join("");
}

// Render TeX once and cache: {inner, minX, minY, w, h} in MathJax units (1000 = 1 em).
function texToSvg(tex, display = false) {
  const key = `${display ? "D" : "I"}|${tex}`;
  if (MATH.cache.has(key)) return MATH.cache.get(key);
  if (!MATH.ready) {
    loadMathJax().catch(() => {});
    return null;
  }
  let res;
  try {
    const node = window.MathJax.tex2svg(tex, { display });
    const svg = node.querySelector("svg");
    const vb = (svg.getAttribute("viewBox") || "0 0 0 0").split(/\s+/).map(Number);
    const err = svg.querySelector("[data-mjx-error]");
    res = { inner: svg.innerHTML, minX: vb[0], minY: vb[1], w: vb[2], h: vb[3], error: err ? err.getAttribute("data-mjx-error") : "" };
  } catch (e) {
    res = { inner: "", minX: 0, minY: 0, w: 0, h: 0, error: e.message };
  }
  MATH.cache.set(key, res);
  return res;
}

// A single line of text that may contain $...$ math. Returns {svg, width} in mm,
// positioned with its baseline at y. anchor: start | middle | end.
function richLine(str, x, y, f, anchor = "start", extraAttrs = "") {
  const text = String(str ?? "");
  if (!hasMath(text)) {
    return { svg: `<text x="${round(x, 3)}" y="${round(y, 3)}" text-anchor="${anchor}" ${fontAttrs(f)} ${extraAttrs}>${esc(text)}</text>`, width: textWidthMm(text, f) };
  }
  const m = texToSvg(textToTex(text));
  if (!m || m.error) {
    const plain = text.replace(/\$/g, "");
    const fill = m?.error ? `fill="#b91c1c"` : "";
    return { svg: `<text x="${round(x, 3)}" y="${round(y, 3)}" text-anchor="${anchor}" ${fontAttrs(f)} ${fill}>${esc(plain)}</text>`, width: textWidthMm(plain, f) };
  }
  const size = (f.size || 10) * PT;
  const w = (m.w / 1000) * size;
  const h = (m.h / 1000) * size;
  const top = y + (m.minY / 1000) * size;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return {
    svg: `<svg x="${round(left, 3)}" y="${round(top, 3)}" width="${round(w, 3)}" height="${round(h, 3)}" viewBox="${m.minX} ${m.minY} ${m.w} ${m.h}" overflow="visible" color="${esc(f.color || "#000")}" fill="${esc(f.color || "#000")}">${m.inner}</svg>`,
    width: w,
  };
}

// ---------------------------------------------------------------- formula item
ITEM_TYPES.latex = {
  label: "Formula (LaTeX)",
  icon: "sigma",
  size: [50, 14],
  defaults: () => ({
    tex: "R^2 = 0.95",
    display: true,
    size: 14,
    color: "#111111",
    align: "center",
    valign: "middle",
    padding: 1,
    background: "",
    bgOpacity: 1,
    border: { show: false, color: "#333333", width: 0.3, radius: 0 },
  }),
};

RENDERERS.latex = function latex(item, ctx) {
  const p = item.props;
  let out = "";
  if (p.background) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border?.radius || 0}" fill="${esc(p.background)}" fill-opacity="${p.bgOpacity ?? 1}"/>`;
  const tex = resolveVars(p.tex || "", item);
  const m = tex.trim() ? texToSvg(tex, !!p.display) : null;
  const pad = p.padding || 0;
  if (!m) {
    out += `<text x="${item.w / 2}" y="${item.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Times New Roman, serif" font-style="italic" font-size="${round((p.size || 12) * PT, 3)}" fill="${esc(p.color)}">${esc(tex || (ctx.export ? "" : "(empty formula)"))}</text>`;
  } else if (m.error) {
    out += `<text x="2" y="${round(item.h / 2, 3)}" dominant-baseline="central" font-family="Arial" font-size="2.6" fill="#b91c1c">LaTeX error: ${esc(m.error)}</text>`;
  } else {
    const size = (p.size || 12) * PT;
    const w = (m.w / 1000) * size;
    const h = (m.h / 1000) * size;
    const x = p.align === "left" ? pad : p.align === "right" ? item.w - pad - w : (item.w - w) / 2;
    const y = p.valign === "top" ? pad : p.valign === "bottom" ? item.h - pad - h : (item.h - h) / 2;
    out += `<svg x="${round(x, 3)}" y="${round(y, 3)}" width="${round(w, 3)}" height="${round(h, 3)}" viewBox="${m.minX} ${m.minY} ${m.w} ${m.h}" overflow="visible" color="${esc(p.color)}" fill="${esc(p.color)}">${m.inner}</svg>`;
    S.legendCache.set(item.id, h + pad * 2);
    S.mathWidth = S.mathWidth || new Map();
    S.mathWidth.set(item.id, w + pad * 2);
  }
  if (p.border?.show) out += `<rect width="${item.w}" height="${item.h}" rx="${p.border.radius || 0}" fill="none" stroke="${esc(p.border.color)}" stroke-width="${p.border.width}"/>`;
  return out;
};

// ---------------------------------------------------------------- symbol catalog
const LATEX_SYMBOLS = {
  Greek: [
    ["α", "\\alpha"], ["β", "\\beta"], ["γ", "\\gamma"], ["δ", "\\delta"], ["ε", "\\epsilon"], ["ζ", "\\zeta"], ["η", "\\eta"], ["θ", "\\theta"],
    ["ι", "\\iota"], ["κ", "\\kappa"], ["λ", "\\lambda"], ["μ", "\\mu"], ["ν", "\\nu"], ["ξ", "\\xi"], ["π", "\\pi"], ["ρ", "\\rho"],
    ["σ", "\\sigma"], ["τ", "\\tau"], ["υ", "\\upsilon"], ["φ", "\\phi"], ["χ", "\\chi"], ["ψ", "\\psi"], ["ω", "\\omega"], ["Γ", "\\Gamma"],
    ["Δ", "\\Delta"], ["Θ", "\\Theta"], ["Λ", "\\Lambda"], ["Ξ", "\\Xi"], ["Π", "\\Pi"], ["Σ", "\\Sigma"], ["Υ", "\\Upsilon"], ["Φ", "\\Phi"],
    ["Ψ", "\\Psi"], ["Ω", "\\Omega"],
  ],
  Operators: [
    ["±", "\\pm"], ["∓", "\\mp"], ["×", "\\times"], ["÷", "\\div"], ["·", "\\cdot"], ["√", "\\sqrt{}"], ["∑", "\\sum_{i=1}^{n}"], ["∏", "\\prod_{i=1}^{n}"],
    ["∫", "\\int_{}^{}"], ["∮", "\\oint"], ["∂", "\\partial"], ["∇", "\\nabla"], ["∞", "\\infty"], ["≈", "\\approx"], ["≠", "\\neq"], ["≤", "\\leq"],
    ["≥", "\\geq"], ["≡", "\\equiv"], ["∝", "\\propto"], ["∼", "\\sim"], ["≅", "\\cong"], ["⊥", "\\perp"], ["∥", "\\parallel"], ["∠", "\\angle"],
    ["°", "^{\\circ}"], ["′", "\\prime"],
  ],
  Units: [
    ["m²", "m^{2}"], ["m⁻²", "m^{-2}"], ["km²", "km^{2}"], ["cm³", "cm^{3}"], ["ha⁻¹", "ha^{-1}"], ["Mg ha⁻¹", "Mg\\,ha^{-1}"], ["g C m⁻²", "g\\,C\\,m^{-2}"],
    ["g cm⁻³", "g\\,cm^{-3}"], ["kg m⁻³", "kg\\,m^{-3}"], ["W m⁻² sr⁻¹ µm⁻¹", "W\\,m^{-2}\\,sr^{-1}\\,\\mu m^{-1}"], ["µm", "\\mu m"], ["nm", "nm"],
    ["°C", "^{\\circ}C"], ["%", "\\%"], ["‰", "\\text{‰}"], ["R²", "R^{2}"], ["p<.05", "p < 0.05"], ["n=", "n = "], ["x̄", "\\bar{x}"], ["σ", "\\sigma"],
    ["×10ⁿ", "\\times 10^{n}"],
  ],
  Arrows: [
    ["→", "\\rightarrow"], ["←", "\\leftarrow"], ["↔", "\\leftrightarrow"], ["⇒", "\\Rightarrow"], ["⇔", "\\Leftrightarrow"], ["↑", "\\uparrow"], ["↓", "\\downarrow"], ["↦", "\\mapsto"],
  ],
  "Sets & logic": [
    ["∈", "\\in"], ["∉", "\\notin"], ["⊂", "\\subset"], ["⊆", "\\subseteq"], ["∪", "\\cup"], ["∩", "\\cap"], ["∀", "\\forall"], ["∃", "\\exists"],
    ["¬", "\\neg"], ["∧", "\\wedge"], ["∨", "\\vee"], ["∅", "\\emptyset"], ["ℝ", "\\mathbb{R}"], ["ℕ", "\\mathbb{N}"], ["ℤ", "\\mathbb{Z}"],
  ],
};
// Structure templates: "|" marks where the caret lands.
const LATEX_TEMPLATES = [
  ["a/b", "Fraction", "\\frac{|}{}"],
  ["x²", "Superscript", "^{|}"],
  ["xᵢ", "Subscript", "_{|}"],
  ["√x", "Square root", "\\sqrt{|}"],
  ["ⁿ√x", "n-th root", "\\sqrt[n]{|}"],
  ["∑", "Sum", "\\sum_{i=1}^{n} |"],
  ["∏", "Product", "\\prod_{i=1}^{n} |"],
  ["∫", "Integral", "\\int_{a}^{b} | \\,dx"],
  ["lim", "Limit", "\\lim_{x \\to \\infty} |"],
  ["v⃗", "Vector", "\\vec{|}"],
  ["x̄", "Overline", "\\overline{|}"],
  ["x̂", "Hat", "\\hat{|}"],
  ["(n k)", "Binomial", "\\binom{|}{k}"],
  ["[ ]", "2×2 matrix", "\\begin{bmatrix} | & b \\\\ c & d \\end{bmatrix}"],
  ["Aa", "Upright text", "\\mathrm{|}"],
];
const RECENT_KEY = "glc:latex-recent";
function recentFormulas() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function rememberFormula(tex) {
  const t = String(tex || "").trim();
  if (!t) return;
  try {
    const list = [t, ...recentFormulas().filter((x) => x !== t)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}
// Insert a snippet into a textarea at the caret ("|" = caret position).
function insertAtCaret(ta, snippet) {
  const caret = snippet.indexOf("|");
  const clean = snippet.replace("|", "");
  const a = ta.selectionStart ?? ta.value.length;
  const b = ta.selectionEnd ?? a;
  const selected = ta.value.slice(a, b);
  const insert = caret >= 0 && selected ? clean.slice(0, caret) + selected + clean.slice(caret) : clean;
  ta.value = ta.value.slice(0, a) + insert + ta.value.slice(b);
  const pos = a + (caret >= 0 ? caret + selected.length : insert.length);
  ta.focus();
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
function symbolCatalog(ta, { mathWrap = false } = {}) {
  const wrap = el("div", { class: `${NS}-symcat` });
  const search = el("input", { type: "search", class: `${NS}-input`, placeholder: "Search symbols (e.g. alpha, km, arrow)" });
  const tabs = el("div", { class: `${NS}-symtabs` });
  const grid = el("div", { class: `${NS}-symgrid` });
  let cat = "Greek";
  const put = (code) => insertAtCaret(ta, mathWrap ? `$${code}$` : code);
  const draw = () => {
    grid.innerHTML = "";
    const q = search.value.trim().toLowerCase();
    const list = q ? Object.values(LATEX_SYMBOLS).flat().filter(([g, c]) => g.toLowerCase().includes(q) || c.toLowerCase().includes(q)) : LATEX_SYMBOLS[cat];
    for (const [glyph, code] of list) {
      const b = el("button", { type: "button", class: `${NS}-sym`, title: code }, glyph);
      b.addEventListener("click", () => put(code));
      grid.appendChild(b);
    }
    for (const t of tabs.children) t.classList.toggle("active", !q && t.dataset.cat === cat);
  };
  for (const name of Object.keys(LATEX_SYMBOLS)) {
    const t = el("button", { type: "button", "data-cat": name }, name);
    t.addEventListener("click", () => {
      cat = name;
      search.value = "";
      draw();
    });
    tabs.appendChild(t);
  }
  search.addEventListener("input", draw);
  draw();
  wrap.append(search, tabs, grid);
  return wrap;
}
function templateButtons(ta, { mathWrap = false } = {}) {
  const box = el("div", { class: `${NS}-texttpl` });
  for (const [glyph, name, code] of LATEX_TEMPLATES) {
    const b = el("button", { type: "button", title: `${name}: ${code.replace("|", "…")}` }, glyph);
    b.addEventListener("click", () => insertAtCaret(ta, mathWrap ? `$${code}$` : code));
    box.appendChild(b);
  }
  return box;
}
