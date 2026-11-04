(() => {
  "use strict";
  const script = document.currentScript;
  if (!script || document.getElementById("ent-feedback-widget")) return;
  const origin = new URL(script.src).origin;
  const project = script.dataset.project || "ent";
  const root = document.createElement("div");
  root.id = "ent-feedback-widget";
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open feedback");
  button.setAttribute("aria-expanded", "false");
  button.style.cssText = "position:fixed;right:16px;bottom:20px;width:48px;height:48px;border:0;border-radius:50%;background:#262626;color:white;cursor:pointer;box-shadow:0 4px 16px #0002;z-index:2147483000;display:flex;align-items:center;justify-content:center";
  button.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16a3 3 0 0 1-3 3H7l-4 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/><path d="M7 8h10M7 12h7"/></svg>';
  const frame = document.createElement("iframe");
  frame.id = "ent-feedback-panel";
  frame.title = "Feedback board";
  frame.src = origin + "/embed?project=" + encodeURIComponent(project) + "&board=" + encodeURIComponent(script.dataset.board || "product");
  frame.style.cssText = "display:none;position:fixed;right:16px;bottom:80px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100dvh - 112px));border:1px solid #e5e5e5;border-radius:14px;background:white;box-shadow:0 12px 32px #0002;z-index:2147483000";
  button.setAttribute("aria-controls", frame.id);
  let open = false;
  function setOpen(value) {
    open = value;
    frame.style.display = open ? "block" : "none";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close feedback" : "Open feedback");
    if (open) frame.focus(); else button.focus();
  }
  button.addEventListener("click", () => setOpen(!open));
  button.addEventListener("keydown", event => { if (event.key === "Escape") setOpen(false); });
  window.addEventListener("message", event => {
    if (event.source === frame.contentWindow && event.origin === origin && event.data && event.data.type === "ent:close") setOpen(false);
  });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && open) setOpen(false); });
  root.append(frame, button);
  document.body.append(root);
})();
