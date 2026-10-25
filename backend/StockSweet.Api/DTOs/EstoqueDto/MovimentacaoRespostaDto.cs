using StockSweet.Api.entidades;

namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class MovimentacaoRespostaDto
    {
        public int Id { get; set; }

        public int IdInsumo { get; set; }

        public required string InsumoNome { get; set; }

        public required string UnidadeMedida { get; set; }

        public TipoMovimentacao Tipo { get; set; }

        public MotivoSaida? Motivo { get; set; }

        public decimal Quantidade { get; set; }

        public decimal ValorUnitario { get; set; }

        public DateTime Data { get; set; }

        public string? Observacao { get; set; }

        public required string UsuarioNome { get; set; }
    }
}
