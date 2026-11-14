// Cadastro de insumos (US01/RF02) e de fornecedores (US04/RF01): chamadas à API real
// (api/insumos e api/fornecedores). As telas ficam em js/paginas/insumos.js e fornecedores.js.
import { API_BASE_URL } from "./config.js";
import { getSession, sessaoInvalida } from "./session.js";

const URL_INSUMOS = `${API_BASE_URL}/insumos`;
const URL_FORNECEDORES = `${API_BASE_URL}/fornecedores`;

// Junta as mensagens que a API pode devolver: { message } (400/404/409) ou o
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

  if (resposta.status === 401) throw sessaoInvalida();

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(extrairMensagem(corpo, "Não foi possível concluir a operação."));
  }

  return corpo;
}

/* ---------- insumos ---------- */

// { idInsumo, nome, unidadeMedida, quantidadeEstoque, precoCompra, estoqueMinimo, idFornecedor, nomeFornecedor }
export function listarInsumos() {
  return requisitar(URL_INSUMOS);
}

// dados: { nome, unidadeMedida, precoCompra, estoqueMinimo, idFornecedor? }. O saldo só muda por entrada/saída.
export function criarInsumo(dados) {
  return requisitar(URL_INSUMOS, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarInsumo(id, dados) {
  return requisitar(`${URL_INSUMOS}/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

// A API recusa (409) se o insumo tem movimentações ou está em alguma receita.
export function excluirInsumo(id) {
  return requisitar(`${URL_INSUMOS}/${id}`, { method: "DELETE" });
}

/* ---------- fornecedores ---------- */

// { idFornecedor, nome, telefone, email, endereco, observacao, quantidadeInsumos }
export function listarFornecedores() {
  return requisitar(URL_FORNECEDORES);
}

export function criarFornecedor(dados) {
  return requisitar(URL_FORNECEDORES, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarFornecedor(id, dados) {
  return requisitar(`${URL_FORNECEDORES}/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

// Os insumos do fornecedor permanecem, só ficam sem fornecedor.
export function excluirFornecedor(id) {
  return requisitar(`${URL_FORNECEDORES}/${id}`, { method: "DELETE" });
}
