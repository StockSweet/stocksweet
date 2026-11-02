// Layout compartilhado das telas internas: a mesma sidebar + topbar do painel
// (logo, menu, breadcrumb, tema claro/escuro e menu do usuário).
//
// Cada página só precisa de um <main id="conteudo"> no HTML e de:
//
//   const layout = montarLayout({ ativo: "receitas" });
//   if (layout) layout.definirPagina({ titulo: "Receitas", trilha: [...] });
//
// Sem sessão válida, redireciona ao login e devolve null.

import { clearSession, ehGestor, getSession } from "./session.js";
import { h, icon } from "./dashboard/dom.js";
import { initials } from "./dashboard/format.js";
import { criarPopover, toast } from "./dashboard/ui.js";

const LOGIN_URL = "index.html";
const TEMA_KEY = "stocksweet.tema";
const MARCA = "StockSweet";
const MENU_COMPACTO = "(max-width: 1024px)";

// Itens do menu. "soGestor" segue a regra do session.js (RNF01).
const MENU = [
  {
    grupo: "Visão geral",
    itens: [{ id: "painel", rotulo: "Painel", href: "dashboard.html", icone: "dashboard" }],
  },
  {
    grupo: "Produção",
    itens: [
      { id: "receitas", rotulo: "Receitas", href: "cadastro_receitas.html", icone: "recipe" },
      { id: "precificacao", rotulo: "Precificação", href: "precificacao.html", icone: "tag", soGestor: true },
    ],
  },
  {
    grupo: "Estoque",
    itens: [
      { id: "entrada", rotulo: "Entrada de mercadorias", href: "entrada_mercadorias.html", icone: "arrow-in" },
      { id: "saida", rotulo: "Saída de mercadorias", href: "saida_mercadorias.html", icone: "arrow-out" },
    ],
  },
];

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(TEMA_KEY, tema);
  } catch {
    // sem localStorage: o tema vale só até recarregar
  }
}

function criarSidebar(ativo, gestor, aoFechar) {
  const grupos = MENU.map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => gestor || !item.soGestor) })).filter(
    (grupo) => grupo.itens.length,
  );

  return h(
    "aside",
    { class: "sidebar", id: "sidebar", "aria-label": "Navegação principal" },
    h(
      "div",
      { class: "sidebar__brand" },
      h("img", { class: "sidebar__mark", src: "assets/favicon.svg", alt: "", width: 38, height: 38 }),
      h("span", { class: "sidebar__word" }, "Stock", h("em", null, "Sweet")),
      h("button", { type: "button", class: "icon-btn sidebar__close", id: "sidebarClose", "aria-label": "Fechar menu", onclick: aoFechar }, icon("x")),
    ),
    h(
      "nav",
      { class: "sidebar__nav", "aria-label": "Seções do sistema" },
      ...grupos.flatMap((grupo) => [
        h("p", { class: "sidebar__group" }, grupo.grupo),
        ...grupo.itens.map((item) =>
          h(
            "a",
            {
              class: `nav-item${item.id === ativo ? " is-active" : ""}`,
              href: item.href,
              "aria-current": item.id === ativo ? "page" : null,
            },
            icon(item.icone),
            h("span", null, item.rotulo),
          ),
        ),
      ]),
    ),
  );
}

