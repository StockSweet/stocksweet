// Tela de receitas (RF03): lista com busca, formulário em diálogo e a ficha técnica
// (visão detalhe, em #/receita/{id}) com o custo de produção da receita.
// As chamadas à API ficam em js/receitaService.js e js/precificacaoService.js.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { brl, num, pct } from "../dashboard/format.js";
import { abrirDialogo, banner, botaoIcone, chip, confirmar, criarCampo, esqueleto, estadoVazio, lerNumero, normalizar, novoId } from "../componentes.js";
import {
  adicionarItem,
  atualizarItem,
  atualizarReceita,
  criarReceita,
  excluirReceita,
  listarCustos,
  listarInsumos,
  listarReceitas,
  obterCusto,
  removerItem,
} from "../receitaService.js";
import { obterPrecoSugerido } from "../precificacaoService.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const RECEITAS = { rotulo: "Receitas", href: "#/" };
const UNIDADES_SUGERIDAS = ["unidades", "porções", "fatias", "kg", "L"];

let layout = null;
let navegacao = 0; // descarta respostas de uma tela que já foi trocada

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */

const qtdFmt = (valor, un) => `${num(valor, 3)} ${un}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Erros de rede ganham "Tentar de novo"; os de regra (409, 404…) só a mensagem.
function falhar(erro, retentar) {
  const rede = /conectar ao servidor/i.test(erro.message);
  layout.avisar(erro.message, {
    tom: "erro",
    duracao: 8000,
    acao: rede && retentar ? { label: "Tentar de novo", onClick: retentar } : undefined,
  });
}

function bannerDeFalha(mensagem, aoTentarDeNovo) {
  return banner({
    tom: "erro",
    titulo: "Não foi possível carregar",
    mensagens: mensagem,
    assertivo: true,
    acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: aoTentarDeNovo }],
  });
}

function rota() {
  const m = /^#\/receita\/(\d+)\/?$/.exec(window.location.hash);
  return m ? { tipo: "detalhe", id: Number(m[1]) } : { tipo: "lista" };
}

function linkVoltar(rotulo, href) {
  return h("a", { class: "back-link", href }, icon("arrow-left", 16), rotulo);
}

/* ---------------------------------------------------------
   Formulário de receita (diálogo): criar e editar
--------------------------------------------------------- */

function abrirFormReceita({ receita = null, aoSalvar }) {
  const editando = Boolean(receita);
  const nome = h("input", { id: novoId("nome"), type: "text", maxlength: 150, autocomplete: "off", value: receita?.nome ?? "", placeholder: "Ex.: Bolo de cenoura" });
  const descricao = h("textarea", { id: novoId("desc"), maxlength: 500, rows: 3, placeholder: "Ex.: Cobertura de brigadeiro, sem glúten…" }, receita?.descricao ?? "");
  const rendimento = h("input", { id: novoId("rend"), type: "text", inputmode: "decimal", autocomplete: "off", value: receita ? num(receita.rendimentoReceita, 3).replace(/\./g, "") : "", placeholder: "Ex.: 12" });
  const idLista = novoId("unidades");
  const unidade = h("input", { id: novoId("un"), type: "text", maxlength: 20, autocomplete: "off", list: idLista, value: receita?.unidadeRendimento ?? "", placeholder: "Ex.: fatias" });
  const lista = h("datalist", { id: idLista }, ...UNIDADES_SUGERIDAS.map((u) => h("option", { value: u })));

  const campoNome = criarCampo({ rotulo: "Nome da receita", controle: nome });
  const campoDescricao = criarCampo({ rotulo: "Descrição", controle: descricao, opcional: true });
  const campoRendimento = criarCampo({ rotulo: "Rendimento", controle: rendimento });
  const campoUnidade = criarCampo({ rotulo: "Unidade do rendimento", controle: unidade });

  const avisoEl = h("div", { class: "dlg__aviso" });
  const salvar = h("button", { type: "submit", class: "btn btn--primary", form: "formReceitaDlg" }, editando ? "Salvar alterações" : "Cadastrar receita");
  const form = h("form", { id: "formReceitaDlg", class: "dlg__body", novalidate: true }, avisoEl, campoNome.el, campoDescricao.el, h("div", { class: "fld__row" }, campoRendimento.el, campoUnidade.el), lista);

  const dialogo = abrirDialogo({
    titulo: editando ? "Editar receita" : "Nova receita",
    subtitulo: editando ? null : "Depois de cadastrar, adicione os insumos na ficha técnica.",
    corpo: form,
    rodape: [h("button", { type: "button", class: "btn btn--ghost", onclick: () => dialogo.fechar() }, "Cancelar"), salvar],
  });
  nome.setAttribute("data-autofocus", "");
  nome.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    avisoEl.replaceChildren();

    const dados = {
      nome: nome.value.trim(),
      descricao: descricao.value.trim() || null,
      rendimentoReceita: lerNumero(rendimento.value),
      unidadeRendimento: unidade.value.trim(),
    };

    campoNome.definirErro(dados.nome ? "" : "Informe o nome da receita.");
    campoRendimento.definirErro(dados.rendimentoReceita > 0 ? "" : "O rendimento deve ser maior que zero.");
    campoUnidade.definirErro(dados.unidadeRendimento ? "" : "Informe a unidade do rendimento.");
    const invalido = [campoNome, campoRendimento, campoUnidade].find((c) => c.el.classList.contains("is-invalid"));
    if (invalido) {
      invalido.controle.focus();
      return;
    }

    salvar.disabled = true;
    try {
      const resposta = editando ? await atualizarReceita(receita.idReceita, dados) : await criarReceita(dados);
      dialogo.fechar();
      await aoSalvar(resposta, dados);
    } catch (erro) {
      avisoEl.replaceChildren(banner({ tom: "erro", mensagens: erro.message, assertivo: true }));
      salvar.disabled = false;
    }
  });
}

async function pedirExclusaoReceita(receita) {
  const itens = receita.quantidadeItens ?? 0;
  const ok = await confirmar({
    titulo: "Excluir receita?",
    mensagem: `“${receita.nome}” será excluída${itens ? ` junto com ${plural(itens, "insumo da ficha técnica", "insumos da ficha técnica")}` : ""}. Essa ação não pode ser desfeita.`,
    rotuloConfirmar: "Excluir receita",
    perigo: true,
  });
  if (!ok) return false;

  try {
    await excluirReceita(receita.idReceita);
    layout.avisar(`Receita “${receita.nome}” excluída.`, { tom: "ok" });
    return true;
  } catch (erro) {
    falhar(erro);
    return false;
  }
}

/* ---------------------------------------------------------
   Lista de receitas
--------------------------------------------------------- */

const lista = { receitas: [], custos: new Map(), busca: "" };

function celulaCusto(receita) {
  const custo = lista.custos.get(receita.idReceita);
  if (!receita.quantidadeItens) {
    return [h("td", { class: "num", "data-label": "Custo total" }, h("span", { class: "cell-sub" }, "—")), h("td", { class: "num", "data-label": "Custo por unidade" }, h("span", { class: "cell-sub" }, "—"))];
  }
  if (!custo) {
    return [h("td", { class: "num", "data-label": "Custo total" }, "—"), h("td", { class: "num", "data-label": "Custo por unidade" }, "—")];
  }
  return [
    h(
      "td",
      { class: "num", "data-label": "Custo total" },
      h(
        "div",
        { class: "cell-stack" },
        h("span", { class: "cell-strong" }, brl(custo.custoTotal)),
        custo.possuiAlertas ? h("span", { title: "O cálculo tem alertas. Abra a ficha técnica para ver os detalhes." }, chip("Atenção", "baixo", "alert")) : null,
      ),
    ),
    h("td", { class: "num", "data-label": "Custo por unidade" }, h("span", { class: "cell-strong" }, brl(custo.custoPorUnidade))),
  ];
}

function linhaReceita(receita, acoes) {
  const href = `#/receita/${receita.idReceita}`;
  return h(
    "tr",
    null,
    h(
      "td",
      { class: "cell--full" },
      h("div", { class: "cell-name" }, h("a", { class: "cell-name__link", href }, receita.nome), receita.descricao ? h("span", { class: "cell-name__sub", title: receita.descricao }, receita.descricao) : null),
    ),
    h("td", { class: "nowrap", "data-label": "Rendimento" }, qtdFmt(receita.rendimentoReceita, receita.unidadeRendimento)),
    h("td", { class: "num", "data-label": "Insumos" }, receita.quantidadeItens ? String(receita.quantidadeItens) : h("span", { title: "Sem insumos na ficha técnica" }, chip("Sem insumos", "neutro"))),
    ...celulaCusto(receita),
    h(
      "td",
      { class: "col-actions cell--full" },
      h(
        "div",
        { class: "row-actions" },
        h("a", { class: "btn btn--xs btn--tonal", href, "aria-label": `Abrir ficha técnica de ${receita.nome}` }, icon("clipboard", 14), "Ficha técnica"),
        botaoIcone({ icone: "pencil", rotulo: `Editar ${receita.nome}`, onClick: () => acoes.editar(receita) }),
        botaoIcone({ icone: "trash", rotulo: `Excluir ${receita.nome}`, perigo: true, onClick: () => acoes.excluir(receita) }),
      ),
    ),
  );
}

