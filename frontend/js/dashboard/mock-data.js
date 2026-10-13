// Dados fictícios do painel. Nada aqui vem da API ainda — quando os endpoints
// existirem, createDb() é o ponto de troca. As séries usam PRNG com semente
// fixa (mesma forma a cada carga) e datas relativas a hoje (sempre "frescas").

import { addDays, startOfDay } from "./format.js";

export const DIAS_HISTORICO = 730;

export const PERIODOS = [
  { id: "7d", label: "7 dias", dias: 7, bucket: 1, porLabel: "por dia", anterior: "7 dias anteriores", atras: "7 dias atrás" },
  { id: "30d", label: "30 dias", dias: 30, bucket: 1, porLabel: "por dia", anterior: "30 dias anteriores", atras: "30 dias atrás" },
  { id: "3m", label: "3 meses", dias: 91, bucket: 7, porLabel: "por semana", anterior: "3 meses anteriores", atras: "3 meses atrás" },
  { id: "12m", label: "12 meses", dias: 360, bucket: 30, porLabel: "a cada 30 dias", anterior: "12 meses anteriores", atras: "12 meses atrás" },
];

export const CATEGORIAS = [
  { id: "farinhas", nome: "Farinhas e cereais", peso: 0.2 },
  { id: "laticinios", nome: "Laticínios e ovos", peso: 0.27 },
  { id: "chocolates", nome: "Chocolates e cacau", peso: 0.22 },
  { id: "acucares", nome: "Açúcares e adoçantes", peso: 0.09 },
  { id: "frutas", nome: "Frutas e recheios", peso: 0.11 },
  { id: "embalagens", nome: "Embalagens", peso: 0.08 },
  { id: "aromas", nome: "Aromas e corantes", peso: 0.03 },
];

const FORNECEDORES = {
  moinho: { nome: "Moinho Dourado", prazo: "2 dias" },
  vale: { nome: "Laticínios Vale Verde", prazo: "1 dia" },
  cacau: { nome: "Cacau & Cia", prazo: "3 dias" },
  doce: { nome: "Doce Atacado", prazo: "2 dias" },
  sitio: { nome: "Frutas do Sítio", prazo: "1 dia" },
  embala: { nome: "EmbalaPack", prazo: "4 dias" },
  aromas: { nome: "Casa dos Aromas", prazo: "3 dias" },
};

// [id, nome, categoria, unidade, preço, estoque, mínimo, fornecedor, volatilidade mensal do preço]
const INSUMOS_BASE = [
  ["farinha-trigo", "Farinha de trigo", "farinhas", "kg", 4.8, 102.5, 66, "moinho", 0.03],
  ["amido-milho", "Amido de milho", "farinhas", "kg", 7.9, 23, 16.5, "moinho", 0.03],
  ["aveia", "Aveia em flocos", "farinhas", "kg", 11.5, 15, 13, "moinho", 0.035],
  ["farinha-amendoas", "Farinha de amêndoas", "farinhas", "kg", 68, 5.5, 6.5, "moinho", 0.05],
  ["leite", "Leite integral", "laticinios", "L", 5.2, 59.5, 49.5, "vale", 0.04],
  ["creme-leite", "Creme de leite fresco", "laticinios", "L", 24.9, 8.5, 20, "vale", 0.06],
  ["manteiga", "Manteiga sem sal", "laticinios", "kg", 48, 18, 16.5, "vale", 0.07],
  ["ovos", "Ovos", "laticinios", "dz", 11, 30, 33, "vale", 0.08],
  ["leite-condensado", "Leite condensado", "laticinios", "un", 6.4, 96, 66, "vale", 0.03],
  ["cream-cheese", "Cream cheese", "laticinios", "kg", 39, 8.5, 6.5, "vale", 0.05],
  ["choc-meio-amargo", "Chocolate meio amargo", "chocolates", "kg", 54, 36.5, 25, "cacau", 0.08],
  ["choc-branco", "Chocolate branco", "chocolates", "kg", 58, 11.5, 13, "cacau", 0.08],
  ["cacau-po", "Cacau em pó 50%", "chocolates", "kg", 42, 10.5, 8.5, "cacau", 0.09],
  ["granulado", "Granulado de chocolate", "chocolates", "kg", 21, 15, 10, "cacau", 0.04],
  ["acucar", "Açúcar refinado", "acucares", "kg", 4.6, 132, 82.5, "doce", 0.03],
  ["acucar-confeiteiro", "Açúcar de confeiteiro", "acucares", "kg", 7.2, 8.5, 20, "doce", 0.03],
  ["mel", "Mel", "acucares", "kg", 32, 6.5, 5, "doce", 0.045],
  ["morango", "Morango congelado", "frutas", "kg", 22, 21.5, 20, "sitio", 0.07],
  ["polpa-maracuja", "Polpa de maracujá", "frutas", "kg", 26, 13, 10, "sitio", 0.06],
  ["doce-leite", "Doce de leite", "frutas", "kg", 17.5, 25, 16.5, "doce", 0.035],
  ["geleia-damasco", "Geleia de damasco", "frutas", "kg", 29, 6.5, 5, "doce", 0.035],
  ["caixa-brigadeiro", "Caixa para brigadeiros", "embalagens", "un", 3.4, 281, 248, "embala", 0.025],
  ["forminha", "Forminhas nº 4 (100 un)", "embalagens", "pct", 5.9, 99, 50, "embala", 0.02],
  ["fita-cetim", "Fita de cetim", "embalagens", "rolo", 9.5, 18, 10, "embala", 0.02],
  ["baunilha", "Essência de baunilha", "aromas", "un", 18, 15, 8, "aromas", 0.04],
  ["corante-gel", "Corante alimentício em gel", "aromas", "un", 12.5, 5, 10, "aromas", 0.03],
];

