// ---------------------------------------------------------------- image ribbon + remove.bg
// Format tab for pictures / logos: replace, fit, opacity, border and
// "Remove background" through the remove.bg API with the user's own key
// (kept in this browser only; the picture is sent only when asked).

const REMOVEBG_KEY = "glc:removebg-key";
function removeBgKey() {
  try {
    return localStorage.getItem(REMOVEBG_KEY) || "";
  } catch {
    return "";
  }
}
function openRemoveBgSettings(onSaved) {
  closePopover();
  S.ui.root.querySelector(`.${NS}-modal.${NS}-rbgmodal`)?.remove();
  const overlay = el("div", { class: `${NS}-modal ${NS}-rbgmodal` });
  const close = () => overlay.remove();
  const input = el("input", { type: "password", class: `${NS}-input`, value: removeBgKey(), placeholder: "remove.bg API key", autocomplete: "off", spellcheck: "false" });
  const save = () => {
    try {
      if (input.value.trim()) localStorage.setItem(REMOVEBG_KEY, input.value.trim());
      else localStorage.removeItem(REMOVEBG_KEY);
    } catch {}
    close();
    if (input.value.trim()) onSaved?.();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") close();
  });
  overlay.appendChild(el("div", { class: `${NS}-dlg`, role: "dialog", "aria-label": "remove.bg" },
    el("div", { class: `${NS}-dlghead` }, el("div", {}, el("div", { class: `${NS}-dlgtitle` }, "Remove background · remove.bg"), el("div", { class: `${NS}-dlgsub` }, "Your own API key from remove.bg (free plan: 50 pictures a month)")), iconBtn("close", "Close", close)),
    el("div", { class: `${NS}-dlgbody` },
      el("label", { class: `${NS}-dlgfield` }, el("span", {}, "API key"), input),
      el("p", { class: `${NS}-muted` }, "Get a key at remove.bg → Dashboard → API Keys. It is saved in this browser only and sent only to api.remove.bg, together with the picture, when you click Remove background."),
    ),
    el("div", { class: `${NS}-dlgfoot` },
      el("button", { type: "button", class: `${NS}-btn`, onclick: close }, "Cancel"),
      el("button", { type: "button", class: `${NS}-btn primary`, onclick: save }, "Save key"),
    ),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
  input.focus();
}
async function removeBackground(item) {
  const key = removeBgKey();
  if (!key) return openRemoveBgSettings(() => removeBackground(item));
  const src = item.props.src;
  if (!src) return toast("Choose a picture first.", "warn");
  S.rbgBusy = item.id;
  renderQuickBar();
  toast("Removing the background…");
  try {
    const fd = new FormData();
    fd.append("image_file_b64", String(src).replace(/^data:[^,]+,/, ""));
    fd.append("size", "auto");
    fd.append("format", "png");
    const res = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": key }, body: fd });
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        msg = (await res.json()).errors?.[0]?.title || msg;
      } catch {}
      throw new Error(res.status === 403 ? "the API key was refused" : res.status === 402 ? "no remove.bg credits left" : msg);
    }
    const blob = await res.blob();
    const dataUrl = await new Promise((ok, bad) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = bad;
      r.readAsDataURL(blob);
    });
    // keep the original so the step can be undone (and in item.props.srcOriginal)
    commit(() => {
      if (!item.props.srcOriginal) item.props.srcOriginal = src;
      item.props.src = dataUrl;
    });
    toast("Background removed");
  } catch (e) {
    toast(`remove.bg: ${e.message || e}`, "warn");
  } finally {
    S.rbgBusy = null;
    renderQuickBar();
  }
}

