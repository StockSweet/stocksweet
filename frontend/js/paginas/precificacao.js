// Tela de precificação (RF05 + RF08), só para o Gestor (RNF01): margem padrão, preço
// sugerido de cada receita, margem própria, "Calcular e salvar" e histórico de preços.
// Quem não é Gestor vê uma tela de acesso restrito e nenhuma chamada à API é feita
// (a API também recusa com 403: a checagem do front é só conveniência de UX).
// As chamadas à API ficam em js/precificacaoService.js.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { brl, dShort, hhmm, pct } from "../dashboard/format.js";
import { abrirDialogo, ajuda, banner, botaoIcone, chip, criarCampo, esqueleto, estadoVazio, lerNumero, normalizar, novoId } from "../componentes.js";
import { definirMargemPadrao, definirMargemReceita, listarHistorico, listarPrecificacao, obterMargemPadrao, salvarPrecificacao } from "../precificacaoService.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const LIMITE_VARIACAO = 5; // % — mesmo limite do alerta VariacaoCusto da API
const MARGEM_MAX = 999.99;

const FORMULA =
  "Preço sugerido = custo × (1 + margem ÷ 100). A margem é um acréscimo sobre o custo (markup); a margem real, que é o lucro sobre o preço, sai menor.";

let layout = null;
let navegacao = 0;

const dados = { precos: [], margemPadrao: null, filtro: "todas", busca: "" };

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */

const dataHora = (valor) => {
  const d = new Date(valor);
  return `${dShort(d, d.getFullYear() !== new Date().getFullYear())}, ${hhmm(d)}`;
};

// "+8,4%" / "−11,6%"
function variacaoTexto(v) {
  if (v === 0) return "0%";
  return `${v > 0 ? "+" : "−"}${pct(Math.abs(v), 1)}`;
}

function delta(v, titulo) {
  const tom = v > 0 ? "up" : v < 0 ? "down" : "flat";
  const seta = v > 0 ? "trend-up" : v < 0 ? "trend-down" : "minus";
  return h("span", { class: `delta delta--${tom}`, title: titulo ?? null }, icon(seta, 12), variacaoTexto(v));
}

const origemRotulo = (origem) => (origem === "receita" ? "própria" : "padrão");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function falhar(erro, retentar) {
  const rede = /conectar ao servidor/i.test(erro.message);
  layout.avisar(erro.message, {
    tom: "erro",
    duracao: 8000,
    acao: rede && retentar ? { label: "Tentar de novo", onClick: retentar } : undefined,
  });
}

function linkVoltar(rotulo, href) {
  return h("a", { class: "back-link", href }, icon("arrow-left", 16), rotulo);
}

function cabecalho({ subtitulo, acoes }) {
  return h(
    "div",
    { class: "page-head" },
    h(
      "div",
      { class: "page-head__main" },
      linkVoltar("Voltar ao painel", "dashboard.html"),
      h("h1", null, "Precificação"),
      subtitulo ? h("div", { class: "page-head__sub sub-line" }, h("span", null, subtitulo), ajuda(FORMULA, "Como o preço sugerido é calculado")) : null,
    ),
    acoes ? h("div", { class: "page-head__actions" }, ...acoes) : null,
  );
}

const TITULOS_ALERTA = {
  ReceitaSemItens: { tom: "aviso", titulo: "Receita sem insumos", icone: "info" },
  PrecoZerado: { tom: "erro", titulo: "Insumo sem preço de compra", icone: "alert-octagon" },
  EstoqueInsuficiente: { tom: "aviso", titulo: "Estoque insuficiente para produzir a receita", icone: "alert" },
};