// [id, nome, unidade, preço de venda, [[insumo, quantidade por unidade]]]
const RECEITAS_BASE = [
  ["brigadeiro", "Brigadeiro gourmet", "un", 3.8, [["leite-condensado", 0.035], ["cacau-po", 0.004], ["manteiga", 0.002], ["granulado", 0.007], ["forminha", 0.01]]],
  ["brownie", "Brownie de chocolate", "un", 8.5, [["choc-meio-amargo", 0.03], ["manteiga", 0.028], ["acucar", 0.035], ["farinha-trigo", 0.02], ["ovos", 0.06], ["cacau-po", 0.008]]],
  ["cookie", "Cookie de chocolate", "un", 6.9, [["farinha-trigo", 0.035], ["manteiga", 0.025], ["acucar", 0.02], ["choc-meio-amargo", 0.03], ["ovos", 0.025]]],
  ["cupcake", "Cupcake de baunilha", "un", 8, [["farinha-trigo", 0.03], ["acucar", 0.03], ["manteiga", 0.02], ["ovos", 0.04], ["baunilha", 0.004], ["forminha", 0.01], ["cream-cheese", 0.02]]],
  ["cheesecake", "Cheesecake de morango", "fatia", 15, [["cream-cheese", 0.09], ["creme-leite", 0.04], ["acucar", 0.02], ["morango", 0.06], ["aveia", 0.015], ["manteiga", 0.015]]],
  ["macaron", "Macaron de doce de leite", "un", 5.5, [["farinha-amendoas", 0.012], ["acucar-confeiteiro", 0.015], ["ovos", 0.02], ["corante-gel", 0.002], ["doce-leite", 0.01]]],
  ["trufa", "Trufa de maracujá", "un", 4.5, [["choc-branco", 0.018], ["creme-leite", 0.01], ["polpa-maracuja", 0.008], ["granulado", 0.004], ["forminha", 0.01]]],
  ["bolo-pote", "Bolo de pote de morango", "un", 9.5, [["farinha-trigo", 0.04], ["ovos", 0.06], ["acucar", 0.03], ["leite", 0.05], ["morango", 0.05], ["cream-cheese", 0.03], ["creme-leite", 0.03]]],
];