function tabelaReceitas(itens, acoes) {
  return h(
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
          h("th", { scope: "col" }, "Receita"),
          h("th", { scope: "col" }, "Rendimento"),
          h("th", { scope: "col", class: "num" }, "Insumos"),
          h("th", { scope: "col", class: "num" }, "Custo total"),
          h("th", { scope: "col", class: "num" }, "Custo por unidade"),
          h("th", { scope: "col", class: "col-actions" }, h("span", { class: "sr-only" }, "Ações")),
        ),
      ),
      h("tbody", null, ...itens.map((r) => linhaReceita(r, acoes))),
    ),
  );
}

async function mostrarLista(token) {
  const raiz = layout.conteudo;
  layout.definirPagina({ titulo: "Receitas", trilha: [PAINEL, { rotulo: "Receitas" }] });

  const novaBtn = h("button", { type: "button", class: "btn btn--primary", onclick: () => abrirFormReceita({ aoSalvar: aposCriar }) }, icon("plus", 18), "Nova receita");
  const subtitulo = h("p", { class: "page-head__sub" }, "Fichas técnicas e custo de produção de cada receita.");
  const busca = h("input", { type: "search", placeholder: "Buscar receita…", autocomplete: "off", "aria-label": "Buscar receita pelo nome", value: lista.busca });
  const contagem = h("span", { class: "card-tools__count", "aria-live": "polite" });
  const corpo = h("div", { id: "listaReceitas" });
  const avisos = h("div", { class: "stack" });

  const acoes = { editar: (r) => abrirFormReceita({ receita: r, aoSalvar: carregarELimpar }), excluir: excluirDaLista };

  function desenhar() {
    const termo = normalizar(lista.busca.trim());
    const filtradas = termo ? lista.receitas.filter((r) => normalizar(`${r.nome} ${r.descricao ?? ""}`).includes(termo)) : lista.receitas;

    contagem.textContent = lista.receitas.length ? (termo ? `${plural(filtradas.length, "resultado", "resultados")} de ${lista.receitas.length}` : plural(lista.receitas.length, "receita", "receitas")) : "";

    if (!lista.receitas.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhuma receita cadastrada ainda",
          texto: "Cadastre a primeira receita e monte a ficha técnica para ver o custo de produção e o preço de venda.",
          acao: { rotulo: "Cadastrar primeira receita", icone: "plus", onClick: () => abrirFormReceita({ aoSalvar: aposCriar }) },
        }),
      );
    } else if (!filtradas.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhuma receita encontrada",
          texto: `Não achamos nada para “${lista.busca.trim()}”. Confira a grafia ou limpe a busca.`,
          ilustracao: false,
          iconeNome: "search",
          acao: {
            rotulo: "Limpar busca",
            onClick: () => {
              busca.value = "";
              lista.busca = "";
              desenhar();
              busca.focus();
            },
          },
        }),
      );
    } else {
      corpo.replaceChildren(tabelaReceitas(filtradas, acoes));
    }
  }

  busca.addEventListener("input", () => {
    lista.busca = busca.value;
    desenhar();
  });

  async function carregar({ silencioso = false } = {}) {
    if (!silencioso) corpo.replaceChildren(esqueleto({ linhas: 5 }));
    avisos.replaceChildren();
    try {
      // O resumo de custo é um complemento: se falhar, a lista aparece com "—" no lugar.
      const [receitas, resumo] = await Promise.all([listarReceitas(), listarCustos().catch(() => [])]);
      if (token !== navegacao) return;
      lista.receitas = receitas;
      lista.custos = new Map(resumo.map((c) => [c.idReceita, c]));
      desenhar();
    } catch (erro) {
      if (token !== navegacao) return;
      corpo.replaceChildren();
      avisos.replaceChildren(bannerDeFalha(erro.message, () => carregar()));
    }
  }

  async function carregarELimpar() {
    await carregar({ silencioso: true });
  }

  async function aposCriar(resposta, dados) {
    const id = resposta?.idReceita ?? resposta?.receita?.idReceita;
    layout.avisar(resposta?.message ?? `Receita “${dados.nome}” cadastrada.`, {
      tom: "ok",
      acao: id ? { label: "Abrir ficha técnica", onClick: () => (window.location.hash = `#/receita/${id}`) } : undefined,
    });
    await carregar({ silencioso: true });
  }

  async function excluirDaLista(receita) {
    if (await pedirExclusaoReceita(receita)) await carregar({ silencioso: true });
  }

  raiz.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, linkVoltar("Voltar ao painel", "dashboard.html"), h("h1", null, "Receitas"), subtitulo),
        h("div", { class: "page-head__actions" }, novaBtn),
      ),
      avisos,
      h("section", { class: "card card--fluid", "aria-label": "Lista de receitas" }, h("div", { class: "card-tools" }, h("div", { class: "input-icon" }, h("span", { class: "icon-slot" }, icon("search", 16)), busca), contagem), corpo),
    ),
  );

  if (lista.receitas.length) desenhar();
  await carregar({ silencioso: lista.receitas.length > 0 });
}

