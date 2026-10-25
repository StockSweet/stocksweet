using System.ComponentModel.DataAnnotations;
using StockSweet.Api.entidades;

namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class SaidaDto
    {
        [Required(ErrorMessage = "O insumo é obrigatório.")]
        public int? IdInsumo { get; set; }

        [Required(ErrorMessage = "O motivo da saída é obrigatório.")]
        public MotivoSaida? Motivo { get; set; }

        [Range(0.001, 999999999, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public decimal Quantidade { get; set; }

        [StringLength(500, ErrorMessage = "A observação deve ter no máximo 500 caracteres.")]
        public string? Observacao { get; set; }
    }
}
