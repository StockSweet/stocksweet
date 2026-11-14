// Tela de fornecedores (RF01/US04): lista com busca, cadastro, edição e exclusão em diálogo.
// As chamadas à API ficam em js/cadastroService.js.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { abrirDialogo, banner, botaoIcone, chip, confirmar, criarCampo, esqueleto, estadoVazio, normalizar, novoId } from "../componentes.js";
import { atualizarFornecedor, criarFornecedor, excluirFornecedor, listarFornecedores } from "../cadastroService.js";
import { avisarFalha, bannerDeFalha, linkVoltar, plural } from "./comum.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let layout = null;
const lista = { fornecedores: [], busca: "" };

/* ---------- formulário (criar e editar) ---------- */

function abrirForm({ fornecedor = null, aoSalvar }) {
  const editando = Boolean(fornecedor);
  const texto = (prefixo, valor, extra = {}) => h("input", { id: novoId(prefixo), type: "text", autocomplete: "off", value: valor ?? "", ...extra });

  const nome = texto("nome", fornecedor?.nome, { maxlength: 150, placeholder: "Ex.: Atacado Doce Vida" });
  const telefone = texto("tel", fornecedor?.telefone, { maxlength: 30, inputmode: "tel", placeholder: "Ex.: (11) 98888-7777" });
  const email = texto("email", fornecedor?.email, { maxlength: 255, inputmode: "email", placeholder: "Ex.: vendas@docevida.com.br" });
  const endereco = texto("end", fornecedor?.endereco, { maxlength: 300, placeholder: "Rua, número, bairro, cidade" });
  const observacao = h("textarea", { id: novoId("obs"), maxlength: 500, rows: 3, placeholder: "Ex.: Entrega às terças, pedido mínimo de R$ 200" }, fornecedor?.observacao ?? "");

  const campoNome = criarCampo({ rotulo: "Nome do fornecedor", controle: nome });
  const campoTelefone = criarCampo({ rotulo: "Telefone", controle: telefone, opcional: true });
  const campoEmail = criarCampo({ rotulo: "E-mail", controle: email, opcional: true });
  const campoEndereco = criarCampo({ rotulo: "Endereço", controle: endereco, opcional: true });
  const campoObs = criarCampo({ rotulo: "Observações", controle: observacao, opcional: true });

  const avisoEl = h("div", { class: "dlg__aviso" });
  const salvar = h("button", { type: "submit", class: "btn btn--primary", form: "formFornecedorDlg" }, editando ? "Salvar alterações" : "Cadastrar fornecedor");
  const form = h("form", { id: "formFornecedorDlg", class: "dlg__body", novalidate: true }, avisoEl, campoNome.el, h("div", { class: "fld__row" }, campoTelefone.el, campoEmail.el), campoEndereco.el, campoObs.el);

  const dialogo = abrirDialogo({
    titulo: editando ? "Editar fornecedor" : "Novo fornecedor",
    subtitulo: editando ? null : "Guarde o contato de quem fornece seus insumos.",
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
      telefone: telefone.value.trim() || null,
      email: email.value.trim() || null,
      endereco: endereco.value.trim() || null,
      observacao: observacao.value.trim() || null,
    };

    campoNome.definirErro(dados.nome ? "" : "Informe o nome do fornecedor.");
    campoEmail.definirErro(!dados.email || EMAIL_VALIDO.test(dados.email) ? "" : "Informe um e-mail válido.");
    const invalido = [campoNome, campoEmail].find((c) => c.el.classList.contains("is-invalid"));
    if (invalido) {
      invalido.controle.focus();
      return;
    }

    salvar.disabled = true;
    try {
      if (editando) await atualizarFornecedor(fornecedor.idFornecedor, dados);
      else await criarFornecedor(dados);
      dialogo.fechar();
      await aoSalvar(dados);
    } catch (erro) {
      avisoEl.replaceChildren(banner({ tom: "erro", mensagens: erro.message, assertivo: true }));
      salvar.disabled = false;
    }
  });
}

async function pedirExclusao(fornecedor) {
  const n = fornecedor.quantidadeInsumos ?? 0;
  const ok = await confirmar({
    titulo: "Excluir fornecedor?",
    mensagem: `“${fornecedor.nome}” será excluído.${n ? ` ${plural(n, "insumo vinculado continua", "insumos vinculados continuam")} cadastrado, só sem fornecedor.` : ""} Essa ação não pode ser desfeita.`,
    rotuloConfirmar: "Excluir fornecedor",
    perigo: true,
  });
  if (!ok) return false;

  try {
    await excluirFornecedor(fornecedor.idFornecedor);
    layout.avisar(`Fornecedor “${fornecedor.nome}” excluído.`, { tom: "ok" });
    return true;
  } catch (erro) {
    avisarFalha(layout, erro);
    return false;
  }
}

/* ---------- lista ---------- */

