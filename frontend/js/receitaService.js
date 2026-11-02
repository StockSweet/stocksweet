// Cadastro de receitas: chamadas à API real (api/receitas e api/insumos) + lógica da tela
// cadastro_receitas.html (lista, criar, editar, excluir, ficha técnica e custo de cada receita).
import { API_BASE_URL } from "./config.js";
import { clearSession, getSession } from "./session.js";

const LOGIN_URL = "index.html";
const URL_RECEITAS = `${API_BASE_URL}/receitas`;
const URL_INSUMOS = `${API_BASE_URL}/insumos`;

// Sem sessão válida não há token pra mandar: volta pro login.
const sessao = getSession();
if (!sessao) {
  window.location.replace(LOGIN_URL);
}

/* ---------------------------------------------------------
   Camada de API
--------------------------------------------------------- */

// Junta as mensagens que a API pode devolver: { message } (404/409) ou o
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

  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(extrairMensagem(corpo, "Não foi possível concluir a operação."));
  }

  return corpo;
}

export function listarReceitas() {
  return requisitar(URL_RECEITAS);
}

export function criarReceita(dados) {
  return requisitar(URL_RECEITAS, { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarReceita(id, dados) {
  return requisitar(`${URL_RECEITAS}/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirReceita(id) {
  return requisitar(`${URL_RECEITAS}/${id}`, { method: "DELETE" });
}

// Ficha técnica: itens (insumo + quantidade na unidade do insumo) de uma receita.
export function listarInsumos() {
  return requisitar(URL_INSUMOS);
}

export function listarItens(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens`);
}

export function adicionarItem(idReceita, dados) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarItem(idReceita, idItem, dados) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens/${idItem}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export function removerItem(idReceita, idItem) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/itens/${idItem}`, { method: "DELETE" });
}

// Custo de produção (calculado ao vivo pela API com o preço de compra atual dos insumos).
export function obterCusto(idReceita) {
  return requisitar(`${URL_RECEITAS}/${idReceita}/custo`);
}

export function listarCustos() {
  return requisitar(`${URL_RECEITAS}/custos`);
}

/* ---------------------------------------------------------
   Tela
--------------------------------------------------------- */

const form = document.getElementById("formReceita");
const tituloForm = document.getElementById("tituloForm");
const inputNome = document.getElementById("inputNome");
const inputDescricao = document.getElementById("inputDescricao");
const inputRendimento = document.getElementById("inputRendimento");
const inputUnidade = document.getElementById("inputUnidade");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const mensagemFeedback = document.getElementById("mensagemFeedback");
const estadoLista = document.getElementById("estadoLista");
const tabela = document.getElementById("tabelaReceitas");
const corpoTabela = document.getElementById("corpoTabela");

const cartaoFicha = document.getElementById("cartaoFicha");
const tituloFicha = document.getElementById("tituloFicha");
const btnFecharFicha = document.getElementById("btnFecharFicha");
const mensagemFicha = document.getElementById("mensagemFicha");
const formItem = document.getElementById("formItem");
const selectInsumo = document.getElementById("selectInsumo");
const inputQuantidadeItem = document.getElementById("inputQuantidadeItem");
const labelQuantidadeItem = document.getElementById("labelQuantidadeItem");
const dicaUnidade = document.getElementById("dicaUnidade");
const btnSalvarItem = document.getElementById("btnSalvarItem");
const btnCancelarItem = document.getElementById("btnCancelarItem");
const estadoItens = document.getElementById("estadoItens");
const tabelaItens = document.getElementById("tabelaItens");
const corpoItens = document.getElementById("corpoItens");

const cartaoCusto = document.getElementById("cartaoCusto");
const tituloCusto = document.getElementById("tituloCusto");
const btnRecalcular = document.getElementById("btnRecalcular");
const estadoCusto = document.getElementById("estadoCusto");
const conteudoCusto = document.getElementById("conteudoCusto");
const valorCustoTotal = document.getElementById("valorCustoTotal");
const rotuloCustoUnidade = document.getElementById("rotuloCustoUnidade");
const valorCustoUnidade = document.getElementById("valorCustoUnidade");
const listaAlertas = document.getElementById("listaAlertas");
const tabelaCusto = document.getElementById("tabelaCusto");
const corpoCusto = document.getElementById("corpoCusto");
const calculadoEm = document.getElementById("calculadoEm");

const formatadorNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let receitas = [];
let custos = new Map(); // idReceita -> resumo de custo (GET api/receitas/custos)
let idEmEdicao = null;

// Estado da ficha técnica aberta.
let receitaAberta = null;
let insumos = [];
let itens = [];
let idItemEmEdicao = null;

function exibirMensagem(texto, tipo) {
  mensagemFeedback.textContent = texto;
  mensagemFeedback.className = `alert alert-${tipo === "success" ? "success" : "error"}`;
  mensagemFeedback.style.display = "block";
}

function limparMensagem() {
  mensagemFeedback.style.display = "none";
}

function exibirMensagemFicha(texto, tipo) {
  mensagemFicha.textContent = texto;
  mensagemFicha.className = `alert alert-${tipo === "success" ? "success" : "error"}`;
  mensagemFicha.style.display = "block";
}

function limparMensagemFicha() {
  mensagemFicha.style.display = "none";
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

// Custo total e por unidade da receita; o selo avisa quando o cálculo tem alertas
// (sem itens, insumo sem preço ou sem saldo). Sem o resumo, mostra "—".
function criarCelulasCusto(custo) {
  if (!custo) return [criarCelula("—", "numero"), criarCelula("—", "numero")];

  const total = criarCelula(formatadorMoeda.format(custo.custoTotal), "numero");
  if (custo.possuiAlertas) {
    const selo = document.createElement("span");
    selo.className = "selo-alerta";
    selo.textContent = "Atenção";
    selo.title = "O cálculo tem alertas. Abra a ficha técnica para ver os detalhes.";
    total.append(selo);
  }

  return [total, criarCelula(formatadorMoeda.format(custo.custoPorUnidade), "numero")];
}

function renderizarLista() {
  corpoTabela.replaceChildren();

  if (receitas.length === 0) {
    estadoLista.textContent = "Nenhuma receita cadastrada ainda.";
    estadoLista.hidden = false;
    tabela.hidden = true;
    return;
  }

  estadoLista.hidden = true;
  tabela.hidden = false;

  for (const receita of receitas) {
    const linha = document.createElement("tr");

    linha.append(
      criarCelula(receita.nome, "nome"),
      criarCelula(`${formatadorNumero.format(receita.rendimentoReceita)} ${receita.unidadeRendimento}`),
      criarCelula(String(receita.quantidadeItens ?? 0)),
      ...criarCelulasCusto(custos.get(receita.idReceita)),
      criarCelula(receita.descricao ?? "—"),
    );

    const acoes = document.createElement("td");
    acoes.className = "acoes";
    acoes.append(
      criarBotao("Ficha técnica", "btn-tabela", () => abrirFicha(receita)),
      " ",
      criarBotao("Editar", "btn-tabela", () => iniciarEdicao(receita)),
      " ",
      criarBotao("Excluir", "btn-tabela perigo", () => remover(receita)),
    );
    linha.append(acoes);

    corpoTabela.append(linha);
  }
}

async function carregarLista() {
  try {
    // O resumo de custo é um complemento: se falhar, a lista aparece com "—" no lugar.
    const [lista, resumo] = await Promise.all([listarReceitas(), listarCustos().catch(() => [])]);
    receitas = lista;
    custos = new Map(resumo.map((c) => [c.idReceita, c]));
    renderizarLista();
  } catch (erro) {
    estadoLista.textContent = "Não foi possível carregar as receitas.";
    estadoLista.hidden = false;
    tabela.hidden = true;
    exibirMensagem(erro.message, "error");
  }
}

function iniciarEdicao(receita) {
  idEmEdicao = receita.idReceita;
  inputNome.value = receita.nome;
  inputDescricao.value = receita.descricao ?? "";
  inputRendimento.value = receita.rendimentoReceita;
  inputUnidade.value = receita.unidadeRendimento;

  tituloForm.textContent = `Editando: ${receita.nome}`;
  btnSalvar.textContent = "Salvar alterações";
  btnCancelar.hidden = false;
  limparMensagem();

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  inputNome.focus();
}

function sairDaEdicao() {
  idEmEdicao = null;
  form.reset();
  tituloForm.textContent = "Nova receita";
  btnSalvar.textContent = "Cadastrar receita";
  btnCancelar.hidden = true;
}

// Validação básica no cliente; a regra de verdade continua sendo da API.
function lerFormulario() {
  const nome = inputNome.value.trim();
  const unidade = inputUnidade.value.trim();
  const rendimento = Number(inputRendimento.value);

  if (!nome) throw new Error("Informe o nome da receita.");
  if (!inputRendimento.value || !(rendimento > 0)) {
    throw new Error("O rendimento deve ser maior que zero.");
  }
  if (!unidade) throw new Error("Informe a unidade do rendimento.");

  return {
    nome,
    descricao: inputDescricao.value.trim() || null,
    rendimentoReceita: rendimento,
    unidadeRendimento: unidade,
  };
}

async function remover(receita) {
  if (!window.confirm(`Excluir a receita "${receita.nome}"?`)) return;

  try {
    await excluirReceita(receita.idReceita);
    if (idEmEdicao === receita.idReceita) sairDaEdicao();
    if (receitaAberta?.idReceita === receita.idReceita) fecharFicha();
    exibirMensagem("Receita excluída com sucesso!", "success");
    await carregarLista();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
  }
}

/* ---------------------------------------------------------
   Ficha técnica (itens da receita)
--------------------------------------------------------- */

function insumoSelecionado() {
  return insumos.find((i) => i.idInsumo === Number(selectInsumo.value)) ?? null;
}

// Mostra a unidade do insumo escolhido: a quantidade do item é sempre nessa unidade.
function atualizarUnidade() {
  const insumo = insumoSelecionado();
  labelQuantidadeItem.textContent = insumo ? `Quantidade (${insumo.unidadeMedida}):` : "Quantidade:";
  dicaUnidade.textContent = insumo
    ? `Informe a quantidade em ${insumo.unidadeMedida}, a unidade de medida do insumo.`
    : "Escolha um insumo para ver a unidade.";
}

// Insumos que já estão na receita ficam desabilitados (o mesmo insumo não entra duas vezes).
function renderizarOpcoesInsumo() {
  const jaUsados = new Set(itens.map((item) => item.idInsumo));
  const anterior = selectInsumo.value;

  selectInsumo.replaceChildren();

  const vazio = document.createElement("option");
  vazio.value = "";
  vazio.textContent = insumos.length ? "Selecione um insumo" : "Nenhum insumo cadastrado";
  selectInsumo.append(vazio);

  for (const insumo of insumos) {
    const opcao = document.createElement("option");
    opcao.value = String(insumo.idInsumo);
    opcao.disabled = jaUsados.has(insumo.idInsumo) && insumo.idInsumo !== itemEmEdicaoIdInsumo();
    opcao.textContent = `${insumo.nome} (${insumo.unidadeMedida})${opcao.disabled ? " — já na receita" : ""}`;
    selectInsumo.append(opcao);
  }

  selectInsumo.value = anterior;
  if (selectInsumo.value !== anterior) selectInsumo.value = "";
  atualizarUnidade();
}

// Durante a edição o insumo do item continua selecionável (o select fica travado nele).
function itemEmEdicaoIdInsumo() {
  return itens.find((item) => item.idItem === idItemEmEdicao)?.idInsumo ?? null;
}

function renderizarItens() {
  corpoItens.replaceChildren();

  if (itens.length === 0) {
    estadoItens.textContent = "Nenhum insumo nesta receita ainda.";
    estadoItens.hidden = false;
    tabelaItens.hidden = true;
    return;
  }

  estadoItens.hidden = true;
  tabelaItens.hidden = false;

  for (const item of itens) {
    const linha = document.createElement("tr");

    linha.append(
      criarCelula(item.nomeInsumo, "nome"),
      criarCelula(`${formatadorNumero.format(item.quantidade)} ${item.unidadeMedida}`, "numero"),
      criarCelula(`${formatadorMoeda.format(item.precoCompraAtual)} / ${item.unidadeMedida}`, "numero"),
      criarCelula(formatadorMoeda.format(item.valorItem), "numero"),
    );

    const acoes = document.createElement("td");
    acoes.className = "acoes";
    acoes.append(
      criarBotao("Editar", "btn-tabela", () => iniciarEdicaoItem(item)),
      " ",
      criarBotao("Remover", "btn-tabela perigo", () => removerDaReceita(item)),
    );
    linha.append(acoes);

    corpoItens.append(linha);
  }
}

async function carregarItens() {
  try {
    itens = await listarItens(receitaAberta.idReceita);
    renderizarItens();
    renderizarOpcoesInsumo();
  } catch (erro) {
    estadoItens.textContent = "Não foi possível carregar os itens da receita.";
    estadoItens.hidden = false;
    tabelaItens.hidden = true;
    exibirMensagemFicha(erro.message, "error");
  }
}

async function carregarInsumos() {
  try {
    insumos = await listarInsumos();
  } catch (erro) {
    insumos = [];
    exibirMensagemFicha(erro.message, "error");
  }
  renderizarOpcoesInsumo();
}

function sairDaEdicaoItem() {
  idItemEmEdicao = null;
  formItem.reset();
  selectInsumo.disabled = false;
  btnSalvarItem.textContent = "Adicionar à receita";
  btnCancelarItem.hidden = true;
  renderizarOpcoesInsumo();
}

function iniciarEdicaoItem(item) {
  idItemEmEdicao = item.idItem;
  limparMensagemFicha();
  renderizarOpcoesInsumo();

  // Só a quantidade muda: pra trocar o insumo, remova o item e adicione outro.
  selectInsumo.value = String(item.idInsumo);
  selectInsumo.disabled = true;
  inputQuantidadeItem.value = item.quantidade;
  atualizarUnidade();

  btnSalvarItem.textContent = "Salvar quantidade";
  btnCancelarItem.hidden = false;
  inputQuantidadeItem.focus();
}

/* ---------------------------------------------------------
   Painel de custo (receita aberta na ficha técnica)
--------------------------------------------------------- */

function renderizarCusto(custo) {
  valorCustoTotal.textContent = formatadorMoeda.format(custo.custoTotal);
  rotuloCustoUnidade.textContent = `Custo por unidade (rendimento:${formatadorNumero.format(custo.rendimentoReceita)} ${custo.unidadeRendimento})`;
  valorCustoUnidade.textContent = formatadorMoeda.format(custo.custoPorUnidade);

  listaAlertas.replaceChildren();
  for (const alerta of custo.alertas) {
    const li = document.createElement("li");
    li.textContent = alerta.mensagem;
    listaAlertas.append(li);
  }
  listaAlertas.hidden = custo.alertas.length === 0;

  corpoCusto.replaceChildren();
  for (const item of custo.itens) {
    const linha = document.createElement("tr");
    linha.append(
      criarCelula(item.nomeInsumo, "nome"),
      criarCelula(`${formatadorNumero.format(item.quantidade)} ${item.unidadeMedida}`, "numero"),
      criarCelula(`${formatadorMoeda.format(item.precoCompraAtual)} / ${item.unidadeMedida}`, "numero"),
      criarCelula(formatadorMoeda.format(item.custoItem), "numero"),
      criarCelula(`${formatadorNumero.format(item.percentualDoCusto)}%`, "numero"),
    );
    corpoCusto.append(linha);
  }
  tabelaCusto.hidden = custo.itens.length === 0;

  calculadoEm.textContent = `Calculado em ${new Date(custo.calculadoEm).toLocaleString("pt-BR")}.`;
  estadoCusto.hidden = true;
  conteudoCusto.hidden = false;
}

// Busca o custo na API a cada chamada (nada fica guardado no front): chamada ao abrir a ficha,
// depois de adicionar/editar/remover itens e no botão Recalcular.
async function carregarCusto() {
  if (!receitaAberta) return;

  const idReceita = receitaAberta.idReceita;
  try {
    const custo = await obterCusto(idReceita);
    if (receitaAberta?.idReceita !== idReceita) return; // a ficha mudou enquanto a resposta vinha
    renderizarCusto(custo);
  } catch (erro) {
    if (receitaAberta?.idReceita !== idReceita) return;
    conteudoCusto.hidden = true;
    estadoCusto.textContent = `Não foi possível calcular o custo: ${erro.message}`;
    estadoCusto.hidden = false;
  }
}

// Itens mudaram: atualiza ficha, painel de custo e a lista (coluna de custo) de uma vez.
function atualizarAposMudarItens() {
  return Promise.all([carregarItens(), carregarCusto(), carregarLista()]);
}

async function abrirFicha(receita) {
  receitaAberta = receita;
  insumos = [];
  itens = [];
  sairDaEdicaoItem();
  limparMensagemFicha();

  tituloFicha.textContent = `Ficha técnica: ${receita.nome}`;
  estadoItens.textContent = "Carregando itens...";
  estadoItens.hidden = false;
  tabelaItens.hidden = true;
  cartaoFicha.hidden = false;

  tituloCusto.textContent = `Custo de produção: ${receita.nome}`;
  estadoCusto.textContent = "Calculando custo...";
  estadoCusto.hidden = false;
  conteudoCusto.hidden = true;
  cartaoCusto.hidden = false;
  cartaoFicha.scrollIntoView({ behavior: "smooth", block: "start" });

  await Promise.all([carregarInsumos(), carregarItens(), carregarCusto()]);
}

function fecharFicha() {
  receitaAberta = null;
  idItemEmEdicao = null;
  cartaoFicha.hidden = true;
  cartaoCusto.hidden = true;
  limparMensagemFicha();
}

// Validação básica no cliente; a regra de verdade continua sendo da API.
function lerFormularioItem() {
  const quantidade = Number(inputQuantidadeItem.value);

  if (idItemEmEdicao === null && !insumoSelecionado()) {
    throw new Error("Selecione o insumo.");
  }
  if (!inputQuantidadeItem.value || !(quantidade > 0)) {
    throw new Error("A quantidade deve ser maior que zero.");
  }

  return { quantidade };
}

async function removerDaReceita(item) {
  if (!window.confirm(`Remover "${item.nomeInsumo}" da receita?`)) return;

  try {
    await removerItem(receitaAberta.idReceita, item.idItem);
    if (idItemEmEdicao === item.idItem) sairDaEdicaoItem();
    exibirMensagemFicha("Insumo removido da receita.", "success");
    await atualizarAposMudarItens();
  } catch (erro) {
    exibirMensagemFicha(erro.message, "error");
  }
}

formItem.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparMensagemFicha();

  let dados;
  try {
    dados = lerFormularioItem();
  } catch (erro) {
    exibirMensagemFicha(erro.message, "error");
    return;
  }

  btnSalvarItem.disabled = true;
  try {
    const editando = idItemEmEdicao !== null;
    const resposta = editando
      ? await atualizarItem(receitaAberta.idReceita, idItemEmEdicao, dados)
      : await adicionarItem(receitaAberta.idReceita, {
          idInsumo: Number(selectInsumo.value),
          quantidade: dados.quantidade,
        });

    sairDaEdicaoItem();
    exibirMensagemFicha(resposta.message, "success");
    await atualizarAposMudarItens();
  } catch (erro) {
    exibirMensagemFicha(erro.message, "error");
  } finally {
    btnSalvarItem.disabled = false;
  }
});

selectInsumo.addEventListener("change", atualizarUnidade);
btnCancelarItem.addEventListener("click", () => {
  sairDaEdicaoItem();
  limparMensagemFicha();
});
btnFecharFicha.addEventListener("click", fecharFicha);
btnRecalcular.addEventListener("click", () => Promise.all([carregarCusto(), carregarLista()]));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparMensagem();

  let dados;
  try {
    dados = lerFormulario();
  } catch (erro) {
    exibirMensagem(erro.message, "error");
    return;
  }

  btnSalvar.disabled = true;
  try {
    const editando = idEmEdicao !== null;
    const resposta = editando
      ? await atualizarReceita(idEmEdicao, dados)
      : await criarReceita(dados);

    sairDaEdicao();
    exibirMensagem(resposta.message, "success");
    // Se a receita editada é a da ficha aberta, o rendimento pode ter mudado: recalcula o custo.
    await Promise.all([carregarLista(), editando ? carregarCusto() : null]);
  } catch (erro) {
    exibirMensagem(erro.message, "error");
  } finally {
    btnSalvar.disabled = false;
  }
});

btnCancelar.addEventListener("click", () => {
  sairDaEdicao();
  limparMensagem();
});

if (sessao) {
  carregarLista();
}
