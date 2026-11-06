using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    public class Receita
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdReceita { get; set; }

        [Required]
        [StringLength(150)]
        public required string Nome { get; set; }

        [StringLength(500)]
        public string? Descricao { get; set; }

        // Quanto a receita rende, na unidade de UnidadeRendimento.
        [Precision(12, 3)]
        public decimal RendimentoReceita { get; set; }

        // Ex.: "porções", "fatias", "kg".
        [Required]
        [StringLength(20)]
        public required string UnidadeRendimento { get; set; }

        public DateTime DataCadastro { get; set; } = DateTime.Now;

        // Margem de lucro desejada em percentual (ex: 60.00 para 60%). Padrão: 50%.
        [Precision(5, 2)]
        public decimal MargemLucro { get; set; } = 50.00m;

        // Margem mínima de segurança (ex: 20.00 para 20%). Preço sugerido não deve ficar abaixo deste limite.
        [Precision(5, 2)]
        public decimal MargemLucroMinima { get; set; } = 20.00m;

        public List<ItemReceita> Itens { get; set; } = new();
    }
}
