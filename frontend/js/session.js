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
