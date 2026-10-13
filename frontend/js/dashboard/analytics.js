// Cálculos sobre os dados do painel. Funções puras: recebem o db e devolvem
// valores prontos pros widgets (nenhuma toca no DOM).

import { DIAS_HISTORICO } from "./mock-data.js";
import { addDays, dShort, dTip } from "./format.js";

const ULTIMO = DIAS_HISTORICO - 1;

/* ---------- insumos ---------- */

export const STATUS_LABEL = { ok: "Ok", baixo: "Baixo", critico: "Crítico" };

export function statusDe(insumo) {
  const razao = insumo.estoque / insumo.minimo;
  if (razao <= 0.5) return "critico";
  if (razao <= 1) return "baixo";
  return "ok";
}

export const insumoPorId = (db, id) => db.insumos.find((i) => i.id === id);
export const categoriaPorId = (db, id) => db.categorias.find((c) => c.id === id);
export const valorInsumo = (insumo) => insumo.estoque * insumo.preco;
export const valorEstoque = (db) => db.insumos.reduce((total, i) => total + valorInsumo(i), 0);

export function alertasDe(db) {
  return db.insumos
    .filter((i) => statusDe(i) !== "ok")
    .sort((a, b) => a.estoque / a.minimo - b.estoque / b.minimo);
}

export function saudeEstoque(db) {
  const emDia = db.insumos.filter((i) => statusDe(i) === "ok").length;
  return { emDia, total: db.insumos.length, ratio: emDia / db.insumos.length };
}

// variação do preço no último mês, em %
export function variacaoPreco(insumo) {
  const h = insumo.historico;
  return ((h[h.length - 1] - h[h.length - 2]) / h[h.length - 2]) * 100;
}

// quanto repor pra voltar a 2x o mínimo, arredondado ao passo da unidade
export function reposicaoSugerida(insumo) {
  const passo = ["un", "pct", "rolo", "dz"].includes(insumo.un) ? 1 : 0.5;
  const falta = Math.max(passo, insumo.minimo * 2 - insumo.estoque);
  return Math.ceil(falta / passo) * passo;
}

/* ---------- receitas e precificação ---------- */

export function custoReceita(db, receita) {
  return receita.itens.reduce((total, item) => total + item.quantidade * insumoPorId(db, item.insumoId).preco, 0);
}

export function margemReceita(db, receita) {
  return ((receita.preco - custoReceita(db, receita)) / receita.preco) * 100;
}

export function margemMedia(db) {
  return db.receitas.reduce((total, r) => total + margemReceita(db, r), 0) / db.receitas.length;
}

// preço de venda que entrega a margem pedida, arredondado pra cima em R$ 0,10
export function precoSugerido(db, receita, meta) {
  return Math.ceil((custoReceita(db, receita) / (1 - meta / 100)) * 10 - 1e-9) / 10;
}

/* ---------- séries por período ---------- */

function soma(arr, de, ate) {
  let total = 0;
  for (let i = de; i <= ate; i++) total += arr[i];
  return total;
}

// Quebra a janela do período em buckets (dia, semana ou 30 dias), terminando hoje.
export function seriesDoPeriodo(db, periodo) {
  const n = periodo.dias / periodo.bucket;
  const labels = [];
  const entradas = [];
  const saidas = [];

  for (let b = 0; b < n; b++) {
    const fim = ULTIMO - (n - 1 - b) * periodo.bucket;
    const inicio = fim - periodo.bucket + 1;
    const dataFim = addDays(db.hoje, fim - ULTIMO);
    const dataInicio = addDays(db.hoje, inicio - ULTIMO);

    entradas.push(soma(db.series.entradas, inicio, fim));
    saidas.push(soma(db.series.saidas, inicio, fim));
    labels.push({
      short: dShort(dataFim),
      long: periodo.bucket === 1 ? dTip(dataFim) : `${dShort(dataInicio)} – ${dShort(dataFim)}`,
    });
  }
  return { labels, entradas, saidas };
}

export function intervaloDoPeriodo(db, periodo) {
  // períodos longos atravessam o ano: mostra o ano pra não ficar ambíguo
  const comAno = periodo.dias > 180;
  return `${dShort(addDays(db.hoje, 1 - periodo.dias), comAno)} – ${dShort(db.hoje, comAno)}`;
}

// n pontos de uma janela de `dias` (deslocada `desloc` janelas pra trás), somando cada grupo
function amostraSoma(arr, dias, desloc, n) {
  const fimJanela = ULTIMO - desloc * dias;
  const inicioJanela = fimJanela - dias + 1;
  const pontos = [];
  for (let k = 0; k < n; k++) {
    const de = inicioJanela + Math.round((k * dias) / n);
    const ate = inicioJanela + Math.round(((k + 1) * dias) / n) - 1;
    pontos.push(soma(arr, de, Math.max(de, ate)));
  }
  return pontos;
}

// n pontos igualmente espaçados de uma série de valores pontuais, terminando hoje
function amostraValor(leitor, dias, n) {
  const pontos = [];
  for (let k = 0; k < n; k++) {
    const idx = ULTIMO - Math.round(((n - 1 - k) * (dias - 1)) / (n - 1));
    pontos.push(leitor(idx));
  }
  return pontos;
}

export function iniciarBase(db) {
  db.base = {
    valor: valorEstoque(db),
    margem: margemMedia(db),
    alertas: alertasDe(db).length,
  };
}

