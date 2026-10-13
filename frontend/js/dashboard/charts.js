// Gráficos em SVG/HTML puro (sem biblioteca). Seguem as mesmas regras em todos:
// marcas finas, grade em hairline sólida, 2px de respiro entre elementos,
// rótulos diretos só nos pontos que importam e tooltip em hover/foco.

import { h, s } from "./dom.js";
import { reduzMovimento, tipHide, tipLinha, tipShow } from "./ui.js";

/* ---------- escala e curva ---------- */

function escalaBonita(min, max, alvo = 4) {
  const span = max - min || Math.abs(max) || 1;
  const bruto = span / alvo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const norm = bruto / mag;
  const passo = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / passo + 1e-9) * passo;
  const hi = Math.ceil(max / passo - 1e-9) * passo;
  const ticks = [];
  for (let v = lo; v <= hi + passo / 2; v += passo) ticks.push(Number(v.toFixed(10)));
  return { min: lo, max: hi, ticks };
}

// Interpolação monotônica (Fritsch–Carlson): suaviza sem criar picos que não existem nos dados.
function curva(pts) {
  const n = pts.length;
  if (n < 2) return "";
  const f = (v) => v.toFixed(1);
  if (n === 2) return `M${f(pts[0][0])},${f(pts[0][1])}L${f(pts[1][0])},${f(pts[1][1])}`;

  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const sq = a * a + b * b;
    if (sq > 9) {
      const k = 3 / Math.sqrt(sq);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }

  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const x1 = pts[i][0] + dx[i] / 3;
    const y1 = pts[i][1] + (t[i] * dx[i]) / 3;
    const x2 = pts[i + 1][0] - dx[i] / 3;
    const y2 = pts[i + 1][1] - (t[i + 1] * dx[i]) / 3;
    d += `C${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}

/* ---------- gráfico de linhas ---------- */

/**
 * config: {
 *   series: [{ id, name, color, values }]   cor = valor CSS ("var(--series-1)")
 *   labels: [{ short, long }]               um por ponto
 *   formatValue(v), formatTick(v), formatEnd?(v)
 *   height?, area?, zeroBase?, legend?, legendTotals?: { [id]: string }, ariaLabel
 * }
 */
export function lineChart(root, config) {
  let cfg = config;
  const ocultas = new Set();
  let ativo = null;
  let geo = null;

  const legendaEl = h("div", { class: "lc__legend" });
  const plotEl = h("div", { class: "lc__plot", tabindex: "0", role: "group" });
  const liveEl = h("div", { class: "sr-only", "aria-live": "polite" });
  root.classList.add("lc");
  root.replaceChildren(legendaEl, plotEl, liveEl);

  /* legenda: sempre presente com 2+ séries; clicar isola/oculta (a cor segue a entidade) */
  function desenharLegenda() {
    legendaEl.replaceChildren();
    legendaEl.hidden = cfg.series.length < 2 || cfg.legend === false;
    for (const sr of cfg.series) {
      const visivel = !ocultas.has(sr.id);
      legendaEl.append(
        h(
          "button",
          {
            type: "button",
            class: `lc__legend-item${visivel ? "" : " is-off"}`,
            "aria-pressed": String(visivel),
            "data-id": sr.id,
            title: visivel ? `Ocultar ${sr.name}` : `Mostrar ${sr.name}`,
            onclick: () => {
              if (visivel && cfg.series.length - ocultas.size <= 1) return; // mantém ao menos uma série
              if (visivel) ocultas.add(sr.id);
              else ocultas.delete(sr.id);
              redesenhar({ animar: true });
              legendaEl.querySelector(`[data-id="${sr.id}"]`)?.focus(); // a legenda é refeita: devolve o foco
            },
          },
          h("span", { class: "line-key", style: { "--c": sr.color } }),
          h("span", { class: "lc__legend-name" }, sr.name),
          cfg.legendTotals?.[sr.id] ? h("strong", { class: "lc__legend-total" }, cfg.legendTotals[sr.id]) : null,
        ),
      );
    }
  }

  function desenhar({ animar }) {
    const largura = Math.max(280, Math.floor(plotEl.clientWidth || root.clientWidth || 600));
    const altura = cfg.height ?? 272;

    const visiveis = cfg.series.filter((sr) => !ocultas.has(sr.id));
    const n = cfg.labels.length;
    const formatarFim = cfg.formatEnd ?? cfg.formatValue;

    // o rótulo do último valor fica à direita do ponto final: reserva a largura dele na margem
    const maiorRotulo = Math.max(...visiveis.map((sr) => formatarFim(sr.values[n - 1]).length));
    const m = { top: 16, right: Math.max(18, maiorRotulo * 7 + 22), bottom: 28, left: 50 };
    const w = largura - m.left - m.right;
    const hh = altura - m.top - m.bottom;
    const todos = visiveis.flatMap((sr) => sr.values);
    const maxV = Math.max(...todos, 1);
    const minV = cfg.zeroBase === false ? Math.min(...todos) : 0;
    const folga = cfg.zeroBase === false ? (maxV - minV) * 0.12 || 1 : 0;
    const escala = escalaBonita(cfg.zeroBase === false ? minV - folga : 0, maxV + folga, 4);

    const x = (i) => m.left + (n === 1 ? w / 2 : (i * w) / (n - 1));
    const y = (v) => m.top + hh - ((v - escala.min) / (escala.max - escala.min)) * hh;
    geo = { m, w, hh, n, x, y, largura, altura, visiveis };

    const grade = s("g", { class: "lc__grid" });
    for (const tick of escala.ticks) {
      grade.append(
        s("line", { x1: m.left, x2: m.left + w, y1: y(tick), y2: y(tick), class: tick === escala.min ? "lc__axis" : "lc__gridline" }),
        s("text", { x: m.left - 10, y: y(tick), class: "lc__ytick", "text-anchor": "end", "dominant-baseline": "middle" }, cfg.formatTick(tick)),
      );
    }

    const eixoX = s("g", { class: "lc__xaxis" });
    const maxRotulos = Math.max(2, Math.floor(w / 74));
    const passo = Math.ceil(n / maxRotulos);
    for (let i = n - 1; i >= 0; i -= passo) {
      eixoX.append(s("text", { x: x(i), y: altura - 8, class: "lc__xtick", "text-anchor": i === n - 1 && n > 2 ? "end" : "middle" }, cfg.labels[i].short));
    }

    const marcas = s("g", { class: "lc__marks" });
    const linhas = [];
    const pontasFinais = [];

    for (const sr of visiveis) {
      const pts = sr.values.map((v, i) => [x(i), y(v)]);
      const d = curva(pts);
      const estilo = { "--c": sr.color };

      if (cfg.area) {
        marcas.append(s("path", { d: `${d}L${x(n - 1)},${y(escala.min)}L${x(0)},${y(escala.min)}Z`, class: "lc__area", style: estilo }));
      }
      const linha = s("path", { d, class: "lc__line", style: estilo });
      linhas.push(linha);
      marcas.append(linha);
      pontasFinais.push({ sr, px: pts[n - 1][0], py: pts[n - 1][1] });
    }

    // ponto final com anel de 2px na cor da superfície + rótulo direto (só no final, nunca em todos os pontos)
    const ordenadas = [...pontasFinais].sort((a, b) => a.py - b.py);
    const ys = ordenadas.map((p) => p.py);
    for (let i = 1; i < ys.length; i++) {
      const folga = 15 - (ys[i] - ys[i - 1]); // valores muito próximos: afasta só o necessário pra não sobrepor
      if (folga > 0) {
        ys[i - 1] -= folga / 2;
        ys[i] += folga / 2;
      }
    }
    ordenadas.forEach((p, idx) => {
      marcas.append(
        s("circle", { cx: p.px, cy: p.py, r: 4.5, class: "lc__dot", style: { "--c": p.sr.color } }),
        s(
          "text",
          { x: p.px + 11, y: ys[idx], class: "lc__endlabel", "text-anchor": "start", "dominant-baseline": "central" },
          formatarFim(p.sr.values[n - 1]),
        ),
      );
    });

    const cursor = s("g", { class: "lc__cursor" });
    cursor.append(s("line", { class: "lc__cursor-line", y1: m.top, y2: m.top + hh }));
    for (const sr of visiveis) {
      cursor.append(s("circle", { r: 5, class: "lc__dot lc__dot--cursor", "data-id": sr.id, style: { "--c": sr.color } }));
    }

    const hit = s("rect", { x: m.left - 6, y: m.top, width: w + 12, height: hh + 6, class: "lc__hit" });

    const svg = s(
      "svg",
      { width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, class: "lc__svg", role: "img", "aria-label": cfg.ariaLabel ?? "Gráfico de linhas" },
      grade,
      eixoX,
      marcas,
      cursor,
      hit,
    );

    plotEl.setAttribute("aria-label", `${cfg.ariaLabel ?? "Gráfico"}. Use as setas para explorar os pontos.`);
    plotEl.replaceChildren(svg);
    geo.svg = svg;
    geo.cursor = cursor;

    hit.addEventListener("pointermove", (event) => {
      const rect = svg.getBoundingClientRect();
      const px = event.clientX - rect.left;
      definirAtivo(Math.round(((px - m.left) / w) * (n - 1)), { evento: event });
    });
    hit.addEventListener("pointerleave", () => limparAtivo());
    hit.addEventListener("pointerdown", (event) => {
      const rect = svg.getBoundingClientRect();
      definirAtivo(Math.round(((event.clientX - rect.left - m.left) / w) * (n - 1)), { evento: event });
    });

    ativo = ativo != null && ativo < n ? ativo : null;
    if (ativo != null) posicionarCursor(ativo);

    if (animar && !reduzMovimento()) {
      for (const linha of linhas) {
        linha.setAttribute("pathLength", "1");
        linha.animate(
          [
            { strokeDasharray: "1 1", strokeDashoffset: 1 },
            { strokeDasharray: "1 1", strokeDashoffset: 0 },
          ],
          { duration: 760, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
      marcas.querySelectorAll(".lc__area, .lc__dot, .lc__endlabel").forEach((el) =>
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 360, easing: "ease-out", fill: "backwards" }),
      );
    }
  }

  function posicionarCursor(i) {
    const { x, y, cursor, visiveis } = geo;
    cursor.classList.add("is-on");
    cursor.querySelector(".lc__cursor-line").setAttribute("x1", x(i));
    cursor.querySelector(".lc__cursor-line").setAttribute("x2", x(i));
    for (const sr of visiveis) {
      const ponto = cursor.querySelector(`[data-id="${sr.id}"]`);
      ponto?.setAttribute("cx", x(i));
      ponto?.setAttribute("cy", y(sr.values[i]));
    }
  }

  function conteudoTip(i) {
    const linhas = geo.visiveis.map((sr) => tipLinha({ cor: sr.color, valor: cfg.formatValue(sr.values[i]), nome: sr.name }));
    return [h("div", { class: "tip__head" }, cfg.labels[i].long), ...linhas];
  }

  function definirAtivo(i, { evento, teclado } = {}) {
    if (!geo) return;
    const idx = Math.max(0, Math.min(geo.n - 1, i));
    ativo = idx;
    posicionarCursor(idx);

    let cx;
    let cy;
    if (evento && !teclado) {
      cx = evento.clientX;
      cy = evento.clientY;
    } else {
      const rect = geo.svg.getBoundingClientRect();
      cx = rect.left + geo.x(idx);
      const topo = Math.min(...geo.visiveis.map((sr) => geo.y(sr.values[idx])));
      cy = rect.top + topo;
    }
    tipShow(conteudoTip(idx), cx, cy);
    liveEl.textContent = `${cfg.labels[idx].long}: ${geo.visiveis.map((sr) => `${sr.name} ${cfg.formatValue(sr.values[idx])}`).join(", ")}`;
  }

  function limparAtivo() {
    ativo = null;
    geo?.cursor?.classList.remove("is-on");
    tipHide();
  }

  plotEl.addEventListener("keydown", (event) => {
    if (!geo) return;
    const passos = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in passos) {
      event.preventDefault();
      definirAtivo((ativo ?? geo.n) + passos[event.key], { teclado: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      definirAtivo(0, { teclado: true });
    } else if (event.key === "End") {
      event.preventDefault();
      definirAtivo(geo.n - 1, { teclado: true });
    } else if (event.key === "Escape") {
      limparAtivo();
    }
  });
  plotEl.addEventListener("blur", limparAtivo);

  function redesenhar({ animar = false } = {}) {
    desenharLegenda();
    desenhar({ animar });
  }

  let ultimaLargura = 0;
  const observador = new ResizeObserver(() => {
    const larg = Math.floor(plotEl.clientWidth);
    if (larg && Math.abs(larg - ultimaLargura) > 1) {
      ultimaLargura = larg;
      requestAnimationFrame(() => desenhar({ animar: false }));
    }
  });
  observador.observe(plotEl);

  redesenhar({ animar: true });

  return {
    update(parcial, { animar = true } = {}) {
      cfg = { ...cfg, ...parcial };
      redesenhar({ animar });
    },
    destroy() {
      observador.disconnect();
      tipHide();
    },
  };
}

/* ---------- barras horizontais ---------- */

/**
 * items: [{ id, label, value, share }]  ·  onSelect(id | null)
 * Barras nominais (sem ordem natural) usam todas a mesma cor: o comprimento já diz o valor.
 */
export function barChart(root, { items, formatValue, selecionado = null, onSelect, ariaLabel }) {
  const max = Math.max(...items.map((it) => it.value), 1);
  const lista = h("ul", { class: "bars", "aria-label": ariaLabel });

  items.forEach((item, idx) => {
    const largura = (item.value / max) * 100;
    const marcado = selecionado === item.id;
    const botao = h(
      "button",
      {
        type: "button",
        class: `bar${marcado ? " is-selected" : ""}${selecionado && !marcado ? " is-dim" : ""}`,
        "aria-pressed": String(marcado),
        "aria-label": `${item.label}: ${formatValue(item.value)}, ${item.share.toFixed(0)}% do total. Clique para filtrar os insumos.`,
        style: { "--w": `${largura.toFixed(2)}%`, "--i": idx },
        onclick: () => onSelect?.(marcado ? null : item.id),
      },
      h("span", { class: "bar__label" }, item.label),
      h(
        "span",
        { class: "bar__plot" },
        h("span", { class: "bar__fill" }),
        h("span", { class: "bar__value" }, formatValue(item.value)),
      ),
    );

    const mostrar = (x, y) =>
      tipShow(
        [
          h("div", { class: "tip__head" }, item.label),
          tipLinha({ cor: "var(--series-1)", valor: formatValue(item.value), nome: `${item.share.toFixed(1).replace(".", ",")}% do total` }),
        ],
        x,
        y,
      );
    botao.addEventListener("pointermove", (e) => mostrar(e.clientX, e.clientY));
    botao.addEventListener("pointerleave", tipHide);
    botao.addEventListener("focus", () => {
      const r = botao.getBoundingClientRect();
      mostrar(r.left + r.width * 0.4, r.top);
    });
    botao.addEventListener("blur", tipHide);

    lista.append(h("li", null, botao));
  });

  root.replaceChildren(lista);
}

/* ---------- sparkline ---------- */

// Histórico em tom recessivo; o trecho mais recente e o ponto final na cor de destaque.
export function sparkline(valores) {
  const W = 100;
  const H = 32;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;
  const pts = valores.map((v, i) => [(i * W) / (valores.length - 1), H - 3 - ((v - min) / span) * (H - 6)]);
  const recentes = pts.slice(-3);
  const ultimo = pts[pts.length - 1];

  return h(
    "div",
    { class: "spark", "aria-hidden": "true" },
    h(
      "div",
      { class: "spark__plot" },
      s(
        "svg",
        { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "spark__svg" },
        s("path", { d: curva(pts), class: "spark__line" }),
        s("path", { d: curva(recentes), class: "spark__line spark__line--now" }),
      ),
      h("span", { class: "spark__dot", style: { left: "100%", top: `${(ultimo[1] / H) * 100}%` } }),
    ),
  );
}

/* ---------- medidor (razão contra um limite) ---------- */

// tom: ok | baixo | critico — o preenchimento carrega a severidade; a trilha é um tom mais claro do mesmo.
export function medidor({ razao, tom, marca }) {
  return h(
    "div",
    { class: `meter meter--${tom}`, role: "presentation" },
    h("span", { class: "meter__fill", style: { "--w": `${Math.max(2, Math.min(1, razao) * 100).toFixed(1)}%` } }),
    marca != null ? h("span", { class: "meter__tick", style: { left: `${(marca * 100).toFixed(1)}%` } }) : null,
  );
}
