import { clearSession, ehGestor, getSession } from "./session.js";
import { createDb, PERIODOS } from "./dashboard/mock-data.js";
import { insumoPorId, intervaloDoPeriodo, iniciarBase, statusDe } from "./dashboard/analytics.js";
import { h } from "./dashboard/dom.js";
import { qtd, timeAgo } from "./dashboard/format.js";
import { toast } from "./dashboard/ui.js";
import * as shell from "./dashboard/shell.js";
import * as dialogos from "./dashboard/dialogs.js";
import * as kpis from "./dashboard/widgets/kpis.js";
import * as movimento from "./dashboard/widgets/movimento.js";
import * as alertas from "./dashboard/widgets/alertas.js";
import * as categorias from "./dashboard/widgets/categorias.js";
import * as receitas from "./dashboard/widgets/receitas.js";
import * as insumos from "./dashboard/widgets/insumos.js";
import * as feed from "./dashboard/widgets/feed.js";

const LOGIN_URL = "index.html";
const ORDEM_RENDER = ["shell", "kpis", "mov", "alertas", "categorias", "receitas", "insumos", "feed"];

const sessao = getSession();
if (sessao) iniciar(sessao);
else window.location.replace(LOGIN_URL);

function iniciar(sessao) {
  const db = createDb();
  iniciarBase(db);

  const state = {
    role: ehGestor(sessao.usuario) ? "gestor" : "usuario",
    periodo: PERIODOS[1],
    catModo: "estoque",
    catFiltro: null,
    tabela: { busca: "", status: "todos", pagina: 1, ordem: { chave: "situacao", dir: 1 } },
    lidas: new Set(),
    ultimoMovimento: null,
  };

  const primeiroNome = String(sessao.usuario.nome ?? "Equipe").split(/\s+/)[0];
  const dashEl = document.getElementById("dash");

  const ctx = {
    sessao,
    db,
    state,
    widgets: {},
    get ehGestor() {
      return state.role === "gestor";
    },

    render(...nomes) {
      for (const nome of nomes.length ? nomes : ORDEM_RENDER) ctx.widgets[nome]?.render();
    },

    registrarMovimento({ tipo, insumoId, qtd: quantidade, obs }) {
      const insumo = insumoPorId(db, insumoId);
      const antes = statusDe(insumo);
      const valor = Math.round(quantidade * insumo.preco * 100) / 100;

      insumo.estoque = Math.round((insumo.estoque + (tipo === "entrada" ? quantidade : -quantidade)) * 1000) / 1000;
      const mov = { id: `m-${Date.now()}`, quando: new Date(), tipo, insumoId, qtd: quantidade, valor, por: primeiroNome, obs, manual: true };
      db.movimentos.unshift(mov);

      const serie = tipo === "entrada" ? db.series.entradas : db.series.saidas;
      serie[serie.length - 1] += valor;

      state.ultimoMovimento = mov.id;
      ctx.render();
      return { mov, insumo, antes, depois: statusDe(insumo) };
    },

    desfazerMovimento(mov) {
      const insumo = insumoPorId(db, mov.insumoId);
      insumo.estoque = Math.round((insumo.estoque + (mov.tipo === "entrada" ? -mov.qtd : mov.qtd)) * 1000) / 1000;
      db.movimentos.splice(db.movimentos.indexOf(mov), 1);
      const serie = mov.tipo === "entrada" ? db.series.entradas : db.series.saidas;
      serie[serie.length - 1] -= mov.valor;
      state.ultimoMovimento = null;
      ctx.render();
    },

    avisarMovimento({ mov, insumo, antes, depois }) {
      const sinal = mov.tipo === "entrada" ? "+" : "−";
      let mensagem = `${mov.tipo === "entrada" ? "Entrada" : "Saída"} registrada: ${sinal}${qtd(mov.qtd, insumo.un)} de ${insumo.nome}.`;
      let tom = "ok";

      if (antes === "ok" && depois !== "ok") {
        mensagem += ` Atenção: o estoque ficou ${depois === "critico" ? "em nível crítico" : "abaixo do mínimo"}.`;
        tom = "aviso";
      } else if (antes !== "ok" && depois === "ok") {
        mensagem += " O alerta desse insumo foi resolvido.";
      }
      toast(mensagem, { tom, acao: { label: "Desfazer", onClick: () => ctx.desfazerMovimento(mov) } });
    },

    definirPerfil(papel) {
      if (state.role === papel) return;
      state.role = papel;
      ctx.render();
    },

    sair() {
      clearSession();
      window.location.replace(LOGIN_URL);
    },
  };

  ctx.widgets.shell = shell.montar(ctx);
  const dialogs = dialogos.montar(ctx);
  ctx.abrirMovimento = dialogs.abrirMovimento;
  ctx.abrirInsumo = dialogs.abrirInsumo;

  ctx.widgets.kpis = kpis.montar(ctx);
  ctx.widgets.mov = movimento.montar(ctx);
  ctx.widgets.alertas = alertas.montar(ctx);
  ctx.widgets.categorias = categorias.montar(ctx);
  ctx.widgets.receitas = receitas.montar(ctx);
  ctx.widgets.insumos = insumos.montar(ctx);
  ctx.widgets.feed = feed.montar(ctx);

  document.getElementById("novoMovimento").addEventListener("click", () => ctx.abrirMovimento());

  montarFiltroPeriodo(ctx, dashEl);
  montarAtualizacao(ctx, dashEl);

  ctx.render();
}