// Banners dos alertas de um cálculo; a variação de custo (>= 5%) vem em destaque.
function bannersDoCalculo(calculo) {
  return calculo.alertas.map((alerta) => {
    if (alerta.tipo === "VariacaoCusto") {
      const subiu = (calculo.variacaoCustoPercentual ?? 0) > 0;
      return banner({ tom: subiu ? "erro" : "aviso", titulo: subiu ? "O custo subiu desde o último preço" : "O custo caiu desde o último preço", icone: subiu ? "trend-up" : "trend-down", mensagens: alerta.mensagem });
    }
    const info = TITULOS_ALERTA[alerta.tipo] ?? { tom: "aviso", titulo: "Atenção", icone: "alert" };
    return banner({ tom: info.tom, titulo: info.titulo, icone: info.icone, mensagens: alerta.mensagem });
  });
}

/* ---------------------------------------------------------
   Acesso restrito (perfil Usuário)
--------------------------------------------------------- */

function mostrarBloqueio() {
  layout.definirPagina({ titulo: "Precificação", trilha: [PAINEL, { rotulo: "Precificação" }] });
  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      linkVoltar("Voltar ao painel", "dashboard.html"),
      h(
        "div",
        { class: "empty empty--card" },
        h("div", { class: "empty__art" }, h("span", { class: "empty__badge" }, icon("lock", 30))),
        h("h1", { class: "empty__title" }, "Acesso restrito ao Gestor"),
        h("p", { class: "empty__text" }, "A precificação mostra margens e preços de venda, e só o perfil Gestor pode ver e alterar esses valores. Se você precisa dela, fale com o gestor da sua confeitaria."),
        h(
          "div",
          { class: "page-head__actions", style: { justifyContent: "center" } },
          h("a", { class: "btn btn--primary", href: "dashboard.html" }, icon("arrow-left", 16), "Voltar ao painel"),
          h("a", { class: "btn btn--ghost", href: "cadastro_receitas.html" }, icon("recipe", 16), "Ver receitas"),
        ),
      ),
    ),
  );
}

/* ---------------------------------------------------------
   Diálogos
--------------------------------------------------------- */

function campoMargem({ valor, obrigatorio, dica }) {
  const entrada = h("input", { id: novoId("margem"), type: "text", inputmode: "decimal", autocomplete: "off", value: valor == null ? "" : String(valor).replace(".", ","), placeholder: obrigatorio ? "Ex.: 30" : "Vazio = margem padrão" });
  return criarCampo({ rotulo: obrigatorio ? "Margem padrão" : "Margem própria", controle: entrada, sufixo: "%", dica, opcional: !obrigatorio });
}

// Lê a margem: vazio -> null (se opcional); fora de 0–999,99 -> undefined.
function lerMargem(texto) {
  if (texto.trim() === "") return null;
  const valor = lerNumero(texto);
  return Number.isFinite(valor) && valor >= 0 && valor <= MARGEM_MAX ? valor : undefined;
}

function abrirMargemPadrao() {
  const campo = campoMargem({ valor: dados.margemPadrao, obrigatorio: true, dica: "Vale para todas as receitas que não têm margem própria." });
  const avisoEl = h("div");
  const salvar = h("button", { type: "submit", class: "btn btn--primary", form: "formMargemPadrao" }, "Salvar margem");
  const semPropria = dados.precos.filter((p) => p.origemMargem !== "receita").length;
  const form = h("form", { id: "formMargemPadrao", class: "dlg__body", novalidate: true }, avisoEl, campo.el, h("p", { class: "hint-inline" }, `${plural(semPropria, "receita usa", "receitas usam")} a margem padrão; os preços sugeridos delas mudam ao salvar.`));

  const dialogo = abrirDialogo({
    titulo: "Margem padrão",
    subtitulo: "Acréscimo sobre o custo aplicado a todas as receitas.",
    corpo: form,
    rodape: [h("button", { type: "button", class: "btn btn--ghost", onclick: () => dialogo.fechar() }, "Cancelar"), salvar],
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const margem = lerMargem(campo.controle.value);
    if (margem == null) {
      campo.definirErro(campo.controle.value.trim() ? "A margem deve estar entre 0 e 999,99%." : "Informe a margem padrão, de 0 a 999,99%.");
      campo.controle.focus();
      return;
    }
    salvar.disabled = true;
    try {
      await definirMargemPadrao(margem);
      dialogo.fechar();
      layout.avisar(`Margem padrão atualizada para ${pct(margem, 2)}.`, { tom: "ok" });
      await recarregar();
    } catch (erro) {
      avisoEl.replaceChildren(banner({ tom: "erro", mensagens: erro.message, assertivo: true }));
      salvar.disabled = false;
    }
  });
}

