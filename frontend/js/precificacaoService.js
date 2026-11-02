// Precificação (RF05 + RF08): chamadas à API real (api/precificacao e api/receitas/{id}/...) + lógica
// da tela precificacao.html (margem padrão, preço sugerido por receita, margem própria e histórico).
// RNF01: só o Gestor usa esta tela. Quem não é Gestor vê um bloco bloqueado e nenhuma chamada é feita
// (a API também recusa com 403: a checagem do front é só conveniência de UX).
import { API_BASE_URL } from "./config.js";
import { clearSession, ehGestor, getSession } from "./session.js";

const LOGIN_URL = "index.html";
const URL_PRECIFICACAO = `${API_BASE_URL}/precificacao`;
const URL_RECEITAS = `${API_BASE_URL}/receitas`;

// Sem sessão válida não há token pra mandar: volta pro login.
const sessao = getSession();
if (!sessao) {
  window.location.replace(LOGIN_URL);
}

/* ---------------------------------------------------------
   Camada de API
--------------------------------------------------------- */

// Junta as mensagens que a API pode devolver: { message } (400/404) ou o
// ProblemDetails de validação do ASP.NET ({ errors: { Campo: [msgs] } }).
function extrairMensagem(corpo, padrao) {
  if (corpo?.message) return corpo.message;

  if (corpo?.errors && typeof corpo.errors === "object") {
    const mensagens = Object.values(corpo.errors).flat();
    if (mensagens.length) return mensagens.join(" ");
  }

  return padrao;
}

async function requisitar(url, opcoes = {}) {
  const cabecalhos = { Authorization: `Bearer ${sessao.token}` };
  if (opcoes.body) cabecalhos["Content-Type"] = "application/json";

  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se a API está no ar.");
  }

  // Token vencido ou inválido: encerra a sessão local e pede login de novo.
  if (resposta.status === 401) {
    clearSession();
    window.location.replace(LOGIN_URL);
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (resposta.status === 403) {
    throw new Error("Acesso restrito ao Gestor.");
  }

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(extrairMensagem(corpo, "Não foi possível concluir a operação."));
  }

  return corpo;
}

// Margem padrão global: { margemPadrao }.
export function obterMargemPadrao() {
  return requisitar(`${URL_PRECIFICACAO}/margem`);
}

export function definirMargemPadrao(margemPadrao) {
  return requisitar(`${URL_PRECIFICACAO}/margem`, {
    method: "PUT",
    body: JSON.stringify({ margemPadrao }),
  });
}

// Margem própria da receita; null volta a usar a padrão.
export function definirMargemReceita(idReceita, margemLucro) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/margem`, {
    method: "PUT",
    body: JSON.stringify({ margemLucro }),
  });
}

// Visão geral de todas as receitas (custo atual, preço sugerido, último preço salvo, desatualizado).
export function listarPrecificacao() {
  return requisitar(URL_PRECIFICACAO);
}

// Calcula ao vivo, sem salvar.
export function obterPrecoSugerido(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/preco-sugerido`);
}

// Calcula e salva o snapshot no histórico (201).
export function salvarPrecificacao(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/precificacao`, { method: "POST" });
}

export function listarHistorico(idReceita, limite = 20) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/precificacao/historico?limite=${limite}`);
}

/* ---------------------------------------------------------
   Tela
--------------------------------------------------------- */

const blocoBloqueado = document.getElementById("blocoBloqueado");
const conteudo = document.getElementById("conteudo");
const mensagemFeedback = document.getElementById("mensagemFeedback");

const formMargemPadrao = document.getElementById("formMargemPadrao");
const inputMargemPadrao = document.getElementById("inputMargemPadrao");
const btnSalvarMargemPadrao = document.getElementById("btnSalvarMargemPadrao");

const btnAtualizar = document.getElementById("btnAtualizar");
const estadoLista = document.getElementById("estadoLista");
const tabelaPrecos = document.getElementById("tabelaPrecos");
const corpoPrecos = document.getElementById("corpoPrecos");

