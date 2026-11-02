// Peças de interface das telas internas (receitas e precificação), montadas sobre o
// design system do painel: diálogos e painéis laterais, confirmação, banners, campos de
// formulário, estados vazios, esqueletos e a dica de ajuda.

import { h, icon } from "./dashboard/dom.js";
import { brl } from "./dashboard/format.js";

const FOCUSAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DURACAO_SAIDA = 240;

/* ---------------------------------------------------------
   Diálogos (modal e painel lateral) com pilha:
   Esc fecha só o de cima, o foco fica preso nele e volta
   para quem abriu; o fundo da página fica inerte.
--------------------------------------------------------- */

const pilha = [];

function travarFundo(travar) {
  document.body.classList.toggle("is-locked", travar);
  document.getElementById("app")?.toggleAttribute("inert", travar);
}

function aoTeclar(event) {
  const topo = pilha[pilha.length - 1];
  if (!topo) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    topo.fechar();
    return;
  }
  if (event.key !== "Tab") return;

  const itens = [...topo.raiz.querySelectorAll(FOCUSAVEL)].filter((el) => el.offsetParent !== null);
  if (!itens.length) {
    event.preventDefault();
    return;
  }
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  const dentro = topo.raiz.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === primeiro || !dentro)) {
    event.preventDefault();
    ultimo.focus();
  } else if (!event.shiftKey && (document.activeElement === ultimo || !dentro)) {
    event.preventDefault();
    primeiro.focus();
  }
}

let ouvindo = false;
function garantirOuvinte() {
  if (ouvindo) return;
  document.addEventListener("keydown", aoTeclar, true);
  ouvindo = true;
}

let contadorId = 0;
export const novoId = (prefixo = "id") => `${prefixo}-${++contadorId}`;

// tipo: "modal" (centralizado) ou "gaveta" (painel lateral).
// corpo: Node | Node[]; rodape: Node[] (botões). Devolve { fechar, raiz, corpoEl }.
export function abrirDialogo({ tipo = "modal", titulo, subtitulo, corpo, rodape, largura, aoFechar, semFechar = false }) {
  const idTitulo = novoId("dlg-titulo");
  const abertoPor = document.activeElement;
  let fechado = false;

  const cabecalho = h(
    tipo === "gaveta" ? "header" : "div",
    { class: tipo === "gaveta" ? "drawer__head" : "modal__head dlg__head" },
    h("div", { class: "dlg__titulos" }, h("h2", { id: idTitulo }, titulo), subtitulo ? h("p", { class: "dlg__sub" }, subtitulo) : null),
    semFechar ? null : h("button", { type: "button", class: "icon-btn icon-btn--sm", "data-close": "", "aria-label": "Fechar", onclick: () => fechar() }, icon("x")),
  );

  const corpoEl = h("div", { class: tipo === "gaveta" ? "drawer__body" : "dlg__body" }, ...[corpo].flat());
  const rodapeEl = rodape?.length ? h("footer", { class: tipo === "gaveta" ? "drawer__foot" : "modal__foot dlg__foot" }, ...rodape) : null;

  const painel =
    tipo === "gaveta"
      ? h("aside", { class: "drawer dlg-gaveta", role: "dialog", "aria-modal": "true", "aria-labelledby": idTitulo }, h("div", { class: "drawer__col" }, cabecalho, corpoEl, rodapeEl))
      : h("div", { class: "modal dlg", role: "dialog", "aria-modal": "true", "aria-labelledby": idTitulo, style: largura ? { width: `min(${largura}px, 100%)` } : null }, cabecalho, corpoEl, rodapeEl);

  const raiz = h(
    "div",
    { class: `overlay${tipo === "gaveta" ? " overlay--drawer" : ""}` },
    h("div", { class: "overlay__scrim", onclick: () => fechar() }),
    painel,
  );

  function fechar() {
    if (fechado) return;
    fechado = true;
    const i = pilha.findIndex((d) => d.raiz === raiz);
    if (i >= 0) pilha.splice(i, 1);
    raiz.classList.remove("is-open");
    if (!pilha.length) travarFundo(false);
    window.setTimeout(() => raiz.remove(), DURACAO_SAIDA);
    // Devolve o foco para quem abriu (se ainda existir na tela).
    if (abertoPor?.isConnected && abertoPor !== document.body) abertoPor.focus({ preventScroll: true });
    else document.getElementById("conteudo")?.focus({ preventScroll: true });
    aoFechar?.();
  }

  garantirOuvinte();
  document.body.append(raiz);
  pilha.push({ raiz, fechar });
  travarFundo(true);
  requestAnimationFrame(() => raiz.classList.add("is-open"));

  const alvo = raiz.querySelector("[data-autofocus]") ?? corpoEl.querySelector(FOCUSAVEL) ?? raiz.querySelector(FOCUSAVEL);
  alvo?.focus({ preventScroll: true });

  return { fechar, raiz, corpoEl };
}

