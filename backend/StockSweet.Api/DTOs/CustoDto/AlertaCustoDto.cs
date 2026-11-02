namespace StockSweet.Api.DTOs.CustoDto
{
    // Tipos de alerta que o cálculo de custo pode devolver.
    public static class TipoAlertaCusto
    {
        public const string ReceitaSemItens = "ReceitaSemItens";
        public const string PrecoZerado = "PrecoZerado";
        public const string EstoqueInsuficiente = "EstoqueInsuficiente";
    }

    public class AlertaCustoDto
    {
        public required string Tipo { get; set; }

        public required string Mensagem { get; set; }

        // Preenchidos só nos alertas que dizem respeito a um insumo.
        public int? IdInsumo { get; set; }

        public string? NomeInsumo { get; set; }

        // Só em EstoqueInsuficiente: quanto falta (na unidade do insumo) pra produzir uma receita.
        public decimal? QuantidadeFaltante { get; set; }

        public string? UnidadeMedida { get; set; }
    }
}
