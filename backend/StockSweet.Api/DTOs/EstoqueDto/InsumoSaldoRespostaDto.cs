namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class InsumoSaldoRespostaDto
    {
        public int IdInsumo { get; set; }
        public required string Nome { get; set; }
        public required string UnidadeMedida { get; set; }
        public decimal QuantidadeEstoque { get; set; }
        public decimal EstoqueMinimo { get; set; }
        public required string Nivel { get; set; }
    }
}