// Pergunta de confirmação em diálogo estilizado. Resolve true/false.
export function confirmar({ titulo, mensagem, rotuloConfirmar = "Confirmar", perigo = false }) {
  return new Promise((resolve) => {
    let resposta = false;
    const dialogo = abrirDialogo({
      titulo,
      largura: 440,
      semFechar: true,
      corpo: h(
        "div",
        { class: "confirm" },
        h("span", { class: `confirm__icon confirm__icon--${perigo ? "crit" : "info"}` }, icon(perigo ? "alert" : "info", 22)),
        h("p", { class: "confirm__msg" }, mensagem),
      ),
      rodape: [
        h("button", { type: "button", class: "btn btn--ghost", "data-autofocus": "", onclick: () => dialogo.fechar() }, "Cancelar"),
        h(
          "button",
          {
            type: "button",
            class: `btn ${perigo ? "btn--danger" : "btn--primary"}`,
            onclick: () => {
              resposta = true;
              dialogo.fechar();
            },
          },
          rotuloConfirmar,
        ),
      ],
      aoFechar: () => resolve(resposta),
    });
  });
}

/* ---------------------------------------------------------
   Banners (severidade: info, aviso, erro, ok)
--------------------------------------------------------- */

const ICONE_BANNER = { info: "info", aviso: "alert", erro: "alert-octagon", ok: "check-circle" };

// mensagens: string | string[]; acoes: [{ rotulo, onClick, icone? }]
export function banner({ tom = "info", titulo, mensagens, acoes = [], icone, assertivo = false }) {
  const lista = [mensagens ?? []].flat().filter(Boolean);
  return h(
    "div",
    { class: `banner banner--${tom}`, role: assertivo ? "alert" : "status" },
    h("span", { class: "banner__icon" }, icon(icone ?? ICONE_BANNER[tom], 20)),
    h(
      "div",
      { class: "banner__body" },
      titulo ? h("strong", { class: "banner__title" }, titulo) : null,
      lista.length === 1 ? h("p", null, lista[0]) : null,
      lista.length > 1 ? h("ul", null, ...lista.map((m) => h("li", null, m))) : null,
    ),
    acoes.length
      ? h(
          "div",
          { class: "banner__actions" },
          ...acoes.map((a) =>
            h("button", { type: "button", class: "btn btn--xs btn--ghost", onclick: a.onClick }, a.icone ? icon(a.icone, 14) : null, a.rotulo),
          ),
        )
      : null,
  );
}

/* ---------------------------------------------------------
   Formulário
--------------------------------------------------------- */

// Campo com rótulo, dica e mensagem de erro. Devolve { el, definirErro, controle, sufixoEl, dicaEl }.
// "envoltorio" troca a caixa do controle (ex.: o combo de insumos).
export function criarCampo({ rotulo, controle, dica, opcional = false, sufixo, envoltorio }) {
  const idErro = novoId("erro");
  const erroEl = h("p", { class: "fld__error", id: idErro, role: "alert" });
  const dicaEl = dica ? h("p", { class: "fld__hint" }, dica) : null;
  const sufixoEl = sufixo == null ? null : h("span", null, sufixo);
  const caixa = envoltorio ?? (sufixoEl ? h("div", { class: "fld__suffix" }, controle, sufixoEl) : controle);
  const el = h(
    "div",
    { class: "fld" },
    h("label", { class: "fld__label", for: controle.id }, rotulo, opcional ? h("em", null, " (opcional)") : null),
    caixa,
    dicaEl,
    erroEl,
  );

  const alvo = controle;
  function definirErro(mensagem) {
    erroEl.textContent = mensagem ?? "";
    el.classList.toggle("is-invalid", Boolean(mensagem));
    if (mensagem) alvo.setAttribute("aria-describedby", idErro);
    else alvo.removeAttribute("aria-describedby");
    alvo.setAttribute("aria-invalid", String(Boolean(mensagem)));
  }
  alvo.addEventListener("input", () => erroEl.textContent && definirErro(""));

  return { el, definirErro, controle, sufixoEl, dicaEl };
}

