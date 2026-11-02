using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.ReceitaDto
{
    public class AtualizarItemReceitaDto
    {
        // Na unidade de medida do próprio insumo.
        [Range(0.001, 999999999, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public decimal Quantidade { get; set; }
    }
}
