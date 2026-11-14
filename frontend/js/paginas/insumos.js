// Tela de insumos (RF02/US01): lista com busca, cadastro, edição e exclusão em diálogo.
// O saldo não é editado aqui: só muda por entrada e saída de mercadorias.
// As chamadas à API ficam em js/cadastroService.js.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { brl, qtd } from "../dashboard/format.js";
import { abrirDialogo, banner, botaoIcone, chip, confirmar, criarCampo, esqueleto, estadoVazio, lerNumero, normalizar, novoId } from "../componentes.js";
import { atualizarInsumo, criarInsumo, excluirInsumo, listarFornecedores, listarInsumos } from "../cadastroService.js";
import { avisarFalha, bannerDeFalha, linkVoltar, plural } from "./comum.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const UNIDADES_SUGERIDAS = ["kg", "g", "L", "mL", "un", "dúzia", "pacote", "lata", "caixa"];

let layout = null;
const lista = { insumos: [], fornecedores: [], busca: "" };

// Mesma regra dos alertas da API: até metade do mínimo é crítico; até o mínimo, baixo.
function situacao(i) {
  if (i.quantidadeEstoque <= i.estoqueMinimo / 2) return ["Crítico", "critico"];
  if (i.quantidadeEstoque <= i.estoqueMinimo) return ["Baixo", "baixo"];
  return ["Em dia", "ok"];
}

const decimal = (valor) => String(valor ?? "").replace(".", ",");

/* ---------- formulário (criar e editar) ---------- */

function abrirForm({ insumo = null, aoSalvar }) {
  const editando = Boolean(insumo);
  const nome = h("input", { id: novoId("nome"), type: "text", maxlength: 150, autocomplete: "off", value: insumo?.nome ?? "", placeholder: "Ex.: Farinha de trigo" });
  const idLista = novoId("unidades");
  const unidade = h("input", { id: novoId("un"), type: "text", maxlength: 20, autocomplete: "off", list: idLista, value: insumo?.unidadeMedida ?? "", placeholder: "Ex.: kg" });
  const datalist = h("datalist", { id: idLista }, ...UNIDADES_SUGERIDAS.map((u) => h("option", { value: u })));
  const preco = h("input", { id: novoId("preco"), type: "text", inputmode: "decimal", autocomplete: "off", value: insumo ? decimal(insumo.precoCompra) : "", placeholder: "Ex.: 5,20" });
  const minimo = h("input", { id: novoId("min"), type: "text", inputmode: "decimal", autocomplete: "off", value: insumo ? decimal(insumo.estoqueMinimo) : "", placeholder: "Ex.: 10" });
  const fornecedor = h(
    "select",
    { id: novoId("forn") },
    h("option", { value: "" }, "Sem fornecedor"),
    ...lista.fornecedores.map((f) => h("option", { value: String(f.idFornecedor), selected: insumo?.idFornecedor === f.idFornecedor }, f.nome)),
  );

  const campoNome = criarCampo({ rotulo: "Nome do insumo", controle: nome });
  const campoUnidade = criarCampo({ rotulo: "Unidade de medida", controle: unidade });
  const campoPreco = criarCampo({ rotulo: "Preço de compra", controle: preco, sufixo: "R$ por unidade", dica: "Atualizado sozinho a cada entrada de mercadoria." });
  const campoMinimo = criarCampo({ rotulo: "Estoque mínimo", controle: minimo, dica: "Abaixo disso o sistema emite o alerta de estoque baixo." });
  const campoFornecedor = criarCampo({ rotulo: "Fornecedor", controle: fornecedor, opcional: true });

  const avisoEl = h("div", { class: "dlg__aviso" });
  const salvar = h("button", { type: "submit", class: "btn btn--primary", form: "formInsumoDlg" }, editando ? "Salvar alterações" : "Cadastrar insumo");
  const form = h("form", { id: "formInsumoDlg", class: "dlg__body", novalidate: true }, avisoEl, campoNome.el, h("div", { class: "fld__row" }, campoUnidade.el, campoFornecedor.el), h("div", { class: "fld__row" }, campoPreco.el, campoMinimo.el), datalist);

  const dialogo = abrirDialogo({
    titulo: editando ? "Editar insumo" : "Novo insumo",
    subtitulo: editando ? null : "O saldo começa em zero; registre uma entrada de mercadoria para abastecer o estoque.",
    corpo: form,
    rodape: [h("button", { type: "button", class: "btn btn--ghost", onclick: () => dialogo.fechar() }, "Cancelar"), salvar],
  });
  nome.setAttribute("data-autofocus", "");
  nome.focus();

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    avisoEl.replaceChildren();

    const dados = {
      nome: nome.value.trim(),
      unidadeMedida: unidade.value.trim(),
      precoCompra: preco.value.trim() === "" ? 0 : lerNumero(preco.value),
      estoqueMinimo: minimo.value.trim() === "" ? 0 : lerNumero(minimo.value),
      idFornecedor: fornecedor.value ? Number(fornecedor.value) : null,
    };

    campoNome.definirErro(dados.nome ? "" : "Informe o nome do insumo.");
    campoUnidade.definirErro(dados.unidadeMedida ? "" : "Informe a unidade de medida.");
    campoPreco.definirErro(dados.precoCompra >= 0 ? "" : "Informe um valor válido (ex.: 5,20).");
    campoMinimo.definirErro(dados.estoqueMinimo >= 0 ? "" : "Informe um número válido (ex.: 10).");
    const invalido = [campoNome, campoUnidade, campoPreco, campoMinimo].find((c) => c.el.classList.contains("is-invalid"));
    if (invalido) {
      invalido.controle.focus();
      return;
    }

    salvar.disabled = true;
    try {
      if (editando) await atualizarInsumo(insumo.idInsumo, dados);
      else await criarInsumo(dados);
      dialogo.fechar();
      await aoSalvar(dados);
    } catch (erro) {
      avisoEl.replaceChildren(banner({ tom: "erro", mensagens: erro.message, assertivo: true }));
      salvar.disabled = false;
    }
  });
}

