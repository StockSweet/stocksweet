// Painel (visão geral): indicadores, alertas de estoque (RF06), últimas movimentações e,
// para o Gestor, consumo recente e custo das receitas. Tudo vem da API real.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { medidor } from "../dashboard/charts.js";
import { brl, int, qtd, timeAgo, saudacao } from "../dashboard/format.js";
import { chip, esqueleto, estadoVazio } from "../componentes.js";
import { listarAlertas, listarInsumos, listarMovimentacoes, obterRelatorioSaldo } from "../estoqueService.js";
import { listarCustos } from "../receitaService.js";
import { bannerDeFalha } from "./comum.js";

const LIMITE_ALERTAS = 6;
let layout = null;

const ehEntrada = (mov) => String(mov.tipo).toLowerCase().startsWith("entrada");

function kpi({ rotulo, icone, valor, dica, tom, href }) {
  return h(
    "article",
    { class: `kpi${tom ? ` kpi--${tom}` : ""}` },
    h("div", { class: "kpi__head" }, h("span", { class: "kpi__icon" }, icon(icone, 18)), h("span", { class: "kpi__label" }, rotulo)),
    h("div", { class: "kpi__value" }, valor),
    dica ? h("p", { class: "kpi__hint" }, dica) : null,
    href ? h("a", { class: "kpi__link", href }, "Ver detalhes") : null,
  );
}

function cartao({ classe, titulo, subtitulo, acao, corpo }) {
  return h(
    "section",
    { class: `card ${classe}`, "aria-label": titulo },
    h("header", { class: "card__head" }, h("div", null, h("h2", { class: "card__title" }, titulo), subtitulo ? h("p", { class: "card__sub" }, subtitulo) : null), acao ?? null),
    h("div", { class: "card__body card__body--flush" }, corpo),
  );
}

/* ---------- blocos ---------- */

function itemAlerta(a) {
  const tom = a.nivel === "critico" ? "critico" : "baixo";
  return h(
    "li",
    { class: `alert-item alert-item--${tom}` },
    h(
      "div",
      { class: "alert-item__main" },
      h("a", { class: "alert-item__name", href: "insumos.html" }, a.nome),
      h("span", { class: "alert-item__qty" }, h("strong", null, qtd(a.quantidadeEstoque, a.unidadeMedida)), ` de ${qtd(a.estoqueMinimo, a.unidadeMedida)} mínimos`),
      medidor({ razao: a.estoqueMinimo > 0 ? a.quantidadeEstoque / (a.estoqueMinimo * 2) : 0, tom, marca: 0.5 }),
    ),
    h(
      "div",
      { class: "alert-item__side" },
      chip(tom === "critico" ? "Crítico" : "Baixo", tom, tom === "critico" ? "alert-octagon" : "alert"),
      h("a", { class: "btn btn--tonal btn--xs", href: "entrada_mercadorias.html", "aria-label": `Repor ${a.nome}` }, icon("plus", 14), `Repor ${qtd(a.quantidadeParaRepor, a.unidadeMedida)}`),
    ),
  );
}

function blocoAlertas(alertas) {
  const criticos = alertas.filter((a) => a.nivel === "critico").length;
  const subtitulo = alertas.length ? `${criticos} crítico${criticos === 1 ? "" : "s"} · ${alertas.length - criticos} abaixo do mínimo` : "Nada abaixo do mínimo agora";
  const corpo = alertas.length
    ? h(
        "ul",
        { class: "alert-list" },
        ...alertas.slice(0, LIMITE_ALERTAS).map(itemAlerta),
        alertas.length > LIMITE_ALERTAS ? h("li", { class: "alert-list__more" }, h("a", { class: "link-btn", href: "insumos.html" }, `Ver todos os ${alertas.length} alertas`, icon("chevron-right", 14))) : null,
      )
    : estadoVazio({ titulo: "Tudo em ordem", texto: "Nenhum insumo está no nível mínimo ou abaixo dele.", ilustracao: false, iconeNome: "check-circle" });

  return cartao({ classe: "card--mov", titulo: "Alertas de estoque", subtitulo, acao: h("span", { class: `count-pill${alertas.length ? "" : " is-zero"}` }, String(alertas.length)), corpo });
}

function itemMovimentacao(m) {
  const entrada = ehEntrada(m);
  const nome = m.insumoNome ?? m.nomeInsumo;
  const un = m.unidadeMedida;
  return h(
    "li",
    { class: "feed-item" },
    h("span", { class: `feed-item__icon feed-item__icon--${entrada ? "entrada" : "saida"}` }, icon(entrada ? "arrow-in" : "arrow-out", 16)),
    h("div", { class: "feed-item__txt" }, h("strong", null, nome), h("small", null, `${entrada ? "Entrada" : "Saída"} · ${m.usuarioNome} · ${timeAgo(new Date(m.data))}`)),
    h("div", { class: "feed-item__val" }, h("strong", null, `${entrada ? "+" : "−"}${qtd(m.quantidade, un)}`)),
  );
}

function blocoMovimentacoes(movs) {
  const corpo = movs.length
    ? h("ul", { class: "feed" }, ...movs.map(itemMovimentacao))
    : estadoVazio({ titulo: "Sem movimentações", texto: "As entradas e saídas de mercadorias aparecem aqui.", ilustracao: false, iconeNome: "info" });
  return cartao({
    classe: "card--alertas",
    titulo: "Últimas movimentações",
    subtitulo: "Entradas e saídas mais recentes",
    acao: h("a", { class: "link-btn", href: "entrada_mercadorias.html" }, "Registrar", icon("chevron-right", 14)),
    corpo,
  });
}

