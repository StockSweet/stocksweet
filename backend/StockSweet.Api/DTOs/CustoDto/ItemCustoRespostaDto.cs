namespace StockSweet.Api.DTOs.CustoDto
{
    public class ItemCustoRespostaDto
    {
        public int IdItem { get; set; }

        public int IdInsumo { get; set; }

        public required string NomeInsumo { get; set; }

        public required string UnidadeMedida { get; set; }

        public decimal Quantidade { get; set; }

        public decimal PrecoCompraAtual { get; set; }

        // Quantidade x PrecoCompraAtual, arredondado a 2 casas.
        public decimal CustoItem { get; set; }

        // Fatia do item no custo total (0 a 100, 2 casas). Calculada com os valores exatos.
        public decimal PercentualDoCusto { get; set; }
    }
}
