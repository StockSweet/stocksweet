// Linha de indicadores: um número de destaque (valor em estoque) e três cards
// de apoio. Os números contam até o valor novo quando algo muda.

import { h, icon } from "../dom.js";
import { sparkline } from "../charts.js";
import { delta, piscar, rolarAte } from "../components.js";
import { kpis as calcular } from "../analytics.js";
import { int, num, pct, signed } from "../format.js";
import { reduzMovimento } from "../ui.js";

function contar(el, de, para, formatar) {
  if (reduzMovimento() || de === para || !Number.isFinite(de)) {
    el.textContent = formatar(para);
    return;
  }
  const inicio = performance.now();
  const duracao = 700;
  const passo = (agora) => {
    const t = Math.min(1, (agora - inicio) / duracao);
    const suave = 1 - (1 - t) ** 3;
    el.textContent = formatar(de + (para - de) * suave);
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

export function montar(ctx) {
  const host = document.getElementById("kpis");
  const cartoes = new Map();
  const ultimo = new Map();

  // cada definição diz como o valor é escrito e se a variação é boa ou ruim
  function definicoes(k, periodo, db) {
    const lista = [
      {
        id: "valor",
        hero: true,
        rotulo: "Valor em estoque",
        icone: "coins",
        prefixo: "R$",
        bruto: k.valor.agora,
        formatar: (v) => int(Math.round(v)),
        delta: delta({ valor: k.valor.delta, texto: `${signed(k.valor.delta, (x) => pct(x, 1))}` }),
        vs: `vs. ${periodo.atras}`,
        rodape: `${db.insumos.length} insumos em ${db.categorias.length} categorias`,
        spark: k.valor.spark,
      },
      {
        id: "alertas",
        rotulo: "Insumos em alerta",
        icone: "alert",
        bruto: k.alertas.agora,
        formatar: (v) => int(Math.round(v)),
        sufixo: `de ${k.alertas.total}`,
        delta: delta({ valor: k.alertas.delta, texto: signed(k.alertas.delta, int), bom: "queda" }),
        vs: `vs. ${periodo.atras}`,
        spark: k.alertas.spark,
        link: "alertasCard",
      },
    ];

    if (ctx.ehGestor) {
      lista.push({
        id: "margem",
        rotulo: "Margem média",
        icone: "percent",
        bruto: k.margem.agora,
        formatar: (v) => num(v, 1),
        sufixo: "%",
        delta: delta({ valor: k.margem.delta, texto: `${signed(k.margem.delta, (x) => num(x, 1))} p.p.`, bom: "alta" }),
        vs: `vs. ${periodo.atras}`,
        spark: k.margem.spark,
      });
    } else {
      lista.push({
        id: "movimentos",
        rotulo: "Movimentações",
        icone: "activity",
        bruto: k.movimentos.agora,
        formatar: (v) => int(Math.round(v)),
        delta: delta({ valor: k.movimentos.delta, texto: signed(k.movimentos.delta, (x) => pct(x, 1)) }),
        vs: `vs. ${periodo.anterior}`,
        spark: k.movimentos.spark,
      });
    }

    lista.push({
      id: "perdas",
      rotulo: "Perdas e vencimentos",
      icone: "trash",
      prefixo: "R$",
      bruto: k.perdas.agora,
      formatar: (v) => int(Math.round(v)),
      delta: delta({ valor: k.perdas.delta, texto: signed(k.perdas.delta, (x) => pct(x, 1)), bom: "queda" }),
      vs: `vs. ${periodo.anterior}`,
      spark: k.perdas.spark,
    });

    return lista;
  }

  function criarCartao(def) {
    const refs = {
      num: h("span", { class: "kpi__num" }),
      delta: h("span", { class: "kpi__delta" }),
      vs: h("span", { class: "kpi__vs" }),
      spark: h("div", { class: "kpi__spark" }),
      rodape: def.rodape !== undefined ? h("p", { class: "kpi__foot" }) : null,
    };

    const el = h(
      "article",
      {
        class: `kpi${def.hero ? " kpi--hero" : ""}${def.link ? " kpi--link" : ""}`,
        ...(def.link ? { tabindex: "0", role: "link", "aria-label": `${def.rotulo}: ir para a lista de alertas` } : {}),
      },
      h("header", { class: "kpi__head" }, h("span", { class: "kpi__icon" }, icon(def.icone, 18)), h("span", { class: "kpi__label" }, def.rotulo)),
      h(
        "div",
        { class: "kpi__value" },
        def.prefixo ? h("span", { class: "kpi__prefix" }, def.prefixo) : null,
        refs.num,
        def.sufixo !== undefined ? h("span", { class: "kpi__suffix", "data-sufixo": "" }) : null,
      ),
      h("div", { class: "kpi__meta" }, refs.delta, refs.vs),
      refs.spark,
      refs.rodape,
    );

    if (def.link) {
      const ir = () => {
        const alvo = document.getElementById(def.link);
        rolarAte(alvo);
        piscar(alvo);
      };
      el.addEventListener("click", ir);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ir();
        }
      });
    }
    return { el, refs };
  }

  function render() {
    const k = calcular(ctx.db, ctx.state.periodo);
    const defs = definicoes(k, ctx.state.periodo, ctx.db);

    // monta (ou reaproveita) os cartões na ordem certa; trocar de perfil troca o 3º cartão
    const ordem = defs.map((def) => {
      if (!cartoes.has(def.id)) cartoes.set(def.id, criarCartao(def));
      return cartoes.get(def.id);
    });
    if (host.children.length !== ordem.length || ordem.some((c, i) => host.children[i] !== c.el)) {
      host.replaceChildren(...ordem.map((c) => c.el));
    }

    defs.forEach((def) => {
      const { refs, el } = cartoes.get(def.id);
      contar(refs.num, ultimo.get(def.id), def.bruto, def.formatar);
      ultimo.set(def.id, def.bruto);

      const sufixo = el.querySelector("[data-sufixo]");
      if (sufixo) sufixo.textContent = def.sufixo;

      refs.delta.replaceChildren(def.delta);
      refs.vs.textContent = def.vs;
      refs.spark.replaceChildren(sparkline(def.spark));
      if (refs.rodape) refs.rodape.textContent = def.rodape;
    });
  }

  return { render };
}
