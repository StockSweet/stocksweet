namespace StockSweet.Api.DTOs.CustoDto
{
    // Uma linha de GET api/receitas/custos.
    public class CustoResumoRespostaDto
    {
        public int IdReceita { get; set; }

        public required string Nome { get; set; }

        public decimal CustoTotal { get; set; }

        public decimal CustoPorUnidade { get; set; }

        public int QuantidadeItens { get; set; }

        // Receita sem itens, insumo com preço 0 ou insumo sem saldo para uma receita.
        public bool PossuiAlertas { get; set; }
    }
}