const cartaoMargemReceita = document.getElementById("cartaoMargemReceita");
const tituloMargemReceita = document.getElementById("tituloMargemReceita");
const dicaMargemReceita = document.getElementById("dicaMargemReceita");
const formMargemReceita = document.getElementById("formMargemReceita");
const inputMargemReceita = document.getElementById("inputMargemReceita");
const btnSalvarMargemReceita = document.getElementById("btnSalvarMargemReceita");
const btnUsarPadrao = document.getElementById("btnUsarPadrao");
const btnFecharMargemReceita = document.getElementById("btnFecharMargemReceita");

const cartaoResultado = document.getElementById("cartaoResultado");
const tituloResultado = document.getElementById("tituloResultado");
const subtituloResultado = document.getElementById("subtituloResultado");
const resultadoCusto = document.getElementById("resultadoCusto");
const rotuloMargem = document.getElementById("rotuloMargem");
const resultadoMargem = document.getElementById("resultadoMargem");
const rotuloPrecoUnidade = document.getElementById("rotuloPrecoUnidade");
const resultadoPrecoUnidade = document.getElementById("resultadoPrecoUnidade");
const resultadoPrecoTotal = document.getElementById("resultadoPrecoTotal");
const resultadoMargemReal = document.getElementById("resultadoMargemReal");
const listaAlertas = document.getElementById("listaAlertas");
const btnFecharResultado = document.getElementById("btnFecharResultado");

const cartaoHistorico = document.getElementById("cartaoHistorico");
const tituloHistorico = document.getElementById("tituloHistorico");
const estadoHistorico = document.getElementById("estadoHistorico");
const tabelaHistorico = document.getElementById("tabelaHistorico");
const corpoHistorico = document.getElementById("corpoHistorico");
const btnFecharHistorico = document.getElementById("btnFecharHistorico");

const formatadorNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const formatadorPercentual = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let precos = []; // linhas de GET api/precificacao
let receitaMargem = null; // linha da receita com o editor de margem aberto
let receitaHistorico = null; // linha da receita com o histórico aberto

function exibirMensagem(texto, tipo) {
  mensagemFeedback.textContent = texto;
  mensagemFeedback.className = `alert alert-${tipo === "success" ? "success" : "error"}`;
  mensagemFeedback.style.display = "block";
}

function limparMensagem() {
  mensagemFeedback.style.display = "none";
}

const moeda = (valor) => formatadorMoeda.format(valor);
const percentual = (valor) => `${formatadorPercentual.format(valor)}%`;
const dataHora = (valor) => new Date(valor).toLocaleString("pt-BR");

// Variação com sinal explícito: "+8,37%" / "-11,58%".
function variacao(valor) {
  return `${valor > 0 ? "+" : ""}${formatadorPercentual.format(valor)}%`;
}

function criarCelula(texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  return td;
}

function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", aoClicar);
  return botao;
}

function criarSelo(texto, classe, dica) {
  const selo = document.createElement("span");
  selo.className = `selo ${classe}`;
  selo.textContent = texto;
  if (dica) selo.title = dica;
  return selo;
}

function criarNota(texto) {
  const nota = document.createElement("span");
  nota.className = "nota";
  nota.textContent = texto;
  return nota;
}

function ocultarCartoes() {
  cartaoMargemReceita.hidden = true;
  cartaoResultado.hidden = true;
  cartaoHistorico.hidden = true;
  receitaMargem = null;
  receitaHistorico = null;
}

function rotuloOrigem(linha) {
  return linha.origemMargem === "receita" ? "própria" : "padrão";
}

/* ----- Lista de receitas ----- */

