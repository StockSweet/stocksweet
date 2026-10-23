// ==========================================
// STOCKSWEET - SERVIÇO DE SIMULAÇÃO (MOCK)
// ==========================================
// Este ficheiro simula as respostas de um servidor backend
// permitindo testar a interface de entrada de mercadorias de forma independente.

// 1. Base de dados simulada de insumos da confeitaria
const insumosMock = [
  { idInsumo: 1, nome: "Açúcar Cristal", unidadeMedida: "kg" },
  { idInsumo: 2, nome: "Farinha de Trigo", unidadeMedida: "kg" },
  { idInsumo: 3, nome: "Leite Condensado", unidadeMedida: "un" }
];

/**
 * 2. Função assíncrona que simula a busca de insumos do servidor 
 * (Futuramente será substituída por um fetch GET para a API do .NET)
 */
function obterInsumosSimulados() {
  return new Promise((resolve) => {
    // Simula um atraso de rede (latência de 300ms) idêntico a uma requisição real
    setTimeout(() => {
      resolve(insumosMock);
    }, 300);
  });
}

/**
 * 3. Função assíncrona que simula o envio do registo de entrada para o servidor
 * (Futuramente será substituída por um fetch POST enviando os dados em JSON)
 * @param {Object} dadosMovimentacao - Objeto contendo os dados preenchidos no formulário
 */
function registrarEntradaSimulada(dadosMovimentacao) {
  return new Promise((resolve, reject) => {
    // Simula o tempo de processamento do servidor (500ms)
    setTimeout(() => {
      // Validação de regras de negócio no lado do "servidor simulado"
      if (dadosMovimentacao.quantidade <= 0 || dadosMovimentacao.valorUnitario <= 0) {
        // Se houver erro, rejeita a promessa com uma mensagem explicativa
        reject("A quantidade e o valor unitário devem ser maiores que zero.");
      } else {
        // Se estiver tudo correto, exibe no console para auditoria e retorna sucesso
        console.log("Movimentação Registrada com sucesso (Mock):", dadosMovimentacao);
        resolve({ 
          sucesso: true, 
          mensagem: "Entrada de mercadoria registrada com sucesso!" 
        });
      }
    }, 500);
  });
}

/**
 * 4. Função assíncrona que simula o envio do registro de saída para o servidor
 * @param {Object} dadosSaida - Objeto contendo os dados do formulário de baixa/saída
 */
function registrarSaidaSimulada(dadosSaida) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Validação: Quantidade deve ser maior que zero
      if (dadosSaida.quantidade <= 0) {
        reject("A quantidade de saída deve ser maior que zero.");
      } else {
        console.log("Saída Registrada com sucesso (Mock):", dadosSaida);
        resolve({ 
          sucesso: true, 
          mensagem: "Saída de mercadoria registrada com sucesso!" 
        });
      }
    }, 500);
  });
}