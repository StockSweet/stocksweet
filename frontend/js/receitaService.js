// Cadastro de receitas: chamadas à API real (api/receitas) + lógica da tela
// cadastro_receitas.html (lista, criar, editar e excluir).
import { API_BASE_URL } from "./config.js";
import { clearSession, getSession } from "./session.js";

const LOGIN_URL = "index.html";
const URL_RECEITAS = `${API_BASE_URL}/receitas`;

// Sem sessão válida não há token pra mandar: volta pro login.
const sessao = getSession();
if (!sessao) {
  window.location.replace(LOGIN_URL);
}

/* ---------------------------------------------------------
   Camada de API
--------------------------------------------------------- */

// Junta as mensagens que a API pode devolver: { message } (404/409) ou o
// ProblemDetails de validação do ASP.NET ({ errors: { Campo: [msgs] } }).
function extrairMensagem(corpo, padrao) {
  if (corpo?.message) return corpo.message;

  if (corpo?.errors && typeof corpo.errors === "object") {
    const mensagens = Object.values(corpo.errors).flat();
    if (mensagens.length) return mensagens.join(" ");
  }

  return padrao;
}

async function requisitar(url, opcoes = {}) {
  const cabecalhos = { Authorization: `Bearer ${sessao.token}` };
  if (opcoes.body) cabecalhos["Content-Type"] = "application/json";

  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se a API está no ar.");
  }

  // Token vencido ou inválido: encerra a sessão local e pede login de novo.
  if (resposta.status === 401) {
    clearSession();
    window.location.replace(LOGIN_URL);
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(extrairMensagem(corpo, "Não foi possível concluir a operação."));
  }

  return corpo;
}

export function listarReceitas() {
  return requisitar(URL_RECEITAS);
}

export function criarReceita(dados) {
  return requisitar(URL_RECEITAS, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarReceita(id, dados) {
  return requisitar(`${URL_RECEITAS}/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirReceita(id) {
  return requisitar(`${URL_RECEITAS}/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------
   Tela
--------------------------------------------------------- */

const form = document.getElementById("formReceita");
const tituloForm = document.getElementById("tituloForm");
const inputNome = document.getElementById("inputNome");
const inputDescricao = document.getElementById("inputDescricao");
const inputRendimento = document.getElementById("inputRendimento");
const inputUnidade = document.getElementById("inputUnidade");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const mensagemFeedback = document.getElementById("mensagemFeedback");
const estadoLista = document.getElementById("estadoLista");
const tabela = document.getElementById("tabelaReceitas");
const corpoTabela = document.getElementById("corpoTabela");

const formatadorNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

let receitas = [];
let idEmEdicao = null;

function exibirMensagem(texto, tipo) {
  mensagemFeedback.textContent = texto;
  mensagemFeedback.className = `alert alert-${tipo === "success" ? "success" : "error"}`;
  mensagemFeedback.style.display = "block";
}

function limparMensagem() {
  mensagemFeedback.style.display = "none";
}

function criarCelula(texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  return td;
}

function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", aoClicar);
  return botao;
}

function renderizarLista() {
  corpoTabela.replaceChildren();

  if (receitas.length === 0) {
    estadoLista.textContent = "Nenhuma receita cadastrada ainda.";
    estadoLista.hidden = false;
    tabela.hidden = true;
    return;
  }

  estadoLista.hidden = true;
  tabela.hidden = false;

  for (const receita of receitas) {
    const linha = document.createElement("tr");

    linha.append(
      criarCelula(receita.nome, "nome"),
      criarCelula(`${formatadorNumero.format(receita.rendimentoReceita)} ${receita.unidadeRendimento}`),
      criarCelula(receita.descricao ?? "—"),
    );

    const acoes = document.createElement("td");
    acoes.className = "acoes";
    acoes.append(
      criarBotao("Editar", "btn-tabela", () => iniciarEdicao(receita)),
      " ",
      criarBotao("Excluir", "btn-tabela perigo", () => remover(receita)),
    );
    linha.append(acoes);

    corpoTabela.append(linha);
  }
}

async function carregarLista() {
  try {
    receitas = await listarReceitas();
    renderizarLista();
  } catch (erro) {
    estadoLista.textContent = "Não foi possível carregar as receitas.";
    estadoLista.hidden = false;
    tabela.hidden = true;
    exibirMensagem(erro.message, "error");
  }
}

function iniciarEdicao(receita) {
  idEmEdicao = receita.idReceita;
  inputNome.value = receita.nome;
  inputDescricao.value = receita.descricao ?? "";
  inputRendimento.value = receita.rendimentoReceita;
  inputUnidade.value = receita.unidadeRendimento;

  tituloForm.textContent = `Editando: ${receita.nome}`;
  btnSalvar.textContent = "Salvar alterações";
  btnCancelar.hidden = false;
  limparMensagem();

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  inputNome.focus();
}

function sairDaEdicao() {
  idEmEdicao = null;
  form.reset();
  tituloForm.textContent = "Nova receita";
  btnSalvar.textContent = "Cadastrar receita";
  btnCancelar.hidden = true;
}

// Validação básica no cliente; a regra de verdade continua sendo da API.
function lerFormulario() {
  const nome = inputNome.value.trim();
  const unidade = inputUnidade.value.trim();
  const rendimento = Number(inputRendimento.value);

  if (!nome) throw new Error("Informe o nome da receita.");
  if (!inputRendimento.value || !(rendimento > 0)) {
    throw new Error("O rendimento deve ser maior que zero.");
  }
  if (!unidade) throw new Error("Informe a unidade do rendimento.");

  return {
    nome,
    descricao: inputDescricao.value.trim() || null,
    rendimentoReceita: rendimento,
    unidadeRendimento: unidade,
  };
}

async function remover(receita) {
  if (!window.confirm(`Excluir a receita "${receita.nome}"?`)) return;

  try {
    await excluirReceita(receita.idReceita);
    if (idEmEdicao === receita.idReceita) sairDaEdicao();
    exibirMensagem("Receita excluída com sucesso!", "success");
    await carregarLista();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparMensagem();

  let dados;
  try {
    dados = lerFormulario();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
    return;
  }

  btnSalvar.disabled = true;
  try {
    const editando = idEmEdicao !== null;
    const resposta = editando
      ? await atualizarReceita(idEmEdicao, dados)
      : await criarReceita(dados);

    sairDaEdicao();
    exibirMensagem(resposta.message, "success");
    await carregarLista();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
  } finally {
    btnSalvar.disabled = false;
  }
});

btnCancelar.addEventListener("click", () => {
  sairDaEdicao();
  limparMensagem();
});

if (sessao) {
  carregarLista();
}
