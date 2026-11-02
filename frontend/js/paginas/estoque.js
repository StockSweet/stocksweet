// Entrada e saída de mercadorias (US02 e US03): formulário ligado à API real, com o saldo
// do insumo, um resumo ao vivo do que vai acontecer e o histórico das últimas movimentações.
// As duas telas usam este módulo (js/paginas/entrada.js e js/paginas/saida.js).
// As chamadas à API ficam em js/estoqueService.js.

import { montarLayout } from "../layout.js";
import { h, icon } from "../dashboard/dom.js";
import { badgeStatus } from "../dashboard/components.js";
import { brl, dShort, hhmm, num, pct } from "../dashboard/format.js";
import { banner, botaoIcone, criarCampo, criarCombo, esqueleto, estadoVazio, lerNumero, novoId } from "../componentes.js";
import { listarInsumos, listarMovimentacoes, MOTIVOS_SAIDA, registrarEntrada, registrarSaida } from "../estoqueService.js";

const PAINEL = { rotulo: "Painel", href: "dashboard.html" };
const LIMITE_HISTORICO = 10;

const TELAS = {
  entrada: {
    ativo: "entrada",
    titulo: "Entrada de mercadorias",
    crumb: "Entrada",
    subtitulo: "Registre o que chegou: o saldo do insumo sobe e o preço de compra é atualizado.",
    cardTitulo: "Nova entrada",
    cardSub: "Preencha o que foi recebido.",
    botao: "Registrar entrada",
    cruzado: { rotulo: "Registrar saída", href: "saida_mercadorias.html", icone: "arrow-out" },
    vazio: "Registre a primeira entrada ao lado e ela aparece aqui.",
  },
  saida: {
    ativo: "saida",
    titulo: "Saída de mercadorias",
    crumb: "Saída",
    subtitulo: "Registre o que saiu do estoque e por quê: o saldo do insumo diminui.",
    cardTitulo: "Nova saída",
    cardSub: "Informe o que saiu e o motivo.",
    botao: "Registrar saída",
    cruzado: { rotulo: "Registrar entrada", href: "entrada_mercadorias.html", icone: "arrow-in" },
    vazio: "Registre a primeira saída ao lado e ela aparece aqui.",
  },
};

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */

const qtdTexto = (valor, un) => `${num(valor, 3)} ${un}`;
const paraCampo = (valor) => String(valor).replace(".", ",");

// Mesma régua do painel: até 50% do mínimo é crítico, até o mínimo é baixo.
function situacaoDe(saldo, minimo) {
  if (saldo <= 0) return "critico";
  if (!(minimo > 0)) return "ok";
  const razao = saldo / minimo;
  if (razao <= 0.5) return "critico";
  if (razao <= 1) return "baixo";
  return "ok";
}

function dataHora(valor) {
  const d = new Date(valor);
  return `${dShort(d, d.getFullYear() !== new Date().getFullYear())}, ${hhmm(d)}`;
}

const rotuloMotivo = (valor) => MOTIVOS_SAIDA.find((m) => m.valor === valor)?.rotulo ?? null;

function chipMovimento(tipo) {
  const entrada = tipo === "ENTRADA";
  return h("span", { class: `status status--sm status--${entrada ? "entrada" : "saida"}` }, icon(entrada ? "arrow-in" : "arrow-out", 12), entrada ? "ENTRADA" : "SAÍDA");
}

function linha(rotulo, valor, { forte = false, tom = null } = {}) {
  return h("div", { class: "preview__line" }, h("span", null, rotulo), h("strong", { class: `${forte ? "sum__big" : ""}${tom ? ` is-${tom}` : ""}`, style: { marginLeft: "auto" } }, valor));
}

/* ---------------------------------------------------------
   Tela
--------------------------------------------------------- */

