// Estrutura da página: tema, menu lateral, busca, notificações, menu do usuário e cabeçalho.

import { $, $$, h, icon } from "./dom.js";
import { medidor } from "./charts.js";
import { badgeStatus } from "./components.js";
import { alertasDe, buscar, categoriaPorId, notificacoes, saudeEstoque, statusDe } from "./analytics.js";
import { dLong, initials, qtd, saudacao, timeAgo } from "./format.js";
import { criarPopover, fecharPopovers, toast } from "./ui.js";

const TEMA_KEY = "stocksweet.tema";

export function montar(ctx) {
  const { sessao } = ctx;
  const nome = sessao.usuario.nome ?? sessao.usuario.email ?? "Usuário";
  const primeiroNome = String(nome).split(/\s+/)[0];

  /* ---------- ícones declarativos: <span data-icon="box"> ---------- */
  $$("[data-icon]").forEach((el) => {
    el.replaceChildren(icon(el.dataset.icon, Number(el.dataset.size) || 18));
    el.classList.add("icon-slot");
  });

  /* ---------- tema ---------- */
  const html = document.documentElement;
  $("#themeBtn").addEventListener("click", () => {
    const novo = html.dataset.theme === "dark" ? "light" : "dark";
    html.dataset.theme = novo;
    try {
      localStorage.setItem(TEMA_KEY, novo);
    } catch {
      // sem localStorage: o tema vale só até recarregar
    }
  });

  /* ---------- menu lateral (celular/tablet) ---------- */
  const appEl = $("#app");
  const menuBtn = $("#menuBtn");
  const setMenu = (aberto) => {
    appEl.classList.toggle("is-menu-open", aberto);
    menuBtn.setAttribute("aria-expanded", String(aberto));
    document.body.classList.toggle("is-locked", aberto);
  };
  menuBtn.addEventListener("click", () => setMenu(!appEl.classList.contains("is-menu-open")));
  $("#sidebarClose").addEventListener("click", () => setMenu(false));
  $("#sidebarBackdrop").addEventListener("click", () => setMenu(false));

  $$("[data-soon]").forEach((el) =>
    el.addEventListener("click", () => {
      setMenu(false);
      toast(`${el.dataset.soon} ainda não está disponível — por enquanto o Painel é o único módulo.`, { tom: "info" });
    }),
  );

  /* ---------- cabeçalho da página ---------- */
  const hoje = dLong(new Date());
  $("#hoje").textContent = hoje.charAt(0).toUpperCase() + hoje.slice(1);
  $("#saudacao").textContent = `${saudacao()}, ${primeiroNome}`;

  /* ---------- usuário ---------- */
  const papelRotulo = () => (ctx.ehGestor ? "Gestor" : "Usuário");
  const avatar = initials(nome);
  $("#avatar").textContent = avatar;
  $("#avatarLg").textContent = avatar;
  $("#userName").textContent = nome;
  $("#userNameFull").textContent = nome;
  $("#userEmail").textContent = sessao.usuario.email ?? "";

  criarPopover($("#userBtn"), $("#userPanel"));
  $("#logoutBtn").addEventListener("click", () => ctx.sair());

  const roleSwitch = $("#roleSwitch");
  roleSwitch.addEventListener("click", (event) => {
    const botao = event.target.closest("[data-role-set]");
    if (botao) ctx.definirPerfil(botao.dataset.roleSet);
  });

  /* ---------- notificações ---------- */
  const bellBadge = $("#bellBadge");
  const notifList = $("#notifList");
  criarPopover($("#bellBtn"), $("#notifPanel"));

  $("#notifReadAll").addEventListener("click", () => {
    notificacoes(ctx.db).forEach((n) => ctx.state.lidas.add(n.id));
    renderNotificacoes();
  });

  const ICONE_NOTIF = { critico: "alert-octagon", baixo: "alert", preco: "trend-up" };

  function renderNotificacoes() {
    const itens = notificacoes(ctx.db);
    const naoLidas = itens.filter((n) => !ctx.state.lidas.has(n.id)).length;

    bellBadge.hidden = naoLidas === 0;
    bellBadge.textContent = naoLidas > 9 ? "9+" : naoLidas;
    $("#bellBtn").setAttribute("aria-label", naoLidas ? `Notificações, ${naoLidas} não lida${naoLidas === 1 ? "" : "s"}` : "Notificações");
    $("#notifReadAll").disabled = naoLidas === 0;

    if (!itens.length) {
      notifList.replaceChildren(h("li", { class: "notifs__empty" }, "Você está em dia. Nenhuma notificação por aqui."));
      return;
    }

    notifList.replaceChildren(
      ...itens.map((n) =>
        h(
          "li",
          null,
          h(
            "button",
            {
              type: "button",
              class: `notif notif--${n.tipo}${ctx.state.lidas.has(n.id) ? " is-read" : ""}`,
              onclick: () => {
                ctx.state.lidas.add(n.id);
                fecharPopovers();
                renderNotificacoes();
                ctx.abrirInsumo(n.insumoId);
              },
            },
            h("span", { class: "notif__icon" }, icon(ICONE_NOTIF[n.tipo], 16)),
            h("span", { class: "notif__txt" }, h("strong", null, n.titulo), h("small", null, timeAgo(n.quando))),
            ctx.state.lidas.has(n.id) ? null : h("span", { class: "notif__dot", "aria-label": "Não lida" }),
          ),
        ),
      ),
    );
  }

  /* ---------- saúde do estoque (rodapé do menu) ---------- */
  const saudeEl = $("#sideHealth");
  function renderSaude() {
    const { emDia, total, ratio } = saudeEstoque(ctx.db);
    saudeEl.replaceChildren(
      h("div", { class: "health__head" }, icon("heart", 16), h("span", null, "Saúde do estoque"), h("strong", null, `${Math.round(ratio * 100)}%`)),
      medidor({ razao: ratio, tom: ratio >= 0.85 ? "ok" : ratio >= 0.65 ? "baixo" : "critico" }),
      h("small", null, `${emDia} de ${total} insumos acima do mínimo`),
    );
  }

  /* ---------- resumo do dia ---------- */
  function renderResumo() {
    const alertas = alertasDe(ctx.db);
    const criticos = alertas.filter((i) => statusDe(i) === "critico").length;
    const resumo = $("#resumo");

    if (!alertas.length) {
      resumo.replaceChildren("Tudo em ordem: nenhum insumo abaixo do mínimo hoje.");
      return;
    }
    resumo.replaceChildren(
      h("strong", null, `${alertas.length} insumo${alertas.length === 1 ? "" : "s"}`),
      ` pede${alertas.length === 1 ? "" : "m"} reposição`,
      criticos ? ` — ${criticos} em nível crítico.` : ".",
    );
  }

  /* ---------- busca (combobox) ---------- */
  const buscaEl = $("#searchInput");
  const listaEl = $("#searchList");
  let opcoes = [];
  let indice = -1;

  function fecharBusca() {
    listaEl.hidden = true;
    buscaEl.setAttribute("aria-expanded", "false");
    buscaEl.removeAttribute("aria-activedescendant");
    indice = -1;
  }

  function escolher(opcao) {
    fecharBusca();
    buscaEl.value = "";
    buscaEl.blur();
    opcao.acao();
  }

  function marcar(novo) {
    indice = novo;
    $$("[role=option]", listaEl).forEach((el, i) => {
      const ativo = i === indice;
      el.setAttribute("aria-selected", String(ativo));
      el.classList.toggle("is-active", ativo);
      if (ativo) {
        buscaEl.setAttribute("aria-activedescendant", el.id);
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function opcaoInsumo(insumo) {
    return {
      acao: () => ctx.abrirInsumo(insumo.id),
      nos: [
        h("span", { class: "opt__icon" }, icon("box", 16)),
        h("span", { class: "opt__txt" }, h("strong", null, insumo.nome), h("small", null, `${categoriaPorId(ctx.db, insumo.cat).nome} · ${qtd(insumo.estoque, insumo.un)}`)),
        badgeStatus(statusDe(insumo)),
      ],
    };
  }

  function renderBusca() {
    const termo = buscaEl.value.trim();
    const grupos = [];

    if (!termo) {
      const emAlerta = alertasDe(ctx.db).slice(0, 4);
      if (emAlerta.length) grupos.push({ titulo: "Em alerta agora", itens: emAlerta.map(opcaoInsumo) });
    } else {
      const { insumos, receitas } = buscar(ctx.db, termo, { incluirReceitas: ctx.ehGestor });
      if (insumos.length) grupos.push({ titulo: "Insumos", itens: insumos.map(opcaoInsumo) });
      if (receitas.length) {
        grupos.push({
          titulo: "Receitas",
          itens: receitas.map((r) => ({
            acao: () => ctx.widgets.receitas.destacar(r.id),
            nos: [h("span", { class: "opt__icon" }, icon("recipe", 16)), h("span", { class: "opt__txt" }, h("strong", null, r.nome), h("small", null, "Ver margem e preço sugerido"))],
          })),
        });
      }
    }

    opcoes = grupos.flatMap((g) => g.itens);
    listaEl.replaceChildren();

    if (!opcoes.length) {
      if (termo) listaEl.append(h("li", { class: "search__empty", role: "presentation" }, `Nada encontrado para “${termo}”.`));
      listaEl.hidden = !termo;
      buscaEl.setAttribute("aria-expanded", String(Boolean(termo)));
      return;
    }

    let n = 0;
    for (const grupo of grupos) {
      listaEl.append(h("li", { class: "search__group", role: "presentation" }, grupo.titulo));
      for (const item of grupo.itens) {
        const i = n++;
        listaEl.append(
          h(
            "li",
            {
              id: `opt-${i}`,
              role: "option",
              class: "opt",
              "aria-selected": "false",
              onpointerdown: (e) => e.preventDefault(), // não deixa o input perder o foco antes do clique
              onclick: () => escolher(opcoes[i]),
              onpointermove: () => indice !== i && marcar(i),
            },
            ...item.nos,
          ),
        );
      }
    }
    listaEl.hidden = false;
    buscaEl.setAttribute("aria-expanded", "true");
    marcar(0);
  }

  buscaEl.addEventListener("input", renderBusca);
  buscaEl.addEventListener("focus", renderBusca);
  buscaEl.addEventListener("blur", () => window.setTimeout(fecharBusca, 120));
  buscaEl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (listaEl.hidden) renderBusca();
      if (opcoes.length) marcar((indice + (event.key === "ArrowDown" ? 1 : -1) + opcoes.length) % opcoes.length);
    } else if (event.key === "Enter" && opcoes[indice]) {
      event.preventDefault();
      escolher(opcoes[indice]);
    } else if (event.key === "Escape") {
      if (buscaEl.value) buscaEl.value = "";
      else buscaEl.blur();
      fecharBusca();
    }
  });

  document.addEventListener("keydown", (event) => {
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
    if (event.key === "/" && !digitando && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      buscaEl.focus();
    }
    if (event.key === "Escape" && appEl.classList.contains("is-menu-open")) setMenu(false);
  });

  /* ---------- sincroniza o que depende do perfil ---------- */
  function render() {
    document.body.dataset.role = ctx.state.role;
    $("#userRole").textContent = papelRotulo();
    roleSwitch.querySelectorAll("[data-role-set]").forEach((b) => {
      const ativo = b.dataset.roleSet === ctx.state.role;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    renderNotificacoes();
    renderSaude();
    renderResumo();
  }

  return { render };
}
