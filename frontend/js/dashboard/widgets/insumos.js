// Lista de insumos (RF02/RF07): busca, filtro por situação e categoria,
// ordenação por coluna, paginação e exportação do saldo em CSV (Gestor).

import { h, icon } from "../dom.js";
import { medidor } from "../charts.js";
import { badgeStatus, estadoVazio } from "../components.js";
import { categoriaPorId, normaliza, statusDe, variacaoPreco } from "../analytics.js";
import { brl, num, qtd, signed } from "../format.js";
import { toast } from "../ui.js";

const POR_PAGINA = 8;

const COLUNAS = [
  { chave: "nome", rotulo: "Insumo", classe: "" },
  { chave: "estoque", rotulo: "Estoque", classe: "col-estoque" },
  { chave: "preco", rotulo: "Preço de compra", classe: "col-preco num" },
  { chave: "situacao", rotulo: "Situação", classe: "col-situacao" },
];

const razao = (i) => i.estoque / i.minimo;

const COMPARADORES = {
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  estoque: (a, b) => razao(a) - razao(b),
  preco: (a, b) => a.preco - b.preco,
  situacao: (a, b) => razao(a) - razao(b),
};

function baixarCsv(nomeArquivo, linhas) {
  const escapar = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const conteudo = linhas.map((l) => l.map(escapar).join(";")).join("\r\n");
  // BOM + ponto e vírgula: o Excel em português abre com acentos e colunas certas
  const blob = new Blob(["﻿", conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: nomeArquivo });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function montar(ctx) {
  const tabelaEl = document.getElementById("insumosTabela");
  const subEl = document.getElementById("insumosSub");
  const buscaEl = document.getElementById("tblBusca");
  const statusEl = document.getElementById("tblStatus");
  const chipsEl = document.getElementById("tblChips");
  const infoEl = document.getElementById("tblInfo");
  const pgLabel = document.getElementById("pgLabel");
  const pgPrev = document.getElementById("pgPrev");
  const pgNext = document.getElementById("pgNext");

  buscaEl.addEventListener("input", () => {
    ctx.state.tabela.busca = buscaEl.value;
    ctx.state.tabela.pagina = 1;
    render();
  });

  statusEl.addEventListener("click", (event) => {
    const botao = event.target.closest("[data-status]");
    if (!botao) return;
    ctx.state.tabela.status = botao.dataset.status;
    ctx.state.tabela.pagina = 1;
    render();
  });

  pgPrev.addEventListener("click", () => mudarPagina(-1));
  pgNext.addEventListener("click", () => mudarPagina(1));

  document.getElementById("exportBtn").addEventListener("click", () => {
    const lista = filtrados();
    const cabecalho = ["Insumo", "Categoria", "Fornecedor", "Estoque", "Unidade", "Mínimo", "Preço de compra (R$)", "Valor em estoque (R$)", "Situação"];
    const linhas = lista.map((i) => [
      i.nome,
      categoriaPorId(ctx.db, i.cat).nome,
      i.fornecedor.nome,
      num(i.estoque, 2),
      i.un,
      num(i.minimo, 2),
      num(i.preco, 2),
      num(i.estoque * i.preco, 2),
      statusDe(i) === "ok" ? "Ok" : statusDe(i) === "baixo" ? "Baixo" : "Crítico",
    ]);
    baixarCsv(`saldo-estoque-${new Date().toISOString().slice(0, 10)}.csv`, [cabecalho, ...linhas]);
    toast(`Saldo exportado: ${lista.length} insumo${lista.length === 1 ? "" : "s"}.`, { tom: "ok" });
  });

  function filtrados() {
    const { busca, status, ordem } = ctx.state.tabela;
    const q = normaliza(busca);

    const lista = ctx.db.insumos.filter((i) => {
      if (ctx.state.catFiltro && i.cat !== ctx.state.catFiltro) return false;
      if (status === "alerta" && statusDe(i) === "ok") return false;
      if (q && !normaliza(`${i.nome} ${i.fornecedor.nome} ${categoriaPorId(ctx.db, i.cat).nome}`).includes(q)) return false;
      return true;
    });

    const cmp = COMPARADORES[ordem.chave];
    return lista.sort((a, b) => cmp(a, b) * ordem.dir || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function mudarPagina(delta) {
    ctx.state.tabela.pagina += delta;
    render();
  }

  function ordenarPor(chave) {
    const { ordem } = ctx.state.tabela;
    if (ordem.chave === chave) ordem.dir *= -1;
    else {
      ordem.chave = chave;
      ordem.dir = 1;
    }
    ctx.state.tabela.pagina = 1;
    render();
  }

  function cabecalho() {
    const { ordem } = ctx.state.tabela;
    return h(
      "thead",
      null,
      h(
        "tr",
        null,
        ...COLUNAS.map((col) => {
          const ativa = ordem.chave === col.chave;
          return h(
            "th",
            { scope: "col", class: col.classe, "aria-sort": ativa ? (ordem.dir === 1 ? "ascending" : "descending") : "none" },
            h("button", { type: "button", class: `sort${ativa ? " is-active" : ""}`, onclick: () => ordenarPor(col.chave) }, col.rotulo, icon(ativa ? (ordem.dir === 1 ? "trend-up" : "trend-down") : "chevron-up-down", 14)),
          );
        }),
        h("th", { scope: "col", class: "col-acao" }, h("span", { class: "sr-only" }, "Ações")),
      ),
    );
  }

  function tendenciaPreco(insumo) {
    const v = variacaoPreco(insumo);
    const alto = Math.abs(v) >= 3;
    const tom = !alto ? "neutro" : v > 0 ? "ruim" : "bom"; // preço de compra subindo é ruim
    return h("small", { class: `delta delta--${tom}`, title: "Variação do preço de compra no último mês" }, icon(v > 0.05 ? "trend-up" : v < -0.05 ? "trend-down" : "minus", 12), signed(v, (x) => `${num(x, 1)}%`));
  }

  function linha(insumo) {
    const status = statusDe(insumo);
    const abrir = () => ctx.abrirInsumo(insumo.id);
    const tr = h(
      "tr",
      { class: "is-clickable", tabindex: "0", "aria-label": `${insumo.nome}, ${qtd(insumo.estoque, insumo.un)} em estoque. Abrir detalhes.` },
      h("td", { class: "tbl__name" }, h("strong", null, insumo.nome), h("small", null, ctx.state.catFiltro ? insumo.fornecedor.nome : categoriaPorId(ctx.db, insumo.cat).nome)),
      h(
        "td",
        { class: "col-estoque" },
        h("span", { class: "stock-qty" }, h("strong", null, qtd(insumo.estoque, insumo.un)), h("em", null, `mín. ${num(insumo.minimo, 1)}`)),
        medidor({ razao: insumo.estoque / (insumo.minimo * 2), tom: status, marca: 0.5 }),
      ),
      h("td", { class: "col-preco num" }, h("span", null, `${brl(insumo.preco)}`, h("small", { class: "unit" }, `/${insumo.un}`)), tendenciaPreco(insumo)),
      h("td", { class: "col-situacao" }, badgeStatus(status)),
      h(
        "td",
        { class: "col-acao" },
        h(
          "button",
          {
            type: "button",
            class: "icon-btn icon-btn--sm",
            title: "Registrar movimentação",
            "aria-label": `Registrar movimentação de ${insumo.nome}`,
            onclick: (e) => {
              e.stopPropagation();
              ctx.abrirMovimento({ tipo: status === "ok" ? "saida" : "entrada", insumoId: insumo.id });
            },
          },
          icon("swap", 16),
        ),
      ),
    );
    tr.addEventListener("click", abrir);
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === tr) abrir();
    });
    return tr;
  }

  function render() {
    const { tabela, catFiltro } = ctx.state;
    const lista = filtrados();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    tabela.pagina = Math.min(Math.max(1, tabela.pagina), paginas);
    const inicio = (tabela.pagina - 1) * POR_PAGINA;
    const pagina = lista.slice(inicio, inicio + POR_PAGINA);

    const emAlerta = ctx.db.insumos.filter((i) => statusDe(i) !== "ok").length;
    subEl.textContent = `${ctx.db.insumos.length} cadastrados · ${emAlerta} em alerta`;

    statusEl.querySelectorAll("[data-status]").forEach((b) => {
      const ativo = b.dataset.status === tabela.status;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    if (buscaEl.value !== tabela.busca) buscaEl.value = tabela.busca;

    chipsEl.hidden = !catFiltro;
    chipsEl.replaceChildren();
    if (catFiltro) {
      chipsEl.append(
        h(
          "span",
          { class: "chip" },
          h("span", null, "Categoria: ", h("strong", null, categoriaPorId(ctx.db, catFiltro).nome)),
          h(
            "button",
            {
              type: "button",
              "aria-label": "Remover filtro de categoria",
              onclick: () => {
                ctx.state.catFiltro = null;
                ctx.state.tabela.pagina = 1;
                ctx.render("categorias", "insumos");
              },
            },
            icon("x", 12),
          ),
        ),
      );
    }

    const corpo = pagina.length
      ? h("tbody", null, ...pagina.map(linha))
      : h(
          "tbody",
          null,
          h(
            "tr",
            null,
            h(
              "td",
              { colspan: COLUNAS.length + 1 },
              estadoVazio({
                icone: "search",
                titulo: "Nenhum insumo encontrado",
                texto: "Tente outro termo ou limpe os filtros.",
                acao: {
                  label: "Limpar filtros",
                  onClick: () => {
                    Object.assign(ctx.state.tabela, { busca: "", status: "todos", pagina: 1 });
                    ctx.state.catFiltro = null;
                    ctx.render("categorias", "insumos");
                  },
                },
              }),
            ),
          ),
        );

    tabelaEl.replaceChildren(h("caption", { class: "sr-only" }, "Lista de insumos com estoque, preço e situação"), cabecalho(), corpo);

    infoEl.textContent = lista.length ? `Mostrando ${inicio + 1}–${inicio + pagina.length} de ${lista.length}` : "0 resultados";
    pgLabel.textContent = `${tabela.pagina} de ${paginas}`;
    pgPrev.disabled = tabela.pagina <= 1;
    pgNext.disabled = tabela.pagina >= paginas;
  }

  return { render };
}