function criarCelulaSituacao(linha) {
  const td = document.createElement("td");

  if (linha.quantidadeItens === 0) {
    td.append(criarSelo("Sem itens", "selo-neutro", "A receita não tem insumos na ficha técnica."));
    return td;
  }

  if (!linha.ultimoPreco) {
    td.append(criarSelo("Sem preço salvo", "selo-neutro"));
  } else if (linha.desatualizado) {
    const texto = linha.variacaoCustoPercentual == null
      ? "Desatualizado"
      : `Desatualizado (${variacao(linha.variacaoCustoPercentual)})`;
    td.append(criarSelo(texto, "selo-alerta", "O custo atual é diferente do custo do último preço salvo."));
  } else {
    td.append(criarSelo("Atualizado", "selo-ok"));
  }

  if (linha.ultimoPreco && linha.margemAlterada) {
    td.append(criarNota("Margem mudou desde o último preço"));
  }
  if (linha.possuiAlertas) {
    td.append(criarNota("Há alertas de custo: calcule para ver"));
  }

  return td;
}

function criarCelulaUltimoPreco(linha) {
  const td = document.createElement("td");

  if (!linha.ultimoPreco) {
    td.textContent = "—";
    return td;
  }

  td.append(
    `${moeda(linha.ultimoPreco.precoSugerido)} / ${linha.unidadeRendimento}`,
    criarNota(`Receita: ${moeda(linha.ultimoPreco.precoSugeridoTotal)} · ${dataHora(linha.ultimoPreco.dataCalculo)}`),
  );
  return td;
}

function renderizarLista() {
  corpoPrecos.replaceChildren();

  if (precos.length === 0) {
    estadoLista.textContent = "Nenhuma receita cadastrada ainda.";
    estadoLista.hidden = false;
    tabelaPrecos.hidden = true;
    return;
  }

  estadoLista.hidden = true;
  tabelaPrecos.hidden = false;

  for (const linha of precos) {
    const semItens = linha.quantidadeItens === 0;
    const tr = document.createElement("tr");

    const nome = criarCelula(linha.nome, "nome");
    nome.append(criarNota(`Rende ${formatadorNumero.format(linha.rendimentoReceita)} ${linha.unidadeRendimento}`));

    const margem = criarCelula(percentual(linha.margemLucro), "numero");
    margem.append(criarNota(`margem ${rotuloOrigem(linha)}`));

    tr.append(
      nome,
      criarCelula(semItens ? "—" : moeda(linha.custoProducao), "numero"),
      margem,
      criarCelula(semItens ? "—" : `${moeda(linha.precoSugerido)} / ${linha.unidadeRendimento}`, "numero"),
      criarCelula(semItens ? "—" : moeda(linha.precoSugeridoTotal), "numero"),
      criarCelulaUltimoPreco(linha),
      criarCelulaSituacao(linha),
    );

    const acoes = document.createElement("td");
    acoes.className = "acoes";
    const botaoCalcular = criarBotao("Calcular e salvar", "btn-tabela", () => calcularESalvar(linha, botaoCalcular));
    if (semItens) {
      botaoCalcular.disabled = true;
      botaoCalcular.title = "Adicione insumos à ficha técnica da receita antes de calcular o preço.";
    }
    acoes.append(
      botaoCalcular,
      " ",
      criarBotao("Margem", "btn-tabela", () => abrirMargemReceita(linha)),
      " ",
      criarBotao("Histórico", "btn-tabela", () => abrirHistorico(linha)),
    );
    tr.append(acoes);

    corpoPrecos.append(tr);
  }
}

async function carregarLista() {
  estadoLista.textContent = "Carregando receitas...";
  estadoLista.hidden = false;
  tabelaPrecos.hidden = true;

  try {
    precos = await listarPrecificacao();
    renderizarLista();
  } catch (erro) {
    estadoLista.textContent = `Não foi possível carregar as receitas: ${erro.message}`;
  }
}

async function carregarMargemPadrao() {
  try {
    const { margemPadrao } = await obterMargemPadrao();
    inputMargemPadrao.value = margemPadrao;
  } catch (erro) {
    exibirMensagem(`Não foi possível carregar a margem padrão: ${erro.message}`, "error");
  }
}

