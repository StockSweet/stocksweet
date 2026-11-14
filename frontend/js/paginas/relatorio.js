// Relatório de saldo (RF07/US06), exclusivo do Gestor (RNF01): quantidade, valor e situação de
// cada insumo em tempo real, com filtro por situação, busca e exportação em CSV.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { medidor } from "../dashboard/charts.js";
import { brl, int, num, pct, qtd } from "../dashboard/format.js";
import { chip, esqueleto, estadoVazio, normalizar } from "../componentes.js";
import { obterRelatorioSaldo } from "../estoqueService.js";
import { bannerDeFalha, linkVoltar, plural } from "./comum.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const SITUACAO = { critico: ["Crítico", "critico"], baixo: ["Baixo", "baixo"], ok: ["Em dia", "ok"] };

let layout = null;
const estado = { relatorio: null, busca: "", filtro: "todos" };

function kpi({ rotulo, icone, valor, dica, tom }) {
  return h(
    "article",
    { class: `kpi${tom ? ` kpi--${tom}` : ""}` },
    h("div", { class: "kpi__head" }, h("span", { class: "kpi__icon" }, icon(icone, 18)), h("span", { class: "kpi__label" }, rotulo)),
    h("div", { class: "kpi__value" }, valor),
    dica ? h("p", { class: "kpi__hint" }, dica) : null,
  );
}

// Planilha pt-BR: separador ";" e BOM para o Excel reconhecer os acentos.
function exportarCsv(insumos) {
  const campo = (valor) => `"${String(valor).replace(/"/g, '""')}"`;
  const linhas = [["Insumo", "Unidade", "Saldo", "Estoque mínimo", "Preço de compra", "Valor em estoque", "Situação", "Quantidade a repor"]];
  for (const i of insumos) {
    linhas.push([i.nome, i.unidadeMedida, num(i.quantidadeEstoque, 3), num(i.estoqueMinimo, 3), num(i.precoCompra, 2), num(i.valorTotalItem, 2), SITUACAO[i.situacao]?.[0] ?? i.situacao, num(i.quantidadeParaRepor, 3)]);
  }
  const csv = `﻿${linhas.map((l) => l.map(campo).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = h("a", { href: url, download: `saldo-estoque-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function linha(i) {
  const [rotulo, tom] = SITUACAO[i.situacao] ?? SITUACAO.ok;
  return h(
    "tr",
    null,
    h("td", { class: "cell--full" }, h("span", { class: "cell-strong" }, i.nome)),
    h("td", { class: "num nowrap", "data-label": "Saldo" }, h("span", { class: "cell-strong" }, qtd(i.quantidadeEstoque, i.unidadeMedida))),
    h("td", { class: "num nowrap", "data-label": "Mínimo" }, qtd(i.estoqueMinimo, i.unidadeMedida)),
    h(
      "td",
      { "data-label": "Nível" },
      h("div", { class: "cell-stack" }, h("span", { class: "cell-sub" }, `${pct(i.percentualEstoqueMinimo, 0)} do mínimo`), medidor({ razao: i.percentualEstoqueMinimo / 200, tom, marca: 0.5 })),
    ),
    h("td", { class: "num nowrap", "data-label": "Valor em estoque" }, brl(i.valorTotalItem)),
    h("td", { "data-label": "Situação" }, chip(rotulo, tom)),
    h("td", { class: "num nowrap", "data-label": "A repor" }, i.quantidadeParaRepor > 0 ? qtd(i.quantidadeParaRepor, i.unidadeMedida) : h("span", { class: "cell-sub" }, "—")),
  );
}

function desenhar(ui) {
  const { resumo, insumos } = estado.relatorio;
  ui.kpis.replaceChildren(
    kpi({ rotulo: "Valor em estoque", icone: "coins", valor: brl(resumo.valorTotalEstoque), dica: `${plural(resumo.totalInsumos, "insumo", "insumos")} no catálogo` }),
    kpi({ rotulo: "Em dia", icone: "check-circle", tom: "good", valor: int(resumo.insumosAdequados), dica: "acima do mínimo" }),
    kpi({ rotulo: "Em alerta", icone: "alert", tom: resumo.insumosEmAlerta ? "warn" : "good", valor: int(resumo.insumosEmAlerta), dica: `${int(resumo.insumosCriticos)} em nível crítico` }),
    kpi({ rotulo: "Saúde do estoque", icone: "heart", tom: resumo.indiceSaudeEstoque >= 85 ? "good" : resumo.indiceSaudeEstoque >= 65 ? "warn" : "crit", valor: pct(resumo.indiceSaudeEstoque, 0), dica: "insumos acima do mínimo" }),
  );

  const termo = normalizar(estado.busca.trim());
  const filtrados = insumos.filter((i) => (estado.filtro === "todos" || i.situacao !== "ok") && (!termo || normalizar(i.nome).includes(termo)));
  ui.contagem.textContent = plural(filtrados.length, "insumo", "insumos");
  ui.exportar.disabled = !filtrados.length;
  ui.exportar.onclick = () => exportarCsv(filtrados);

  if (!insumos.length) {
    ui.corpo.replaceChildren(estadoVazio({ titulo: "Nenhum insumo cadastrado", texto: "Cadastre insumos para acompanhar o saldo aqui.", acao: { rotulo: "Cadastrar insumo", icone: "plus", onClick: () => (window.location.href = "insumos.html") } }));
  } else if (!filtrados.length) {
    ui.corpo.replaceChildren(estadoVazio({ titulo: "Nada por aqui", texto: "Nenhum insumo corresponde ao filtro.", ilustracao: false, iconeNome: "search" }));
  } else {
    ui.corpo.replaceChildren(
      h(
        "div",
        { class: "table-wrap" },
        h(
          "table",
          { class: "tbl rtable" },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              h("th", { scope: "col" }, "Insumo"),
              h("th", { scope: "col", class: "num" }, "Saldo"),
              h("th", { scope: "col", class: "num" }, "Mínimo"),
              h("th", { scope: "col" }, "Nível"),
              h("th", { scope: "col", class: "num" }, "Valor em estoque"),
              h("th", { scope: "col" }, "Situação"),
              h("th", { scope: "col", class: "num" }, "A repor"),
            ),
          ),
          h("tbody", null, ...filtrados.map(linha)),
        ),
      ),
    );
  }
}

