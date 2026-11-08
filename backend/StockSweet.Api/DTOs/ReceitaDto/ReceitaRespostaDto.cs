namespace StockSweet.Api.DTOs.ReceitaDto
{
    public class ReceitaRespostaDto
    {
        public int IdReceita { get; set; }

        public required string Nome { get; set; }

        public string? Descricao { get; set; }

        public decimal RendimentoReceita { get; set; }

        public required string UnidadeRendimento { get; set; }

        public DateTime DataCadastro { get; set; }

        public decimal MargemLucro { get; set; }

        public decimal MargemLucroMinima { get; set; }

        public int QuantidadeItens { get; set; }
    }
}
