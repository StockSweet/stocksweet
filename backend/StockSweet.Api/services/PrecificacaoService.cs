using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.ReceitaDto;

namespace StockSweet.Api.services
{
    public class PrecificacaoService
    {
        private readonly StockDbContext _context;

        public PrecificacaoService(StockDbContext context)
        {
            _context = context;
        }

        public async Task<PrecificacaoReceitaRespostaDto?> CalcularPrecificacaoReceita(int idReceita, decimal? margemSimulada = null)
        {
            var receita = await _context.Receita
                .AsNoTracking()
                .Include(r => r.Itens)
                    .ThenInclude(i => i.Insumo)
                .FirstOrDefaultAsync(r => r.IdReceita == idReceita);

            if (receita == null)
            {
                return null;
            }

            return MontarCalculoPrecificacao(receita, margemSimulada);
        }

        public async Task<List<PrecificacaoReceitaRespostaDto>> ListarPrecificacaoTodas()
        {
            var receitas = await _context.Receita
                .AsNoTracking()
                .Include(r => r.Itens)
                    .ThenInclude(i => i.Insumo)
                .OrderBy(r => r.Nome)
                .ToListAsync();

            return receitas.Select(r => MontarCalculoPrecificacao(r)).ToList();
        }

        private static PrecificacaoReceitaRespostaDto MontarCalculoPrecificacao(
            entidades.Receita receita,
            decimal? margemSimulada = null)
        {
            var itensDto = new List<InsumoPrecificacaoItemDto>();
            decimal custoTotalProducao = 0m;
            bool estoqueGeralSuficiente = true;
            decimal lotesPossiveisMin = decimal.MaxValue;

            foreach (var item in receita.Itens)
            {
                var insumo = item.Insumo;
                var precoAtual = insumo?.PrecoCompra ?? 0m;
                var subtotalItem = Math.Round(item.Quantidade * precoAtual, 2, MidpointRounding.AwayFromZero);
                custoTotalProducao += subtotalItem;

                var saldoEstoque = insumo?.QuantidadeEstoque ?? 0m;
                var suficiente = saldoEstoque >= item.Quantidade;
                var faltante = suficiente ? 0m : Math.Round(item.Quantidade - saldoEstoque, 3);

                if (!suficiente)
                {
                    estoqueGeralSuficiente = false;
                }

                if (item.Quantidade > 0)
                {
                    var lotesPossiveis = saldoEstoque / item.Quantidade;
                    if (lotesPossiveis < lotesPossiveisMin)
                    {
                        lotesPossiveisMin = lotesPossiveis;
                    }
                }

                itensDto.Add(new InsumoPrecificacaoItemDto
                {
                    IdInsumo = item.IdInsumo,
                    NomeInsumo = insumo?.Nome ?? "Insumo Desconhecido",
                    UnidadeMedida = insumo?.UnidadeMedida ?? string.Empty,
                    QuantidadeNecessaria = item.Quantidade,
                    PrecoCompraAtual = precoAtual,
                    CustoSubtotal = subtotalItem,
                    QuantidadeEstoque = saldoEstoque,
                    EstoqueMinimo = insumo?.EstoqueMinimo ?? 0m,
                    SaldoSuficiente = suficiente,
                    SaldoFaltante = faltante
                });
            }

            if (receita.Itens.Count == 0 || lotesPossiveisMin == decimal.MaxValue)
            {
                lotesPossiveisMin = 0;
            }

            var rendimento = receita.RendimentoReceita > 0 ? receita.RendimentoReceita : 1m;
            var custoUnitario = Math.Round(custoTotalProducao / rendimento, 2, MidpointRounding.AwayFromZero);

            var margemEfetiva = margemSimulada ?? receita.MargemLucro;
            var margemMinima = receita.MargemLucroMinima;

            // Preço Sugerido com base na margem de lucro (Markup sobre custo):
            // Preço = Custo * (1 + Margem% / 100)
            var fatorMargem = 1m + (margemEfetiva / 100m);
            var precoSugeridoLote = Math.Round(custoTotalProducao * fatorMargem, 2, MidpointRounding.AwayFromZero);
            var precoSugeridoUnitario = Math.Round(custoUnitario * fatorMargem, 2, MidpointRounding.AwayFromZero);

            var lucroLote = Math.Round(precoSugeridoLote - custoTotalProducao, 2, MidpointRounding.AwayFromZero);
            var lucroUnitario = Math.Round(precoSugeridoUnitario - custoUnitario, 2, MidpointRounding.AwayFromZero);

            // Preço mínimo de segurança
            var fatorMinimo = 1m + (margemMinima / 100m);
            var precoMinimoSegurancaUnitario = Math.Round(custoUnitario * fatorMinimo, 2, MidpointRounding.AwayFromZero);

            return new PrecificacaoReceitaRespostaDto
            {
                IdReceita = receita.IdReceita,
                Nome = receita.Nome,
                RendimentoReceita = receita.RendimentoReceita,
                UnidadeRendimento = receita.UnidadeRendimento,
                CustoTotalProducao = custoTotalProducao,
                CustoUnitarioProducao = custoUnitario,
                MargemLucroDefinida = margemEfetiva,
                MargemLucroMinima = margemMinima,
                PrecoSugeridoLote = precoSugeridoLote,
                PrecoSugeridoUnitario = precoSugeridoUnitario,
                LucroEsperadoLote = lucroLote,
                LucroEsperadoUnitario = lucroUnitario,
                PrecoMinimoSegurancaUnitario = precoMinimoSegurancaUnitario,
                TemEstoqueSuficiente = estoqueGeralSuficiente,
                QuantidadeMaximaLotesPossiveis = (int)Math.Floor(lotesPossiveisMin),
                ItensFichaTecnica = itensDto
            };
        }
    }
}

