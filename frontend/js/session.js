// Sessão do usuário no navegador: token JWT + dados do usuário.
// Guardada em localStorage (manter conectado) ou sessionStorage (só a aba atual).

export const TOKEN_KEY = "stocksweet.token";
export const USER_KEY = "stocksweet.usuario";

const storages = () => [window.sessionStorage, window.localStorage];

// Lê o "exp" do JWT só pra evitar mostrar o painel com um token que já venceu.
// A validação de verdade continua sendo da API; aqui é só conveniência de UX.
function tokenExpirado(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return typeof exp === "number" && exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export function getSession() {
  for (const storage of storages()) {
    try {
      const token = storage.getItem(TOKEN_KEY);
      if (!token) continue;

      const usuario = JSON.parse(storage.getItem(USER_KEY) ?? "null");
      if (tokenExpirado(token) || !usuario) {
        clearSession();
        return null;
      }
      return { token, usuario };
    } catch {
      // storage bloqueado ou JSON corrompido: trata como sem sessão
    }
  }
  return null;
}

export function clearSession() {
  for (const storage of storages()) {
    try {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    } catch {
      // ignora storage indisponível
    }
  }
}

// O enum NivelUsuario da API é serializado como texto ("Usuario" / "Gestor").
export function ehGestor(usuario) {
  return String(usuario?.nivel ?? "").toLowerCase() === "gestor";
}

/* ---------------------------------------------------------
   Sessão inválida: aviso na tela + volta ao login com ?next
--------------------------------------------------------- */

const LOGIN_URL = "index.html";
export const EVENTO_SESSAO_INVALIDA = "stocksweet:sessao-invalida";

// Erro lançado pelos serviços quando a API recusa o token (401) ou não há token.
export class SessaoInvalidaErro extends Error {
  constructor() {
    super("Sua sessão expirou ou não é válida. Entre novamente para continuar.");
    this.name = "SessaoInvalidaErro";
  }
}

export const ehErroDeSessao = (erro) => erro instanceof SessaoInvalidaErro;

// Página em que o usuário está, em caminho relativo (ex.: "cadastro_receitas.html#/receita/65").
export function paginaAtual() {
  const arquivo = window.location.pathname.split("/").pop() || "dashboard.html";
  return `${arquivo}${window.location.search}${window.location.hash}`;
}

// Só aceita caminho relativo para uma página .html do próprio site: nada de esquema, host,
// "//", barras invertidas ou "..". Qualquer outra coisa (ou o próprio login) vira null.
const NEXT_SEGURO = /^[A-Za-z0-9_-]+\.html(?:[?#][^\s\\]*)?$/;

export function proximaUrlSegura(valor) {
  if (typeof valor !== "string" || !NEXT_SEGURO.test(valor)) return null;
  if (valor.includes("..") || valor.startsWith(LOGIN_URL)) return null;
  return valor;
}

export function urlDeLogin(proxima = paginaAtual()) {
  return `${LOGIN_URL}?next=${encodeURIComponent(proxima)}`;
}

// Vai ao login guardando a página de origem; com limpar=true encerra a sessão local antes.
export function irParaLogin({ limpar = false } = {}) {
  if (limpar) clearSession();
  window.location.replace(urlDeLogin());
}

// Chamado pelos serviços no 401: avisa a tela (layout.js mostra o aviso) e devolve o erro para lançar.
export function sessaoInvalida() {
  window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_INVALIDA));
  return new SessaoInvalidaErro();
}
