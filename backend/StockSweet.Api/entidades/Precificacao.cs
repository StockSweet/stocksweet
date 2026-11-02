using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    // Snapshot de um cálculo de preço salvo pelo Gestor. Nunca é alterado depois de gravado:
    // o histórico mostra o preço e o custo exatamente como estavam naquele dia.
    public class Precificacao
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int IdPrecificacao { get; set; }

        public int IdReceita { get; set; }

        public Receita? Receita { get; set; }

        // Em %, sobre o custo (markup) e já resolvida: a da receita ou a padrão no momento do cálculo.
        [Precision(5, 2)]
        public decimal MargemLucro { get; set; }

        // Custo total da receita inteira no momento do cálculo.
        [Precision(12, 2)]
        public decimal CustoProducao { get; set; }

        // CustoProducao ÷ rendimento da receita.
        [Precision(12, 2)]
        public decimal CustoPorUnidade { get; set; }

        // Preço de venda sugerido por unidade de rendimento (fatia, porção, kg...).
        [Precision(12, 2)]
        public decimal PrecoSugerido { get; set; }

        // Preço de venda sugerido para a receita inteira.
        [Precision(12, 2)]
        public decimal PrecoSugeridoTotal { get; set; }

        // Quem calculou e salvou.
        public int IdUsuario { get; set; }

        public Usuario? Usuario { get; set; }

        public DateTime DataCalculo { get; set; } = DateTime.Now;
    }
}
