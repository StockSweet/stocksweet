namespace StockSweet.Api.DTOs.CustoDto
{
    // Resposta de GET api/receitas/{id}/custo. Também é o resultado de
    // CustoService.CalcularCustoReceita, que outras funcionalidades (ex.: precificação) reaproveitam.
    public class CustoReceitaRespostaDto
    {
        public int IdReceita { get; set; }

        public required string NomeReceita { get; set; }

        public decimal RendimentoReceita { get; set; }

        public required string UnidadeRendimento { get; set; }

        public decimal CustoTotal { get; set; }

        public decimal CustoPorUnidade { get; set; }

        public DateTimeOffset CalculadoEm { get; set; }

        public List<ItemCustoRespostaDto> Itens { get; set; } = new();

        public List<AlertaCustoDto> Alertas { get; set; } = new();
    }
}
