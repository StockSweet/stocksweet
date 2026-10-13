// Helpers de DOM. Tudo que vem de dados (nomes, observações, usuário) entra
// via textContent/createTextNode — nunca por concatenação de HTML.

const SVG_NS = "http://www.w3.org/2000/svg";

function applyProps(el, props) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;

    if (key === "class") {
      el.setAttribute("class", value);
    } else if (key === "style" && typeof value === "object") {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith("--")) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Ícones de traço (24x24, mesma família visual). Strings estáticas e confiáveis.
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.8"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  recipe: '<path d="M7 13.5A4 4 0 0 1 8 5.7a4.5 4.5 0 0 1 8 0 4 4 0 0 1 1 7.8V20H7v-6.5Z"/><path d="M7 16.5h10"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  "arrow-in": '<path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/>',
  "arrow-out": '<path d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14"/>',
  alert: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.4v.1"/>',
  "alert-octagon": '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z"/><path d="M12 8v5M12 16.4v.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "chevron-left": '<path d="m15 6-6 6 6 6"/>',
  "chevron-right": '<path d="m9 6 6 6-6 6"/>',
  "chevron-up-down": '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  "trend-up": '<path d="M7 17 17 7M9 7h8v8"/>',
  "trend-down": '<path d="M7 7l10 10M17 9v8H9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  table: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 5v14"/>',
  "chart-line": '<path d="M3 17l5-6 4 4 8-9"/>',
  heart: '<path d="M12 20.5s-8-4.6-8-10.7A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.8c0 6.1-8 10.7-8 10.7Z"/>',
  coins: '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.5-.8-1.5-1.3-2.6-1.3-1.6 0-2.6.8-2.6 2 0 2.8 5.2 1.4 5.2 4.2 0 1.2-1.1 2-2.6 2-1.2 0-2.1-.5-2.7-1.4M12 6.5V8M12 16v1.5"/>',
  percent: '<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function icon(name, size = 18) {
  const el = document.createElementNS(SVG_NS, "svg");
  el.setAttribute("viewBox", "0 0 24 24");
  el.setAttribute("width", size);
  el.setAttribute("height", size);
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "1.7");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("class", "icon");
  el.innerHTML = ICONS[name] ?? "";
  return el;
}