async function carregar(ui) {
  ui.avisos.replaceChildren();
  ui.corpo.replaceChildren(esqueleto({ linhas: 6 }));
  try {
    estado.relatorio = await obterRelatorioSaldo();
    desenhar(ui);
  } catch (erro) {
    ui.corpo.replaceChildren();
    ui.avisos.replaceChildren(bannerDeFalha(erro.message, () => carregar(ui)));
  }
}

function montar() {
  layout.definirPagina({ titulo: "Relatório de saldo", trilha: [PAINEL, { rotulo: "Relatório de saldo" }] });

  if (!layout.gestor) {
    layout.conteudo.replaceChildren(
      h("div", { class: "view" }, estadoVazio({ titulo: "Área exclusiva do Gestor", texto: "O relatório de saldo só está disponível para o perfil Gestor. Fale com o gestor da sua confeitaria.", ilustracao: false, iconeNome: "lock", acao: { rotulo: "Voltar ao painel", onClick: () => (window.location.href = "dashboard.html") } })),
    );
    return;
  }

  const busca = h("input", { type: "search", placeholder: "Buscar insumo…", autocomplete: "off", "aria-label": "Buscar insumo pelo nome" });
  const ui = {
    avisos: h("div", { class: "stack" }),
    kpis: h("div", { class: "kpis kpis--page" }),
    contagem: h("span", { class: "card-tools__count", "aria-live": "polite" }),
    corpo: h("div"),
    exportar: h("button", { type: "button", class: "btn btn--ghost btn--sm" }, icon("download", 16), "Exportar CSV"),
  };

  const botoesFiltro = [["todos", "Todos"], ["alerta", "Em alerta"]].map(([valor, rotulo]) =>
    h("button", { type: "button", class: estado.filtro === valor ? "is-active" : "", "aria-pressed": String(estado.filtro === valor), onclick: () => definirFiltro(valor) }, rotulo),
  );
  function definirFiltro(valor) {
    estado.filtro = valor;
    botoesFiltro.forEach((b, i) => {
      const ativo = ["todos", "alerta"][i] === valor;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    if (estado.relatorio) desenhar(ui);
  }
  busca.addEventListener("input", () => {
    estado.busca = busca.value;
    if (estado.relatorio) desenhar(ui);
  });

  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, linkVoltar("Voltar ao painel", "dashboard.html"), h("h1", null, "Relatório de saldo"), h("p", { class: "page-head__sub" }, "Quantidade, valor e situação de cada insumo agora.")),
        h("div", { class: "page-head__actions" }, h("button", { type: "button", class: "btn btn--ghost", onclick: () => carregar(ui) }, icon("refresh", 16), "Atualizar")),
      ),
      ui.avisos,
      ui.kpis,
      h(
        "section",
        { class: "card card--fluid", "aria-label": "Saldo dos insumos" },
        h("div", { class: "card-tools" }, h("div", { class: "input-icon" }, h("span", { class: "icon-slot" }, icon("search", 16)), busca), h("div", { class: "segmented segmented--sm", role: "group", "aria-label": "Filtrar por situação" }, ...botoesFiltro), ui.contagem, ui.exportar),
        ui.corpo,
      ),
    ),
  );
  carregar(ui);
}

layout = montarLayout({ ativo: "relatorios" });
if (layout) montar();
