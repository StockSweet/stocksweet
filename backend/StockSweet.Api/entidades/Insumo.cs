using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    public class Insumo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdInsumo { get; set; }

        [Required]
        [StringLength(150)]
        public required string Nome { get; set; }

        [Required]
        [StringLength(20)]
        public required string UnidadeMedida { get; set; }

        // Saldo atual. Só é alterado pelas movimentações de entrada e saída.
        [Precision(12, 3)]
        public decimal QuantidadeEstoque { get; set; }

        // Último valor unitário pago (atualizado a cada entrada).
        [Precision(12, 2)]
        public decimal PrecoCompra { get; set; }

        [Precision(12, 3)]
        public decimal EstoqueMinimo { get; set; }
    }
}
