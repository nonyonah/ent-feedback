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
  button.setAttribute("aria-label", "Submit feedback");
  button.setAttribute("aria-expanded", "false");
  button.style.cssText = "position:fixed;right:16px;bottom:20px;height:40px;padding:0 16px;border:0;outline:0;border-radius:12px;background:#fff;color:#171717;font:500 13px/20px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 20px #00000014;z-index:2147483000;display:flex;align-items:center;justify-content:center;appearance:none;white-space:nowrap";
  button.textContent = "Submit feedback";
  function applyTheme(theme) {
    const dark = theme === "dark";
    button.style.background = dark ? "#242424" : "#ffffff";
    button.style.color = dark ? "#f5f5f5" : "#171717";
    if (document.getElementById("ent-feedback-panel")) document.getElementById("ent-feedback-panel").style.background = dark ? "#242424" : "#ffffff";
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const themeMode = ["light", "dark"].includes(script.dataset.theme) ? script.dataset.theme : "system";
  const hostTheme = () => {
    const html = document.documentElement;
    const value = html.dataset.theme || html.dataset.colorScheme;
    if (value === "light" || value === "dark") return value;
    if (html.classList.contains("dark")) return "dark";
    if (html.classList.contains("light")) return "light";
    return media.matches ? "dark" : "light";
  };
  const followSystem = () => { applyTheme(themeMode === "system" ? hostTheme() : themeMode); };
  followSystem();
  media.addEventListener("change", followSystem);
  const themeObserver = new MutationObserver(followSystem);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "data-color-scheme"] });
  window.addEventListener("pageshow", followSystem);
  button.addEventListener("focus", () => { if (button.matches(":focus-visible")) button.style.outline = "2px solid #7443e9"; });
  button.addEventListener("blur", () => { button.style.outline = "0"; });
  const frame = document.createElement("iframe");
  frame.id = "ent-feedback-panel";
  frame.title = "Feedback board";
  frame.src = origin + "/embed?project=" + encodeURIComponent(project) + "&board=" + encodeURIComponent(script.dataset.board || "product");
  frame.style.cssText = "display:none;position:fixed;right:16px;bottom:80px;width:min(384px,calc(100vw - 32px));height:min(693px,calc(100dvh - 112px));border:0;outline:0;border-radius:20px;background:white;box-shadow:0 12px 32px #0002;z-index:2147483000";
  button.setAttribute("aria-controls", frame.id);
  frame.style.transformOrigin = "bottom right";
  let open = false;
  let activeAnimation = null;
  function setOpen(value, instant = false) {
    const visible = frame.style.display !== "none";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const closed = { opacity: "0", transform: reduced ? "none" : "translateY(8px) scale(.97)" };
    const computed = window.getComputedStyle(frame);
    const from = visible ? { opacity: computed.opacity, transform: computed.transform } : closed;
    if (activeAnimation) { activeAnimation.cancel(); activeAnimation = null; }
    open = value;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close feedback" : "Submit feedback");
    button.textContent = open ? "Close feedback" : "Submit feedback";
    if (open) { frame.style.display = "block"; frame.focus(); } else button.focus();
    const to = open ? { opacity: "1", transform: "none" } : closed;
    if (instant || typeof frame.animate !== "function") {
      Object.assign(frame.style, to);
      if (!open) frame.style.display = "none";
      return;
    }
    const animation = frame.animate([from, to], {
      duration: reduced || !open ? 125 : 250,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      fill: "both"
    });
    activeAnimation = animation;
    animation.onfinish = () => {
      if (activeAnimation !== animation) return;
      Object.assign(frame.style, to);
      if (!open) frame.style.display = "none";
      animation.cancel();
      activeAnimation = null;
    };
  }
  button.addEventListener("click", event => setOpen(!open, event.detail === 0));
  button.addEventListener("keydown", event => { if (event.key === "Escape") setOpen(false, true); });
  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || event.origin !== origin || !event.data) return;
    if (event.data.type === "ent:close") setOpen(false, event.data.inputModality === "keyboard");
    if (event.data.type === "ent:appearance" && /^#[0-9a-f]{6}$/i.test(event.data.accent)) {
      followSystem();
      frame.style.background = button.style.background;
    }
  });
  window.addEventListener("keydown", event => { if (event.key === "Escape" && open) setOpen(false, true); });
  root.append(frame, button);
  document.body.append(root);
  followSystem();
})();
