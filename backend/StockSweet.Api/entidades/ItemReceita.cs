using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    // Linha da ficha técnica: quanto de um insumo a receita usa.
    // O valor do item não é gravado: o PrecoCompra do insumo muda a cada entrada
    // de estoque, então o custo é calculado ao vivo (Quantidade * PrecoCompra).
    public class ItemReceita
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdItem { get; set; }

        public int IdReceita { get; set; }

        public Receita? Receita { get; set; }

        public int IdInsumo { get; set; }

        public Insumo? Insumo { get; set; }

        // Sempre na UnidadeMedida do próprio insumo.
        [Precision(12, 3)]
        public decimal Quantidade { get; set; }
    }
}
