namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class DashboardSaldoRespostaDto
    {
        public ResumoEstoqueDto Resumo { get; set; } = new();
        public List<InsumoDashboardDto> Insumos { get; set; } = new();
        public List<MovimentacaoRecenteDto> UltimasMovimentacoes { get; set; } = new();
        public List<ConsumoInsumoDto> TopConsumo { get; set; } = new();
    }

    public class ResumoEstoqueDto
    {
        public int TotalInsumos { get; set; }
        public int InsumosEmAlerta { get; set; }
        public int InsumosCriticos { get; set; }
        public int InsumosAdequados { get; set; }
        public decimal ValorTotalEstoque { get; set; }
        public decimal IndiceSaudeEstoque { get; set; } // percentual 0-100% de insumos ok
    }

    public class InsumoDashboardDto
    {
        public int IdInsumo { get; set; }
        public required string Nome { get; set; }
        public required string UnidadeMedida { get; set; }
        public decimal QuantidadeEstoque { get; set; }
        public decimal EstoqueMinimo { get; set; }
        public decimal PrecoCompra { get; set; }
        public decimal ValorTotalItem { get; set; }
        public decimal PercentualEstoqueMinimo { get; set; }
        public decimal QuantidadeParaRepor { get; set; }
        public required string Situacao { get; set; } // "critico", "baixo", "ok"
    }

    public class MovimentacaoRecenteDto
    {
        public int IdMovimentacao { get; set; }
        public DateTime Data { get; set; }
        public required string Tipo { get; set; }
        public string? Motivo { get; set; }
        public int IdInsumo { get; set; }
        public required string NomeInsumo { get; set; }
        public required string UnidadeMedida { get; set; }
        public decimal Quantidade { get; set; }
        public decimal? ValorUnitario { get; set; }
        public decimal? ValorTotal { get; set; }
        public required string UsuarioNome { get; set; }
    }

    public class ConsumoInsumoDto
    {
        public int IdInsumo { get; set; }
        public required string Nome { get; set; }
        public required string UnidadeMedida { get; set; }
        public decimal QuantidadeConsumida { get; set; }
        public decimal? ValorTotalConsumido { get; set; }
    }
}

