using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    public class MovimentacaoEstoque
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdMovimentacao { get; set; }

        public int IdInsumo { get; set; }
        public Insumo? Insumo { get; set; }

        // Quem registrou a movimentação.
        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }

        [Required]
        public TipoMovimentacao Tipo { get; set; }

        // Só preenchido nas saídas.
        public MotivoSaida? Motivo { get; set; }

        [Precision(12, 3)]
        public decimal Quantidade { get; set; }

        // Entrada: valor pago. Saída: preço de compra do insumo no momento da baixa.
        [Precision(12, 2)]
        public decimal ValorUnitario { get; set; }

        public DateTime Data { get; set; } = DateTime.Now;

        [StringLength(500)]
        public string? Observacao { get; set; }
    }
}
