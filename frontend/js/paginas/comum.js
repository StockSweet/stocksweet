// Peças repetidas pelas telas de cadastro (insumos e fornecedores).
import { h, icon } from "../dashboard/dom.js";
import { banner } from "../componentes.js";

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function linkVoltar(rotulo, href) {
  return h("a", { class: "back-link", href }, icon("arrow-left", 16), rotulo);
}

export function bannerDeFalha(mensagem, aoTentarDeNovo) {
  return banner({
    tom: "erro",
    titulo: "Não foi possível carregar",
    mensagens: mensagem,
    assertivo: true,
    acoes: [{ rotulo: "Tentar de novo", icone: "refresh", onClick: aoTentarDeNovo }],
  });
}

// Erros de rede ganham "Tentar de novo"; os de regra (409, 404…) só a mensagem.
export function avisarFalha(layout, erro, retentar) {
  const rede = /conectar ao servidor/i.test(erro.message);
  layout.avisar(erro.message, {
    tom: "erro",
    duracao: 8000,
    acao: rede && retentar ? { label: "Tentar de novo", onClick: retentar } : undefined,
  });
}
