using StockSweet.Api.DTOs.CustoDto;

namespace StockSweet.Api.DTOs.PrecificacaoDto
{
    // De onde veio a margem usada no cálculo.
    public static class OrigemMargem
    {
        public const string Receita = "receita";
        public const string Padrao = "padrao";
    }

    // Tipos de alerta da precificação (os de custo continuam em TipoAlertaCusto).
    public static class TipoAlertaPrecificacao
    {
        public const string VariacaoCusto = "VariacaoCusto";
    }

    // Resposta de GET api/receitas/{id}/preco-sugerido (e o "calculo" do POST .../precificacao).
    public class PrecoSugeridoRespostaDto
    {
        public int IdReceita { get; set; }

        public required string NomeReceita { get; set; }

        public decimal RendimentoReceita { get; set; }

        public required string UnidadeRendimento { get; set; }

        // Custo da receita inteira e por unidade de rendimento.
        public decimal CustoProducao { get; set; }

        public decimal CustoPorUnidade { get; set; }

        // Margem efetiva (%, markup sobre o custo) e de onde ela vem: "receita" ou "padrao".
        public decimal MargemLucro { get; set; }

        public required string OrigemMargem { get; set; }

        // custo x (1 + margem/100), por unidade de rendimento e para a receita inteira.
        public decimal PrecoSugerido { get; set; }

        public decimal PrecoSugeridoTotal { get; set; }

        // Lucro sobre o PREÇO (lucro / preço, em %). Menor que a margem, que é sobre o custo.
        // Null quando o preço é 0 (custo zerado).
        public decimal? MargemReal { get; set; }

        // Comparação com o último snapshot salvo da receita (null se nunca foi salvo).
        public decimal? VariacaoCustoPercentual { get; set; }

        public decimal? CustoUltimoCalculo { get; set; }

        public DateTime? DataUltimoCalculo { get; set; }

        public DateTimeOffset CalculadoEm { get; set; }

        public List<AlertaCustoDto> Alertas { get; set; } = new();
    }
}
