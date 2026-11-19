(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement) || !script.src) {
    return;
  }

  const origin = new URL(script.src).origin;
  const widgetUrl = `${origin}/widget`;
  const position = script.dataset.position === "left" ? "left" : "right";
  const initialOpen = script.dataset.open === "true";
  const theme = script.dataset.theme === "light" ? "light" : "dark";
  const hostId = "cybrdial-widget-root";
  document.getElementById(hostId)?.remove();

  function isWidgetMessage(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      typeof value.type === "string" &&
      value.type.startsWith("cybrdial:")
    );
  }

  const root = document.createElement("div");
  root.id = hostId;
  root.style.position = "fixed";
  root.style[position] = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "2147483000";
  root.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const panel = document.createElement("iframe");
  panel.title = "CybrDial softphone";
  panel.src = widgetUrl;
  panel.allow = "microphone; autoplay";
  panel.style.display = "none";
  panel.style.width = "360px";
  panel.style.height = "620px";
  panel.style.maxWidth = "calc(100vw - 40px)";
  panel.style.maxHeight = "calc(100vh - 100px)";
  panel.style.border = "1px solid rgba(71,85,105,.8)";
  panel.style.borderRadius = "16px";
  panel.style.background = "#09090B";
  panel.style.boxShadow = "0 24px 80px rgba(0,0,0,.55)";
  panel.style.marginBottom = "12px";

  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Abrir CybrDial");
  bubble.textContent = "D";
  bubble.style.display = "block";
  bubble.style.marginLeft = "auto";
  bubble.style.width = "56px";
  bubble.style.height = "56px";
  bubble.style.border = "1px solid rgba(34,211,238,.55)";
  bubble.style.borderRadius = "9999px";
  bubble.style.background = "#0891b2";
  bubble.style.color = "#ffffff";
  bubble.style.fontWeight = "800";
  bubble.style.fontSize = "18px";
  bubble.style.cursor = "pointer";
  bubble.style.boxShadow = "0 12px 32px rgba(8,145,178,.35)";

  let open = false;
  function setOpen(nextOpen) {
    open = nextOpen;
    panel.style.display = open ? "block" : "none";
    bubble.setAttribute(
      "aria-label",
      open ? "Minimizar CybrDial" : "Abrir CybrDial",
    );
    bubble.textContent = open ? "×" : "D";
  }

  bubble.addEventListener("click", () => setOpen(!open));

  if (theme === "light") {
    panel.style.background = "#f8fafc";
  }
  setOpen(initialOpen);

  window.addEventListener("message", (event) => {
    if (event.origin !== origin) {
      return;
    }
    if (event.source !== panel.contentWindow) {
      return;
    }
    if (!isWidgetMessage(event.data)) {
      return;
    }
    if (event.data.type === "cybrdial:close") {
      setOpen(false);
    }
    if (event.data.type === "cybrdial:minimize") {
      setOpen(false);
    }
    if (event.data.type === "cybrdial:expand") {
      setOpen(true);
    }
    if (
      event.data.type === "cybrdial:auth-state" &&
      event.data.authenticated === false
    ) {
      setOpen(true);
    }
    if (event.data.type === "cybrdial:dial") {
      if (typeof event.data.number === "string") {
        setOpen(true);
        panel.contentWindow?.postMessage(
          { type: "cybrdial:dial", number: event.data.number },
          origin,
        );
      }
    }
    if (
      event.data.type === "cybrdial:ready" ||
      event.data.type === "cybrdial:call-state" ||
      event.data.type === "cybrdial:auth-state" ||
      event.data.type === "cybrdial:error"
    ) {
      window.dispatchEvent(
        new CustomEvent("cybrdial:widget", { detail: event.data }),
      );
    }
  });

  root.append(panel, bubble);
  document.body.appendChild(root);

  Object.defineProperty(window, "CybrDialWidget", {
    configurable: true,
    writable: false,
    value: Object.freeze({
      open() {
        setOpen(true);
      },
      minimize() {
        setOpen(false);
      },
      close() {
        setOpen(false);
      },
      dial(phoneNumber) {
        if (typeof phoneNumber !== "string") {
          return;
        }
        setOpen(true);
        panel.contentWindow?.postMessage(
          { type: "cybrdial:dial", number: phoneNumber },
          origin,
        );
      },
    }),
  });

  const sendInit = () => {
    panel.contentWindow?.postMessage(
      {
        type: "cybrdial:init",
        hostOrigin: window.location.origin,
        theme,
      },
      origin,
    );
  };
  panel.addEventListener("load", sendInit, { once: false });
})();