// Lê um campo de margem em %: vazio vira null; texto inválido ou fora de 0–999,99 vira undefined.
function lerMargem(input) {
  const texto = input.value.trim();
  if (texto === "") return null;

  const valor = Number(texto);
  if (!Number.isFinite(valor) || valor < 0 || valor > 999.99) return undefined;
  return valor;
}

/* ----- Margem padrão ----- */

formMargemPadrao.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limparMensagem();

  const margem = lerMargem(inputMargemPadrao);
  if (margem == null) {
    exibirMensagem("Informe a margem padrão, de 0 a 999,99%.", "error");
    return;
  }

  btnSalvarMargemPadrao.disabled = true;
  try {
    await definirMargemPadrao(margem);
    exibirMensagem("Margem padrão atualizada.", "success");
    await carregarLista(); // os preços das receitas sem margem própria mudam
  } catch (erro) {
    exibirMensagem(erro.message, "error");
  } finally {
    btnSalvarMargemPadrao.disabled = false;
  }
});

/* ----- Margem da receita ----- */

function abrirMargemReceita(linha) {
  limparMensagem();
  ocultarCartoes();
  receitaMargem = linha;

  tituloMargemReceita.textContent = `Margem — ${linha.nome}`;
  dicaMargemReceita.textContent = linha.margemReceita == null
    ? `Hoje a receita usa a margem padrão (${percentual(linha.margemLucro)}). Uma margem própria sobrepõe a padrão só nesta receita.`
    : `A receita tem margem própria de ${percentual(linha.margemReceita)}. Remova-a para voltar a usar a padrão.`;
  inputMargemReceita.value = linha.margemReceita ?? "";
  btnUsarPadrao.disabled = linha.margemReceita == null;

  cartaoMargemReceita.hidden = false;
  cartaoMargemReceita.scrollIntoView({ behavior: "smooth", block: "nearest" });
  inputMargemReceita.focus();
}

async function gravarMargemReceita(margem, mensagemSucesso) {
  if (!receitaMargem) return;

  limparMensagem();
  btnSalvarMargemReceita.disabled = true;
  btnUsarPadrao.disabled = true;
  try {
    await definirMargemReceita(receitaMargem.idReceita, margem);
    cartaoMargemReceita.hidden = true;
    receitaMargem = null;
    exibirMensagem(mensagemSucesso, "success");
    await carregarLista();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
    btnUsarPadrao.disabled = receitaMargem?.margemReceita == null;
  } finally {
    btnSalvarMargemReceita.disabled = false;
  }
}

formMargemReceita.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const margem = lerMargem(inputMargemReceita);
  if (margem === undefined) {
    exibirMensagem("A margem deve estar entre 0 e 999,99%.", "error");
    return;
  }

  // Campo vazio equivale a "usar a margem padrão".
  gravarMargemReceita(margem, margem === null ? "Margem própria removida: a receita usa a padrão." : "Margem da receita atualizada.");
});

btnUsarPadrao.addEventListener("click", () => {
  gravarMargemReceita(null, "Margem própria removida: a receita usa a padrão.");
});

btnFecharMargemReceita.addEventListener("click", () => {
  cartaoMargemReceita.hidden = true;
  receitaMargem = null;
});

/* ----- Calcular e salvar ----- */