async function pedirExclusao(insumo) {
  const ok = await confirmar({
    titulo: "Excluir insumo?",
    mensagem: `“${insumo.nome}” será excluído. Insumos com movimentações ou usados em receitas não podem ser excluídos. Essa ação não pode ser desfeita.`,
    rotuloConfirmar: "Excluir insumo",
    perigo: true,
  });
  if (!ok) return false;

  try {
    await excluirInsumo(insumo.idInsumo);
    layout.avisar(`Insumo “${insumo.nome}” excluído.`, { tom: "ok" });
    return true;
  } catch (erro) {
    avisarFalha(layout, erro);
    return false;
  }
}

/* ---------- lista ---------- */

function linha(i, acoes) {
  const [rotulo, tom] = situacao(i);
  return h(
    "tr",
    null,
    h("td", { class: "cell--full" }, h("div", { class: "cell-name" }, h("span", { class: "cell-strong" }, i.nome), h("span", { class: "cell-name__sub" }, i.nomeFornecedor ? `Fornecedor: ${i.nomeFornecedor}` : "Sem fornecedor"))),
    h("td", { class: "num nowrap", "data-label": "Saldo" }, h("div", { class: "cell-stack" }, h("span", { class: "cell-strong" }, qtd(i.quantidadeEstoque, i.unidadeMedida)), chip(rotulo, tom))),
    h("td", { class: "num nowrap", "data-label": "Mínimo" }, qtd(i.estoqueMinimo, i.unidadeMedida)),
    h("td", { class: "num nowrap", "data-label": "Preço de compra" }, `${brl(i.precoCompra)} / ${i.unidadeMedida}`),
    h(
      "td",
      { class: "col-actions cell--full" },
      h("div", { class: "row-actions" }, botaoIcone({ icone: "pencil", rotulo: `Editar ${i.nome}`, onClick: () => acoes.editar(i) }), botaoIcone({ icone: "trash", rotulo: `Excluir ${i.nome}`, perigo: true, onClick: () => acoes.excluir(i) })),
    ),
  );
}

