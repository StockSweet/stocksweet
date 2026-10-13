// Componentes pequenos reutilizados por vários widgets.

import { h, icon } from "./dom.js";
import { STATUS_LABEL } from "./analytics.js";

const ICONE_STATUS = { ok: "check", baixo: "alert", critico: "alert-octagon" };

// Situação do estoque: a cor nunca vai sozinha — sempre ícone + rótulo.
export function badgeStatus(status) {
  return h("span", { class: `status status--${status}` }, icon(ICONE_STATUS[status], 14), STATUS_LABEL[status]);
}

/**
 * Variação com seta (direção) + cor (se é bom ou ruim). `bom` pode ser "alta", "queda" ou null (neutro).
 */
export function delta({ valor, texto, bom = null }) {
  const direcao = valor > 0 ? "up" : valor < 0 ? "down" : "flat";
  let tom = "neutro";
  if (valor !== 0 && bom) tom = (valor > 0) === (bom === "alta") ? "bom" : "ruim";

  return h(
    "span",
    { class: `delta delta--${tom}` },
    direcao === "flat" ? icon("minus", 14) : icon(direcao === "up" ? "trend-up" : "trend-down", 14),
    texto,
  );
}

export function estadoVazio({ icone, titulo, texto, acao }) {
  return h(
    "div",
    { class: "empty" },
    h("span", { class: "empty__icon" }, icon(icone, 22)),
    h("strong", null, titulo),
    texto ? h("p", null, texto) : null,
    acao ? h("button", { type: "button", class: "btn btn--tonal btn--sm", onclick: acao.onClick }, acao.label) : null,
  );
}

export function rolarAte(el) {
  const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
}

export function piscar(el) {
  el.classList.remove("is-flash");
  void el.offsetWidth;
  el.classList.add("is-flash");
  window.setTimeout(() => el.classList.remove("is-flash"), 1800);
}