const OPERADORES = ["Camila", "Rafael", "Beatriz", "Cozinha"];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arredonda = (v, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

function gerarInsumos(rnd, hoje) {
  return INSUMOS_BASE.map(([id, nome, cat, un, preco, estoque, minimo, forn, vol]) => {
    // histórico mensal de preço (13 pontos, o último é o preço atual): caminha de trás pra frente
    const historico = [preco];
    for (let i = 1; i < 13; i++) {
      const deriva = (rnd() - 0.46) * vol * 2;
      historico.unshift(arredonda(Math.max(preco * 0.62, historico[0] / (1 + deriva))));
    }
    historico[12] = preco;

    const mensal = historico.map((_, i) => addDays(hoje, -(12 - i) * 30));
    return { id, nome, cat, un, preco, estoque, minimo, forn, fornecedor: FORNECEDORES[forn], historico, mensal };
  });
}

function gerarFluxos(rnd, hoje) {
  const DOW = [0.42, 0.92, 1.0, 1.02, 1.08, 1.38, 1.22]; // dom..sáb: sexta e sábado puxam a produção
  const MES = [1, 1, 1.12, 1.18, 1, 1.08, 1, 1, 1, 1.14, 1.04, 1.32]; // Páscoa, festas juninas, Dia das Crianças, Natal

  const entradas = [];
  const saidas = [];
  const perdas = [];
  const sim = [];
  let nivel = 0;

  for (let i = 0; i < DIAS_HISTORICO; i++) {
    const dia = addDays(hoje, i - (DIAS_HISTORICO - 1));
    const dow = dia.getDay();

    const saida = 780 * DOW[dow] * MES[dia.getMonth()] * (0.8 + rnd() * 0.4);

    // compras de segunda a sábado repõem parte do que foi consumido; domingo, só uma reposição pequena de vez em quando
    let entrada = 0;
    if (dow !== 0) entrada = Math.max(0, -nivel + 350) * (0.4 + rnd() * 0.35);
    else if (rnd() < 0.2) entrada = 80 + rnd() * 320;

    let perda = 0;
    if (rnd() < 0.35) perda = 8 + rnd() * 34;
    if (rnd() < 0.035) perda += 70 + rnd() * 150; // lote vencido

    nivel += entrada - saida;
    entradas.push(arredonda(entrada));
    saidas.push(arredonda(saida));
    perdas.push(arredonda(perda));
    sim.push(nivel);
  }

  // variação do valor em estoque relativa a hoje (o valor real vem dos insumos)
  const ultimo = sim[sim.length - 1];
  const estoqueDelta = sim.map((v) => v - ultimo);

  // margem média e nº de alertas: passeios aleatórios que terminam no valor de hoje
  const margemDelta = new Array(DIAS_HISTORICO).fill(0);
  const alertas = new Array(DIAS_HISTORICO).fill(0);
  let deriva = 0;
  let nAlertas = 0;
  for (let i = DIAS_HISTORICO - 2; i >= 0; i--) {
    deriva += (rnd() - 0.5) * 0.2 - 0.004;
    margemDelta[i] = deriva;
    nAlertas = Math.min(5, Math.max(-3, nAlertas + (rnd() < 0.12 ? 1 : rnd() < 0.13 ? -1 : 0)));
    alertas[i] = nAlertas;
  }

  return { entradas, saidas, perdas, estoqueDelta, margemDelta, alertasDelta: alertas };
}

function gerarMovimentos(rnd, insumos, hoje) {
  const lista = [];
  const agora = new Date();
  for (let i = 0; i < 70; i++) {
    const insumo = insumos[Math.floor(rnd() * insumos.length)];
    const entrada = rnd() < 0.42;
    const base = entrada ? insumo.minimo * (0.5 + rnd()) : insumo.minimo * (0.04 + rnd() * 0.2);
    const passo = ["un", "pct", "rolo", "dz"].includes(insumo.un) ? 1 : 0.5;
    const qtd = Math.max(passo, Math.round(base / passo) * passo);

    const diasAtras = Math.floor((i / 70) ** 1.25 * 21);
    const quando = addDays(startOfDay(hoje), -diasAtras);
    quando.setHours(7 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
    if (quando > agora) quando.setTime(agora.getTime() - Math.floor(rnd() * 3 + 1) * 3600000);

    lista.push({
      id: `m${i}`,
      quando,
      tipo: entrada ? "entrada" : "saida",
      insumoId: insumo.id,
      qtd,
      valor: arredonda(qtd * insumo.preco),
      por: OPERADORES[Math.floor(rnd() * OPERADORES.length)],
      obs: "",
      manual: false,
    });
  }
  return lista.sort((a, b) => b.quando - a.quando);
}

export function createDb() {
  const hoje = startOfDay(new Date());
  const rnd = mulberry32(20261012);

  const insumos = gerarInsumos(rnd, hoje);
  const receitas = RECEITAS_BASE.map(([id, nome, un, preco, itens]) => ({
    id,
    nome,
    un,
    preco,
    itens: itens.map(([insumoId, quantidade]) => ({ insumoId, quantidade })),
  }));

  return {
    hoje,
    insumos,
    receitas,
    categorias: CATEGORIAS,
    movimentos: gerarMovimentos(rnd, insumos, hoje),
    series: gerarFluxos(rnd, hoje),
    metaMargem: 60,
  };
}
