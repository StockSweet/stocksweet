// Alertas de estoque (RF06): insumos no mínimo ou abaixo, do mais urgente pro menos.

import { h, icon } from "../dom.js";
import { medidor } from "../charts.js";
import { badgeStatus, estadoVazio, piscar, rolarAte } from "../components.js";
import { alertasDe, reposicaoSugerida, statusDe } from "../analytics.js";
import { qtd } from "../format.js";

const LIMITE = 4;

export function montar(ctx) {
  const listaEl = document.getElementById("alertasList");
  const subEl = document.getElementById("alertasSub");
  const contagemEl = document.getElementById("alertasCount");

  function verTodos() {
    ctx.state.tabela.status = "alerta";
    ctx.state.tabela.pagina = 1;
    ctx.render("insumos");
    const alvo = document.getElementById("insumosCard");
    rolarAte(alvo);
    piscar(alvo);
  }

  function item(insumo) {
    const status = statusDe(insumo);
    return h(
      "li",
      { class: `alert-item alert-item--${status}` },
      h(
        "div",
        { class: "alert-item__main" },
        h("button", { type: "button", class: "alert-item__name", onclick: () => ctx.abrirInsumo(insumo.id) }, insumo.nome),
        h("span", { class: "alert-item__qty" }, h("strong", null, qtd(insumo.estoque, insumo.un)), ` de ${qtd(insumo.minimo, insumo.un)} mínimos`),
        medidor({ razao: insumo.estoque / (insumo.minimo * 2), tom: status, marca: 0.5 }),
      ),
      h(
        "div",
        { class: "alert-item__side" },
        badgeStatus(status),
        h(
          "button",
          {
            type: "button",
            class: "btn btn--tonal btn--xs",
            "aria-label": `Repor ${insumo.nome}`,
            onclick: () => ctx.abrirMovimento({ tipo: "entrada", insumoId: insumo.id, qtd: reposicaoSugerida(insumo) }),
          },
          icon("plus", 14),
          "Repor",
        ),
      ),
    );
  }

  function render() {
    const alertas = alertasDe(ctx.db);
    const criticos = alertas.filter((i) => statusDe(i) === "critico").length;

    contagemEl.textContent = alertas.length;
    contagemEl.classList.toggle("is-zero", alertas.length === 0);
    subEl.textContent = alertas.length ? `${criticos} crítico${criticos === 1 ? "" : "s"} · ${alertas.length - criticos} abaixo do mínimo` : "Nada abaixo do mínimo agora";

    if (!alertas.length) {
      listaEl.replaceChildren(
        h("li", null, estadoVazio({ icone: "check-circle", titulo: "Tudo em ordem", texto: "Nenhum insumo está no nível mínimo ou abaixo dele." })),
      );
      return;
    }

    listaEl.replaceChildren(
      ...alertas.slice(0, LIMITE).map(item),
      h(
        "li",
        { class: "alert-list__more" },
        h("button", { type: "button", class: "link-btn", onclick: verTodos }, alertas.length > LIMITE ? `Ver todos os ${alertas.length} alertas` : "Ver na lista de insumos", icon("chevron-right", 14)),
      ),
    );
  }

  return { render };
}
