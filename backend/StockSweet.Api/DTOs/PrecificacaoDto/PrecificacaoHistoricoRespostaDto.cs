namespace StockSweet.Api.DTOs.PrecificacaoDto
{
    // Um snapshot salvo (GET api/receitas/{id}/precificacao/historico).
    public class PrecificacaoHistoricoRespostaDto
    {
        public int IdPrecificacao { get; set; }

        public int IdReceita { get; set; }

        public decimal MargemLucro { get; set; }

        public decimal CustoProducao { get; set; }

        public decimal CustoPorUnidade { get; set; }

        public decimal PrecoSugerido { get; set; }

        public decimal PrecoSugeridoTotal { get; set; }

        public decimal? MargemReal { get; set; }

        public int IdUsuario { get; set; }

        public string? NomeUsuario { get; set; }

        public DateTime DataCalculo { get; set; }
    }
}