function abrirMargemReceita(linha) {
  const propria = linha.margemReceita != null;
  const campo = campoMargem({ valor: linha.margemReceita, obrigatorio: false, dica: `Deixe vazio para usar a margem padrão (${pct(dados.margemPadrao ?? linha.margemLucro, 2)}).` });
  const previaEl = h("div", { class: "preview" });
  const avisoEl = h("div");
  const salvar = h("button", { type: "submit", class: "btn btn--primary", form: "formMargemReceita" }, "Salvar margem");
  const usarPadrao = h("button", { type: "button", class: "btn btn--ghost", disabled: !propria }, "Usar margem padrão");

  function atualizarPrevia() {
    const texto = campo.controle.value;
    const margem = lerMargem(texto);
    const efetiva = texto.trim() === "" ? (dados.margemPadrao ?? linha.margemLucro) : margem;
    if (efetiva === undefined || !linha.quantidadeItens) {
      previaEl.replaceChildren(h("div", { class: "preview__line preview__line--muted" }, h("span", null, linha.quantidadeItens ? "Informe uma margem entre 0 e 999,99%." : "Adicione insumos à receita para ver o preço."), h("strong", null, "—")));
      return;
    }
    const preco = linha.custoPorUnidade * (1 + efetiva / 100);
    previaEl.replaceChildren(
      h("div", { class: "preview__line" }, h("span", null, "Preço sugerido por unidade"), h("strong", null, `≈ ${brl(preco)}`)),
      h("div", { class: "preview__line preview__line--muted" }, h("span", null, `Hoje: ${brl(linha.precoSugerido)} (margem ${origemRotulo(linha.origemMargem)} de ${pct(linha.margemLucro, 2)})`)),
    );
  }
  campo.controle.addEventListener("input", atualizarPrevia);
  atualizarPrevia();

  const form = h("form", { id: "formMargemReceita", class: "dlg__body", novalidate: true }, avisoEl, campo.el, previaEl);
  const dialogo = abrirDialogo({
    titulo: "Margem da receita",
    subtitulo: `${linha.nome} · hoje usa a margem ${origemRotulo(linha.origemMargem)} de ${pct(linha.margemLucro, 2)}`,
    corpo: form,
    rodape: [usarPadrao, h("button", { type: "button", class: "btn btn--ghost", onclick: () => dialogo.fechar() }, "Cancelar"), salvar],
  });

  async function gravar(margem, mensagem) {
    salvar.disabled = true;
    usarPadrao.disabled = true;
    try {
      await definirMargemReceita(linha.idReceita, margem);
      dialogo.fechar();
      layout.avisar(mensagem, { tom: "ok" });
      await recarregar();
    } catch (erro) {
      avisoEl.replaceChildren(banner({ tom: "erro", mensagens: erro.message, assertivo: true }));
      salvar.disabled = false;
      usarPadrao.disabled = !propria;
    }
  }

  usarPadrao.addEventListener("click", () => gravar(null, `${linha.nome} voltou a usar a margem padrão.`));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const margem = lerMargem(campo.controle.value);
    if (margem === undefined) {
      campo.definirErro("A margem deve estar entre 0 e 999,99%.");
      campo.controle.focus();
      return;
    }
    gravar(margem, margem === null ? `${linha.nome} voltou a usar a margem padrão.` : `Margem de ${linha.nome} atualizada para ${pct(margem, 2)}.`);
  });
}

