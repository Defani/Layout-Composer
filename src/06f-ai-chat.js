// ---------------------------------------------------------------- AI chat bar
// A chat bar under the canvas. Messages go through the Live MCP Bridge plugin
// (window.__geolibreLive), the same chat the AI client reads with chat_wait;
// replies come back to this view because each message carries
// source "layout-composer". Each message also carries a short description of
// the open layout, and window.LayoutComposer.ai lets the AI change it.
// Without the bridge the bar explains how to turn it on; nothing is sent
// anywhere else.

const AI_SOURCE = "layout-composer";
const AI = { el: null, list: null, input: null, status: null, unsub: null, snap: null, open: false };

function aiHub() {
  return window.__geolibreLive && typeof window.__geolibreLive.send === "function" ? window.__geolibreLive : null;
}

// What the AI gets with every message: enough to act on "this map" or "the selected title".
function aiContext() {
  const d = S.doc;
  const sel = selectedItems();
  const brief = (i) => ({ id: i.id, type: i.type, name: i.name, x: round(i.x, 1), y: round(i.y, 1), w: round(i.w, 1), h: round(i.h, 1) });
  return {
    source: AI_SOURCE,
    plugin: "Layout Composer",
    api: "window.LayoutComposer.ai (describe, item, add, update, remove, select, page, undo, exportDialog)",
    layout: d?.name,
    page: d ? `${round(d.page.width, 1)} x ${round(d.page.height, 1)} mm (${d.page.size || "custom"})` : null,
    selected: sel.map(brief),
    items: (d?.items || []).slice(0, 80).map(brief),
    itemCount: d?.items.length || 0,
  };
}

// Light formatting for replies: **bold**, `code`, line breaks. Everything else is escaped.
function aiFormat(text) {
  return esc(String(text || ""))
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function aiStatusText(snap) {
  if (!aiHub()) return ["off", "Live MCP Bridge is not active: enable it in the Plugins menu to chat with the AI."];
  if (!snap?.connected) return ["off", "AI client not connected (Live MCP Bridge is waiting for it)."];
  if (snap.typing) return ["busy", "AI is working on it…"];
  if (snap.listening) return ["on", "AI is listening"];
  return ["idle", "AI is not listening yet: say “listen to geolibre” in the AI app. Messages wait until then."];
}

function renderAiChat(snap = AI.snap) {
  if (!AI.el) return;
  AI.snap = snap;
  const [state, text] = aiStatusText(snap);
  AI.status.className = `${NS}-aistatus ${state}`;
  AI.status.title = text;
  AI.status.querySelector("span").textContent = text;
  AI.input.disabled = !aiHub();
  const msgs = (snap?.history || []).filter((m) => m.via === AI_SOURCE || (m.role === "system" && m.via === AI_SOURCE));
  AI.list.replaceChildren();
  if (!msgs.length) {
    AI.list.append(el("div", { class: `${NS}-aiempty` },
      el("b", {}, "Ask AI about this layout"),
      el("p", {}, "For example: “add a legend under the map”, “make the title bold and centred”, “set the page to A3 landscape”, or “export a 300 dpi PNG”."),
    ));
  }
  for (const m of msgs.slice(-40)) {
    const mine = m.role === "user";
    const bubble = el("div", { class: `${NS}-aimsg ${mine ? "me" : m.role === "system" ? "sys" : "ai"}` });
    if (m.text) bubble.append(el("div", { class: `${NS}-aitext`, html: aiFormat(m.text) }));
    if (m.chart && aiHub()?.renderChart) {
      const box = el("div", { class: `${NS}-aichart` });
      bubble.append(box);
      try {
        aiHub().renderChart(box, m.chart, { height: 200 });
      } catch {}
    }
    bubble.append(el("small", {}, `${m.time || ""}${mine && m.state === "queued" ? " · waiting" : ""}`));
    AI.list.append(bubble);
  }
  if (snap?.typing) AI.list.append(el("div", { class: `${NS}-aimsg ai ${NS}-aityping` }, el("span"), el("span"), el("span")));
  AI.list.scrollTop = AI.list.scrollHeight;
}

function aiSend() {
  const hub = aiHub();
  const text = AI.input.value.trim();
  if (!text || !hub) return;
  hub.send(text, aiContext());
  AI.input.value = "";
  AI.input.style.height = "";
  setAiOpen(true);
  renderAiChat(hub.snapshot?.());
}

function setAiOpen(open) {
  AI.open = open;
  AI.el?.classList.toggle("open", open);
  S.ui.root?.querySelector(`.${NS}-aitoggle`)?.classList.toggle("on", open);
  if (open) {
    AI.list.scrollTop = AI.list.scrollHeight;
    setTimeout(() => AI.input?.focus(), 30);
  }
}

function buildAiChat() {
  AI.list = el("div", { class: `${NS}-ailist` });
  AI.status = el("div", { class: `${NS}-aistatus` }, el("i"), el("span"));
  AI.input = el("textarea", { class: `${NS}-aiinput`, rows: 1, placeholder: "Ask AI to change this layout…" });
  AI.input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      aiSend();
    }
    if (e.key === "Escape") setAiOpen(false);
  });
  AI.input.addEventListener("input", () => {
    AI.input.style.height = "";
    AI.input.style.height = `${Math.min(120, AI.input.scrollHeight)}px`;
  });
  AI.input.addEventListener("focus", () => setAiOpen(true));
  const send = el("button", { type: "button", class: `${NS}-aisend`, title: "Send (Enter)", html: icon("send", 16), onclick: aiSend });
  const head = el("div", { class: `${NS}-aihead` },
    el("span", { class: `${NS}-aititle`, html: `${icon("sparkle", 14)}<b>Ask AI</b>` }),
    AI.status,
    iconBtn("chevron", "Collapse", () => setAiOpen(false), `${NS}-aicollapse`),
  );
  AI.el = el("div", { class: `${NS}-aichat` },
    el("div", { class: `${NS}-aipanel` }, head, AI.list),
    el("div", { class: `${NS}-aibar` }, AI.input, send),
  );
  return AI.el;
}