/* ---------- filtro de período: uma linha acima de tudo que ele afeta ---------- */

let recarga = 0;

// Enquanto "recarrega", o painel mantém o quadro anterior com opacidade reduzida (sem esqueleto, sem salto).
function recarregar(dashEl, ms, aoFim) {
  dashEl.classList.add("is-refreshing");
  dashEl.setAttribute("aria-busy", "true");
  clearTimeout(recarga);
  recarga = window.setTimeout(() => {
    aoFim();
    dashEl.classList.remove("is-refreshing");
    dashEl.removeAttribute("aria-busy");
  }, ms);
}

function montarFiltroPeriodo(ctx, dashEl) {
  const grupo = document.getElementById("periodo");
  const intervalo = document.getElementById("periodoIntervalo");

  const botoes = PERIODOS.map((p) =>
    h("button", { type: "button", role: "radio", "data-id": p.id, onclick: () => escolher(p) }, p.label),
  );
  grupo.replaceChildren(...botoes);

  function marcar() {
    botoes.forEach((b) => {
      const ativo = b.dataset.id === ctx.state.periodo.id;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-checked", String(ativo));
      b.tabIndex = ativo ? 0 : -1;
    });
    intervalo.textContent = intervaloDoPeriodo(ctx.db, ctx.state.periodo);
  }

  function escolher(periodo) {
    if (periodo.id === ctx.state.periodo.id) return;
    ctx.state.periodo = periodo;
    marcar();
    recarregar(dashEl, 360, () => ctx.render("kpis", "mov", "categorias"));
  }

  grupo.addEventListener("keydown", (event) => {
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!passo) return;
    event.preventDefault();
    const atual = PERIODOS.findIndex((p) => p.id === ctx.state.periodo.id);
    const proximo = (atual + passo + PERIODOS.length) % PERIODOS.length;
    escolher(PERIODOS[proximo]);
    botoes[proximo].focus();
  });

  marcar();
}

/* ---------- botão "atualizado há…" ---------- */

function montarAtualizacao(ctx, dashEl) {
  const botao = document.getElementById("refreshBtn");
  const rotulo = document.getElementById("refreshLabel");
  let ultima = Date.now();

  const escrever = () => {
    rotulo.textContent = `Atualizado ${timeAgo(new Date(ultima))}`;
  };

  botao.addEventListener("click", () => {
    if (botao.classList.contains("is-loading")) return;
    botao.classList.add("is-loading");
    rotulo.textContent = "Atualizando…";
    recarregar(dashEl, 900, () => {
      ctx.render();
      ultima = Date.now();
      botao.classList.remove("is-loading");
      escrever();
    });
  });

  escrever();
  window.setInterval(escrever, 30000);
}
