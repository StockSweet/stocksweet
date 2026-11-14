using System.ComponentModel.DataAnnotations;

namespace StockSweet.Api.DTOs.InsumoDto
{
    // Cadastro e edição de insumo. O saldo não entra aqui: só muda por entrada e saída de mercadorias.
    public class InsumoDto
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        [StringLength(150, ErrorMessage = "O nome deve ter no máximo 150 caracteres.")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "A unidade de medida é obrigatória.")]
        [StringLength(20, ErrorMessage = "A unidade de medida deve ter no máximo 20 caracteres.")]
        public string UnidadeMedida { get; set; } = string.Empty;

        [Range(0, 999999999, ErrorMessage = "O preço de compra não pode ser negativo.")]
        public decimal PrecoCompra { get; set; }

        [Range(0, 999999999, ErrorMessage = "O estoque mínimo não pode ser negativo.")]
        public decimal EstoqueMinimo { get; set; }

        public int? IdFornecedor { get; set; }
    }
}
