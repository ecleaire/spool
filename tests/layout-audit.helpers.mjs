function layoutIssues() {
  const issues = [], dialog = document.querySelector("dialog[open]"), root = dialog || document;
  const name = (el) => el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + String(el.className || "").trim().split(/\s+/).slice(0, 2).join(".") + " " + String(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 32);
  const visibleRect = (el) => {
    for (let p = el; p; p = p.parentElement) {
      if (p.hidden || p.matches("dialog:not([open])")) return null;
      if (p.matches("details:not([open])") && !p.querySelector(":scope>summary")?.contains(el)) return null;
    }
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === "hidden" || s.display === "none") return null;
    let b = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(innerWidth, r.right), bottom: Math.min(innerHeight, r.bottom) };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p), pr = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(ps.overflowX)) {
        b.left = Math.max(b.left, pr.left);
        b.right = Math.min(b.right, pr.right);
      }
      if (/auto|scroll|hidden|clip/.test(ps.overflowY)) {
        b.top = Math.max(b.top, pr.top);
        b.bottom = Math.min(b.bottom, pr.bottom);
      }
    }
    return b.right - b.left > 3 && b.bottom - b.top > 3 ? { ...b, original: r } : null;
  };
  if (!dialog && document.documentElement.scrollWidth > innerWidth + 2) issues.push("document horizontal overflow " + document.documentElement.scrollWidth + "/" + innerWidth);
  if (dialog) {
    const r = dialog.getBoundingClientRect();
    if (r.left < -2 || r.right > innerWidth + 2 || r.top < -2 || r.bottom > innerHeight + 2) issues.push("dialog outside viewport " + name(dialog));
    for (const close of dialog.querySelectorAll(".dialog-head>button,.cloud-dialog-head>button,.search-panel-head>button")) {
      const r2 = close.getBoundingClientRect(), hit = document.elementFromPoint(r2.x + r2.width / 2, r2.y + r2.height / 2);
      if (r2.top < 0 || r2.bottom > innerHeight + 1 || !hit || !close.contains(hit)) issues.push("unreachable close " + name(close));
    }
  }
  const selectors = ".page-actions,.toolbar,.booking-tools,.actions,.booking-row-actions,.bulk-selection-controls,.bulk-action-buttons,.dialog-actions,.sharing-actions,.permission-footer,.fields,.cloud-dialog-body,.search-panel-head,.duration-entry,.hex-control";
  for (const group of root.querySelectorAll(selectors)) {
    if (!visibleRect(group)) continue;
    const bounds = group.getBoundingClientRect(), controls = [...group.querySelectorAll("button,input:not([type=hidden]),select,textarea,a[href]")].filter((el) => el.closest(selectors) === group).map((el) => ({ el, r: visibleRect(el) })).filter((x) => x.r);
    for (let i = 0; i < controls.length; i++) {
      const { el, r } = controls[i];
      if (r.original.left < bounds.left - 2 || r.original.right > bounds.right + 2) issues.push("control outside " + name(group) + " -> " + name(el));
      for (let j = i + 1; j < controls.length; j++) {
        const b = controls[j];
        if (el.contains(b.el) || b.el.contains(el)) continue;
        if (Math.min(r.right, b.r.right) - Math.max(r.left, b.r.left) > 2 && Math.min(r.bottom, b.r.bottom) - Math.max(r.top, b.r.top) > 2) issues.push("overlap " + name(el) + " / " + name(b.el));
      }
    }
  }
  for (const row of root.querySelectorAll(".filament-row")) {
    const parts = [...row.children].filter((el) => el.matches(".product,.weight,.place,.actions")).map((el) => {
      const ink = [];
      for (const child of el.querySelectorAll("img,.item-tag,button,a[href],.bar")) {
        const r = visibleRect(child);
        if (r) ink.push(r);
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim() || node.parentElement.closest("svg,.sr-only")) continue;
        const bounds = visibleRect(node.parentElement);
        if (!bounds) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          const box = { left: Math.max(r.left, bounds.left), right: Math.min(r.right, bounds.right), top: Math.max(r.top, bounds.top), bottom: Math.min(r.bottom, bounds.bottom) };
          if (box.right - box.left > 2 && box.bottom - box.top > 2) ink.push(box);
        }
      }
      return { el, ink };
    });
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j];
      if (a.ink.some((r) => b.ink.some((s) => Math.min(r.right, s.right) - Math.max(r.left, s.left) > 2 && Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > 2))) issues.push("row content overlap " + name(a.el) + " / " + name(b.el));
    }
  }
  for (const button of root.querySelectorAll("button")) {
    const b = visibleRect(button);
    if (!b || button.matches(".product-title,.product-photo") || button.closest(".tag-suggestions")) continue;
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest("svg,.sr-only,[aria-hidden=true]")) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.textOverflow === "ellipsis") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if ([...range.getClientRects()].some((r) => r.width > 2 && (r.left < b.original.left - 2 || r.right > b.original.right + 2 || r.top < b.original.top - 2 || r.bottom > b.original.bottom + 2))) issues.push("button text outside " + name(button));
    }
  }
  return [...new Set(issues)];
}
export {
  layoutIssues
};