/* ---------------------------------------------------------
   Ficha técnica (visão detalhe)
--------------------------------------------------------- */

const TITULOS_ALERTA = {
  ReceitaSemItens: { tom: "aviso", titulo: "Receita sem insumos", icone: "info" },
  PrecoZerado: { tom: "erro", titulo: "Insumo sem preço de compra", icone: "alert-octagon" },
  EstoqueInsuficiente: { tom: "aviso", titulo: "Estoque insuficiente para produzir a receita", icone: "alert" },
};

// Combo pesquisável de insumos (input + lista), simples e acessível por teclado.
function criarCombo(aoEscolher) {
  const idLista = novoId("combo-lista");
  const input = h("input", {
    id: novoId("insumo"),
    type: "text",
    class: "combo__input",
    role: "combobox",
    autocomplete: "off",
    spellcheck: "false",
    "aria-expanded": "false",
    "aria-controls": idLista,
    "aria-autocomplete": "list",
    placeholder: "Buscar insumo…",
  });
  const listaEl = h("ul", { class: "combo__list", id: idLista, role: "listbox", "aria-label": "Insumos", hidden: true });
  const el = h("div", { class: "combo" }, input, h("span", { class: "combo__chev" }, icon("chevron-down", 16)), listaEl);

  let insumos = [];
  let usados = new Set();
  let escolhido = null;
  let visiveis = [];
  let ativo = -1;

  function fechar() {
    listaEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    ativo = -1;
  }

  function marcar(indice) {
    ativo = indice;
    [...listaEl.querySelectorAll("[role=option]")].forEach((opcao, i) => {
      opcao.classList.toggle("is-active", i === ativo);
      opcao.setAttribute("aria-selected", String(i === ativo));
      if (i === ativo) {
        input.setAttribute("aria-activedescendant", opcao.id);
        opcao.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function escolher(insumo) {
    if (usados.has(insumo.idInsumo)) return;
    escolhido = insumo;
    input.value = insumo.nome;
    fechar();
    aoEscolher(insumo);
  }

  function abrir() {
    const termo = normalizar(input.value.trim());
    visiveis = insumos.filter((i) => !termo || normalizar(i.nome).includes(termo));
    listaEl.replaceChildren(
      ...(visiveis.length
        ? visiveis.map((insumo, i) => {
            const jaUsado = usados.has(insumo.idInsumo);
            return h(
              "li",
              {
                id: `${idLista}-${i}`,
                role: "option",
                class: "combo__opt",
                "aria-selected": "false",
                "aria-disabled": jaUsado ? "true" : null,
                onpointerdown: (e) => e.preventDefault(),
                onclick: () => escolher(insumo),
                onpointermove: () => ativo !== i && marcar(i),
              },
              h("span", null, insumo.nome),
              h("small", null, jaUsado ? "já na receita" : `${brl(insumo.precoCompra)} / ${insumo.unidadeMedida}`),
            );
          })
        : [h("li", { class: "combo__empty", role: "presentation" }, insumos.length ? "Nenhum insumo com esse nome." : "Nenhum insumo cadastrado.")]),
    );
    listaEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (visiveis.length) marcar(Math.max(0, visiveis.findIndex((i) => !usados.has(i.idInsumo))));
  }

  input.addEventListener("click", () => listaEl.hidden && abrir());
  input.addEventListener("input", () => {
    if (escolhido) {
      escolhido = null;
      aoEscolher(null);
    }
    abrir();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      // Texto igual ao nome de um insumo livre conta como escolha.
      const exato = !escolhido && insumos.find((i) => normalizar(i.nome) === normalizar(input.value.trim()) && !usados.has(i.idInsumo));
      if (exato) escolher(exato);
      fechar();
    }, 120);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (listaEl.hidden) abrir();
      else if (visiveis.length) marcar((ativo + (event.key === "ArrowDown" ? 1 : -1) + visiveis.length) % visiveis.length);
    } else if (event.key === "Enter" && !listaEl.hidden && visiveis[ativo]) {
      event.preventDefault();
      escolher(visiveis[ativo]);
    } else if (event.key === "Escape" && !listaEl.hidden) {
      event.stopPropagation();
      fechar();
    }
  });

  return {
    el,
    input,
    get escolhido() {
      return escolhido;
    },
    definirInsumos(lista, idsUsados) {
      insumos = lista;
      usados = new Set(idsUsados);
    },
    limpar() {
      escolhido = null;
      input.value = "";
      fechar();
    },
  };
}

async function mostrarDetalhe(id, token) {
  const raiz = layout.conteudo;
  const estado = { receita: null, custo: null, preco: null, insumos: [], editando: null };

  layout.definirPagina({ titulo: "Ficha técnica", trilha: [PAINEL, RECEITAS, { rotulo: "…" }] });

  const topo = h("div", { class: "stack" });
  const avisos = h("div", { class: "stack" });
  const corpo = h("div", { class: "stack" }, esqueleto({ cards: layout.gestor ? 4 : 3, linhas: 4 }));
  raiz.replaceChildren(h("div", { class: "view" }, topo, avisos, corpo));
  topo.replaceChildren(h("div", { class: "page-head" }, h("div", { class: "page-head__main" }, linkVoltar("Voltar para receitas", "#/"))));

  const tentarDeNovo = () => mostrarDetalhe(id, ++navegacao);

  /* ----- dados ----- */
  async function carregarCusto() {
    const custo = await obterCusto(id);
    // Preço sugerido: só o Gestor chama a API de preço, e só quando há insumos para calcular.
    let preco = null;
    if (layout.gestor && custo.itens.length) preco = await obterPrecoSugerido(id).catch(() => null);
    return { custo, preco };
  }

  let carregado;
  try {
    const [receitas, dados, insumos] = await Promise.all([listarReceitas(), carregarCusto(), listarInsumos().catch(() => [])]);
    carregado = { receitas, ...dados, insumos };
  } catch (erro) {
    if (token !== navegacao) return;
    corpo.replaceChildren();
    avisos.replaceChildren(
      /não encontrad/i.test(erro.message)
        ? estadoVazio({ titulo: "Receita não encontrada", texto: "Ela pode ter sido excluída. Volte para a lista e escolha outra.", ilustracao: false, iconeNome: "search", acao: { rotulo: "Voltar para receitas", icone: "arrow-left", onClick: () => (window.location.hash = "#/") } })
        : bannerDeFalha(erro.message, tentarDeNovo),
    );
    return;
  }
  if (token !== navegacao) return;

  estado.receita = carregado.receitas.find((r) => r.idReceita === id) ?? null;
  estado.custo = carregado.custo;
  estado.preco = carregado.preco;
  estado.insumos = carregado.insumos;

  if (!estado.receita) {
    corpo.replaceChildren(estadoVazio({ titulo: "Receita não encontrada", texto: "Ela pode ter sido excluída. Volte para a lista e escolha outra.", ilustracao: false, iconeNome: "search", acao: { rotulo: "Voltar para receitas", icone: "arrow-left", onClick: () => (window.location.hash = "#/") } }));
    return;
  }

  /* ----- partes da tela ----- */
  const kpisEl = h("div", { class: "kpis kpis--page" });
  const alertasEl = h("div", { class: "stack" });
  const tabelaEl = h("div", { id: "tabelaItens" });

  function desenharTopo() {
    const r = estado.receita;
    layout.definirPagina({ titulo: r.nome, trilha: [PAINEL, RECEITAS, { rotulo: r.nome }] });
    topo.replaceChildren(
      h(
        "div",
        { class: "page-head" },
        h(
          "div",
          { class: "page-head__main" },
          linkVoltar("Voltar para receitas", "#/"),
          h("p", { class: "eyebrow" }, "Ficha técnica"),
          h("h1", null, r.nome),
          h("div", { class: "page-head__meta" }, chip(`Rende ${qtdFmt(r.rendimentoReceita, r.unidadeRendimento)}`, "acento", "recipe"), chip(plural(estado.custo.itens.length, "insumo", "insumos"), "neutro", "box")),
          r.descricao ? h("p", { class: "page-head__text" }, r.descricao) : null,
        ),
        h(
          "div",
          { class: "page-head__actions" },
          h("button", { type: "button", class: "btn btn--ghost", onclick: () => abrirFormReceita({ receita: r, aoSalvar: aposEditarReceita }) }, icon("pencil", 16), "Editar receita"),
          h("button", { type: "button", class: "btn btn--ghost", onclick: recalcular }, icon("refresh", 16), "Atualizar custo"),
          botaoIcone({ icone: "trash", rotulo: `Excluir a receita ${r.nome}`, perigo: true, onClick: excluirEstaReceita }),
        ),
      ),
    );
  }

  function kpi({ rotulo, icone, valor, dica, tom }) {
    return h("article", { class: `kpi${tom ? ` kpi--${tom}` : ""}` }, h("div", { class: "kpi__head" }, h("span", { class: "kpi__icon" }, icon(icone, 18)), h("span", { class: "kpi__label" }, rotulo)), h("div", { class: "kpi__value" }, valor), dica ? h("p", { class: "kpi__hint" }, dica) : null);
  }

  function desenharResumo() {
    const { custo, preco } = estado;
    const semItens = custo.itens.length === 0;
    const cards = [
      kpi({ rotulo: "Custo total", icone: "coins", valor: semItens ? "—" : brl(custo.custoTotal), dica: `Para ${qtdFmt(custo.rendimentoReceita, custo.unidadeRendimento)}` }),
      kpi({ rotulo: "Custo por unidade", icone: "tag", valor: semItens ? "—" : brl(custo.custoPorUnidade), dica: `Por ${custo.unidadeRendimento.replace(/s$/, "")}` }),
      kpi({ rotulo: "Insumos", icone: "box", valor: String(custo.itens.length), dica: semItens ? "Adicione o primeiro abaixo" : "na ficha técnica" }),
    ];
    if (layout.gestor) {
      cards.push(
        kpi({
          rotulo: "Preço sugerido",
          icone: "percent",
          tom: preco ? "good" : null,
          valor: preco ? brl(preco.precoSugerido) : "—",
          dica: preco ? `Margem de ${pct(preco.margemLucro, 1)} (${preco.origemMargem === "receita" ? "própria" : "padrão"}) · receita toda: ${brl(preco.precoSugeridoTotal)}` : semItens ? "Disponível depois de adicionar insumos" : "Indisponível no momento",
        }),
      );
    }
    kpisEl.replaceChildren(...cards);
  }

  function desenharAlertas() {
    const grupos = new Map();
    for (const alerta of estado.custo.alertas) {
      if (!grupos.has(alerta.tipo)) grupos.set(alerta.tipo, []);
      grupos.get(alerta.tipo).push(alerta.mensagem);
    }
    alertasEl.replaceChildren(
      ...[...grupos].map(([tipo, mensagens]) => {
        const info = TITULOS_ALERTA[tipo] ?? { tom: "aviso", titulo: "Atenção", icone: "alert" };
        return banner({ tom: info.tom, titulo: info.titulo, icone: info.icone, mensagens });
      }),
    );
  }

  /* ----- adicionar insumo (inline) ----- */
  const idsUsados = () => estado.custo.itens.map((i) => i.idInsumo);
  const combo = criarCombo((insumo) => {
    campoQtd.sufixoEl.textContent = insumo ? insumo.unidadeMedida : "—";
    campoInsumo.definirErro("");
    estimar();
  });
  const qtdInput = h("input", { id: novoId("qtd"), type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "0", "aria-label": "Quantidade do insumo" });
  const campoInsumo = criarCampo({ rotulo: "Insumo", controle: combo.input, envoltorio: combo.el });
  const campoQtd = criarCampo({ rotulo: "Quantidade", controle: qtdInput, sufixo: "—", dica: " " });
  const addBtn = h("button", { type: "submit", class: "btn btn--primary add-item__btn" }, icon("plus", 16), "Adicionar");
  const formAdd = h("form", { class: "add-item", novalidate: true, "aria-label": "Adicionar insumo à receita" }, campoInsumo.el, campoQtd.el, addBtn);

  function estimar() {
    const q = lerNumero(qtdInput.value);
    const insumo = combo.escolhido;
    campoQtd.dicaEl.textContent = insumo && q > 0 ? `Custo estimado: ${brl(q * insumo.precoCompra)}` : " ";
  }
  qtdInput.addEventListener("input", estimar);

  formAdd.addEventListener("submit", async (event) => {
    event.preventDefault();
    const insumo = combo.escolhido;
    const quantidade = lerNumero(qtdInput.value);
    campoInsumo.definirErro(insumo ? "" : "Escolha um insumo da lista.");
    campoQtd.definirErro(quantidade > 0 ? "" : "Informe uma quantidade maior que zero.");
    if (!insumo) return combo.input.focus();
    if (!(quantidade > 0)) return qtdInput.focus();

    addBtn.disabled = true;
    try {
      const resposta = await adicionarItem(id, { idInsumo: insumo.idInsumo, quantidade });
      combo.limpar();
      qtdInput.value = "";
      campoQtd.sufixoEl.textContent = "—";
      estimar();
      layout.avisar(resposta?.message ?? `${insumo.nome} adicionado à receita.`, { tom: "ok" });
      await atualizar();
      combo.input.focus();
    } catch (erro) {
      falhar(erro);
    } finally {
      addBtn.disabled = false;
    }
  });

  /* ----- tabela de itens ----- */
  const sinaisPorInsumo = () => {
    const mapa = new Map();
    for (const a of estado.custo.alertas) {
      if (a.idInsumo == null) continue;
      if (!mapa.has(a.idInsumo)) mapa.set(a.idInsumo, new Set());
      mapa.get(a.idInsumo).add(a.tipo);
    }
    return mapa;
  };

  function celulaQuantidade(item) {
    if (estado.editando !== item.idItem) return h("td", { class: "num", "data-label": "Quantidade" }, qtdFmt(item.quantidade, item.unidadeMedida));

    const entrada = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", value: num(item.quantidade, 3).replace(/\./g, ""), "aria-label": `Nova quantidade de ${item.nomeInsumo} em ${item.unidadeMedida}` });
    const erro = h("p", { class: "edit-qty__error", role: "alert" });
    const caixa = h("div", { class: "fld__suffix" }, entrada, h("span", null, item.unidadeMedida));

    const salvar = async () => {
      const quantidade = lerNumero(entrada.value);
      if (!(quantidade > 0)) {
        erro.textContent = "Informe uma quantidade maior que zero.";
        caixa.style.borderColor = "var(--crit)";
        entrada.focus();
        return;
      }
      try {
        const resposta = await atualizarItem(id, item.idItem, { quantidade });
        estado.editando = null;
        layout.avisar(resposta?.message ?? "Quantidade atualizada.", { tom: "ok" });
        await atualizar();
      } catch (e) {
        falhar(e);
      }
    };
    const cancelar = () => {
      estado.editando = null;
      desenharTabela();
    };
    entrada.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        salvar();
      } else if (event.key === "Escape") {
        event.stopPropagation();
        cancelar();
      }
    });
    entrada.addEventListener("input", () => {
      erro.textContent = "";
      caixa.style.borderColor = "";
    });
    queueMicrotask(() => {
      entrada.focus();
      entrada.select();
    });

    return h(
      "td",
      { class: "num cell--full", "data-label": "Quantidade" },
      h("div", { class: "edit-qty" }, caixa, botaoIcone({ icone: "check", rotulo: "Salvar quantidade", onClick: salvar }), botaoIcone({ icone: "x", rotulo: "Cancelar edição", onClick: cancelar })),
      erro,
    );
  }

  async function remover(item) {
    const ok = await confirmar({
      titulo: "Remover insumo da receita?",
      mensagem: `“${item.nomeInsumo}” deixa de fazer parte de “${estado.receita.nome}” e o custo será recalculado.`,
      rotuloConfirmar: "Remover insumo",
      perigo: true,
    });
    if (!ok) return;
    try {
      await removerItem(id, item.idItem);
      layout.avisar(`${item.nomeInsumo} removido da receita.`, { tom: "ok" });
      await atualizar();
    } catch (erro) {
      falhar(erro);
    }
  }

  function linhaItem(item, sinais) {
    const marcas = sinais.get(item.idInsumo) ?? new Set();
    return h(
      "tr",
      null,
      h(
        "td",
        { class: "cell--full" },
        h(
          "div",
          { class: "cell-name" },
          h("span", { class: "cell-strong" }, item.nomeInsumo),
          marcas.size
            ? h("div", { class: "cell-flags" }, marcas.has("PrecoZerado") ? chip("Sem preço", "critico", "alert-octagon") : null, marcas.has("EstoqueInsuficiente") ? chip("Estoque insuficiente", "baixo", "alert") : null)
            : null,
        ),
      ),
      celulaQuantidade(item),
      h("td", { class: "num", "data-label": "Preço atual" }, `${brl(item.precoCompraAtual)} / ${item.unidadeMedida}`),
      h("td", { class: "num", "data-label": "Custo do item" }, h("span", { class: "cell-strong" }, brl(item.custoItem))),
      h(
        "td",
        { class: "cell--full", "data-label": "% do custo" },
        h("div", { class: "share" }, h("span", { class: "share__bar", "aria-hidden": "true" }, h("span", { class: "share__fill", style: { "--w": `${Math.min(100, item.percentualDoCusto)}%` } })), h("span", { class: "share__num" }, pct(item.percentualDoCusto, 1))),
      ),
      h(
        "td",
        { class: "col-actions cell--full" },
        h(
          "div",
          { class: "row-actions" },
          botaoIcone({
            icone: "pencil",
            rotulo: `Editar quantidade de ${item.nomeInsumo}`,
            onClick: () => {
              estado.editando = item.idItem;
              desenharTabela();
            },
          }),
          botaoIcone({ icone: "trash", rotulo: `Remover ${item.nomeInsumo} da receita`, perigo: true, onClick: () => remover(item) }),
        ),
      ),
    );
  }

  function desenharTabela() {
    const itens = estado.custo.itens;
    if (!itens.length) {
      tabelaEl.replaceChildren(
        estadoVazio({
          titulo: "Nenhum insumo nesta receita ainda",
          texto: "Escolha um insumo no campo acima, informe a quantidade e adicione. O custo é calculado na hora.",
          ilustracao: false,
          iconeNome: "box",
          acao: { rotulo: "Escolher insumo", icone: "search", onClick: () => combo.input.focus() },
        }),
      );
      return;
    }
    const sinais = sinaisPorInsumo();
    tabelaEl.replaceChildren(
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
              h("th", { scope: "col", class: "num" }, "Quantidade"),
              h("th", { scope: "col", class: "num" }, "Preço atual"),
              h("th", { scope: "col", class: "num" }, "Custo do item"),
              h("th", { scope: "col" }, "% do custo"),
              h("th", { scope: "col", class: "col-actions" }, h("span", { class: "sr-only" }, "Ações")),
            ),
          ),
          h("tbody", null, ...itens.map((item) => linhaItem(item, sinais))),
          h("tfoot", null, h("tr", { class: "tbl-total" }, h("th", { scope: "row", colSpan: 3 }, "Custo total da receita"), h("td", { class: "num" }, brl(estado.custo.custoTotal)), h("td", null, pct(100, 0)), h("td", null))),
        ),
      ),
    );
  }

  function desenharTudo() {
    combo.definirInsumos(estado.insumos, idsUsados());
    desenharTopo();
    desenharResumo();
    desenharAlertas();
    desenharTabela();
  }

  // Itens mudaram (ou o preço de algum insumo): busca o custo de novo e redesenha.
  async function atualizar() {
    try {
      const dados = await carregarCusto();
      if (token !== navegacao) return;
      estado.custo = dados.custo;
      estado.preco = dados.preco;
      desenharTudo();
    } catch (erro) {
      falhar(erro, atualizar);
    }
  }

  async function recalcular() {
    await atualizar();
    layout.avisar("Custo atualizado com os preços de hoje.", { tom: "ok" });
  }

  async function aposEditarReceita(resposta, dados) {
    layout.avisar(resposta?.message ?? "Receita atualizada.", { tom: "ok" });
    const lista = await listarReceitas().catch(() => null);
    const nova = lista?.find((r) => r.idReceita === id);
    if (nova) estado.receita = nova;
    else estado.receita = { ...estado.receita, ...dados };
    await atualizar(); // o rendimento muda o custo por unidade
  }

  async function excluirEstaReceita() {
    if (await pedirExclusaoReceita({ ...estado.receita, quantidadeItens: estado.custo.itens.length })) window.location.hash = "#/";
  }

  corpo.replaceChildren(
    kpisEl,
    alertasEl,
    h(
      "section",
      { class: "card card--fluid", "aria-labelledby": "tituloInsumos" },
      h("div", { class: "card__head" }, h("div", null, h("h2", { class: "card__title", id: "tituloInsumos" }, "Insumos da receita"), h("p", { class: "card__sub" }, "A quantidade é sempre na unidade de medida do insumo."))),
      h("div", { class: "card__body card__body--flush" }, formAdd, tabelaEl),
    ),
  );
  desenharTudo();
}

/* ---------------------------------------------------------
   Início e navegação
--------------------------------------------------------- */

let primeira = true;

function rotear() {
  const token = ++navegacao;
  const destino = rota();
  const navegar = destino.tipo === "detalhe" ? mostrarDetalhe(destino.id, token) : mostrarLista(token);
  navegar.finally(() => {
    if (!primeira && token === navegacao) layout.focarConteudo();
    primeira = false;
  });
}

function iniciar() {
  layout = montarLayout({ ativo: "receitas" });
  if (!layout) return;
  window.addEventListener("hashchange", rotear);
  rotear();
}

iniciar();