// Connect to the bridge now, and again whenever it appears later.
function connectAiChat() {
  AI.unsub?.();
  AI.unsub = null;
  const hub = aiHub();
  if (hub?.subscribe) AI.unsub = hub.subscribe((snap) => renderAiChat(snap));
  else renderAiChat(null);
  clearInterval(AI.poll);
  AI.poll = setInterval(() => {
    const h = aiHub();
    if (h && !AI.unsub) connectAiChat();
    if (!h && AI.unsub) {
      AI.unsub();
      AI.unsub = null;
      renderAiChat(null);
    }
  }, 3000);
  S.disposers.push(() => {
    clearInterval(AI.poll);
    AI.unsub?.();
    AI.unsub = null;
  });
}

// ---- API for the AI (also handy from the browser console)
function aiApi() {
  const find = (id) => {
    const it = findItem(id);
    if (!it) throw new Error(`No item with id ${id}`);
    return it;
  };
  return {
    describe: () => ({ ...aiContext(), page: clone(S.doc.page) }),
    item: (id) => clone(find(id)),
    // tool: map, inset, legend, colorbar, north, scalebar, text, heading, subheading, body, caption,
    // maplabel, callout, title, table, latex, shape, image, marker, path, icon, attrtable, chart
    add(tool, rect = null, variant) {
      const before = new Set(S.doc.items.map((i) => i.id));
      if (rect) addItemFromTool(tool, rect, variant);
      else addAtCenter(tool, variant);
      const it = S.doc.items.find((i) => !before.has(i.id));
      return it ? it.id : null;
    },
    // patch: { x, y, w, h, rot, name, opacity, hidden, locked, props: { ...deep-merged } }
    update(id, patch = {}) {
      const it = find(id);
      commit(() => {
        const { props, ...top } = patch;
        Object.assign(it, top);
        if (props) it.props = deepMerge(it.props, props);
      });
      return clone(it);
    },
    remove(ids) {
      const set = new Set([].concat(ids));
      commit(() => (S.doc.items = S.doc.items.filter((i) => !set.has(i.id))));
      return S.doc.items.length;
    },
    select: (ids) => select([].concat(ids || [])),
    page(patch = {}) {
      commit(() => Object.assign(S.doc.page, patch));
      fitPage();
      return clone(S.doc.page);
    },
    undo: () => undo(),
    exportDialog: () => openExportDialog(),
  };
}
