// Cadastro de receitas: chamadas à API real (api/receitas e api/insumos).
// A tela que usa estas funções fica em js/paginas/receitas.js.
import { API_BASE_URL } from "./config.js";
import { getSession, sessaoInvalida } from "./session.js";

const URL_RECEITAS = `${API_BASE_URL}/receitas`;
const URL_INSUMOS = `${API_BASE_URL}/insumos`;

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
  // Sem sessão válida não há token pra mandar: a tela mostra o aviso de sessão inválida.
  const sessao = getSession();
  if (!sessao) throw sessaoInvalida();

  const cabecalhos = { Authorization: `Bearer ${sessao.token}` };
  if (opcoes.body) cabecalhos["Content-Type"] = "application/json";

  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se a API está no ar.");
  }

  // Token vencido ou inválido: não redireciona em silêncio; a tela explica e oferece "Entrar novamente".
  if (resposta.status === 401) throw sessaoInvalida();

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

// Ficha técnica: itens (insumo + quantidade na unidade do insumo) de uma receita.
export function listarInsumos() {
  return requisitar(URL_INSUMOS);
}

export function listarItens(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens`);
}

export function adicionarItem(idReceita, dados) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarItem(idReceita, idItem, dados) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens/${idItem}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function removerItem(idReceita, idItem) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens/${idItem}`, { method: "DELETE" });
}

// Custo de produção (calculado ao vivo pela API com o preço de compra atual dos insumos).
export function obterCusto(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/custo`);
}

export function listarCustos() {
  return requisitar(`${URL_RECEITAS}/custos`);
}
