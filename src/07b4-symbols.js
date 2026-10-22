// ---------------------------------------------------------------- Symbol dialog (Word's Insert > Symbol)
// Unicode subsets with several thousand characters, symbol fonts, a character
// code box, recently used symbols and a Special Characters tab. Inserts at the
// cursor of the text being edited, into the selected text, or as a new text.

const SYMBOL_FONTS = ["(normal text)", "Arial", "Times New Roman", "Segoe UI Symbol", "Cambria Math", "Wingdings", "Wingdings 2", "Wingdings 3", "Webdings", "Symbol"];
// symbol fonts map plain character codes to pictures: their own subset
const SYMBOL_FONT_ONLY = /^(Wingdings|Webdings|Symbol)/;
const MAP_SYMBOLS = "▲△▴▵◆◇◈●○◎◉◌◍■□▣▢▪▫★☆✦✧✩✪✫✬✭✮✯✰⊕⊗⊙⊚⊛⊞⊠⌖✚✛✜✠✝✞✟☩☦☨☪☫☬☸♨⚓⚑⚐⚒⚔⚕⚖⚘⚙⚜⚠⚡⛏⛑⛔⛪⛫⛬⛭⛯⛰⛱⛲⛳⛴⛵⛶⛷⛸⛹⛺⛻⛼⛽⛾⛿✈⌂⌘⌛⏚⏛∿≈≋〰⩯⩰♒";
const SYMBOL_SUBSETS = [
  ["Map & GIS", [...MAP_SYMBOLS]],
  ["Latin-1 Supplement", [0xa1, 0xff]],
  ["Latin Extended-A", [0x100, 0x17f]],
  ["Spacing Modifier Letters", [0x2b0, 0x2ff]],
  ["Greek and Coptic", [0x391, 0x3a1, 0x3a3, 0x3c9]],
  ["Cyrillic", [0x401, 0x45f]],
  ["General Punctuation", [0x2010, 0x205e]],
  ["Superscripts and Subscripts", [0x2070, 0x2071, 0x2074, 0x208e, 0x2090, 0x209c]],
  ["Currency Symbols", [0x20a0, 0x20c0]],
  ["Letterlike Symbols", [0x2100, 0x214f]],
  ["Number Forms", [0x2150, 0x218b]],
  ["Arrows", [0x2190, 0x21ff]],
  ["Mathematical Operators", [0x2200, 0x22ff]],
  ["Miscellaneous Technical", [0x2300, 0x23ff]],
  ["Enclosed Alphanumerics", [0x2460, 0x24ff]],
  ["Box Drawing", [0x2500, 0x257f]],
  ["Block Elements", [0x2580, 0x259f]],
  ["Geometric Shapes", [0x25a0, 0x25ff]],
  ["Miscellaneous Symbols", [0x2600, 0x26ff]],
  ["Dingbats", [0x2701, 0x27bf]],
  ["Misc. Mathematical Symbols-A", [0x27c0, 0x27ef]],
  ["Supplemental Arrows-A", [0x27f0, 0x27ff]],
  ["Supplemental Arrows-B", [0x2900, 0x297f]],
  ["Misc. Mathematical Symbols-B", [0x2980, 0x29ff]],
  ["Supplemental Math Operators", [0x2a00, 0x2aff]],
  ["Misc. Symbols and Arrows", [0x2b00, 0x2b73, 0x2b76, 0x2bff]],
  ["CJK Symbols and Punctuation", [0x3001, 0x303f]],
  ["Enclosed CJK Letters and Months", [0x3248, 0x325f, 0x32b1, 0x32bf]],
];
const SPECIAL_CHARS = [
  ["—", "Em Dash"], ["–", "En Dash"], ["‑", "Nonbreaking Hyphen"], ["­", "Optional Hyphen"],
  [" ", "Em Space"], [" ", "En Space"], [" ", "¼ Em Space"], [" ", "Nonbreaking Space"],
  ["©", "Copyright"], ["®", "Registered"], ["™", "Trademark"], ["§", "Section"], ["¶", "Paragraph"],
  ["…", "Ellipsis"], ["‘", "Single Opening Quote"], ["’", "Single Closing Quote"], ["“", "Double Opening Quote"], ["”", "Double Closing Quote"],
  ["°", "Degree"], ["′", "Prime (minutes)"], ["″", "Double Prime (seconds)"], ["±", "Plus-Minus"], ["×", "Multiplication"], ["÷", "Division"],
  ["²", "Superscript Two (km²)"], ["³", "Superscript Three (m³)"], ["‰", "Per Mille"], ["µ", "Micro"], ["€", "Euro"], ["•", "Bullet"],
];
const RECENT_SYM_KEY = "glc:recentsym";

