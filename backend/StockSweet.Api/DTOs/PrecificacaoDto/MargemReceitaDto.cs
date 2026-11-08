using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.PrecificacaoDto
{
    // Corpo de PUT api/receitas/{id}/margem.
    public class MargemReceitaDto
    {
        // Em %, sobre o custo. Null remove a margem própria e a receita volta a usar a padrão.
        [Range(0, 999.99, ErrorMessage = "A margem deve estar entre 0 e 999,99%.")]
        public decimal? MargemLucro { get; set; }
    }
}