function fato(rotulo, valor, extra) {
  return h("div", { class: "facts__item" }, h("dt", null, rotulo), h("dd", null, valor, extra ? h("small", null, extra) : null));
}

function abrirResultado(linha, resposta) {
  const { calculo, dataCalculo } = resposta;
  const dialogo = abrirDialogo({
    titulo: "Preço salvo",
    subtitulo: `${linha.nome} · ${dataHora(dataCalculo)}`,
    corpo: [
      ...bannersDoCalculo(calculo),
      h("div", { class: "price-hero" }, h("span", { class: "price-hero__label" }, `Preço sugerido por ${calculo.unidadeRendimento.replace(/s$/, "")}`), h("span", { class: "price-hero__value" }, brl(calculo.precoSugerido)), h("span", { class: "price-hero__sub" }, `Receita inteira: ${brl(calculo.precoSugeridoTotal)}`)),
      h(
        "dl",
        { class: "facts facts--3" },
        fato("Custo de produção", brl(calculo.custoProducao)),
        fato("Margem", pct(calculo.margemLucro, 2), `sobre o custo · ${origemRotulo(calculo.origemMargem)}`),
        fato("Margem real", calculo.margemReal == null ? "—" : pct(calculo.margemReal, 2), "lucro ÷ preço"),
      ),
    ],
    rodape: [
      h("button", { type: "button", class: "btn btn--ghost", onclick: () => (dialogo.fechar(), abrirHistorico(linha)) }, icon("history", 16), "Ver histórico"),
      h("button", { type: "button", class: "btn btn--primary", "data-autofocus": "", onclick: () => dialogo.fechar() }, "Concluir"),
    ],
  });
}

async function abrirHistorico(linha) {
  const corpo = h("div", { class: "stack" }, esqueleto({ linhas: 3 }));
  const gaveta = abrirDialogo({ tipo: "gaveta", titulo: "Histórico de preços", subtitulo: linha.nome, corpo });

  async function carregar() {
    corpo.replaceChildren(esqueleto({ linhas: 3 }));
    try {
      const historico = await listarHistorico(linha.idReceita);
      if (!gaveta.raiz.isConnected) return;
      if (!historico.length) {
        corpo.replaceChildren(
          estadoVazio({
            titulo: "Nenhum preço salvo ainda",
            texto: linha.quantidadeItens ? "Use “Calcular e salvar” para registrar o preço de hoje e acompanhar as mudanças de custo." : "Adicione insumos à ficha técnica para poder calcular o preço.",
            ilustracao: false,
            iconeNome: "history",
          }),
        );
        return;
      }
      corpo.replaceChildren(
        h(
          "p",
          { class: "hint-inline" },
          `${plural(historico.length, "preço salvo", "preços salvos")}, do mais recente ao mais antigo. A variação compara o custo com o do preço anterior.`,
        ),
        h(
          "ol",
          { class: "timeline", "aria-label": "Preços salvos da receita" },
          ...historico.map((item, i) => {
            const anterior = historico[i + 1];
            const variacao = anterior && anterior.custoProducao > 0 ? ((item.custoProducao - anterior.custoProducao) / anterior.custoProducao) * 100 : null;
            const relevante = variacao != null && Math.abs(variacao) >= LIMITE_VARIACAO;
            return h(
              "li",
              { class: `tl-item${i === 0 ? " tl-item--atual" : ""}` },
              h(
                "div",
                { class: "tl-item__head" },
                h("span", { class: "tl-item__price" }, brl(item.precoSugerido), " ", h("small", null, `/ ${linha.unidadeRendimento}`)),
                h("span", { class: "tl-item__date" }, dataHora(item.dataCalculo)),
              ),
              h(
                "div",
                { class: "tl-item__facts" },
                i === 0 ? chip("Mais recente", "acento") : null,
                h("span", null, `Custo ${brl(item.custoProducao)}`),
                variacao != null ? delta(variacao, relevante ? "Variação de 5% ou mais no custo" : "Variação do custo") : null,
                h("span", null, `Margem ${pct(item.margemLucro, 2)}`),
                item.margemReal != null ? h("span", null, `Margem real ${pct(item.margemReal, 2)}`) : null,
                h("span", null, `Receita ${brl(item.precoSugeridoTotal)}`),
                item.nomeUsuario ? h("span", null, `por ${item.nomeUsuario}`) : null,
              ),
            );
          }),
        ),
      );
    } catch (erro) {
      if (!gaveta.raiz.isConnected) return;
      corpo.replaceChildren(banner({ tom: "erro", titulo: "Não foi possível carregar o histórico", mensagens: erro.message, assertivo: true, acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: carregar }] }));
    }
  }
  await carregar();
}

