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

        public List<ItemReceita> Itens { get; set; } = new();
    }
}
