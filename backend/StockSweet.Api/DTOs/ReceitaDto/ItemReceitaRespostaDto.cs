namespace StockSweet.Api.DTOs.ReceitaDto
{
    public class ItemReceitaRespostaDto
    {
        public int IdItem { get; set; }

        public int IdInsumo { get; set; }

        public required string NomeInsumo { get; set; }

        public required string UnidadeMedida { get; set; }

        public decimal Quantidade { get; set; }

        public decimal PrecoCompraAtual { get; set; }

        // Calculado ao vivo com o preço atual do insumo; não é gravado no banco.
        public decimal ValorItem =>
            Math.Round(Quantidade * PrecoCompraAtual, 2, MidpointRounding.AwayFromZero);
    }
}
