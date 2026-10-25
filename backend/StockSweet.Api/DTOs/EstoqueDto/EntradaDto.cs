using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.EstoqueDto
{
    public class EntradaDto
    {
        [Required(ErrorMessage = "O insumo é obrigatório.")]
        public int? IdInsumo { get; set; }

        [Range(0.001, 999999999, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public decimal Quantidade { get; set; }

        [Range(0.01, 999999999, ErrorMessage = "O valor unitário deve ser maior que zero.")]
        public decimal ValorUnitario { get; set; }

        [StringLength(500, ErrorMessage = "A observação deve ter no máximo 500 caracteres.")]
        public string? Observacao { get; set; }
    }
}
