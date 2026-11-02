// Estoque: chamadas à API real (api/insumos e api/movimentacoes).
// As telas que usam estas funções ficam em js/paginas/estoque.js (entrada e saída de mercadorias).
import { API_BASE_URL } from "./config.js";
import { clearSession, getSession } from "./session.js";

const LOGIN_URL = "index.html";
const URL_INSUMOS = `${API_BASE_URL}/insumos`;
const URL_MOVIMENTACOES = `${API_BASE_URL}/movimentacoes`;

// Motivos aceitos pela API em POST /api/movimentacoes/saida (valor enviado -> rótulo na tela).
export const MOTIVOS_SAIDA = [
  { valor: "PRODUCAO", rotulo: "Produção", dica: "Usado em uma receita" },
  { valor: "PERDA_VALIDADE", rotulo: "Perda por validade", dica: "Passou do prazo" },
  { valor: "AVARIA", rotulo: "Avaria", dica: "Estragou ou quebrou" },
  { valor: "OUTRO", rotulo: "Outro", dica: "Qualquer outro motivo" },
];

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
  // Sem sessão válida não há token pra mandar: volta pro login.
  const sessao = getSession();
  if (!sessao) {
    window.location.replace(LOGIN_URL);
    throw new Error("Sessão expirada. Faça login novamente.");
  }

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

// Insumos com saldo: { idInsumo, nome, unidadeMedida, quantidadeEstoque, precoCompra, estoqueMinimo }.
export function listarInsumos() {
  return requisitar(URL_INSUMOS);
}

// Entrada: { idInsumo, quantidade, valorUnitario, observacao? }. Soma ao saldo e atualiza o preço de compra.
export function registrarEntrada(dados) {
  return requisitar(`${URL_MOVIMENTACOES}/entrada`, { method: "POST", body: JSON.stringify(dados) });
}

// Saída: { idInsumo, motivo, quantidade, observacao? }. A API recusa (400) se passar do saldo.
export function registrarSaida(dados) {
  return requisitar(`${URL_MOVIMENTACOES}/saida`, { method: "POST", body: JSON.stringify(dados) });
}

// Histórico, do mais recente ao mais antigo. Filtros opcionais: tipo (ENTRADA/SAIDA), idInsumo, de, ate (yyyy-MM-dd), limite.
export function listarMovimentacoes({ tipo, idInsumo, de, ate, limite } = {}) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ tipo, idInsumo, de, ate, limite })) {
    if (valor !== undefined && valor !== null && valor !== "") parametros.set(chave, String(valor));
  }
  const consulta = parametros.toString();
  return requisitar(consulta ? `${URL_MOVIMENTACOES}?${consulta}` : URL_MOVIMENTACOES);
}
