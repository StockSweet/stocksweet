// Modal "Registrar movimentação" e gaveta com os detalhes de um insumo.

import { h, icon } from "./dom.js";
import { lineChart, medidor } from "./charts.js";
import { badgeStatus } from "./components.js";
import { categoriaPorId, insumoPorId, reposicaoSugerida, statusDe, valorInsumo, variacaoPreco } from "./analytics.js";
import { brl, dMonth, dShort, num, qtd, signed } from "./format.js";
import { criarOverlay } from "./ui.js";
import { itemMovimento } from "./widgets/feed.js";

// "2,5" e "2.5" valem; vazio ou texto inválido vira NaN
function lerQuantidade(texto) {
  const limpo = String(texto).trim().replace(/\s/g, "").replace(",", ".");
  return /^\d*\.?\d+$/.test(limpo) ? Number(limpo) : NaN;
}

export function montar(ctx) {
  /* =============== modal =============== */

  const modalEl = document.getElementById("movModal");
  const form = document.getElementById("movForm");
  const tipoEl = document.getElementById("movTipo");
  const insumoSel = document.getElementById("movInsumo");
  const qtdEl = document.getElementById("movQtd");
  const unEl = document.getElementById("movUn");
  const erroEl = document.getElementById("movQtdErro");
  const previewEl = document.getElementById("movPreview");
  const obsEl = document.getElementById("movObs");
  const modal = criarOverlay(modalEl);

  let tipo = "entrada";

  function definirTipo(novo) {
    tipo = novo;
    tipoEl.dataset.tipo = novo;
    tipoEl.querySelectorAll("[data-tipo]").forEach((b) => {
      const ativo = b.dataset.tipo === novo;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-checked", String(ativo));
    });
    atualizarPreview();
  }

  function preencherInsumos() {
    insumoSel.replaceChildren(
      ...ctx.db.categorias.map((cat) =>
        h(
          "optgroup",
          { label: cat.nome },
          ...ctx.db.insumos.filter((i) => i.cat === cat.id).map((i) => h("option", { value: i.id }, `${i.nome} — ${qtd(i.estoque, i.un)} em estoque`)),
        ),
      ),
    );
  }

  function insumoAtual() {
    return insumoPorId(ctx.db, insumoSel.value);
  }

  function atualizarPreview() {
    const insumo = insumoAtual();
    if (!insumo) return;
    unEl.textContent = insumo.un;

    const q = lerQuantidade(qtdEl.value);
    const valida = Number.isFinite(q) && q > 0;
    const novo = valida ? Math.round((insumo.estoque + (tipo === "entrada" ? q : -q)) * 1000) / 1000 : insumo.estoque;

    const simulado = { ...insumo, estoque: Math.max(0, novo) };
    previewEl.replaceChildren(
      h(
        "div",
        { class: "preview__line" },
        h("span", null, "Estoque"),
        h("strong", null, qtd(insumo.estoque, insumo.un)),
        icon("chevron-right", 14),
        h("strong", { class: valida && novo < 0 ? "is-neg" : "" }, valida ? qtd(Math.max(0, novo), insumo.un) : "—"),
        valida ? badgeStatus(statusDe(simulado)) : null,
      ),
      h("div", { class: "preview__line preview__line--muted" }, h("span", null, "Valor da movimentação"), h("strong", null, valida ? brl(q * insumo.preco) : "—")),
    );
  }

  function validar() {
    const insumo = insumoAtual();
    const q = lerQuantidade(qtdEl.value);
    let mensagem = "";

    if (!Number.isFinite(q) || q <= 0) mensagem = "Informe uma quantidade maior que zero.";
    else if (tipo === "saida" && q > insumo.estoque + 1e-9) mensagem = `Estoque insuficiente: há apenas ${qtd(insumo.estoque, insumo.un)}.`;

    erroEl.textContent = mensagem;
    qtdEl.closest(".fld").classList.toggle("is-invalid", Boolean(mensagem));
    return mensagem ? null : q;
  }

  function abrirMovimento({ tipo: tipoInicial = "entrada", insumoId, qtd: qtdInicial } = {}) {
    if (drawer.aberto) drawer.fechar();
    preencherInsumos();
    if (insumoId) insumoSel.value = insumoId;
    qtdEl.value = qtdInicial ? num(qtdInicial, 2) : "";
    obsEl.value = "";
    erroEl.textContent = "";
    qtdEl.closest(".fld").classList.remove("is-invalid");
    definirTipo(tipoInicial);
    modal.abrir();
    if (qtdInicial) {
      qtdEl.focus();
      qtdEl.select();
    }
  }

  tipoEl.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-tipo]");
    if (botao) {
      definirTipo(botao.dataset.tipo);
      if (qtdEl.value) validar();
    }
  });
  insumoSel.addEventListener("change", () => {
    atualizarPreview();
    if (qtdEl.value) validar();
  });
  qtdEl.addEventListener("input", () => {
    atualizarPreview();
    if (erroEl.textContent) validar();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = validar();
    if (q == null) {
      qtdEl.focus();
      return;
    }
    const resultado = ctx.registrarMovimento({ tipo, insumoId: insumoSel.value, qtd: q, obs: obsEl.value.trim() });
    modal.fechar();
    ctx.avisarMovimento(resultado);
  });

  /* =============== gaveta =============== */

  const drawerEl = document.getElementById("drawer");
  const conteudoEl = document.getElementById("drawerConteudo");
  const drawer = criarOverlay(drawerEl, {
    onClose: () => {
      graficoPreco?.destroy();
      graficoPreco = null;
    },
  });
  let graficoPreco = null;

  function fato(rotulo, valor, extra) {
    return h("div", { class: "facts__item" }, h("dt", null, rotulo), h("dd", null, valor, extra ?? null));
  }

  function abrirInsumo(id) {
    const insumo = insumoPorId(ctx.db, id);
    if (!insumo) return;
    const status = statusDe(insumo);
    const variacao = variacaoPreco(insumo);
    const movimentos = ctx.db.movimentos.filter((m) => m.insumoId === id).slice(0, 4);
    const precoEl = h("div", { class: "drawer__chart" });

    graficoPreco?.destroy();
    conteudoEl.replaceChildren(
      h(
        "header",
        { class: "drawer__head" },
        h("div", null, h("p", { class: "eyebrow" }, `${categoriaPorId(ctx.db, insumo.cat).nome}`), h("h2", { id: "drawerTitulo" }, insumo.nome)),
        h("button", { type: "button", class: "icon-btn", "data-close": "", "data-autofocus": "", "aria-label": "Fechar detalhes" }, icon("x")),
      ),
      h(
        "div",
        { class: "drawer__body" },
        h(
          "section",
          { class: "drawer__stock" },
          h("div", { class: "drawer__qty" }, h("span", { class: "drawer__big" }, num(insumo.estoque, 2)), h("span", { class: "drawer__un" }, `${insumo.un} em estoque`), badgeStatus(status)),
          medidor({ razao: insumo.estoque / (insumo.minimo * 2), tom: status, marca: 0.5 }),
          h(
            "p",
            { class: "drawer__hint" },
            `Mínimo: ${qtd(insumo.minimo, insumo.un)}`,
            status !== "ok" ? ` · reposição sugerida: ${qtd(reposicaoSugerida(insumo), insumo.un)}` : "",
          ),
        ),
        h(
          "dl",
          { class: "facts" },
          fato("Preço de compra", `${brl(insumo.preco)}/${insumo.un}`),
          fato("Variação em 30 dias", signed(variacao, (x) => `${num(x, 1)}%`)),
          fato("Valor em estoque", brl(valorInsumo(insumo))),
          fato("Fornecedor", insumo.fornecedor.nome, h("small", null, `entrega em ${insumo.fornecedor.prazo}`)),
        ),
        h("section", { class: "drawer__section" }, h("h3", null, "Preço de compra nos últimos 12 meses"), precoEl),
        h(
          "section",
          { class: "drawer__section" },
          h("h3", null, "Movimentações recentes"),
          movimentos.length
            ? h("ul", { class: "feed feed--compact" }, ...movimentos.map((m) => itemMovimento(ctx, m, { compacto: true })))
            : h("p", { class: "muted" }, "Nenhuma movimentação nas últimas semanas."),
        ),
      ),
      h(
        "footer",
        { class: "drawer__foot" },
        h("button", { type: "button", class: "btn btn--ghost", onclick: () => abrirMovimento({ tipo: "saida", insumoId: id }) }, icon("arrow-out", 16), "Registrar saída"),
        h("button", { type: "button", class: "btn btn--primary", onclick: () => abrirMovimento({ tipo: "entrada", insumoId: id, qtd: status !== "ok" ? reposicaoSugerida(insumo) : undefined }) }, icon("arrow-in", 16), "Registrar entrada"),
      ),
    );

    drawer.abrir();

    graficoPreco = lineChart(precoEl, {
      series: [{ id: "preco", name: "Preço de compra", color: "var(--series-1)", values: insumo.historico }],
      labels: insumo.mensal.map((d) => ({ short: dMonth(d), long: `Preço em ${dShort(d)}` })),
      formatValue: brl,
      formatTick: (v) => brl(v),
      formatEnd: brl,
      area: true,
      zeroBase: false,
      height: 200,
      ariaLabel: `Histórico do preço de compra de ${insumo.nome}`,
    });
  }

  return { abrirMovimento, abrirInsumo };
}