function renderizarResultado(linha, calculo, idPrecificacao, dataCalculo) {
  tituloResultado.textContent = `Preço salvo — ${linha.nome}`;
  subtituloResultado.textContent = `Preço nº ${idPrecificacao} gravado em ${dataHora(dataCalculo)}.`;

  resultadoCusto.textContent = moeda(calculo.custoProducao);
  rotuloMargem.textContent = `Margem sobre o custo (${rotuloOrigem(calculo)})`;
  resultadoMargem.textContent = percentual(calculo.margemLucro);
  rotuloPrecoUnidade.textContent = `Preço sugerido por ${calculo.unidadeRendimento}`;
  resultadoPrecoUnidade.textContent = moeda(calculo.precoSugerido);
  resultadoPrecoTotal.textContent = moeda(calculo.precoSugeridoTotal);
  resultadoMargemReal.textContent = calculo.margemReal == null ? "—" : percentual(calculo.margemReal);

  listaAlertas.replaceChildren();
  for (const alerta of calculo.alertas) {
    const li = document.createElement("li");
    li.textContent = alerta.mensagem;
    listaAlertas.append(li);
  }
  listaAlertas.hidden = calculo.alertas.length === 0;

  cartaoResultado.hidden = false;
  cartaoResultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function calcularESalvar(linha, botao) {
  limparMensagem();
  botao.disabled = true;
  try {
    const { idPrecificacao, dataCalculo, calculo } = await salvarPrecificacao(linha.idReceita);

    // O resultado fica de pé enquanto a lista é recarregada; o histórico aberto (se for desta receita) também.
    cartaoMargemReceita.hidden = true;
    receitaMargem = null;
    renderizarResultado(linha, calculo, idPrecificacao, dataCalculo);
    await carregarLista();
    if (receitaHistorico?.idReceita === linha.idReceita) await carregarHistorico();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
    botao.disabled = false;
  }
}

btnFecharResultado.addEventListener("click", () => {
  cartaoResultado.hidden = true;
});

/* ----- Histórico ----- */

function renderizarHistorico(historico) {
  corpoHistorico.replaceChildren();

  if (historico.length === 0) {
    estadoHistorico.textContent = "Nenhum preço salvo para esta receita ainda. Use \"Calcular e salvar\".";
    estadoHistorico.hidden = false;
    tabelaHistorico.hidden = true;
    return;
  }

  estadoHistorico.hidden = true;
  tabelaHistorico.hidden = false;

  for (const item of historico) {
    const tr = document.createElement("tr");
    tr.append(
      criarCelula(dataHora(item.dataCalculo)),
      criarCelula(moeda(item.custoProducao), "numero"),
      criarCelula(percentual(item.margemLucro), "numero"),
      criarCelula(item.margemReal == null ? "—" : percentual(item.margemReal), "numero"),
      criarCelula(moeda(item.precoSugerido), "numero"),
      criarCelula(moeda(item.precoSugeridoTotal), "numero"),
      criarCelula(item.nomeUsuario ?? "—"),
    );
    corpoHistorico.append(tr);
  }
}

async function carregarHistorico() {
  if (!receitaHistorico) return;

  const idReceita = receitaHistorico.idReceita;
  try {
    const historico = await listarHistorico(idReceita);
    if (receitaHistorico?.idReceita !== idReceita) return; // o histórico mudou enquanto a resposta vinha
    renderizarHistorico(historico);
  } catch (erro) {
    if (receitaHistorico?.idReceita !== idReceita) return;
    tabelaHistorico.hidden = true;
    estadoHistorico.textContent = `Não foi possível carregar o histórico: ${erro.message}`;
    estadoHistorico.hidden = false;
  }
}

async function abrirHistorico(linha) {
  limparMensagem();
  cartaoMargemReceita.hidden = true;
  receitaMargem = null;
  receitaHistorico = linha;

  tituloHistorico.textContent = `Histórico de preços — ${linha.nome}`;
  estadoHistorico.textContent = "Carregando histórico...";
  estadoHistorico.hidden = false;
  tabelaHistorico.hidden = true;
  cartaoHistorico.hidden = false;
  cartaoHistorico.scrollIntoView({ behavior: "smooth", block: "nearest" });

  await carregarHistorico();
}

btnFecharHistorico.addEventListener("click", () => {
  cartaoHistorico.hidden = true;
  receitaHistorico = null;
});

btnAtualizar.addEventListener("click", () => {
  limparMensagem();
  carregarLista();
});

/* ----- Início ----- */

function iniciar() {
  if (!sessao) return; // já mandou pro login

  // RNF01: perfil Usuário não vê a tela nem chama a API.
  if (!ehGestor(sessao.usuario)) {
    blocoBloqueado.hidden = false;
    conteudo.hidden = true;
    return;
  }

  conteudo.hidden = false;
  carregarMargemPadrao();
  carregarLista();
}

iniciar();