function celulaContato(f) {
  const linhas = [
    f.telefone ? h("span", { class: "cell-strong" }, f.telefone) : null,
    f.email ? h("a", { class: "cell-sub", href: `mailto:${f.email}` }, f.email) : null,
  ].filter(Boolean);
  return h("td", { "data-label": "Contato" }, linhas.length ? h("div", { class: "cell-stack" }, ...linhas) : h("span", { class: "cell-sub" }, "—"));
}

function linha(f, acoes) {
  return h(
    "tr",
    null,
    h("td", { class: "cell--full" }, h("div", { class: "cell-name" }, h("span", { class: "cell-strong" }, f.nome), f.observacao ? h("span", { class: "cell-name__sub", title: f.observacao }, f.observacao) : null)),
    celulaContato(f),
    h("td", { "data-label": "Endereço" }, f.endereco ? h("span", { title: f.endereco }, f.endereco) : h("span", { class: "cell-sub" }, "—")),
    h("td", { class: "num", "data-label": "Insumos" }, f.quantidadeInsumos ? chip(String(f.quantidadeInsumos), "ok") : h("span", { class: "cell-sub" }, "Nenhum")),
    h(
      "td",
      { class: "col-actions cell--full" },
      h("div", { class: "row-actions" }, botaoIcone({ icone: "pencil", rotulo: `Editar ${f.nome}`, onClick: () => acoes.editar(f) }), botaoIcone({ icone: "trash", rotulo: `Excluir ${f.nome}`, perigo: true, onClick: () => acoes.excluir(f) })),
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
          h("th", { scope: "col" }, "Fornecedor"),
          h("th", { scope: "col" }, "Contato"),
          h("th", { scope: "col" }, "Endereço"),
          h("th", { scope: "col", class: "num" }, "Insumos"),
          h("th", { scope: "col", class: "col-actions" }, h("span", { class: "sr-only" }, "Ações")),
        ),
      ),
      h("tbody", null, ...itens.map((f) => linha(f, acoes))),
    ),
  );
}

async function mostrarLista() {
  layout.definirPagina({ titulo: "Fornecedores", trilha: [PAINEL, { rotulo: "Fornecedores" }] });

  const novo = () => abrirForm({ aoSalvar: aposSalvar });
  const busca = h("input", { type: "search", placeholder: "Buscar fornecedor…", autocomplete: "off", "aria-label": "Buscar fornecedor", value: lista.busca });
  const contagem = h("span", { class: "card-tools__count", "aria-live": "polite" });
  const corpo = h("div", { id: "listaFornecedores" });
  const avisos = h("div", { class: "stack" });
  const acoes = {
    editar: (f) => abrirForm({ fornecedor: f, aoSalvar: aposSalvar }),
    excluir: async (f) => (await pedirExclusao(f)) && carregar({ silencioso: true }),
  };

  function desenhar() {
    const termo = normalizar(lista.busca.trim());
    const filtrados = termo ? lista.fornecedores.filter((f) => normalizar(`${f.nome} ${f.telefone ?? ""} ${f.email ?? ""} ${f.endereco ?? ""}`).includes(termo)) : lista.fornecedores;
    contagem.textContent = lista.fornecedores.length ? (termo ? `${plural(filtrados.length, "resultado", "resultados")} de ${lista.fornecedores.length}` : plural(lista.fornecedores.length, "fornecedor", "fornecedores")) : "";

    if (!lista.fornecedores.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhum fornecedor cadastrado ainda",
          texto: "Cadastre quem fornece seus insumos para ter o contato à mão na hora de repor o estoque.",
          acao: { rotulo: "Cadastrar primeiro fornecedor", icone: "plus", onClick: novo },
        }),
      );
    } else if (!filtrados.length) {
      corpo.replaceChildren(
        estadoVazio({
          titulo: "Nenhum fornecedor encontrado",
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
    if (!silencioso) corpo.replaceChildren(esqueleto({ linhas: 5 }));
    avisos.replaceChildren();
    try {
      lista.fornecedores = await listarFornecedores();
      desenhar();
    } catch (erro) {
      corpo.replaceChildren();
      avisos.replaceChildren(bannerDeFalha(erro.message, () => carregar()));
    }
  }

  async function aposSalvar(dados) {
    layout.avisar(`Fornecedor “${dados.nome}” salvo.`, { tom: "ok" });
    await carregar({ silencioso: true });
  }

  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, linkVoltar("Voltar ao painel", "dashboard.html"), h("h1", null, "Fornecedores"), h("p", { class: "page-head__sub" }, "Contatos de quem fornece seus insumos.")),
        h("div", { class: "page-head__actions" }, h("button", { type: "button", class: "btn btn--primary", onclick: novo }, icon("plus", 18), "Novo fornecedor")),
      ),
      avisos,
      h("section", { class: "card card--fluid", "aria-label": "Lista de fornecedores" }, h("div", { class: "card-tools" }, h("div", { class: "input-icon" }, h("span", { class: "icon-slot" }, icon("search", 16)), busca), contagem), corpo),
    ),
  );

  await carregar();
}

layout = montarLayout({ ativo: "fornecedores" });
if (layout) mostrarLista();