export function montarLayout({ ativo } = {}) {
  const sessao = getSession();
  if (!sessao) {
    window.location.replace(LOGIN_URL);
    return null;
  }

  const gestor = ehGestor(sessao.usuario);
  const nome = sessao.usuario.nome ?? sessao.usuario.email ?? "Usuário";
  const papel = gestor ? "Gestor" : "Usuário";
  const conteudo = document.getElementById("conteudo");

  /* ---------- menu lateral (celular/tablet) ---------- */
  const compacto = window.matchMedia(MENU_COMPACTO);
  let app;
  let sidebar;
  let menuBtn;

  function atualizarFocoDoMenu() {
    // Fechado no celular, o menu sai da ordem de tabulação.
    const escondido = compacto.matches && !app.classList.contains("is-menu-open");
    sidebar.toggleAttribute("inert", escondido);
  }

  function definirMenu(aberto) {
    app.classList.toggle("is-menu-open", aberto);
    menuBtn.setAttribute("aria-expanded", String(aberto));
    document.body.classList.toggle("is-locked", aberto);
    atualizarFocoDoMenu();
    if (aberto) document.getElementById("sidebarClose")?.focus({ preventScroll: true });
    else if (compacto.matches) menuBtn.focus({ preventScroll: true });
  }

  sidebar = criarSidebar(ativo, gestor, () => definirMenu(false));

  /* ---------- topbar ---------- */
  menuBtn = h(
    "button",
    {
      type: "button",
      class: "icon-btn topbar__menu",
      id: "menuBtn",
      "aria-label": "Abrir menu",
      "aria-controls": "sidebar",
      "aria-expanded": "false",
      onclick: () => definirMenu(!app.classList.contains("is-menu-open")),
    },
    icon("menu", 20),
  );

  const trilhaEl = h("ol", { class: "crumbs__list" });
  const trilhaNav = h("nav", { class: "crumbs", "aria-label": "Você está em" }, trilhaEl);

  const temaBtn = h(
    "button",
    {
      type: "button",
      class: "icon-btn",
      id: "themeBtn",
      "aria-label": "Alternar entre tema claro e escuro",
      onclick: () => aplicarTema(document.documentElement.dataset.theme === "dark" ? "light" : "dark"),
    },
    h("span", { class: "theme-sun icon-slot" }, icon("sun", 19)),
    h("span", { class: "theme-moon icon-slot" }, icon("moon", 19)),
  );

  const usuarioBtn = h(
    "button",
    { type: "button", class: "user-btn", id: "userBtn", "aria-haspopup": "true", "aria-expanded": "false", "aria-controls": "userPanel" },
    h("span", { class: "avatar", "aria-hidden": "true" }, initials(nome)),
    h("span", { class: "user-btn__meta" }, h("strong", null, nome), h("small", null, papel)),
    h("span", { class: "user-btn__chev icon-slot" }, icon("chevron-down", 16)),
  );
  const usuarioPainel = h(
    "div",
    { class: "popover popover--user", id: "userPanel", hidden: true },
    h(
      "div",
      { class: "user-card" },
      h("span", { class: "avatar avatar--lg", "aria-hidden": "true" }, initials(nome)),
      h("div", null, h("strong", null, nome), h("small", null, sessao.usuario.email ?? ""), h("small", null, `Perfil: ${papel}`)),
    ),
    h(
      "button",
      {
        type: "button",
        class: "menu-item",
        onclick: () => {
          clearSession();
          window.location.replace(LOGIN_URL);
        },
      },
      icon("logout", 18),
      "Sair da conta",
    ),
  );
  criarPopover(usuarioBtn, usuarioPainel);

  const topbar = h(
    "header",
    { class: "topbar" },
    menuBtn,
    trilhaNav,
    h("div", { class: "topbar__actions" }, temaBtn, h("div", { class: "popover-wrap" }, usuarioBtn, usuarioPainel)),
  );

  /* ---------- montagem ---------- */
  const principal = h("div", { class: "main" }, topbar);
  app = h(
    "div",
    { class: "app", id: "app" },
    sidebar,
    h("div", { class: "sidebar-backdrop", id: "sidebarBackdrop", onclick: () => definirMenu(false) }),
    principal,
  );

  if (conteudo) {
    conteudo.classList.add("content");
    conteudo.setAttribute("tabindex", "-1");
    principal.append(conteudo);
  }

  const skip = document.querySelector(".skip-link");
  if (skip) skip.after(app);
  else document.body.prepend(app);
  document.body.append(h("div", { class: "toasts", id: "toasts", "aria-live": "polite" }));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && app.classList.contains("is-menu-open")) definirMenu(false);
  });
  compacto.addEventListener("change", () => {
    if (!compacto.matches) {
      app.classList.remove("is-menu-open");
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
    }
    atualizarFocoDoMenu();
  });
  atualizarFocoDoMenu();

  /* ---------- API da página ---------- */

  // trilha: [{ rotulo, href? }]; o último item é a página atual.
  function definirPagina({ titulo, trilha }) {
    document.title = `${titulo} · ${MARCA}`;
    const itens = trilha ?? [{ rotulo: titulo }];

    trilhaEl.replaceChildren(
      ...itens.map((item, i) => {
        const ultimo = i === itens.length - 1;
        return h(
          "li",
          { class: "crumbs__item" },
          ultimo
            ? h("span", { class: "crumbs__current", "aria-current": "page" }, item.rotulo)
            : !item.href
              ? h("span", { class: "crumbs__static" }, item.rotulo)
            : h("a", { class: "crumbs__link", href: item.href }, item.rotulo),
          ultimo ? null : h("span", { class: "crumbs__sep icon-slot", "aria-hidden": "true" }, icon("chevron-right", 14)),
        );
      }),
    );
  }

  function focarConteudo() {
    conteudo?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  return {
    sessao,
    gestor,
    conteudo,
    definirPagina,
    focarConteudo,
    avisar: (mensagem, opcoes) => toast(mensagem, opcoes),
  };
}