export function iniciar(tipo) {
  const tela = TELAS[tipo];
  const entrada = tipo === "entrada";
  const layout = montarLayout({ ativo: tela.ativo });
  if (!layout) return;

  layout.definirPagina({ titulo: tela.titulo, trilha: [PAINEL, { rotulo: "Mercadorias" }, { rotulo: tela.crumb }] });

  const estado = { insumos: [], insumo: null, motivo: "PRODUCAO", filtro: "todas", registrando: false };

  /* ----- campos ----- */
  const combo = criarCombo(() => aoMudarInsumo(), {
    detalhe: (i) => (i.quantidadeEstoque > 0 ? `${qtdTexto(i.quantidadeEstoque, i.unidadeMedida)} em estoque` : "sem estoque"),
  });
  combo.input.disabled = true;
  combo.input.placeholder = "Carregando insumos…";
  const campoInsumo = criarCampo({ rotulo: "Insumo", controle: combo.input, envoltorio: combo.el });

  const infoEl = h("div", { class: "insumo-info", "aria-live": "polite" });

  const qtdInput = h("input", { id: novoId("qtd"), type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "0" });
  const campoQtd = criarCampo({ rotulo: entrada ? "Quantidade recebida" : "Quantidade", controle: qtdInput, sufixo: "—" });
  const saldoTodo = h("button", { type: "button", class: "link-btn", hidden: true, onclick: usarSaldoTodo });
  if (!entrada) campoQtd.el.append(saldoTodo);

  const valorInput = h("input", { id: novoId("valor"), type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "0,00" });
  const campoValor = entrada ? criarCampo({ rotulo: "Valor unitário", controle: valorInput, sufixo: "R$", dica: " " }) : null;

  const obsInput = h("textarea", { id: novoId("obs"), maxlength: 500, rows: 3, placeholder: entrada ? "Ex.: fornecedor, número da nota fiscal…" : "Ex.: lote vencido, receita do bolo de sábado…" });
  const campoObs = criarCampo({ rotulo: "Observação", controle: obsInput, opcional: true });

  /* ----- motivo (só na saída) ----- */
  const nomeMotivo = novoId("motivo");
  const motivosEl = entrada
    ? null
    : h(
        "fieldset",
        { class: "motivos" },
        h("legend", { class: "fld__label" }, "Motivo da saída"),
        h(
          "div",
          { class: "motivos__grade" },
          ...MOTIVOS_SAIDA.map((m) =>
            h(
              "label",
              { class: "motivo" },
              h("input", {
                type: "radio",
                name: nomeMotivo,
                value: m.valor,
                checked: m.valor === estado.motivo,
                onchange: () => {
                  estado.motivo = m.valor;
                },
              }),
              h("span", { class: "motivo__txt" }, h("strong", null, m.rotulo), h("small", null, m.dica)),
            ),
          ),
        ),
      );

  const resumoEl = h("div", { class: "preview sum", "aria-live": "polite" });
  const avisoEl = h("div", { class: "stack" });
  const notaEl = h("p", { class: "note", "aria-live": "polite" });
  const enviar = h("button", { type: "submit", class: "btn btn--primary btn--block" }, icon(entrada ? "arrow-in" : "arrow-out", 16), tela.botao);
  const form = h(
    "form",
    { class: "estoque-form", novalidate: true, "aria-label": tela.cardTitulo },
    avisoEl,
    campoInsumo.el,
    infoEl,
    motivosEl,
    entrada ? h("div", { class: "fld__row" }, campoQtd.el, campoValor.el) : campoQtd.el,
    campoObs.el,
    resumoEl,
    notaEl,
    enviar,
  );

  /* ----- histórico ----- */
  const filtrosEl = h("div", { class: "segmented segmented--sm", role: "group", "aria-label": "Filtrar movimentações" });
  const listaEl = h("div", { class: "mov-wrap" });
  const recarregarBtn = botaoIcone({ icone: "refresh", rotulo: "Atualizar histórico", onClick: () => carregarHistorico() });

  /* ----- montagem ----- */
  const falhaEl = h("div", { class: "stack" });
  layout.conteudo.replaceChildren(
    h(
      "div",
      { class: "view" },
      h(
        "div",
        { class: "page-head" },
        h("div", { class: "page-head__main" }, h("a", { class: "back-link", href: "dashboard.html" }, icon("arrow-left", 16), "Voltar ao painel"), h("h1", null, tela.titulo), h("p", { class: "page-head__sub" }, tela.subtitulo)),
        h("div", { class: "page-head__actions" }, h("a", { class: "btn btn--ghost", href: tela.cruzado.href }, icon(tela.cruzado.icone, 16), tela.cruzado.rotulo)),
      ),
      falhaEl,
      h(
        "div",
        { class: "estoque-grid" },
        h("section", { class: "card", "aria-labelledby": "tituloForm" }, h("div", { class: "card__head" }, h("div", null, h("h2", { class: "card__title", id: "tituloForm" }, tela.cardTitulo), h("p", { class: "card__sub" }, tela.cardSub))), h("div", { class: "card__body" }, form)),
        h(
          "section",
          { class: "card", "aria-labelledby": "tituloHist" },
          h("div", { class: "card__head card__head--wrap" }, h("div", null, h("h2", { class: "card__title", id: "tituloHist" }, "Últimas movimentações"), h("p", { class: "card__sub" }, "As mais recentes primeiro")), h("div", { class: "mov-tools" }, filtrosEl, recarregarBtn)),
          h("div", { class: "card__body card__body--flush" }, listaEl),
        ),
      ),
    ),
  );

  /* ----- insumo escolhido ----- */
  function aoMudarInsumo() {
    estado.insumo = combo.escolhido;
    campoInsumo.definirErro("");
    avisoEl.replaceChildren();
    const un = estado.insumo?.unidadeMedida ?? "—";
    campoQtd.sufixoEl.textContent = un;
    if (campoValor) {
      campoValor.dicaEl.textContent = estado.insumo ? `Preço de compra atual: ${brl(estado.insumo.precoCompra)} / ${un}` : " ";
    }
    desenharInsumo();
    desenharResumo();
  }

  function desenharInsumo() {
    const i = estado.insumo;
    if (!i) {
      infoEl.replaceChildren(h("p", { class: "hint-inline" }, "Escolha um insumo para ver o saldo, o estoque mínimo e o preço de compra."));
      saldoTodo.hidden = true;
      return;
    }
    const situacao = situacaoDe(i.quantidadeEstoque, i.estoqueMinimo);
    const razao = i.estoqueMinimo > 0 ? i.quantidadeEstoque / (i.estoqueMinimo * 2) : 1;
    infoEl.replaceChildren(
      h(
        "div",
        { class: "insumo-info__head" },
        h("div", { class: "insumo-info__saldo" }, h("span", { class: "insumo-info__rotulo" }, "Saldo atual"), h("strong", null, qtdTexto(i.quantidadeEstoque, i.unidadeMedida))),
        badgeStatus(situacao),
      ),
      h("div", { class: `meter${situacao === "ok" ? "" : ` meter--${situacao}`}`, "aria-hidden": "true" }, h("span", { class: "meter__fill", style: { "--w": `${Math.max(2, Math.min(100, razao * 100))}%` } }), h("span", { class: "meter__tick", style: { left: "50%" } })),
      h(
        "dl",
        { class: "insumo-info__fatos" },
        h("div", null, h("dt", null, "Estoque mínimo"), h("dd", null, qtdTexto(i.estoqueMinimo, i.unidadeMedida))),
        h("div", null, h("dt", null, "Preço de compra"), h("dd", null, `${brl(i.precoCompra)} / ${i.unidadeMedida}`)),
        h("div", null, h("dt", null, "Valor em estoque"), h("dd", null, brl(i.quantidadeEstoque * i.precoCompra))),
      ),
    );
    if (!entrada) {
      saldoTodo.hidden = !(i.quantidadeEstoque > 0);
      saldoTodo.textContent = `Usar saldo todo (${qtdTexto(i.quantidadeEstoque, i.unidadeMedida)})`;
    }
  }

  function usarSaldoTodo() {
    if (!estado.insumo) return;
    qtdInput.value = paraCampo(estado.insumo.quantidadeEstoque);
    campoQtd.definirErro("");
    desenharResumo();
    qtdInput.focus();
  }

  /* ----- resumo ao vivo ----- */
  function desenharResumo() {
    const i = estado.insumo;
    const q = lerNumero(qtdInput.value);
    const v = lerNumero(valorInput.value);
    const qOk = q > 0;
    notaEl.replaceChildren();

    if (!i) {
      resumoEl.replaceChildren(h("p", { class: "hint-inline" }, entrada ? "O valor total da entrada aparece aqui." : "O valor da baixa e o saldo depois da saída aparecem aqui."));
      return;
    }

    if (entrada) {
      const vOk = v > 0;
      const saldoDepois = i.quantidadeEstoque + (qOk ? q : 0);
      resumoEl.replaceChildren(
        linha("Valor total da entrada", qOk && vOk ? brl(q * v) : "—", { forte: true }),
        linha("Saldo depois", qOk ? `${qtdTexto(i.quantidadeEstoque, i.unidadeMedida)} → ${qtdTexto(saldoDepois, i.unidadeMedida)}` : qtdTexto(i.quantidadeEstoque, i.unidadeMedida)),
        linha("Preço de compra", vOk ? `${brl(i.precoCompra)} → ${brl(v)}` : `${brl(i.precoCompra)} / ${i.unidadeMedida}`),
      );
      const mudou = vOk && Math.abs(v - i.precoCompra) >= 0.005;
      const variacao = mudou && i.precoCompra > 0 ? ((v - i.precoCompra) / i.precoCompra) * 100 : null;
      notaEl.append(
        icon("info", 15),
        h("span", null, mudou ? `O preço de compra de ${i.nome} passa de ${brl(i.precoCompra)} para ${brl(v)}${variacao != null ? ` (${variacao > 0 ? "+" : "−"}${pct(Math.abs(variacao), 1)})` : ""} e o custo das receitas que usam o insumo muda junto.` : "O preço de compra do insumo passa a ser o valor unitário desta entrada, e isso muda o custo das receitas que usam o insumo."),
      );
      return;
    }

    const saldoDepois = i.quantidadeEstoque - (qOk ? q : 0);
    const passou = qOk && saldoDepois < -1e-9;
    resumoEl.replaceChildren(
      linha("Valor da baixa", qOk ? brl(q * i.precoCompra) : "—", { forte: true }),
      linha("Saldo depois", qOk ? (passou ? "insuficiente" : `${qtdTexto(i.quantidadeEstoque, i.unidadeMedida)} → ${qtdTexto(Math.max(0, saldoDepois), i.unidadeMedida)}`) : qtdTexto(i.quantidadeEstoque, i.unidadeMedida), { tom: passou ? "neg" : null }),
    );
    if (passou) {
      notaEl.append(icon("alert-octagon", 15), h("span", { class: "note--crit" }, `A quantidade passa do saldo: há apenas ${qtdTexto(i.quantidadeEstoque, i.unidadeMedida)} em estoque.`));
    } else if (qOk && saldoDepois <= 1e-9) {
      notaEl.append(icon("alert", 15), h("span", { class: "note--warn" }, "Esta saída zera o estoque do insumo."));
    } else if (qOk && i.estoqueMinimo > 0 && saldoDepois < i.estoqueMinimo) {
      notaEl.append(icon("alert", 15), h("span", { class: "note--warn" }, `O saldo fica abaixo do estoque mínimo (${qtdTexto(i.estoqueMinimo, i.unidadeMedida)}).`));
    } else {
      notaEl.append(icon("info", 15), h("span", null, "A baixa usa o preço de compra atual do insumo."));
    }
  }

  qtdInput.addEventListener("input", desenharResumo);
  valorInput.addEventListener("input", desenharResumo);

  /* ----- dados ----- */
  async function carregarInsumos() {
    try {
      const insumos = await listarInsumos();
      estado.insumos = insumos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      combo.definirInsumos(estado.insumos);
      combo.input.disabled = false;
      combo.input.placeholder = "Buscar insumo…";
      estado.insumo = combo.escolhido;
      desenharInsumo();
      desenharResumo();
      falhaEl.replaceChildren();
      return true;
    } catch (erro) {
      falhaEl.replaceChildren(banner({ tom: "erro", titulo: "Não foi possível carregar os insumos", mensagens: erro.message, assertivo: true, acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: carregarInsumos }] }));
      return false;
    }
  }

  function itemMovimento(m) {
    const ehEntrada = m.tipo === "ENTRADA";
    const motivo = ehEntrada ? null : rotuloMotivo(m.motivo);
    return h(
      "li",
      { class: "mov" },
      h("span", { class: `mov__icone mov__icone--${ehEntrada ? "entrada" : "saida"}`, "aria-hidden": "true" }, icon(ehEntrada ? "arrow-in" : "arrow-out", 16)),
      h(
        "div",
        { class: "mov__corpo" },
        h("div", { class: "mov__linha" }, h("strong", { class: "mov__nome" }, m.insumoNome), h("strong", { class: "mov__qtd" }, `${ehEntrada ? "+" : "−"}${qtdTexto(m.quantidade, m.unidadeMedida)}`)),
        h(
          "div",
          { class: "mov__linha mov__linha--meta" },
          h("span", { class: "mov__meta" }, chipMovimento(m.tipo), motivo ? h("span", null, motivo) : null, h("time", { datetime: m.data }, dataHora(m.data)), m.usuarioNome ? h("span", null, `por ${m.usuarioNome}`) : null),
          h("span", { class: "mov__valor", title: `${brl(m.valorUnitario)} por ${m.unidadeMedida}` }, brl(m.quantidade * m.valorUnitario)),
        ),
        m.observacao ? h("p", { class: "mov__obs", title: m.observacao }, m.observacao) : null,
      ),
    );
  }

  async function carregarHistorico({ silencioso = false } = {}) {
    if (!silencioso) listaEl.replaceChildren(esqueleto({ linhas: 4 }));
    const filtroTipo = estado.filtro === "entradas" ? "ENTRADA" : estado.filtro === "saidas" ? "SAIDA" : undefined;
    try {
      const movimentos = await listarMovimentacoes({ tipo: filtroTipo, limite: LIMITE_HISTORICO });
      if (!movimentos.length) {
        listaEl.replaceChildren(
          estadoVazio({
            titulo: estado.filtro === "todas" ? "Nenhuma movimentação ainda" : "Nada neste filtro",
            texto: estado.filtro === "todas" ? tela.vazio : "Ainda não há movimentações deste tipo.",
            ilustracao: false,
            iconeNome: "swap",
          }),
        );
        return;
      }
      listaEl.replaceChildren(h("ul", { class: "mov-lista" }, ...movimentos.map(itemMovimento)));
    } catch (erro) {
      listaEl.replaceChildren(h("div", { class: "mov-erro" }, banner({ tom: "erro", titulo: "Não foi possível carregar o histórico", mensagens: erro.message, assertivo: true, acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: () => carregarHistorico() }] })));
    }
  }

  function desenharFiltros() {
    filtrosEl.replaceChildren(
      ...[
        ["todas", "Todas"],
        ["entradas", "Entradas"],
        ["saidas", "Saídas"],
      ].map(([chave, rotulo]) =>
        h(
          "button",
          {
            type: "button",
            class: estado.filtro === chave ? "is-active" : "",
            "aria-pressed": String(estado.filtro === chave),
            onclick: () => {
              estado.filtro = chave;
              desenharFiltros();
              carregarHistorico();
            },
          },
          rotulo,
        ),
      ),
    );
  }

  /* ----- envio ----- */
  function limparFormulario() {
    qtdInput.value = "";
    valorInput.value = "";
    obsInput.value = "";
    for (const campo of [campoQtd, campoValor, campoObs, campoInsumo]) campo?.definirErro("");
    if (!entrada) {
      estado.motivo = "PRODUCAO";
      form.querySelector(`input[name="${nomeMotivo}"][value="PRODUCAO"]`).checked = true;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (estado.registrando) return;
    avisoEl.replaceChildren();

    const insumo = estado.insumo;
    const quantidade = lerNumero(qtdInput.value);
    const valorUnitario = lerNumero(valorInput.value);

    campoInsumo.definirErro(insumo ? "" : "Escolha um insumo da lista.");
    campoQtd.definirErro(quantidade > 0 ? "" : "Informe uma quantidade maior que zero.");
    campoValor?.definirErro(valorUnitario > 0 ? "" : "Informe um valor unitário maior que zero.");

    if (!insumo) return combo.input.focus();
    if (!(quantidade > 0)) return qtdInput.focus();
    if (entrada && !(valorUnitario > 0)) return valorInput.focus();

    const observacao = obsInput.value.trim() || undefined;
    estado.registrando = true;
    enviar.disabled = true;
    try {
      const resposta = entrada
        ? await registrarEntrada({ idInsumo: insumo.idInsumo, quantidade, valorUnitario, observacao })
        : await registrarSaida({ idInsumo: insumo.idInsumo, motivo: estado.motivo, quantidade, observacao });

      limparFormulario();
      layout.avisar(resposta?.message ?? (entrada ? "Entrada registrada." : "Saída registrada."), { tom: "ok" });
      await Promise.all([carregarInsumos(), carregarHistorico({ silencioso: true })]);
      aoMudarInsumo();
      qtdInput.focus();
    } catch (erro) {
      if (!entrada && /insuficiente/i.test(erro.message)) {
        // O saldo pode ter mudado desde que a tela abriu: atualiza e mostra o que há disponível.
        await carregarInsumos();
        aoMudarInsumo();
        const disponivel = estado.insumo ? ` Saldo disponível: ${qtdTexto(estado.insumo.quantidadeEstoque, estado.insumo.unidadeMedida)}.` : "";
        campoQtd.definirErro(`${erro.message}${disponivel}`);
        qtdInput.focus();
      } else {
        avisoEl.replaceChildren(banner({ tom: "erro", titulo: "Não foi possível registrar", mensagens: erro.message, assertivo: true }));
      }
    } finally {
      estado.registrando = false;
      enviar.disabled = false;
    }
  });

  desenharFiltros();
  desenharInsumo();
  desenharResumo();
  carregarInsumos();
  carregarHistorico();
}