/* ---------------------------------------------------------
   Lista de receitas
--------------------------------------------------------- */

async function calcularESalvar(linha, botao) {
  const rotuloOriginal = botao.cloneNode(true).childNodes;
  botao.disabled = true;
  botao.replaceChildren(icon("refresh", 14), "Calculando…");
  botao.firstChild.classList.add("spin");
  try {
    const resposta = await salvarPrecificacao(linha.idReceita);
    await recarregar();
    abrirResultado(linha, resposta);
  } catch (erro) {
    falhar(erro, () => calcularESalvar(linha, botao));
    botao.disabled = false;
    botao.replaceChildren(...rotuloOriginal);
  }
}

function situacao(linha) {
  if (linha.quantidadeItens === 0) return { chave: "sem-itens", chip: chip("Sem itens", "neutro", "info") };
  if (!linha.ultimoPreco) return { chave: "sem-preco", chip: chip("Sem preço salvo", "neutro", "clock") };
  if (linha.desatualizado) return { chave: "desatualizada", chip: chip("Desatualizado", "baixo", "alert") };
  return { chave: "atualizada", chip: chip("Atualizado", "ok", "check-circle") };
}

function linhaPreco(linha) {
  const semItens = linha.quantidadeItens === 0;
  const sit = situacao(linha);
  const variacao = linha.variacaoCustoPercentual;
  const vazio = () => h("span", { class: "cell-sub" }, "—");

  const calcular = h("button", { type: "button", class: "btn btn--xs btn--tonal", disabled: semItens, title: semItens ? "Adicione insumos à ficha técnica antes de calcular o preço." : null }, icon("calculator", 14), "Calcular e salvar");
  calcular.addEventListener("click", () => calcularESalvar(linha, calcular));
  if (semItens) calcular.setAttribute("aria-label", `Calcular e salvar ${linha.nome} (indisponível: receita sem itens)`);

  return h(
    "tr",
    null,
    h(
      "td",
      { class: "cell--full" },
      h(
        "div",
        { class: "cell-name" },
        h("a", { class: "cell-name__link", href: `cadastro_receitas.html#/receita/${linha.idReceita}`, title: "Abrir a ficha técnica" }, linha.nome),
        h("span", { class: "cell-name__sub" }, `Rende ${linha.rendimentoReceita.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${linha.unidadeRendimento}`),
        h("div", { class: "cell-flags cell-flags--name", role: "group", "aria-label": "Situação do preço" }, sit.chip, linha.ultimoPreco && variacao != null && variacao !== 0 ? delta(variacao, "Variação do custo desde o último preço salvo") : null),
        linha.ultimoPreco && linha.margemAlterada ? h("span", { class: "cell-sub" }, "A margem mudou desde o último preço") : null,
        linha.possuiAlertas && !semItens ? h("span", { class: "cell-sub" }, "Há alertas de custo: calcule para ver") : null,
      ),
    ),
    h("td", { class: "num", "data-label": "Custo" }, semItens ? vazio() : h("div", { class: "cell-stack" }, h("span", { class: "cell-strong" }, brl(linha.custoProducao)), h("span", { class: "cell-sub" }, `${brl(linha.custoPorUnidade)} / unid.`))),
    h("td", { class: "num", "data-label": "Margem" }, h("div", { class: "cell-stack" }, h("span", { class: "cell-strong" }, pct(linha.margemLucro, 2)), chip(origemRotulo(linha.origemMargem), linha.origemMargem === "receita" ? "acento" : "neutro"))),
    h("td", { class: "num", "data-label": "Preço sugerido (por unidade)" }, semItens ? vazio() : h("div", { class: "cell-stack" }, h("span", { class: "cell-strong" }, brl(linha.precoSugerido)), h("span", { class: "cell-sub" }, `Total: ${brl(linha.precoSugeridoTotal)}`))),
    h(
      "td",
      { class: "num", "data-label": "Último preço salvo" },
      linha.ultimoPreco ? h("div", { class: "cell-stack" }, h("span", { class: "cell-strong" }, brl(linha.ultimoPreco.precoSugerido)), h("span", { class: "cell-sub" }, dataHora(linha.ultimoPreco.dataCalculo))) : vazio(),
    ),
    h(
      "td",
      { class: "col-actions cell--full" },
      h(
        "div",
        { class: "row-actions" },
        calcular,
        botaoIcone({ icone: "percent", rotulo: `Margem da receita ${linha.nome}`, onClick: () => abrirMargemReceita(linha) }),
        botaoIcone({ icone: "history", rotulo: `Histórico de preços de ${linha.nome}`, onClick: () => abrirHistorico(linha) }),
      ),
    ),
  );
}