// A picture from a web link, stored inside the layout as a data URL (exports
// stay untainted and the layout keeps working offline).
async function imageFromUrl(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!/^image\//.test(blob.type) && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) throw new Error("the link is not a picture");
    return await new Promise((ok, bad) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = bad;
      r.readAsDataURL(blob);
    });
  } catch (e) {
    // some servers only allow <img>: try through a canvas
    return await new Promise((ok, bad) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          ok(c.toDataURL("image/png"));
        } catch {
          bad(new Error("that server does not allow its pictures to be copied — download it and use From file"));
        }
      };
      img.onerror = () => bad(new Error(e.message === "Failed to fetch" ? "the picture could not be loaded (offline, or the server blocks it)" : e.message));
      img.src = url;
    });
  }
}
function openImageLinkDialog(item) {
  closePopover();
  S.ui.root.querySelector(`.${NS}-modal.${NS}-linkmodal`)?.remove();
  const overlay = el("div", { class: `${NS}-modal ${NS}-linkmodal` });
  const close = () => overlay.remove();
  const input = el("input", { type: "url", class: `${NS}-input`, placeholder: "https://…/logo.png", spellcheck: "false" });
  const status = el("p", { class: `${NS}-muted` }, "PNG, JPG, GIF, WebP or SVG. The picture is copied into the layout.");
  const go = async () => {
    const url = input.value.trim();
    if (!/^https?:\/\//i.test(url) && !/^data:image\//i.test(url)) return (status.textContent = "Paste a link that starts with http:// or https://");
    status.textContent = "Loading…";
    try {
      const data = await imageFromUrl(url);
      const img = new Image();
      img.onload = () => {
        const ar = img.naturalWidth / img.naturalHeight || 1;
        if (item) {
          commit(() => {
            item.props.src = data;
            delete item.props.srcOriginal;
            item.h = round(item.w / ar, 2);
          });
        } else {
          const pg = S.doc.page;
          const it = newItem("image", 0, 0);
          it.w = 40;
          it.h = round(40 / ar, 2);
          it.x = round((pg.width - it.w) / 2, 2);
          it.y = round((pg.height - it.h) / 2, 2);
          it.props.src = data;
          commit(() => S.doc.items.push(it));
          select([it.id]);
        }
        close();
      };
      img.src = data;
    } catch (e) {
      status.textContent = `Could not use that link: ${e.message || e}`;
    }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
    if (e.key === "Escape") close();
  });
  overlay.appendChild(el("div", { class: `${NS}-dlg`, role: "dialog", "aria-label": "Picture from a link" },
    el("div", { class: `${NS}-dlghead` }, el("div", { class: `${NS}-dlgtitle` }, "Picture from a link"), iconBtn("close", "Close", close)),
    el("div", { class: `${NS}-dlgbody` }, el("label", { class: `${NS}-dlgfield` }, el("span", {}, "Link (URL)"), input), status),
    el("div", { class: `${NS}-dlgfoot` },
      el("button", { type: "button", class: `${NS}-btn`, onclick: close }, "Cancel"),
      el("button", { type: "button", class: `${NS}-btn primary`, onclick: go }, "Insert"),
    ),
  ));
  overlay.addEventListener("pointerdown", (e) => e.target === overlay && close());
  S.ui.root.appendChild(overlay);
  input.focus();
}

function imageRibbon(item) {
  const p = item.props;
  const rerender = () => {
    refreshCanvas();
    renderQuickBar();
  };
  const big = (ic, label, title, onClick, extra = "") => el("button", { type: "button", class: `${NS}-rbig ${extra}`, title, html: `${icon(ic, 18)}<span>${esc(label)}</span>`, onclick: onClick });
  const txt = (label, title, onClick, active = false) => el("button", { type: "button", class: `${NS}-qbtn ${NS}-qtxt ${active ? "active" : ""}`, title, onclick: onClick }, label);
  const busy = S.rbgBusy === item.id;
  const picture = el("div", { class: `${NS}-rgroup` }, el("div", { class: `${NS}-rrow ${NS}-rbigrow` },
    big("image", "Change", "Choose another picture from a file", () => pickImage(item)),
    big("link", "From link", "Use a picture from a web link (URL)", () => openImageLinkDialog(item)),
    big("sparkle", busy ? "Working…" : "Remove BG", "Remove the background with remove.bg (your API key)", () => !busy && removeBackground(item), busy ? "active" : ""),
    el("div", { class: `${NS}-rstack` },
      txt("Restore", "Back to the original picture", () => p.srcOriginal && commit(() => (p.src = p.srcOriginal))),
      txt("API key…", "Set or change the remove.bg API key", () => openRemoveBgSettings()),
    ),
  ), el("div", { class: `${NS}-rcap` }, "Picture"));
  const fit = p.fit || "contain";
  const op = el("input", { type: "range", class: `${NS}-range ${NS}-qop`, min: 0, max: 1, step: 0.05, value: p.opacity ?? 1, title: "Opacity" });
  op.addEventListener("input", () => liveSet(item, "props.opacity", parseFloat(op.value), () => refreshCanvas()));
  const look = ribbonGroup("Look", [
    txt("Fit", "Whole picture inside the box", () => liveSet(item, "props.fit", "contain", rerender), fit === "contain"),
    txt("Fill", "Cover the box (crops)", () => liveSet(item, "props.fit", "cover", rerender), fit === "cover"),
    txt("Stretch", "Stretch to the box", () => liveSet(item, "props.fit", "fill", rerender), fit === "fill"),
    el("span", { class: `${NS}-qtag` }, "Opacity"), op,
    txt("Border", "Border around the picture", () => liveSet(item, "props.border.show", !p.border?.show, rerender), !!p.border?.show),
  ]);
  return [picture, look];
}
