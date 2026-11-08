using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.PrecificacaoDto
{
    // Corpo de PUT api/precificacao/margem e resposta de GET api/precificacao/margem.
    public class MargemPadraoDto
    {
        // Em %, sobre o custo. De 0 até 999,99 (a margem é decimal(5,2) e deve ser menor que 1000).
        [Required(ErrorMessage = "A margem padrão é obrigatória.")]
        [Range(0, 999.99, ErrorMessage = "A margem deve estar entre 0 e 999,99%.")]
        public decimal? MargemPadrao { get; set; }
    }
}