/* ---------------------------------------------------------
   Tela
--------------------------------------------------------- */

let ui = null; // referências da tela montada

function contagens() {
  const lista = dados.precos;
  return {
    total: lista.length,
    desatualizadas: lista.filter((p) => p.quantidadeItens > 0 && p.ultimoPreco && p.desatualizado).length,
    semPreco: lista.filter((p) => p.quantidadeItens > 0 && !p.ultimoPreco).length,
    comPreco: lista.filter((p) => p.ultimoPreco).length,
  };
}

function kpi({ rotulo, icone, valor, dica, tom, acao }) {
  return h(
    "article",
    { class: `kpi${tom ? ` kpi--${tom}` : ""}` },
    h("div", { class: "kpi__head" }, h("span", { class: "kpi__icon" }, icon(icone, 18)), h("span", { class: "kpi__label" }, rotulo)),
    h("div", { class: "kpi__value" }, valor),
    dica ? h("p", { class: "kpi__hint" }, dica) : null,
    acao ? h("button", { type: "button", class: "kpi__link", onclick: acao.onClick }, acao.rotulo) : null,
  );
}

function desenharResumo() {
  const c = contagens();
  ui.kpis.replaceChildren(
    kpi({ rotulo: "Margem padrão", icone: "percent", valor: dados.margemPadrao == null ? "—" : pct(dados.margemPadrao, 2), dica: "Vale para receitas sem margem própria.", acao: { rotulo: "Alterar margem padrão", onClick: abrirMargemPadrao } }),
    kpi({ rotulo: "Receitas", icone: "recipe", valor: String(c.total), dica: `${c.comPreco} com preço salvo` }),
    kpi({
      rotulo: "Preço desatualizado",
      icone: "alert",
      tom: c.desatualizadas ? "warn" : "good",
      valor: String(c.desatualizadas),
      dica: c.desatualizadas ? "O custo mudou desde o último preço salvo." : "Nenhum preço salvo está velho.",
      acao: c.desatualizadas ? { rotulo: "Ver desatualizadas", onClick: () => definirFiltro("desatualizadas") } : null,
    }),
    kpi({ rotulo: "Sem preço salvo", icone: "clock", valor: String(c.semPreco), dica: "Receitas com itens que ainda não foram precificadas.", acao: c.semPreco ? { rotulo: "Ver sem preço", onClick: () => definirFiltro("sem-preco") } : null }),
  );

  // Alerta de variação de custo >= 5% (para cima ou para baixo)
  const relevantes = dados.precos.filter((p) => p.ultimoPreco && p.variacaoCustoPercentual != null && Math.abs(p.variacaoCustoPercentual) >= LIMITE_VARIACAO);
  if (!relevantes.length) {
    ui.alerta.replaceChildren();
    return;
  }
  const subiu = relevantes.some((p) => p.variacaoCustoPercentual > 0);
  ui.alerta.replaceChildren(
    banner({
      tom: subiu ? "erro" : "aviso",
      icone: subiu ? "trend-up" : "trend-down",
      titulo: `${plural(relevantes.length, "receita com custo", "receitas com custo")} variando ${LIMITE_VARIACAO}% ou mais desde o último preço`,
      mensagens: relevantes.map((p) => `${p.nome}: custo ${variacaoTexto(p.variacaoCustoPercentual)} (de ${brl(p.ultimoPreco.custoProducao)} para ${brl(p.custoProducao)}). Reavalie o preço.`),
      acoes: [{ rotulo: "Ver desatualizadas", onClick: () => definirFiltro("desatualizadas") }],
    }),
  );
}

