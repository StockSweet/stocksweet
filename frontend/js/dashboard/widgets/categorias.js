// Insumos por categoria: barras horizontais (uma cor só — as categorias não têm ordem natural).
// Clicar numa barra filtra a lista de insumos.

import { barChart } from "../charts.js";
import { rolarAte, piscar } from "../components.js";
import { categoriaPorId, porCategoria } from "../analytics.js";
import { brl0 } from "../format.js";

export function montar(ctx) {
  const chartEl = document.getElementById("catChart");
  const subEl = document.getElementById("catSub");
  const hintEl = document.getElementById("catHint");
  const modoEl = document.getElementById("catModo");

  modoEl.addEventListener("click", (event) => {
    const botao = event.target.closest("[data-modo]");
    if (!botao || ctx.state.catModo === botao.dataset.modo) return;
    ctx.state.catModo = botao.dataset.modo;
    render();
  });

  function selecionar(id) {
    ctx.state.catFiltro = id;
    ctx.state.tabela.pagina = 1;
    ctx.render("categorias", "insumos");

    if (id) {
      const alvo = document.getElementById("insumosCard");
      if (alvo.getBoundingClientRect().top > window.innerHeight * 0.8) rolarAte(alvo);
      piscar(alvo);
    }
  }

  function render() {
    const { catModo, catFiltro, periodo } = ctx.state;
    const itens = porCategoria(ctx.db, periodo, catModo);
    const total = itens.reduce((t, it) => t + it.value, 0);

    modoEl.querySelectorAll("[data-modo]").forEach((b) => {
      const ativo = b.dataset.modo === catModo;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });

    subEl.textContent =
      catModo === "estoque"
        ? `${brl0(total)} parados em estoque hoje`
        : `${brl0(total)} consumidos nos últimos ${periodo.label}`;

    hintEl.textContent = catFiltro
      ? `Lista filtrada por “${categoriaPorId(ctx.db, catFiltro).nome}”. Clique na barra de novo para limpar.`
      : "Clique em uma categoria para filtrar a lista de insumos.";

    barChart(chartEl, {
      items: itens,
      formatValue: brl0,
      selecionado: catFiltro,
      onSelect: selecionar,
      ariaLabel: catModo === "estoque" ? "Valor em estoque por categoria" : "Consumo por categoria no período",
    });
  }

  return { render };
}
