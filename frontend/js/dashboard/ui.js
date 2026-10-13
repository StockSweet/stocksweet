// Peças de interface compartilhadas: tooltip, toasts, overlays (modal/gaveta) e popovers.

import { h, icon } from "./dom.js";

const FOCUSAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- tooltip único (posicionado na tela, vale pra qualquer gráfico) ---------- */

let tipEl = null;

function garantirTip() {
  if (!tipEl) {
    tipEl = h("div", { class: "tip", role: "tooltip", hidden: true });
    document.body.append(tipEl);
  }
  return tipEl;
}

export function tipShow(content, x, y) {
  const el = garantirTip();
  el.replaceChildren(...[content].flat());
  el.hidden = false;

  const { width, height } = el.getBoundingClientRect();
  const folga = 14;
  let left = x + folga;
  let top = y - height - folga;

  if (left + width > window.innerWidth - 8) left = x - width - folga;
  if (left < 8) left = Math.max(8, Math.min(window.innerWidth - width - 8, x - width / 2));
  if (top < 8) top = y + folga;

  el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  el.classList.add("is-on");
}

export function tipHide() {
  if (!tipEl) return;
  tipEl.classList.remove("is-on");
  tipEl.hidden = true;
}

// Linhas padrão do tooltip: valor em destaque, nome da série em segundo plano.
export function tipLinha({ cor, valor, nome }) {
  return h(
    "div",
    { class: "tip__row" },
    cor ? h("span", { class: "tip__key", style: { "--c": cor } }) : null,
    h("strong", { class: "tip__val" }, valor),
    nome ? h("span", { class: "tip__name" }, nome) : null,
  );
}

/* ---------- toasts ---------- */

export function toast(mensagem, { tom = "info", acao, duracao = 4600 } = {}) {
  const host = document.getElementById("toasts");
  if (!host) return;

  let timer;
  const el = h(
    "div",
    { class: `toast toast--${tom}`, role: "status" },
    h("span", { class: "toast__icon" }, icon(tom === "ok" ? "check-circle" : tom === "erro" || tom === "aviso" ? "alert" : "info", 18)),
    h("span", { class: "toast__msg" }, mensagem),
    acao
      ? h(
          "button",
          {
            type: "button",
            class: "toast__action",
            onclick: () => {
              acao.onClick();
              fechar();
            },
          },
          acao.label,
        )
      : null,
    h("button", { type: "button", class: "toast__x", "aria-label": "Fechar aviso", onclick: () => fechar() }, icon("x", 14)),
  );

  function fechar() {
    clearTimeout(timer);
    el.classList.remove("is-in");
    window.setTimeout(() => el.remove(), 260);
  }

  const agendar = () => {
    clearTimeout(timer);
    timer = window.setTimeout(fechar, duracao);
  };
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("pointerleave", agendar);

  host.append(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  agendar();
}

/* ---------- overlays: modal e gaveta ---------- */

export function criarOverlay(root, { onClose } = {}) {
  let abertoPor = null;
  let fechando = 0;

  function aoTeclar(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      fechar();
      return;
    }
    if (event.key !== "Tab") return;

    const itens = [...root.querySelectorAll(FOCUSAVEL)].filter((el) => el.offsetParent !== null);
    if (!itens.length) return;
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];

    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  function abrir() {
    clearTimeout(fechando);
    abertoPor = document.activeElement;
    root.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("app")?.setAttribute("inert", "");
    root.addEventListener("keydown", aoTeclar);
    requestAnimationFrame(() => root.classList.add("is-open"));

    const alvo = root.querySelector("[data-autofocus]") ?? root.querySelector(FOCUSAVEL);
    alvo?.focus({ preventScroll: true });
  }

  function fechar() {
    if (root.hidden) return;
    root.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    document.getElementById("app")?.removeAttribute("inert");
    root.removeEventListener("keydown", aoTeclar);
    fechando = window.setTimeout(() => {
      root.hidden = true;
    }, 240);
    abertoPor?.focus?.({ preventScroll: true });
    onClose?.();
  }

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) fechar();
  });

  return { abrir, fechar, get aberto() { return !root.hidden; } };
}

/* ---------- popovers (notificações, menu do usuário) ---------- */

let popoverAberto = null;

export function criarPopover(botao, painel, { aoAbrir } = {}) {
  function aoClicarFora(event) {
    if (!painel.contains(event.target) && !botao.contains(event.target)) fechar();
  }

  function aoTeclar(event) {
    if (event.key === "Escape") {
      fechar();
      botao.focus();
    }
  }

  function abrir() {
    popoverAberto?.fechar();
    painel.hidden = false;
    botao.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => painel.classList.add("is-open"));
    document.addEventListener("pointerdown", aoClicarFora, true);
    document.addEventListener("keydown", aoTeclar);
    popoverAberto = controle;
    aoAbrir?.();
  }

  function fechar() {
    if (painel.hidden) return;
    painel.classList.remove("is-open");
    painel.hidden = true;
    botao.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", aoClicarFora, true);
    document.removeEventListener("keydown", aoTeclar);
    if (popoverAberto === controle) popoverAberto = null;
  }

  const controle = { abrir, fechar };
  botao.addEventListener("click", () => (painel.hidden ? abrir() : fechar()));
  return controle;
}

export function fecharPopovers() {
  popoverAberto?.fechar();
}