function filtradas() {
  const termo = normalizar(dados.busca.trim());
  return dados.precos.filter((p) => {
    if (termo && !normalizar(p.nome).includes(termo)) return false;
    if (dados.filtro === "desatualizadas") return p.quantidadeItens > 0 && p.ultimoPreco && p.desatualizado;
    if (dados.filtro === "sem-preco") return p.quantidadeItens > 0 && !p.ultimoPreco;
    return true;
  });
}

function definirFiltro(filtro) {
  dados.filtro = filtro;
  desenharLista();
}

function desenharLista() {
  const c = contagens();
  ui.filtros.replaceChildren(
    ...[
      ["todas", `Todas (${c.total})`],
      ["desatualizadas", `Desatualizadas (${c.desatualizadas})`],
      ["sem-preco", `Sem preço (${c.semPreco})`],
    ].map(([chave, rotulo]) => h("button", { type: "button", class: dados.filtro === chave ? "is-active" : "", "aria-pressed": String(dados.filtro === chave), onclick: () => definirFiltro(chave) }, rotulo)),
  );

  const lista = filtradas();
  ui.contagem.textContent = dados.precos.length ? plural(lista.length, "receita", "receitas") : "";

  if (!dados.precos.length) {
    ui.corpo.replaceChildren(
      estadoVazio({
        titulo: "Nenhuma receita para precificar",
        texto: "Cadastre uma receita e monte a ficha técnica; o preço sugerido aparece aqui.",
        acao: { rotulo: "Ir para receitas", icone: "recipe", onClick: () => (window.location.href = "cadastro_receitas.html") },
      }),
    );
    return;
  }
  if (!lista.length) {
    ui.corpo.replaceChildren(
      estadoVazio({
        titulo: "Nada por aqui",
        texto: dados.filtro === "todas" ? `Nenhuma receita encontrada para “${dados.busca.trim()}”.` : "Nenhuma receita neste filtro. Boa notícia!",
        ilustracao: false,
        iconeNome: "check-circle",
        acao: {
          rotulo: "Ver todas as receitas",
          onClick: () => {
            dados.busca = "";
            ui.busca.value = "";
            definirFiltro("todas");
          },
        },
      }),
    );
    return;
  }

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
            h("th", { scope: "col" }, "Receita e situação"),
            h("th", { scope: "col", class: "num" }, "Custo"),
            h("th", { scope: "col", class: "num" }, "Margem"),
            h("th", { scope: "col", class: "num" }, "Preço sugerido por unidade"),
            h("th", { scope: "col", class: "num" }, "Último preço salvo"),
            h("th", { scope: "col", class: "col-actions" }, h("span", { class: "sr-only" }, "Ações")),
          ),
        ),
        h("tbody", null, ...lista.map(linhaPreco)),
      ),
    ),
  );
}