function blocoConsumo(top) {
  const maior = Math.max(...top.map((c) => Number(c.quantidadeConsumida)), 0);
  const corpo = top.length
    ? h(
        "ul",
        { class: "feed" },
        ...top.map((c) =>
          h(
            "li",
            { class: "feed-item" },
            h("span", { class: "feed-item__icon feed-item__icon--saida" }, icon("arrow-out", 16)),
            h("div", { class: "feed-item__txt" }, h("strong", null, c.nome), medidor({ razao: maior ? c.quantidadeConsumida / maior : 0, tom: "ok" })),
            h("div", { class: "feed-item__val" }, h("strong", null, qtd(c.quantidadeConsumida, c.unidadeMedida)), c.valorTotalConsumido != null ? h("small", null, brl(c.valorTotalConsumido)) : null),
          ),
        ),
      )
    : estadoVazio({ titulo: "Sem consumo recente", texto: "Registre saídas de mercadorias para ver o que mais sai.", ilustracao: false, iconeNome: "info" });
  return cartao({ classe: "card--cat", titulo: "Mais consumidos", subtitulo: "Saídas dos últimos 30 dias", corpo });
}

function blocoReceitas(custos) {
  const corpo = custos.length
    ? h(
        "ul",
        { class: "feed" },
        ...custos.slice(0, 6).map((r) =>
          h(
            "li",
            { class: "feed-item" },
            h("span", { class: "feed-item__icon" }, icon("recipe", 16)),
            h("div", { class: "feed-item__txt" }, h("a", { class: "feed-item__name", href: `cadastro_receitas.html#/receita/${r.idReceita}` }, r.nome), h("small", null, `${r.quantidadeItens} insumo${r.quantidadeItens === 1 ? "" : "s"} na ficha técnica`)),
            h("div", { class: "feed-item__val" }, h("strong", null, brl(r.custoPorUnidade)), h("small", null, "por unidade")),
          ),
        ),
      )
    : estadoVazio({ titulo: "Nenhuma receita", texto: "Cadastre receitas para ver o custo de produção.", ilustracao: false, iconeNome: "recipe" });
  return cartao({
    classe: "card--rec",
    titulo: "Custo das receitas",
    subtitulo: "Calculado com o preço atual de cada insumo",
    acao: h("a", { class: "link-btn", href: "precificacao.html" }, "Precificação", icon("chevron-right", 14)),
    corpo,
  });
}

/* ---------- carga ---------- */

async function carregar(raiz) {
  raiz.replaceChildren(esqueleto({ cards: 4, linhas: 4 }));
  try {
    const gestor = layout.gestor;
    // O relatório consolidado é só do Gestor; o Usuário monta o painel com os endpoints abertos.
    const [insumos, alertas, movs, relatorio, custos] = await Promise.all([
      listarInsumos(),
      listarAlertas(),
      listarMovimentacoes({ limite: 8 }),
      gestor ? obterRelatorioSaldo() : Promise.resolve(null),
      gestor ? listarCustos().catch(() => []) : Promise.resolve([]),
    ]);

    const total = insumos.length;
    const emAlerta = alertas.length;
    const saude = total ? Math.round(((total - emAlerta) / total) * 100) : 100;
    const valor = relatorio?.resumo.valorTotalEstoque ?? insumos.reduce((soma, i) => soma + i.quantidadeEstoque * i.precoCompra, 0);

    const kpis = h(
      "div",
      { class: "kpis kpis--page" },
      kpi({ rotulo: "Insumos cadastrados", icone: "box", valor: int(total), dica: total ? "no catálogo" : "Cadastre o primeiro insumo", href: "insumos.html" }),
      kpi({ rotulo: "Insumos em alerta", icone: "alert", tom: emAlerta ? "crit" : "good", valor: int(emAlerta), dica: emAlerta ? "no mínimo ou abaixo dele" : "Nenhum abaixo do mínimo" }),
      kpi({ rotulo: "Saúde do estoque", icone: "heart", tom: saude >= 85 ? "good" : saude >= 65 ? "warn" : "crit", valor: `${saude}%`, dica: `${total - emAlerta} de ${total} acima do mínimo` }),
      gestor ? kpi({ rotulo: "Valor em estoque", icone: "coins", valor: brl(valor), dica: "saldo × preço de compra", href: "relatorio_saldo.html" }) : null,
    );

    const linha1 = h("div", { class: "grid" }, blocoAlertas(alertas), blocoMovimentacoes(movs));
    const linha2 = gestor ? h("div", { class: "grid" }, blocoConsumo(relatorio.topConsumo), blocoReceitas(custos)) : null;
    raiz.replaceChildren(h("div", { class: "stack" }, kpis, linha1, linha2));
  } catch (erro) {
    raiz.replaceChildren(bannerDeFalha(erro.message, () => carregar(raiz)));
  }
}

layout = montarLayout({ ativo: "painel" });
if (layout) {
  layout.definirPagina({ titulo: "Painel", trilha: [{ rotulo: "Painel" }] });
  const nome = String(layout.sessao.usuario.nome ?? "").split(/\s+/)[0] || "equipe";
  const corpo = h("div");
  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, h("h1", null, `${saudacao()}, ${nome}`), h("p", { class: "page-head__sub" }, "Resumo do seu estoque agora.")),
        h(
          "div",
          { class: "page-head__actions" },
          h("button", { type: "button", class: "btn btn--ghost", onclick: () => carregar(corpo) }, icon("refresh", 16), "Atualizar"),
          h("a", { class: "btn btn--primary", href: "entrada_mercadorias.html" }, icon("plus", 18), "Registrar movimentação"),
        ),
      ),
      corpo,
    ),
  );
  carregar(corpo);
}
