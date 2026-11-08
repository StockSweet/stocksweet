using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StockSweet.Api.entidades
{
    // Configuração global da precificação. A tabela tem sempre UMA linha (IdConfiguracao = 1,
    // criada pela migration): é a margem usada pelas receitas que não têm margem própria.
    public class ConfiguracaoPrecificacao
    {
        public const int IdUnico = 1;
        public const decimal MargemPadraoInicial = 30m;

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int IdConfiguracao { get; set; } = IdUnico;

        // Em %, sobre o custo (markup).
        [Precision(5, 2)]
        public decimal MargemPadrao { get; set; } = MargemPadraoInicial;
    }
}
