// Últimas movimentações registradas (entradas e saídas).

import { h, icon } from "../dom.js";
import { insumoPorId } from "../analytics.js";
import { brl, qtd, timeAgo } from "../format.js";

const QUANTIDADE = 9;

export function itemMovimento(ctx, mov, { compacto = false } = {}) {
  const insumo = insumoPorId(ctx.db, mov.insumoId);
  const entrada = mov.tipo === "entrada";

  return h(
    "li",
    { class: `feed-item${mov.id === ctx.state.ultimoMovimento ? " is-new" : ""}` },
    h("span", { class: `feed-item__icon feed-item__icon--${mov.tipo}` }, icon(entrada ? "arrow-in" : "arrow-out", 16)),
    h(
      "div",
      { class: "feed-item__txt" },
      compacto
        ? h("strong", null, entrada ? "Entrada" : "Saída")
        : h("button", { type: "button", class: "feed-item__name", onclick: () => ctx.abrirInsumo(insumo.id) }, insumo.nome),
      h("small", null, compacto ? `${mov.por} · ${timeAgo(mov.quando)}` : `${entrada ? "Entrada" : "Saída"} · ${mov.por} · ${timeAgo(mov.quando)}`),
      mov.obs ? h("small", { class: "feed-item__obs" }, `“${mov.obs}”`) : null,
    ),
    h("div", { class: "feed-item__val" }, h("strong", null, `${entrada ? "+" : "−"}${qtd(mov.qtd, insumo.un)}`), h("small", null, brl(mov.valor))),
  );
}

export function montar(ctx) {
  const listaEl = document.getElementById("feedList");

  function render() {
    listaEl.replaceChildren(...ctx.db.movimentos.slice(0, QUANTIDADE).map((mov) => itemMovimento(ctx, mov)));
  }

  return { render };
}