/* ---------------------------------------------------------
   Estados: vazio, carregando, ajuda
--------------------------------------------------------- */

// Ilustração estática e confiável (sem dados do usuário).
const CUPCAKE = `
<svg viewBox="0 0 160 140" width="160" height="140" aria-hidden="true" focusable="false">
  <ellipse cx="80" cy="126" rx="54" ry="8" fill="var(--surface-3)"/>
  <path d="M44 68h72l-8.5 50a6 6 0 0 1-6 5H58.5a6 6 0 0 1-6-5L44 68Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M62 74l4 44M80 74v44M98 74l-4 44" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  <path d="M38 68c0-14 10-22 22-22 2-12 12-20 20-20s18 8 20 20c12 0 22 8 22 22H38Z" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M52 58c6 4 12 4 18 0M90 58c6 4 12 4 18 0" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none" opacity=".5"/>
  <circle cx="80" cy="20" r="6.5" fill="var(--crit)"/>
  <path d="M80 14c1-5 4-8 8-9" stroke="var(--good-ink)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M66 42l5 3M92 40l-4 5M80 50l3 4" stroke="var(--gold)" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export function estadoVazio({ titulo, texto, acao, ilustracao = true, iconeNome }) {
  const arte = h("div", { class: "empty__art" });
  if (ilustracao) arte.innerHTML = CUPCAKE;
  else arte.append(h("span", { class: "empty__badge" }, icon(iconeNome ?? "info", 28)));

  return h(
    "div",
    { class: "empty" },
    arte,
    h("h2", { class: "empty__title" }, titulo),
    texto ? h("p", { class: "empty__text" }, texto) : null,
    acao ? h("button", { type: "button", class: "btn btn--primary", onclick: acao.onClick }, acao.icone ? icon(acao.icone, 16) : null, acao.rotulo) : null,
  );
}

// Blocos cinzas pulsando no lugar do conteúdo que está carregando.
export function esqueleto({ linhas = 5, cards = 0 } = {}) {
  return h(
    "div",
    { class: "skeleton", role: "status", "aria-live": "polite" },
    h("span", { class: "sr-only" }, "Carregando…"),
    cards ? h("div", { class: "skeleton__cards", "aria-hidden": "true" }, ...Array.from({ length: cards }, () => h("div", { class: "skeleton__card sk" }))) : null,
    h(
      "div",
      { class: "skeleton__rows", "aria-hidden": "true" },
      ...Array.from({ length: linhas }, () => h("div", { class: "skeleton__row" }, h("span", { class: "sk sk--wide" }), h("span", { class: "sk" }), h("span", { class: "sk" }), h("span", { class: "sk sk--short" }))),
    ),
  );
}

// Botão "?" com texto de ajuda que aparece ao passar o mouse ou focar (teclado e toque).
export function ajuda(texto, rotulo = "Ajuda") {
  const id = novoId("ajuda");
  return h(
    "span",
    { class: "help" },
    h(
      "button",
      {
        type: "button",
        class: "help__btn",
        "aria-label": rotulo,
        "aria-describedby": id,
        // WCAG 1.4.13: a dica some com Esc sem tirar o foco de lugar
        onkeydown: (event) => event.key === "Escape" && event.target.blur(),
      },
      icon("help-circle", 16),
    ),
    h("span", { class: "help__tip", role: "tooltip", id }, texto),
  );
}

// Chip de status (reaproveita .status do painel). tom: ok | baixo | critico | neutro
export function chip(texto, tom = "neutro", iconeNome) {
  return h("span", { class: `status status--${tom}` }, iconeNome ? icon(iconeNome, 13) : null, texto);
}

// Botão só com ícone: rótulo acessível + dica visual (title).
export function botaoIcone({ icone, rotulo, onClick, perigo = false, desabilitado = false }) {
  return h(
    "button",
    { type: "button", class: `icon-btn icon-btn--sm row-btn${perigo ? " row-btn--danger" : ""}`, "aria-label": rotulo, title: rotulo, disabled: desabilitado, onclick: onClick },
    icon(icone, 17),
  );
}

// Normaliza para busca sem acento e sem diferenciar maiúsculas.
export const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// "2,5" e "2.5" valem; vazio ou texto inválido vira NaN.
export function lerNumero(texto) {
  const limpo = String(texto).trim().replace(/\s/g, "").replace(",", ".");
  return /^\d*\.?\d+$/.test(limpo) ? Number(limpo) : Number.NaN;
}

/* ---------------------------------------------------------
   Combo pesquisável
--------------------------------------------------------- */

// Combo pesquisável de insumos (input + lista), simples e acessível por teclado.
// detalhe(insumo) é o texto à direita de cada opção; textoUsado, o das opções já usadas.
export function criarCombo(aoEscolher, { detalhe = (i) => `${brl(i.precoCompra)} / ${i.unidadeMedida}`, textoUsado = "já na receita" } = {}) {
  const idLista = novoId("combo-lista");
  const input = h("input", {
    id: novoId("insumo"),
    type: "text",
    class: "combo__input",
    role: "combobox",
    autocomplete: "off",
    spellcheck: "false",
    "aria-expanded": "false",
    "aria-controls": idLista,
    "aria-autocomplete": "list",
    placeholder: "Buscar insumo…",
  });
  const listaEl = h("ul", { class: "combo__list", id: idLista, role: "listbox", "aria-label": "Insumos", hidden: true });
  const el = h("div", { class: "combo" }, input, h("span", { class: "combo__chev" }, icon("chevron-down", 16)), listaEl);

  let insumos = [];
  let usados = new Set();
  let escolhido = null;
  let visiveis = [];
  let ativo = -1;

  function fechar() {
    listaEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    ativo = -1;
  }

  function marcar(indice) {
    ativo = indice;
    [...listaEl.querySelectorAll("[role=option]")].forEach((opcao, i) => {
      opcao.classList.toggle("is-active", i === ativo);
      opcao.setAttribute("aria-selected", String(i === ativo));
      if (i === ativo) {
        input.setAttribute("aria-activedescendant", opcao.id);
        opcao.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function escolher(insumo) {
    if (usados.has(insumo.idInsumo)) return;
    escolhido = insumo;
    input.value = insumo.nome;
    fechar();
    aoEscolher(insumo);
  }

  function abrir() {
    const termo = normalizar(input.value.trim());
    visiveis = insumos.filter((i) => !termo || normalizar(i.nome).includes(termo));
    listaEl.replaceChildren(
      ...(visiveis.length
        ? visiveis.map((insumo, i) => {
            const jaUsado = usados.has(insumo.idInsumo);
            return h(
              "li",
              {
                id: `${idLista}-${i}`,
                role: "option",
                class: "combo__opt",
                "aria-selected": "false",
                "aria-disabled": jaUsado ? "true" : null,
                onpointerdown: (e) => e.preventDefault(),
                onclick: () => escolher(insumo),
                onpointermove: () => ativo !== i && marcar(i),
              },
              h("span", null, insumo.nome),
              h("small", null, jaUsado ? textoUsado : detalhe(insumo)),
            );
          })
        : [h("li", { class: "combo__empty", role: "presentation" }, insumos.length ? "Nenhum insumo com esse nome." : "Nenhum insumo cadastrado.")]),
    );
    listaEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (visiveis.length) marcar(Math.max(0, visiveis.findIndex((i) => !usados.has(i.idInsumo))));
  }

  input.addEventListener("click", () => listaEl.hidden && abrir());
  input.addEventListener("input", () => {
    if (escolhido) {
      escolhido = null;
      aoEscolher(null);
    }
    abrir();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      // Texto igual ao nome de um insumo livre conta como escolha.
      const exato = !escolhido && insumos.find((i) => normalizar(i.nome) === normalizar(input.value.trim()) && !usados.has(i.idInsumo));
      if (exato) escolher(exato);
      fechar();
    }, 120);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (listaEl.hidden) abrir();
      else if (visiveis.length) marcar((ativo + (event.key === "ArrowDown" ? 1 : -1) + visiveis.length) % visiveis.length);
    } else if (event.key === "Enter" && !listaEl.hidden && visiveis[ativo]) {
      event.preventDefault();
      escolher(visiveis[ativo]);
    } else if (event.key === "Escape" && !listaEl.hidden) {
      event.stopPropagation();
      fechar();
    }
  });

  return {
    el,
    input,
    get escolhido() {
      return escolhido;
    },
    definirInsumos(lista, idsUsados = []) {
      insumos = lista;
      usados = new Set(idsUsados);
      // mantém a escolha atual apontando para os dados mais novos do insumo
      if (escolhido) escolhido = lista.find((i) => i.idInsumo === escolhido.idInsumo) ?? null;
    },
    escolher(insumo) {
      escolher(insumo);
    },
    limpar() {
      escolhido = null;
      input.value = "";
      fechar();
    },
  };
}
