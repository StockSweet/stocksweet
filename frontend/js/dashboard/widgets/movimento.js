// Card principal: entradas x saídas no período, em gráfico de linhas ou tabela.

import { h, icon } from "../dom.js";
import { lineChart } from "../charts.js";
import { intervaloDoPeriodo, seriesDoPeriodo } from "../analytics.js";
import { brl0, brlCompact, signed } from "../format.js";

const COR_ENTRADAS = "var(--series-1)";
const COR_SAIDAS = "var(--series-2)";

const soma = (arr) => arr.reduce((a, b) => a + b, 0);

export function montar(ctx) {
  const chartEl = document.getElementById("movChart");
  const tabelaEl = document.getElementById("movTable");
  const subEl = document.getElementById("movSub");
  const insightEl = document.getElementById("movInsight");
  const viewEl = document.getElementById("movView");
  let grafico = null;

  viewEl.addEventListener("click", (event) => {
    const botao = event.target.closest("[data-view]");
    if (!botao) return;
    const tabela = botao.dataset.view === "table";
    chartEl.hidden = tabela;
    tabelaEl.hidden = !tabela;
    viewEl.querySelectorAll("[data-view]").forEach((b) => {
      const ativo = b === botao;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    // o gráfico escondido não mede largura: redesenha ao voltar
    if (!tabela) grafico?.update({}, { animar: false });
  });

  function montarTabela(dados) {
    const linhas = dados.labels.map((rotulo, i) => {
      const saldo = dados.entradas[i] - dados.saidas[i];
      return h(
        "tr",
        null,
        h("th", { scope: "row" }, rotulo.long),
        h("td", { class: "num" }, brl0(dados.entradas[i])),
        h("td", { class: "num" }, brl0(dados.saidas[i])),
        h("td", { class: `num ${saldo < 0 ? "is-neg" : ""}` }, signed(saldo, brl0)),
      );
    });

    tabelaEl.replaceChildren(
      h(
        "table",
        { class: "tbl tbl--compact" },
        h("caption", { class: "sr-only" }, "Entradas e saídas por período, em reais"),
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "Período"), h("th", { scope: "col", class: "num" }, "Entradas"), h("th", { scope: "col", class: "num" }, "Saídas"), h("th", { scope: "col", class: "num" }, "Saldo"))),
        h("tbody", null, ...linhas),
      ),
    );
  }

  function insight(dados) {
    const totalE = soma(dados.entradas);
    const totalS = soma(dados.saidas);
    const saldo = totalE - totalS;
    const maior = dados.saidas.indexOf(Math.max(...dados.saidas));

    insightEl.replaceChildren(
      h(
        "span",
        { class: "insight" },
        icon(saldo >= 0 ? "arrow-in" : "arrow-out", 16),
        h("span", null, "Saldo do período ", h("strong", null, signed(saldo, brl0)), saldo >= 0 ? " — entrou mais do que saiu." : " — saiu mais do que entrou."),
      ),
      h(
        "span",
        { class: "insight" },
        icon("activity", 16),
        h("span", null, "Maior consumo: ", h("strong", null, dados.labels[maior].long), " · ", brl0(dados.saidas[maior])),
      ),
    );
  }

  function render() {
    const { periodo } = ctx.state;
    const dados = seriesDoPeriodo(ctx.db, periodo);

    subEl.textContent = `Valor movimentado ${periodo.porLabel} · ${intervaloDoPeriodo(ctx.db, periodo)}`;

    const config = {
      series: [
        { id: "entradas", name: "Entradas", color: COR_ENTRADAS, values: dados.entradas },
        { id: "saidas", name: "Saídas", color: COR_SAIDAS, values: dados.saidas },
      ],
      labels: dados.labels,
      formatValue: brl0,
      formatTick: brlCompact,
      formatEnd: brlCompact,
      legendTotals: { entradas: brlCompact(soma(dados.entradas)), saidas: brlCompact(soma(dados.saidas)) },
      ariaLabel: `Entradas e saídas ${periodo.porLabel}, últimos ${periodo.label}`,
      height: 300,
    };

    if (grafico) grafico.update(config);
    else grafico = lineChart(chartEl, config);

    montarTabela(dados);
    insight(dados);
  }

  return { render };
}