const operacoesNoDia = (db, i) => Math.round(db.series.saidas[i] / 58) + (db.series.entradas[i] > 0 ? 1 : 0);

export function kpis(db, periodo) {
  const { dias } = periodo;
  const n = Math.min(12, dias);
  const idxAntes = ULTIMO - (dias - 1);

  const valorAgora = valorEstoque(db);
  const valorEm = (i) => (i === ULTIMO ? valorAgora : db.base.valor + db.series.estoqueDelta[i]);
  const valorAntes = valorEm(idxAntes);

  const margemAgora = margemMedia(db);
  const margemEm = (i) => (i === ULTIMO ? margemAgora : db.base.margem + db.series.margemDelta[i]);

  const alertasAgora = alertasDe(db).length;
  const alertasEm = (i) => (i === ULTIMO ? alertasAgora : Math.max(0, db.base.alertas + db.series.alertasDelta[i]));

  const perdasAtual = soma(db.series.perdas, ULTIMO - dias + 1, ULTIMO);
  const perdasAnterior = soma(db.series.perdas, ULTIMO - 2 * dias + 1, ULTIMO - dias);

  let opsAtual = 0;
  let opsAnterior = 0;
  for (let i = ULTIMO - dias + 1; i <= ULTIMO; i++) opsAtual += operacoesNoDia(db, i);
  for (let i = ULTIMO - 2 * dias + 1; i <= ULTIMO - dias; i++) opsAnterior += operacoesNoDia(db, i);

  const opsSerie = Array.from({ length: DIAS_HISTORICO }, (_, i) => operacoesNoDia(db, i));

  return {
    valor: {
      agora: valorAgora,
      delta: ((valorAgora - valorAntes) / valorAntes) * 100,
      spark: amostraValor(valorEm, dias, n),
    },
    alertas: {
      agora: alertasAgora,
      total: db.insumos.length,
      delta: alertasAgora - alertasEm(idxAntes),
      spark: amostraValor(alertasEm, dias, n),
    },
    margem: {
      agora: margemAgora,
      delta: margemAgora - margemEm(idxAntes),
      spark: amostraValor(margemEm, dias, n),
    },
    perdas: {
      agora: perdasAtual,
      delta: perdasAnterior ? ((perdasAtual - perdasAnterior) / perdasAnterior) * 100 : 0,
      spark: amostraSoma(db.series.perdas, dias, 0, n),
    },
    movimentos: {
      agora: opsAtual,
      delta: opsAnterior ? ((opsAtual - opsAnterior) / opsAnterior) * 100 : 0,
      spark: amostraSoma(opsSerie, dias, 0, n),
    },
  };
}

/* ---------- categorias ---------- */

export function porCategoria(db, periodo, modo) {
  let valores;

  if (modo === "estoque") {
    valores = db.categorias.map((c) =>
      db.insumos.filter((i) => i.cat === c.id).reduce((total, i) => total + valorInsumo(i), 0),
    );
  } else {
    // o consumo do período é distribuído pelo peso de cada categoria, com uma
    // oscilação determinística por período pra os rankings não ficarem idênticos
    const totalSaidas = soma(db.series.saidas, ULTIMO - periodo.dias + 1, ULTIMO);
    const pesos = db.categorias.map((c, i) => c.peso * (1 + 0.18 * Math.sin((i + 1) * 2.3 + periodo.dias * 0.17)));
    const somaPesos = pesos.reduce((a, b) => a + b, 0);
    valores = pesos.map((p) => (p / somaPesos) * totalSaidas);
  }

  const total = valores.reduce((a, b) => a + b, 0);
  return db.categorias
    .map((c, i) => ({ id: c.id, label: c.nome, value: valores[i], share: total ? (valores[i] / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

/* ---------- notificações e busca ---------- */

export function notificacoes(db) {
  const agora = Date.now();
  const itens = [];

  alertasDe(db).forEach((insumo, idx) => {
    const status = statusDe(insumo);
    itens.push({
      id: `alerta:${insumo.id}:${status}`,
      tipo: status,
      insumoId: insumo.id,
      titulo: status === "critico" ? `${insumo.nome} em nível crítico` : `${insumo.nome} abaixo do mínimo`,
      quando: new Date(agora - (idx + 1) * 38 * 60000),
    });
  });

  db.insumos
    .filter((i) => variacaoPreco(i) >= 6)
    .forEach((insumo, idx) => {
      itens.push({
        id: `preco:${insumo.id}`,
        tipo: "preco",
        insumoId: insumo.id,
        titulo: `Preço de ${insumo.nome.toLowerCase()} subiu ${variacaoPreco(insumo).toFixed(1).replace(".", ",")}%`,
        quando: new Date(agora - (idx + 2) * 5.5 * 3600000),
      });
    });

  return itens.sort((a, b) => b.quando - a.quando);
}

export const normaliza = (texto) =>
  String(texto).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function buscar(db, termo, { incluirReceitas }) {
  const q = normaliza(termo);
  if (!q) return { insumos: [], receitas: [] };

  const insumos = db.insumos
    .filter((i) => normaliza(`${i.nome} ${categoriaPorId(db, i.cat).nome} ${i.fornecedor.nome}`).includes(q))
    .slice(0, 5);
  const receitas = incluirReceitas ? db.receitas.filter((r) => normaliza(r.nome).includes(q)).slice(0, 3) : [];
  return { insumos, receitas };
}
