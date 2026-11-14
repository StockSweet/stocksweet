using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockSweet.Api.entidades
{
    // Parceiro comercial que fornece insumos (RF01). Um fornecedor pode prover vários insumos.
    public class Fornecedor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdFornecedor { get; set; }

        [Required]
        [StringLength(150)]
        public required string Nome { get; set; }

        [StringLength(30)]
        public string? Telefone { get; set; }

        [StringLength(255)]
        public string? Email { get; set; }

        [StringLength(300)]
        public string? Endereco { get; set; }

        [StringLength(500)]
        public string? Observacao { get; set; }
    }
}