function subsetChars(range) {
  if (typeof range[0] === "string") return range;
  const out = [];
  for (let i = 0; i < range.length; i += 2) for (let c = range[i]; c <= range[i + 1]; c++) out.push(String.fromCodePoint(c));
  return out;
}
function recentSymbols() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SYM_KEY) || "[]");
  } catch {
    return [];
  }
}

function openSymbolDialog() {
  closePopover();
  S.ui.root.querySelector(`.${NS}-modal.${NS}-symmodal`)?.remove();
  // the text being typed in keeps its cursor while the dialog is open
  const ta = S.ui.textArea && document.body.contains(S.ui.textArea) ? S.ui.textArea : null;
  const caret = ta ? [ta.selectionStart, ta.selectionEnd] : null;
  let tab = "symbols";
  let font = "(normal text)";
  let subset = 0;
  let picked = { ch: "", font: "(normal text)" };
  const overlay = el("div", { class: `${NS}-modal ${NS}-symmodal` });
  const dlg = el("div", { class: `${NS}-dlg ${NS}-symdlg`, role: "dialog", "aria-label": "Symbol" });
  overlay.appendChild(dlg);
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDlg, true);
  };
  const onKeyDlg = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "Enter" && picked.ch && document.activeElement?.tagName !== "SELECT") {
      e.preventDefault();
      insert();
    }
  };
  document.addEventListener("keydown", onKeyDlg, true);
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());

  const insert = () => {
    const ch = picked.ch;
    if (!ch) return;
    const fam = picked.font === "(normal text)" ? null : picked.font;
    const recent = [{ ch, font: picked.font }, ...recentSymbols().filter((r) => !(r.ch === ch && r.font === picked.font))].slice(0, 20);
    try {
      localStorage.setItem(RECENT_SYM_KEY, JSON.stringify(recent));
    } catch {}
    const sel = selectedItems()[0];
    if (ta && document.body.contains(ta) && !fam) {
      ta.focus();
      if (caret) ta.setSelectionRange(caret[0], caret[1]);
      insertAtCaret(ta, `${ch}|`);
      caret[0] = caret[1] = ta.selectionStart;
    } else if (sel?.type === "text" && !fam) {
      commit(() => (sel.props.text = `${sel.props.text || ""}${ch}`));
    } else {
      // a new text holding the symbol, in the symbol font when one was chosen
      const pg = S.doc.page;
      const it = newItem("text", pg.width / 2 - 10, pg.height / 2 - 8);
      Object.assign(it, { w: 20, name: `Symbol ${ch}` });
      it.props.text = ch;
      it.props.align = "center";
      it.props.autoSize = "width";
      it.props.font.size = 28;
      if (fam) it.props.font.family = fam;
      commit(() => S.doc.items.push(it));
      select([it.id]);
    }
    draw();
  };

  const body = el("div", { class: `${NS}-dlgbody ${NS}-symbody` });
  const draw = () => {
    const tabs = el("div", { class: `${NS}-symtabs2` },
      ...[["symbols", "Symbols"], ["special", "Special Characters"]].map(([id, l]) => el("button", { type: "button", class: tab === id ? "active" : "", onclick: () => { tab = id; draw(); } }, l)));
    if (tab === "special") {
      const list = el("div", { class: `${NS}-speclist` }, ...SPECIAL_CHARS.map(([ch, name]) => {
        const b = el("button", { type: "button", class: picked.ch === ch ? "active" : "" }, el("span", { class: `${NS}-specch` }, ch.trim() ? ch : "·"), el("span", {}, name));
        b.addEventListener("click", () => { picked = { ch, font: "(normal text)" }; draw(); });
        b.addEventListener("dblclick", () => { picked = { ch, font: "(normal text)" }; insert(); });
        return b;
      }));
      body.replaceChildren(tabs, list);
      return;
    }
    const symFont = SYMBOL_FONT_ONLY.test(font);
    const fontSel = el("select", { class: `${NS}-input` }, ...SYMBOL_FONTS.map((f) => el("option", { value: f, selected: f === font }, f)));
    fontSel.addEventListener("change", () => { font = fontSel.value; draw(); });
    const subSel = el("select", { class: `${NS}-input`, disabled: symFont }, ...(symFont ? [el("option", {}, "Font characters")] : SYMBOL_SUBSETS.map(([n], i) => el("option", { value: i, selected: i === subset }, n))));
    subSel.addEventListener("change", () => { subset = Number(subSel.value); draw(); });
    const chars = symFont ? subsetChars([0x21, 0x7e, 0xa1, 0xff]) : subsetChars(SYMBOL_SUBSETS[subset][1]);
    const css = (f) => (f === "(normal text)" ? "" : `font-family:"${f}"`);
    const grid = el("div", { class: `${NS}-symgrid2` }, ...chars.map((ch) => {
      const b = el("button", { type: "button", class: picked.ch === ch && picked.font === font ? "active" : "", title: `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`, style: css(font) }, ch);
      b.addEventListener("click", () => { picked = { ch, font }; draw(); });
      b.addEventListener("dblclick", () => { picked = { ch, font }; insert(); });
      return b;
    }));
    const recent = recentSymbols();
    const recentRow = el("div", { class: `${NS}-symrecent` }, ...(recent.length ? recent.map((r) => {
      const b = el("button", { type: "button", style: css(r.font), title: r.font === "(normal text)" ? "" : r.font }, r.ch);
      b.addEventListener("click", () => { picked = { ...r }; draw(); });
      b.addEventListener("dblclick", () => { picked = { ...r }; insert(); });
      return b;
    }) : [el("span", { class: `${NS}-muted` }, "Symbols you insert appear here.")]));
    const cp = picked.ch ? picked.ch.codePointAt(0) : null;
    const code = el("input", { class: `${NS}-input ${NS}-symcode`, value: cp != null ? cp.toString(16).toUpperCase().padStart(4, "0") : "", placeholder: "25E6", spellcheck: "false" });
    // typing a code jumps to its subset (Word's Character code box)
    code.addEventListener("change", () => {
      const n = parseInt(code.value.trim().replace(/^u\+/i, ""), 16);
      if (!Number.isFinite(n) || n < 0x20 || n > 0x10ffff) return;
      const ch = String.fromCodePoint(n);
      const at = SYMBOL_SUBSETS.findIndex(([, r]) => subsetChars(r).includes(ch));
      if (at >= 0) subset = at;
      font = "(normal text)";
      picked = { ch, font };
      draw();
    });
    body.replaceChildren(
      tabs,
      el("div", { class: `${NS}-symtop` }, el("label", {}, "Font:", fontSel), el("label", {}, "Subset:", subSel)),
      grid,
      el("div", { class: `${NS}-dlglabel` }, "Recently used symbols:"),
      recentRow,
      el("div", { class: `${NS}-symfoot` },
        el("span", { class: `${NS}-sympreview`, style: css(picked.font) }, picked.ch || " "),
        el("span", { class: `${NS}-muted` }, cp != null ? `U+${cp.toString(16).toUpperCase().padStart(4, "0")} · decimal ${cp}` : "Pick a symbol"),
        el("label", {}, "Character code:", code, el("span", { class: `${NS}-muted` }, "Unicode (hex)")),
      ),
    );
    grid.querySelector("button.active")?.scrollIntoView({ block: "nearest" });
  };
  draw();
  dlg.append(
    el("div", { class: `${NS}-dlghead` }, el("div", { class: `${NS}-dlgtitle` }, "Symbol"), iconBtn("close", "Close (Esc)", close)),
    body,
    el("div", { class: `${NS}-dlgfoot` },
      el("button", { type: "button", class: `${NS}-btn primary`, onclick: insert }, "Insert"),
      el("button", { type: "button", class: `${NS}-btn`, onclick: close }, "Close"),
    ),
  );
  S.ui.root.appendChild(overlay);
}
