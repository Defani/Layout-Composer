// ---------------------------------------------------------------- chart ribbon
// Format tab for charts: type gallery (Plotly kinds), data (layer or typed
// rows), and look (style, colors, labels, legend, title).

const CHART_KIND_ICONS = {
  donut: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="30 20"/>',
  pie: '<path d="M12 4a8 8 0 1 0 8 8h-8z" fill="currentColor" opacity=".5"/><path d="M14 2a8 8 0 0 1 8 8h-8z" fill="currentColor"/>',
  bar: '<path d="M5 20V12M10 20V6M15 20V10M20 20V4" stroke="currentColor" stroke-width="3.2"/>',
  hbar: '<path d="M4 5h10M4 10h16M4 15h7M4 20h13" stroke="currentColor" stroke-width="3.2"/>',
  line: '<path d="M3 18l5-6 4 3 5-8 4 4" fill="none" stroke="currentColor" stroke-width="2"/>',
  area: '<path d="M3 20V16l5-6 4 3 5-8 4 4v11z" fill="currentColor" opacity=".55"/>',
  scatter: '<circle cx="6" cy="16" r="2" fill="currentColor"/><circle cx="11" cy="9" r="2" fill="currentColor"/><circle cx="16" cy="13" r="2" fill="currentColor"/><circle cx="19" cy="6" r="2" fill="currentColor"/>',
  lollipop: '<path d="M6 20V12M12 20V7M18 20V10" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="11" r="2.3" fill="currentColor"/><circle cx="12" cy="6" r="2.3" fill="currentColor"/><circle cx="18" cy="9" r="2.3" fill="currentColor"/>',
  bubble: '<circle cx="8" cy="14" r="5" fill="currentColor" opacity=".5"/><circle cx="16" cy="9" r="3.5" fill="currentColor" opacity=".8"/><circle cx="18" cy="17" r="2" fill="currentColor"/>',
  funnel: '<path d="M3 5h18M6 10h12M8.5 15h7M10.5 20h3" stroke="currentColor" stroke-width="3"/>',
  funnelarea: '<path d="M3 4h18l-5 8v8h-8v-8z" fill="currentColor" opacity=".6"/>',
  treemap: '<rect x="3" y="3" width="10" height="18" fill="currentColor" opacity=".7"/><rect x="14" y="3" width="7" height="9" fill="currentColor" opacity=".45"/><rect x="14" y="13" width="7" height="8" fill="currentColor" opacity=".25"/>',
  sunburst: '<circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="14 4" opacity=".6"/>',
  icicle: '<rect x="3" y="3" width="18" height="5" fill="currentColor"/><rect x="3" y="9" width="10" height="12" fill="currentColor" opacity=".6"/><rect x="14" y="9" width="7" height="12" fill="currentColor" opacity=".35"/>',
  rose: '<path d="M12 12L12 3A9 9 0 0 1 19 8z" fill="currentColor"/><path d="M12 12L18 16A7 7 0 0 1 9 18z" fill="currentColor" opacity=".55"/><path d="M12 12L6 15A6 6 0 0 1 7 8z" fill="currentColor" opacity=".3"/>',
  radar: '<path d="M12 3l8 6-3 10H7L4 9z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/><path d="M12 6l5 4-2 6H9l-2-5z" fill="currentColor" opacity=".6"/>',
  waterfall: '<path d="M4 20v-6h4v6M9 14V8h4v6M14 8V5h4v15" fill="none" stroke="currentColor" stroke-width="2"/>',
  histogram: '<path d="M3 20V14h4V8h4V4h4v7h4v9z" fill="currentColor" opacity=".6"/>',
  box: '<path d="M8 4v4M8 16v4M6 4h4M6 20h4" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="8" width="6" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 6v3M16 15v3" stroke="currentColor" stroke-width="1.5"/><rect x="13.5" y="9" width="5" height="6" fill="currentColor" opacity=".5"/>',
  violin: '<path d="M8 3c-3 5 3 6 0 9s3 6 0 9c-3-3 3-6 0-9s3-4 0-9z" fill="currentColor" opacity=".6"/><path d="M16 5c-2 4 2 5 0 7s2 4 0 7c-2-3 2-5 0-7s2-3 0-7z" fill="currentColor" opacity=".35"/>',
  heatbar: '<rect x="3" y="8" width="4.5" height="8" fill="currentColor" opacity=".25"/><rect x="7.5" y="8" width="4.5" height="8" fill="currentColor" opacity=".5"/><rect x="12" y="8" width="4.5" height="8" fill="currentColor" opacity=".75"/><rect x="16.5" y="8" width="4.5" height="8" fill="currentColor"/>',
};
const chartKindIcon = (k, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${CHART_KIND_ICONS[k] || ""}</svg>`;

function openChartDataEditor(item) {
  closePopover();
  S.ui.root.querySelector(`.${NS}-modal.${NS}-chartdatamodal`)?.remove();
  const p = item.props;
  const overlay = el("div", { class: `${NS}-modal ${NS}-chartdatamodal` });
  const close = () => overlay.remove();
  const ta = el("textarea", { class: `${NS}-input ${NS}-code`, rows: 12, spellcheck: "false" });
  ta.value = p.manual || "";
  ta.addEventListener("input", () => liveSet(item, "props.manual", ta.value, () => refreshCanvas()));
  overlay.appendChild(el("div", { class: `${NS}-dlg ${NS}-codedlg`, role: "dialog", "aria-label": "Chart data" },
    el("div", { class: `${NS}-dlghead` }, el("div", {}, el("div", { class: `${NS}-dlgtitle` }, "Chart data"), el("div", { class: `${NS}-dlgsub` }, "One row per line: label, value — paste straight from Excel works too")), iconBtn("close", "Close", close)),
    el("div", { class: `${NS}-dlgbody ${NS}-codebody` }, ta),
    el("div", { class: `${NS}-dlgfoot` }, el("button", { type: "button", class: `${NS}-btn primary`, onclick: close }, "Done")),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
  ta.focus();
}

function chartRibbon(item) {
  const p = item.props;
  const rerender = () => {
    refreshCanvas();
    renderProps();
    renderQuickBar();
  };
  const set = (path, v) => liveSet(item, path, v, rerender);
  const sel = (path, opts, title, after) => {
    const cur = getPath(item, path);
    const s = el("select", { class: `${NS}-input ${NS}-qcase`, title }, ...opts.map(([v, l]) => el("option", { value: v, selected: String(cur ?? "") === String(v) }, l)));
    s.addEventListener("change", () => {
      liveSet(item, path, s.value, rerender);
      after?.();
    });
    return s;
  };
  const txt = (label, title, onClick, active = false) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${active ? "active" : ""}`, title, onclick: onClick }, label);
  const tag = (t) => el("span", { class: `${NS}-qtag` }, t);
  const rowOf = (...c) => el("div", { class: `${NS}-rrow` }, ...c.filter(Boolean));
  const group = (caption, ...rows) => el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrows` }, ...rows), el("div", { class: `${NS}-rcap` }, caption));
  const classic = (p.engine === "native" || (!p.engine && p.dataSource !== "manual")) && NATIVE_KINDS.has(p.kind);

  // ---- chart type: big button with the gallery of every kind
  const kindName = PLOTLY_KINDS.find(([k]) => k === p.kind)?.[1] || p.kind;
  const typeBtn = el("button", { type: "button", class: `${NS}-rbig`, title: "Chart type", html: `${chartKindIcon(p.kind, 20)}<span>${esc(kindName)} ▾</span>` });
  typeBtn.addEventListener("click", () => popoverAt(typeBtn, el("div", {}, el("div", { class: `${NS}-ptitle` }, "Chart type"),
    el("div", { class: `${NS}-chartkinds` }, ...PLOTLY_KINDS.map(([k, l]) => el("button", { type: "button", class: `${NS}-chartkind ${p.kind === k ? "active" : ""}`, html: `${chartKindIcon(k, 22)}<small>${esc(l)}</small>`, onclick: () => {
      closePopover();
      commit(() => {
        p.kind = k;
        if (!NATIVE_KINDS.has(k)) p.engine = "plotly";
      });
    } })))), `${NS}-ddpop`));
  const typeG = el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrow ${NS}-rbigrow` }, typeBtn), el("div", { class: `${NS}-rcap` }, "Chart"));

  // ---- data
  const manual = p.dataSource === "manual";
  const srcOpts = [["manual", "Typed data"], ...dataLayerOptions("—").filter(([id]) => id)];
  const src = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Data source" }, ...srcOpts.map(([v, l]) => el("option", { value: v, selected: manual ? v === "manual" : v === p.layer }, l)));
  src.addEventListener("change", () => commit(() => {
    if (src.value === "manual") p.dataSource = "manual";
    else {
      p.dataSource = "layer";
      p.layer = src.value;
      autoGroupField(p);
    }
  }));
  const fields = manual || !p.layer ? [] : layerFields(p.layer);
  const dataG = manual
    ? group("Data", rowOf(src), rowOf(txt("Edit data…", "Type or paste label, value rows", () => openChartDataEditor(item))))
    : group("Data",
      rowOf(src, tag("by"), sel("props.group", [["", "(all)"], ...fields.map((f) => [f.name, f.name])], "Group (class) field")),
      rowOf(sel("props.valueMode", VALUE_MODES, "Value"), ["sum", "mean"].includes(p.valueMode) ? sel("props.valueField", fields.filter((f) => f.numeric).map((f) => [f.name, f.name]), "Numeric field") : null,
        sel("props.sort", [["value-desc", "Largest first"], ["value-asc", "Smallest first"], ["label", "A → Z"], ["none", "As found"]], "Order")),
    );

  // ---- look
  const style = el("select", { class: `${NS}-input ${NS}-qcase`, title: "Chart style" },
    ...Object.entries(PLOTLY_THEMES).map(([k, t]) => el("option", { value: k, selected: !classic && (p.plotStyle || "plotly") === k }, t.name)),
    NATIVE_KINDS.has(p.kind) ? el("option", { value: "__native", selected: classic }, "Classic (no Plotly)") : null);
  style.addEventListener("change", () => commit(() => {
    if (style.value === "__native") p.engine = "native";
    else Object.assign(p, { engine: "plotly", plotStyle: style.value });
  }));
  const colors = sel("props.colorMode", [["layer", "Layer colors"], ["plotly", "Plotly colors"], ["palette", "Palette"], ["single", "One color"]], "Colors");
  const labels = sel("props.labels", [["percent", "Percent"], ["value", "Values"], ["label", "Names"], ["none", "No labels"]], "Labels on the chart");
  const title = el("input", { type: "text", class: `${NS}-input`, value: p.title || "", placeholder: "Chart title", title: "Title", style: { width: "150px" } });
  title.addEventListener("change", () => set("props.title", title.value));
  const lookG = group("Look",
    rowOf(tag("Style"), style, colors, p.colorMode === "palette" ? sel("props.palette", Object.entries(COLORMAP_LABELS), "Palette") : null),
    rowOf(labels, txt("Legend", "Show the legend", () => set("props.showLegend", !p.showLegend), !!p.showLegend), p.kind === "donut" ? txt("Total", "Total in the middle", () => set("props.centerText", p.centerText === "total" ? "none" : "total"), p.centerText === "total") : null, title),
  );
  return [typeG, dataG, lookG];
}
