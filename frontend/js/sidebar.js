// Barra lateral ÚNICA do sistema. Todas as páginas internas (painel, receitas, precificação,
// entrada e saída de mercadorias) montam a sidebar a partir da lista MENU_LATERAL daqui:
// para criar, mover ou renomear um item do menu, é só editar esta lista.
//
// Cada página só diz qual item está ativo (id); grupos, ordem, rótulos, ícones, itens "em breve",
// regra de perfil e rodapé (indicador de saúde do estoque + Configurações) são sempre os mesmos.

import { h, icon } from "./dashboard/dom.js";
import { medidor } from "./dashboard/charts.js";
import { toast } from "./dashboard/ui.js";
import { listarInsumos } from "./estoqueService.js";
import { getSession } from "./session.js";

// href = tela que existe; emBreve = botão que só avisa; soGestor = escondido para o perfil Usuário
// (a regra vem do atributo data-only="gestor" + body[data-role], em dashboard.css).
export const MENU_LATERAL = [
  {
    grupo: "Visão geral",
    itens: [{ id: "painel", rotulo: "Painel", icone: "dashboard", href: "dashboard.html" }],
  },
  {
    grupo: "Estoque",
    itens: [
      { id: "insumos", rotulo: "Insumos", icone: "box", emBreve: true },
      { id: "fornecedores", rotulo: "Fornecedores", icone: "truck", emBreve: true },
      { id: "entrada", rotulo: "Entrada de mercadorias", icone: "arrow-in", href: "entrada_mercadorias.html" },
      { id: "saida", rotulo: "Saída de mercadorias", icone: "arrow-out", href: "saida_mercadorias.html" },
    ],
  },
  {
    grupo: "Produção",
    itens: [
      { id: "receitas", rotulo: "Receitas", icone: "recipe", href: "cadastro_receitas.html" },
      { id: "precificacao", rotulo: "Precificação", icone: "tag", href: "precificacao.html", soGestor: true },
      { id: "relatorios", rotulo: "Relatórios", icone: "chart", emBreve: true, soGestor: true },
    ],
  },
];

// Item do rodapé (fixo, depois do indicador de saúde).
const ITEM_CONFIGURACOES = { id: "configuracoes", rotulo: "Configurações", icone: "sliders", emBreve: true };

// Evento que as telas escutam para fechar o menu recolhível (celular/tablet).
export const EVENTO_FECHAR_MENU = "stocksweet:fechar-menu";

const CHAVE_SAUDE = "stocksweet.saude";

function itemDoMenu(item, ativo) {
  const atributos = { class: `nav-item${item.id === ativo ? " is-active" : ""}`, "data-only": item.soGestor ? "gestor" : null };
  const conteudo = [h("span", { class: "icon-slot", "data-icon": item.icone }, icon(item.icone)), h("span", null, item.rotulo)];

  if (item.emBreve) return h("button", { ...atributos, type: "button", "data-soon": item.rotulo }, ...conteudo);
  return h("a", { ...atributos, href: item.href, "aria-current": item.id === ativo ? "page" : null }, ...conteudo);
}

// Monta a <aside> completa. "ativo" é o id do item destacado (ou nenhum).
export function criarSidebar({ ativo } = {}) {
  const sidebar = h(
    "aside",
    { class: "sidebar", id: "sidebar", "aria-label": "Navegação principal" },
    h(
      "div",
      { class: "sidebar__brand" },
      h("img", { class: "sidebar__mark", src: "assets/favicon.svg", alt: "", width: 38, height: 38 }),
      h("span", { class: "sidebar__word" }, "Stock", h("em", null, "Sweet")),
      h("button", { type: "button", class: "icon-btn sidebar__close", id: "sidebarClose", "aria-label": "Fechar menu" }, h("span", { class: "icon-slot", "data-icon": "x" }, icon("x"))),
    ),
    h("nav", { class: "sidebar__nav" }, ...MENU_LATERAL.flatMap((grupo) => [h("p", { class: "sidebar__group" }, grupo.grupo), ...grupo.itens.map((item) => itemDoMenu(item, ativo))])),
    h("div", { class: "sidebar__foot" }, h("div", { class: "health", id: "sideHealth", "aria-live": "polite" }), itemDoMenu(ITEM_CONFIGURACOES, ativo)),
  );

  // Itens "em breve": mesmo aviso em todas as telas.
  sidebar.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-soon]");
    if (!botao) return;
    document.dispatchEvent(new CustomEvent(EVENTO_FECHAR_MENU));
    toast(`A tela de ${botao.dataset.soon} ainda não está disponível.`, { tom: "info" });
  });

  iniciarSaudeDoEstoque(sidebar.querySelector("#sideHealth"));
  return sidebar;
}

/* ---------------------------------------------------------
   Indicador "Saúde do estoque": % de insumos acima do mínimo,
   calculado com os insumos reais (GET /api/insumos). O último
   resultado fica guardado na aba para o menu já nascer igual
   em todas as páginas.
--------------------------------------------------------- */

const acimaDoMinimo = (insumo) => insumo.estoqueMinimo <= 0 || insumo.quantidadeEstoque / insumo.estoqueMinimo > 1;

function desenharSaude(el, saude) {
  if (!saude) {
    el.replaceChildren(h("div", { class: "health__head" }, icon("heart", 16), h("span", null, "Saúde do estoque")), h("small", null, "Calculando…"));
    return;
  }
  if (saude.indisponivel) {
    el.replaceChildren(h("div", { class: "health__head" }, icon("heart", 16), h("span", null, "Saúde do estoque")), h("small", null, "Indisponível agora"));
    return;
  }
  const razao = saude.total ? saude.emDia / saude.total : 1;
  el.replaceChildren(
    h("div", { class: "health__head" }, icon("heart", 16), h("span", null, "Saúde do estoque"), h("strong", null, `${Math.round(razao * 100)}%`)),
    medidor({ razao, tom: razao >= 0.85 ? "ok" : razao >= 0.65 ? "baixo" : "critico" }),
    h("small", null, `${saude.emDia} de ${saude.total} insumos acima do mínimo`),
  );
}

function lerSaudeGuardada() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CHAVE_SAUDE) ?? "null");
  } catch {
    return null;
  }
}

function guardarSaude(saude) {
  try {
    window.sessionStorage.setItem(CHAVE_SAUDE, JSON.stringify(saude));
  } catch {
    // sem sessionStorage: o indicador só é recalculado a cada página
  }
}

function iniciarSaudeDoEstoque(el) {
  const guardada = lerSaudeGuardada();
  desenharSaude(el, guardada);
  if (!getSession()) return;

  listarInsumos()
    .then((insumos) => {
      const saude = { emDia: insumos.filter(acimaDoMinimo).length, total: insumos.length };
      guardarSaude(saude);
      desenharSaude(el, saude);
    })
    .catch(() => {
      // sem resposta da API: mantém o último valor conhecido (ou avisa que não há)
      if (!guardada) desenharSaude(el, { indisponivel: true });
    });
}
