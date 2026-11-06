using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.ReceitaDto
{
    // DTO para atualização rápida da margem de lucro e margem mínima
    public class DefinirMargemLucroDto
    {
        [Required(ErrorMessage = "A margem de lucro é obrigatória.")]
        [Range(0, 500, ErrorMessage = "A margem de lucro deve estar entre 0% e 500%.")]
        public decimal MargemLucro { get; set; }

        [Range(0, 500, ErrorMessage = "A margem de lucro mínima deve estar entre 0% e 500%.")]
        public decimal? MargemLucroMinima { get; set; }
    }

    // DTO com os cálculos completos de custos, estoque e precificação sugerida
    public class PrecificacaoReceitaRespostaDto
    {
        public int IdReceita { get; set; }
        public required string Nome { get; set; }
        public decimal RendimentoReceita { get; set; }
        public required string UnidadeRendimento { get; set; }

        // Custos calculados em tempo real a partir dos preços atuais de compra do estoque
        public decimal CustoTotalProducao { get; set; }
        public decimal CustoUnitarioProducao { get; set; }

        // Margens
        public decimal MargemLucroDefinida { get; set; }
        public decimal MargemLucroMinima { get; set; }

        // Precificação sugerida (Markup / Margem sobre Custo)
        public decimal PrecoSugeridoLote { get; set; }
        public decimal PrecoSugeridoUnitario { get; set; }
        public decimal LucroEsperadoLote { get; set; }
        public decimal LucroEsperadoUnitario { get; set; }

        // Precificação pelo Piso / Margem Mínima de Segurança
        public decimal PrecoMinimoSegurancaUnitario { get; set; }

        // Diagnóstico integrado com o estoque
        public bool TemEstoqueSuficiente { get; set; }
        public int QuantidadeMaximaLotesPossiveis { get; set; }
        public List<InsumoPrecificacaoItemDto> ItensFichaTecnica { get; set; } = new();
    }

    public class InsumoPrecificacaoItemDto
    {
        public int IdInsumo { get; set; }
        public required string NomeInsumo { get; set; }
        public required string UnidadeMedida { get; set; }
        public decimal QuantidadeNecessaria { get; set; }
        public decimal PrecoCompraAtual { get; set; }
        public decimal CustoSubtotal { get; set; }
        public decimal QuantidadeEstoque { get; set; }
        public decimal EstoqueMinimo { get; set; }
        public bool SaldoSuficiente { get; set; }
        public decimal SaldoFaltante { get; set; }
    }
}

