// Precificação (RF05 + RF08): chamadas à API real (api/precificacao e api/receitas/{id}/...).
// RNF01: só o Gestor usa estes endpoints (a API recusa os demais com 403). A tela que usa
// estas funções fica em js/paginas/precificacao.js.
import { API_BASE_URL } from "./config.js";
import { getSession, sessaoInvalida } from "./session.js";

const URL_PRECIFICACAO = `${API_BASE_URL}/precificacao`;
const URL_RECEITAS = `${API_BASE_URL}/receitas`;

/* ---------------------------------------------------------
   Camada de API
--------------------------------------------------------- */

// Junta as mensagens que a API pode devolver: { message } (400/404) ou o
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

  if (resposta.status === 403) {
    throw new Error("Acesso restrito ao Gestor.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(extrairMensagem(corpo, "Não foi possível concluir a operação."));
  }

  return corpo;
}

// Margem padrão global: { margemPadrao }.
export function obterMargemPadrao() {
  return requisitar(`${URL_PRECIFICACAO}/margem`);
}

export function definirMargemPadrao(margemPadrao) {
  return requisitar(`${URL_PRECIFICACAO}/margem`, {
    method: "PUT",
    body: JSON.stringify({ margemPadrao }),
  });
}

// Margem própria da receita; null volta a usar a padrão.
export function definirMargemReceita(idReceita, margemLucro) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/margem`, {
    method: "PUT",
    body: JSON.stringify({ margemLucro }),
  });
}

// Visão geral de todas as receitas (custo atual, preço sugerido, último preço salvo, desatualizado).
export function listarPrecificacao() {
  return requisitar(URL_PRECIFICACAO);
}

// Calcula ao vivo, sem salvar.
export function obterPrecoSugerido(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/preco-sugerido`);
}

// Calcula e salva o snapshot no histórico (201).
export function salvarPrecificacao(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/precificacao`, { method: "POST" });
}

export function listarHistorico(idReceita, limite = 20) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/precificacao/historico?limite=${limite}`);
}
