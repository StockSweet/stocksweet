using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.ReceitaDto
{
    public class ReceitaDto
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        [StringLength(150, ErrorMessage = "O nome deve ter no máximo 150 caracteres.")]
        public string Nome { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "A descrição deve ter no máximo 500 caracteres.")]
        public string? Descricao { get; set; }

        [Range(0.001, 999999999, ErrorMessage = "O rendimento deve ser maior que zero.")]
        public decimal RendimentoReceita { get; set; }

        [Required(ErrorMessage = "A unidade de rendimento é obrigatória.")]
        [StringLength(20, ErrorMessage = "A unidade de rendimento deve ter no máximo 20 caracteres.")]
        public string UnidadeRendimento { get; set; } = string.Empty;
    }
}
