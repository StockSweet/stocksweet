namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class InsumoRespostaDto
    {
        public int IdInsumo { get; set; }

        public required string Nome { get; set; }

        public required string UnidadeMedida { get; set; }

        public decimal QuantidadeEstoque { get; set; }

        public decimal PrecoCompra { get; set; }

        public decimal EstoqueMinimo { get; set; }
    }
}