async function buscarDados() {
  const [precos, margem] = await Promise.all([listarPrecificacao(), obterMargemPadrao()]);
  dados.precos = precos;
  dados.margemPadrao = margem.margemPadrao;
}

// Recarrega sem piscar a tela (depois de salvar margem ou preço).
async function recarregar() {
  const token = navegacao;
  try {
    await buscarDados();
    if (token === navegacao && ui) {
      desenharResumo();
      desenharLista();
    }
  } catch (erro) {
    falhar(erro, recarregar);
  }
}

async function carregarTela() {
  ui.avisos.replaceChildren();
  ui.kpis.replaceChildren();
  ui.alerta.replaceChildren();
  ui.corpo.replaceChildren(esqueleto({ cards: 4, linhas: 5 }));
  ui.conteudo.hidden = true;
  ui.carregando.hidden = false;
  try {
    await buscarDados();
    ui.carregando.hidden = true;
    ui.conteudo.hidden = false;
    desenharResumo();
    desenharLista();
    return true;
  } catch (erro) {
    ui.carregando.hidden = true;
    ui.avisos.replaceChildren(banner({ tom: "erro", titulo: "Não foi possível carregar a precificação", mensagens: erro.message, assertivo: true, acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: carregarTela }] }));
    return false;
  }
}

function mostrarTela() {
  layout.definirPagina({ titulo: "Precificação", trilha: [PAINEL, { rotulo: "Precificação" }] });

  const busca = h("input", { type: "search", placeholder: "Buscar receita…", autocomplete: "off", "aria-label": "Buscar receita pelo nome", value: dados.busca });
  busca.addEventListener("input", () => {
    dados.busca = busca.value;
    desenharLista();
  });

  ui = {
    avisos: h("div", { class: "stack" }),
    carregando: h("div", null, esqueleto({ cards: 4, linhas: 5 })),
    kpis: h("div", { class: "kpis kpis--page" }),
    alerta: h("div", { class: "stack" }),
    filtros: h("div", { class: "segmented segmented--sm", role: "group", "aria-label": "Filtrar por situação" }),
    contagem: h("span", { class: "card-tools__count", "aria-live": "polite" }),
    corpo: h("div"),
    busca,
  };
  ui.conteudo = h(
    "div",
    { class: "stack" },
    ui.kpis,
    ui.alerta,
    h("section", { class: "card card--wide", "aria-label": "Receitas e preços" }, h("div", { class: "card-tools" }, h("div", { class: "input-icon" }, h("span", { class: "icon-slot" }, icon("search", 16)), busca), ui.filtros, ui.contagem), ui.corpo),
  );

  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      cabecalho({
        subtitulo: "Preço sugerido de cada receita a partir do custo e da margem.",
        acoes: [h("button", { type: "button", class: "btn btn--ghost", onclick: () => carregarTela().then((ok) => ok && layout.avisar("Preços atualizados.", { tom: "ok" })) }, icon("refresh", 16), "Atualizar")],
      }),
      ui.avisos,
      ui.carregando,
      ui.conteudo,
    ),
  );
  return carregarTela();
}

/* ---------------------------------------------------------
   Início
--------------------------------------------------------- */

function iniciar() {
  layout = montarLayout({ ativo: "precificacao" });
  if (!layout) return;

  // RNF01: perfil Usuário não vê a tela nem chama a API.
  if (!layout.gestor) {
    mostrarBloqueio();
    return;
  }
  navegacao += 1;
  mostrarTela();
}

iniciar();