function tabela(itens, acoes) {
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
          h("th", { scope: "col" }, "Insumo"),
          h("th", { scope: "col", class: "num" }, "Saldo"),
          h("th", { scope: "col", class: "num" }, "Mínimo"),
          h("th", { scope: "col", class: "num" }, "Preço de compra"),
          h("th", { scope: "col", class: "col-actions" }, h("span", { class: "sr-only" }, "Ações")),
        ),
      ),
      h("tbody", null, ...itens.map((i) => linha(i, acoes))),
    ),
  );
}

async function mostrarLista() {
  layout.definirPagina({ titulo: "Insumos", trilha: [PAINEL, { rotulo: "Insumos" }] });

  const novo = () => abrirForm({ aoSalvar: aposSalvar });
  const busca = h("input", { type: "search", placeholder: "Buscar insumo…", autocomplete: "off", "aria-label": "Buscar insumo pelo nome", value: lista.busca });
  const contagem = h("span", { class: "card-tools__count", "aria-live": "polite" });
  const corpo = h("div", { id: "listaInsumos" });
  const avisos = h("div", { class: "stack" });
  const acoes = {
    editar: (i) => abrirForm({ insumo: i, aoSalvar: aposSalvar }),
    excluir: async (i) => (await pedirExclusao(i)) && carregar({ silencioso: true }),
  };

  function desenhar() {
    const termo = normalizar(lista.busca.trim());
    const filtrados = termo ? lista.insumos.filter((i) => normalizar(`${i.nome} ${i.nomeFornecedor ?? ""}`).includes(termo)) : lista.insumos;
    contagem.textContent = lista.insumos.length ? (termo ? `${plural(filtrados.length, "resultado", "resultados")} de ${lista.insumos.length}` : plural(lista.insumos.length, "insumo", "insumos")) : "";

    if (!lista.insumos.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhum insumo cadastrado ainda",
          texto: "Cadastre os ingredientes que você usa. Depois, registre as entradas para o sistema controlar o estoque.",
          acao: { rotulo: "Cadastrar primeiro insumo", icone: "plus", onClick: novo },
        }),
      );
    } else if (!filtrados.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhum insumo encontrado",
          texto: `Não achamos nada para “${lista.busca.trim()}”. Confira a grafia ou limpe a busca.`,
          ilustracao: false,
          iconeNome: "search",
          acao: { rotulo: "Limpar busca", onClick: () => { busca.value = ""; lista.busca = ""; desenhar(); busca.focus(); } },
        }),
      );
    } else {
      corpo.replaceChildren(tabela(filtrados, acoes));
    }
  }

  busca.addEventListener("input", () => {
    lista.busca = busca.value;
    desenhar();
  });

  async function carregar({ silencioso = false } = {}) {
    if (!silencioso) corpo.replaceChildren(esqueleto({ linhas: 6 }));
    avisos.replaceChildren();
    try {
      // Os fornecedores só alimentam o campo do formulário: se falhar, a lista aparece mesmo assim.
      const [insumos, fornecedores] = await Promise.all([listarInsumos(), listarFornecedores().catch(() => lista.fornecedores)]);
      lista.insumos = insumos;
      lista.fornecedores = fornecedores;
      desenhar();
    } catch (erro) {
      corpo.replaceChildren();
      avisos.replaceChildren(bannerDeFalha(erro.message, () => carregar()));
    }
  }

  async function aposSalvar(dados) {
    layout.avisar(`Insumo “${dados.nome}” salvo.`, { tom: "ok" });
    await carregar({ silencioso: true });
  }

  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, linkVoltar("Voltar ao painel", "dashboard.html"), h("h1", null, "Insumos"), h("p", { class: "page-head__sub" }, "Ingredientes, preço de compra e estoque mínimo.")),
        h("div", { class: "page-head__actions" }, h("button", { type: "button", class: "btn btn--primary", onclick: novo }, icon("plus", 18), "Novo insumo")),
      ),
      avisos,
      h("section", { class: "card card--fluid", "aria-label": "Lista de insumos" }, h("div", { class: "card-tools" }, h("div", { class: "input-icon" }, h("span", { class: "icon-slot" }, icon("search", 16)), busca), contagem), corpo),
    ),
  );

  await carregar();
}

layout = montarLayout({ ativo: "insumos" });
if (layout) mostrarLista();
