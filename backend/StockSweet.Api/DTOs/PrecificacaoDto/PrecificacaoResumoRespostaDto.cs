namespace StockSweet.Api.DTOs.PrecificacaoDto
{
    // Último preço salvo de uma receita, dentro de uma linha de GET api/precificacao.
    public class UltimoPrecoDto
    {
        public int IdPrecificacao { get; set; }

        public decimal MargemLucro { get; set; }

        public decimal CustoProducao { get; set; }

        public decimal PrecoSugerido { get; set; }

        public decimal PrecoSugeridoTotal { get; set; }

        public DateTime DataCalculo { get; set; }
    }

    // Uma linha de GET api/precificacao: o preço de hoje x o último preço salvo.
    public class PrecificacaoResumoRespostaDto
    {
        public int IdReceita { get; set; }

        public required string Nome { get; set; }

        public decimal RendimentoReceita { get; set; }

        public required string UnidadeRendimento { get; set; }

        public int QuantidadeItens { get; set; }

        // Custo atual (ao vivo).
        public decimal CustoProducao { get; set; }

        public decimal CustoPorUnidade { get; set; }

        // Margem efetiva e sua origem ("receita" ou "padrao"), mais a margem própria da receita (se houver).
        public decimal MargemLucro { get; set; }

        public required string OrigemMargem { get; set; }

        public decimal? MargemReceita { get; set; }

        // Preço que seria sugerido hoje.
        public decimal PrecoSugerido { get; set; }

        public decimal PrecoSugeridoTotal { get; set; }

        // Receita sem itens, insumo com preço 0 ou insumo sem saldo (mesmos alertas do custo).
        public bool PossuiAlertas { get; set; }

        // Último snapshot salvo; null se a receita nunca teve o preço salvo.
        public UltimoPrecoDto? UltimoPreco { get; set; }

        // O custo atual difere do custo do último snapshot: o preço salvo ficou velho.
        // Sempre false quando não há preço salvo.
        public bool Desatualizado { get; set; }

        // Variação % do custo atual sobre o do último snapshot (null sem snapshot).
        public decimal? VariacaoCustoPercentual { get; set; }

        // A margem efetiva de hoje difere da usada no último snapshot.
        public bool MargemAlterada { get; set; }
    }
}
