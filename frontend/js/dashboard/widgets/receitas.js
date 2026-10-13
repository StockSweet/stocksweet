// Receitas e margem (somente Gestor — RF04, RF05, RF08).
// O slider define a margem desejada; cada linha compara com a margem atual e sugere o preço.

import { h, icon } from "../dom.js";
import { custoReceita, margemReceita, precoSugerido } from "../analytics.js";
import { brl, pct } from "../format.js";
import { piscar, rolarAte } from "../components.js";
import { tipHide, tipLinha, tipShow, toast } from "../ui.js";

const ESCALA_MAX = 90; // a barra vai de 0% a 90% de margem

export function montar(ctx) {
  const listaEl = document.getElementById("recList");
  const sliderEl = document.getElementById("metaMargem");
  const metaEl = document.getElementById("metaValor");

  sliderEl.value = ctx.db.metaMargem;

  function pintarSlider() {
    const min = Number(sliderEl.min);
    const max = Number(sliderEl.max);
    sliderEl.style.setProperty("--fill", `${((sliderEl.value - min) / (max - min)) * 100}%`);
    metaEl.textContent = `${sliderEl.value}%`;
  }

  sliderEl.addEventListener("input", () => {
    ctx.db.metaMargem = Number(sliderEl.value);
    pintarSlider();
    render();
  });

  function aplicar(receita, novoPreco) {
    const anterior = receita.preco;
    receita.preco = novoPreco;
    ctx.render("receitas", "kpis");
    toast(`${receita.nome}: preço de venda agora é ${brl(novoPreco)} (margem ${pct(margemReceita(ctx.db, receita))}).`, {
      tom: "ok",
      acao: {
        label: "Desfazer",
        onClick: () => {
          receita.preco = anterior;
          ctx.render("receitas", "kpis");
        },
      },
    });
  }

  function linha(receita) {
    const { db } = ctx;
    const custo = custoReceita(db, receita);
    const margem = margemReceita(db, receita);
    const meta = db.metaMargem;
    const sugerido = precoSugerido(db, receita, meta);
    const abaixo = margem < meta - 0.05;

    const barra = h(
      "div",
      { class: "hbar", "data-receita": receita.id },
      h("span", { class: "hbar__fill", style: { "--w": `${(margem / ESCALA_MAX) * 100}%` } }),
      h("span", { class: "hbar__target", style: { left: `${(meta / ESCALA_MAX) * 100}%` } }),
    );

    const mostrar = (x, y) =>
      tipShow(
        [
          h("div", { class: "tip__head" }, receita.nome),
          tipLinha({ valor: pct(margem), nome: "margem atual" }),
          tipLinha({ valor: brl(receita.preco - custo), nome: `lucro por ${receita.un === "fatia" ? "fatia" : "unidade"}` }),
          tipLinha({ valor: brl(custo), nome: "custo de produção" }),
        ],
        x,
        y,
      );
    barra.addEventListener("pointermove", (e) => mostrar(e.clientX, e.clientY));
    barra.addEventListener("pointerleave", tipHide);

    return h(
      "div",
      { class: `rec-row${abaixo ? " is-below" : ""}`, id: `rec-${receita.id}` },
      h("div", { class: "rec-row__name" }, h("strong", null, receita.nome), h("small", null, `Custo ${brl(custo)} · venda ${brl(receita.preco)}`)),
      h("div", { class: "rec-row__bar" }, barra, h("span", { class: "rec-row__pct" }, pct(margem))),
      h(
        "div",
        { class: "rec-row__action" },
        abaixo
          ? h(
              "button",
              {
                type: "button",
                class: "btn btn--tonal btn--xs",
                title: `Aplicar o preço sugerido para chegar a ${meta}% de margem`,
                "aria-label": `Aplicar preço sugerido de ${brl(sugerido)} em ${receita.nome}`,
                onclick: () => aplicar(receita, sugerido),
              },
              `Aplicar ${brl(sugerido)}`,
            )
          : h("span", { class: "status status--ok" }, icon("check", 14), "Na meta"),
      ),
    );
  }

  function render() {
    const ordenadas = [...ctx.db.receitas].sort((a, b) => margemReceita(ctx.db, b) - margemReceita(ctx.db, a));
    listaEl.replaceChildren(...ordenadas.map(linha));
    pintarSlider();
  }

  function destacar(id) {
    const el = document.getElementById(`rec-${id}`);
    if (!el) return;
    rolarAte(document.getElementById("recCard"));
    piscar(el);
  }

  return { render, destacar };
}
