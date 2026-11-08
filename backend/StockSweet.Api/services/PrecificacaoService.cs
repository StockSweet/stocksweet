using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.CustoDto;
using StockSweet.Api.DTOs.PrecificacaoDto;
using StockSweet.Api.entidades;

namespace StockSweet.Api.services
{
    public enum ErroPrecificacao
    {
        Nenhum,
        ReceitaNaoEncontrada,
        ReceitaSemItens,
        CustoZerado,
        UsuarioNaoEncontrado,
    }

    // Sugestão de preço (RF05) e margem de lucro (RF08).
    //
    // FÓRMULA (markup sobre o custo):
    //   precoSugerido      = custoPorUnidade x (1 + margem / 100)   (por unidade de rendimento)
    //   precoSugeridoTotal = custoTotal      x (1 + margem / 100)   (receita inteira)
    //   margemReal         = (preço - custo) / preço                (lucro sobre o PREÇO) = margem / (100 + margem)
    //
    // O custo vem do CustoService, ao vivo. Tudo em decimal e sem arredondar no meio do caminho:
    // o custo usado é a soma EXATA (quantidade x precoCompra) e só o resultado é arredondado
    // (2 casas, AwayFromZero). Por isso o preço não sai do custoPorUnidade já arredondado.
    //
    // Margem efetiva = a da receita; sem margem própria, a padrão (ConfiguracaoPrecificacao).
    public class PrecificacaoService
    {
        private const int CasasDecimais = 2;

        // Variação de custo (em %, módulo) a partir da qual o gestor recebe o alerta de reavaliar o preço.
        public const decimal LimiteVariacaoCusto = 5m;

        private static readonly System.Globalization.CultureInfo CulturaBR = new("pt-BR");

        private readonly StockDbContext _context;
        private readonly CustoService _custoService;

        public PrecificacaoService(StockDbContext context, CustoService custoService)
        {
            _context = context;
            _custoService = custoService;
        }

        /* ------------------------- Margens ------------------------- */

        public async Task<decimal> ObterMargemPadrao()
        {
            var configuracao = await _context.ConfiguracaoPrecificacao
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdConfiguracao == ConfiguracaoPrecificacao.IdUnico);

            return configuracao?.MargemPadrao ?? ConfiguracaoPrecificacao.MargemPadraoInicial;
        }

        public async Task DefinirMargemPadrao(decimal margem)
        {
            var configuracao = await _context.ConfiguracaoPrecificacao
                .FirstOrDefaultAsync(c => c.IdConfiguracao == ConfiguracaoPrecificacao.IdUnico);

            if (configuracao == null)
            {
                _context.ConfiguracaoPrecificacao.Add(new ConfiguracaoPrecificacao { MargemPadrao = margem });
            }
            else
            {
                configuracao.MargemPadrao = margem;
            }

            await _context.SaveChangesAsync();
        }

        // Null limpa a margem própria. Devolve false se a receita não existir.
        public async Task<bool> DefinirMargemReceita(int idReceita, decimal? margem)
        {
            var receita = await _context.Receita.FirstOrDefaultAsync(r => r.IdReceita == idReceita);

            if (receita == null)
            {
                return false;
            }

            receita.MargemLucro = margem;
            await _context.SaveChangesAsync();

            return true;
        }

        // Margem com no máximo 2 casas (a coluna é decimal(5,2)): valor com mais casas é rejeitado, não arredondado.
        public static bool MargemValida(decimal margem)
        {
            return margem >= 0 && margem < 1000 && decimal.Round(margem, CasasDecimais) == margem;
        }

        /* ------------------------- Cálculo ------------------------- */

        // Calcula ao vivo, sem salvar. Receita sem itens não tem preço: erro ReceitaSemItens.
        public async Task<(PrecoSugeridoRespostaDto? Resultado, ErroPrecificacao Erro)> CalcularPrecoSugerido(int idReceita)
        {
            var custo = await _custoService.CalcularCustoReceita(idReceita);

            if (custo == null)
            {
                return (null, ErroPrecificacao.ReceitaNaoEncontrada);
            }

            if (custo.Itens.Count == 0)
            {
                return (null, ErroPrecificacao.ReceitaSemItens);
            }

            var margemReceita = await _context.Receita
                .AsNoTracking()
                .Where(r => r.IdReceita == idReceita)
                .Select(r => r.MargemLucro)
                .FirstOrDefaultAsync();

            var margemPadrao = await ObterMargemPadrao();
            var margem = margemReceita ?? margemPadrao;

            var ultimo = await _context.Precificacao
                .AsNoTracking()
                .Where(p => p.IdReceita == idReceita)
                .OrderByDescending(p => p.DataCalculo)
                .ThenByDescending(p => p.IdPrecificacao)
                .Select(p => new { p.CustoProducao, p.DataCalculo })
                .FirstOrDefaultAsync();

            // Soma exata dos itens (o CustoTotal do DTO já vem arredondado).
            var custoExato = custo.Itens.Sum(i => i.Quantidade * i.PrecoCompraAtual);
            var (precoUnidade, precoTotal) = CalcularPreco(custoExato, custo.RendimentoReceita, margem);

            var resultado = new PrecoSugeridoRespostaDto
            {
                IdReceita = custo.IdReceita,
                NomeReceita = custo.NomeReceita,
                RendimentoReceita = custo.RendimentoReceita,
                UnidadeRendimento = custo.UnidadeRendimento,
                CustoProducao = custo.CustoTotal,
                CustoPorUnidade = custo.CustoPorUnidade,
                MargemLucro = margem,
                OrigemMargem = margemReceita != null ? OrigemMargem.Receita : OrigemMargem.Padrao,
                PrecoSugerido = precoUnidade,
                PrecoSugeridoTotal = precoTotal,
                MargemReal = CalcularMargemReal(margem, precoTotal),
                CalculadoEm = custo.CalculadoEm,
                Alertas = custo.Alertas,
            };

            if (ultimo != null)
            {
                resultado.CustoUltimoCalculo = ultimo.CustoProducao;
                resultado.DataUltimoCalculo = ultimo.DataCalculo;
                resultado.VariacaoCustoPercentual = CalcularVariacao(custo.CustoTotal, ultimo.CustoProducao);

                var alerta = CriarAlertaDeVariacao(resultado.VariacaoCustoPercentual, ultimo.DataCalculo);
                if (alerta != null)
                {
                    resultado.Alertas.Add(alerta);
                }
            }

            return (resultado, ErroPrecificacao.Nenhum);
        }

        // Faz o mesmo cálculo e grava o snapshot. Custo total zerado (todos os insumos sem preço)
        // não é salvo: um preço de R$ 0,00 no histórico não diz nada e estragaria a comparação seguinte.
        public async Task<(Precificacao? Snapshot, PrecoSugeridoRespostaDto? Calculo, ErroPrecificacao Erro)> SalvarPrecificacao(
            int idReceita, int idUsuario)
        {
            var (calculo, erro) = await CalcularPrecoSugerido(idReceita);

            if (calculo == null)
            {
                return (null, null, erro);
            }

            if (calculo.CustoProducao <= 0)
            {
                return (null, calculo, ErroPrecificacao.CustoZerado);
            }

            if (!await _context.Usuario.AnyAsync(u => u.IdUsuario == idUsuario))
            {
                return (null, calculo, ErroPrecificacao.UsuarioNaoEncontrado);
            }

            var snapshot = new Precificacao
            {
                IdReceita = idReceita,
                MargemLucro = calculo.MargemLucro,
                CustoProducao = calculo.CustoProducao,
                CustoPorUnidade = calculo.CustoPorUnidade,
                PrecoSugerido = calculo.PrecoSugerido,
                PrecoSugeridoTotal = calculo.PrecoSugeridoTotal,
                IdUsuario = idUsuario,
                DataCalculo = DateTime.Now,
            };

            _context.Precificacao.Add(snapshot);
            await _context.SaveChangesAsync();

            return (snapshot, calculo, ErroPrecificacao.Nenhum);
        }

        // Snapshots da receita, mais recentes primeiro. Null se a receita não existir.
        public async Task<List<PrecificacaoHistoricoRespostaDto>?> ListarHistorico(int idReceita, int limite)
        {
            if (!await _context.Receita.AnyAsync(r => r.IdReceita == idReceita))
            {
                return null;
            }

            var linhas = await _context.Precificacao
                .AsNoTracking()
                .Where(p => p.IdReceita == idReceita)
                .OrderByDescending(p => p.DataCalculo)
                .ThenByDescending(p => p.IdPrecificacao)
                .Take(limite)
                .Select(p => new
                {
                    p.IdPrecificacao,
                    p.IdReceita,
                    p.MargemLucro,
                    p.CustoProducao,
                    p.CustoPorUnidade,
                    p.PrecoSugerido,
                    p.PrecoSugeridoTotal,
                    p.IdUsuario,
                    NomeUsuario = p.Usuario!.Nome,
                    p.DataCalculo,
                })
                .ToListAsync();

            return linhas
                .Select(l => new PrecificacaoHistoricoRespostaDto
                {
                    IdPrecificacao = l.IdPrecificacao,
                    IdReceita = l.IdReceita,
                    MargemLucro = l.MargemLucro,
                    CustoProducao = l.CustoProducao,
                    CustoPorUnidade = l.CustoPorUnidade,
                    PrecoSugerido = l.PrecoSugerido,
                    PrecoSugeridoTotal = l.PrecoSugeridoTotal,
                    MargemReal = CalcularMargemReal(l.MargemLucro, l.PrecoSugeridoTotal),
                    IdUsuario = l.IdUsuario,
                    NomeUsuario = l.NomeUsuario,
                    DataCalculo = l.DataCalculo,
                })
                .ToList();
        }

        // Visão geral: todas as receitas com o custo e o preço de hoje x o último preço salvo.
        // Três consultas no total (receitas com o custo agregado, margem padrão, últimos snapshots),
        // independente do número de receitas.
        public async Task<List<PrecificacaoResumoRespostaDto>> ResumirPrecificacao()
        {
            var receitas = await _context.Receita
                .AsNoTracking()
                .OrderBy(r => r.Nome)
                .Select(r => new
                {
                    r.IdReceita,
                    r.Nome,
                    r.RendimentoReceita,
                    r.UnidadeRendimento,
                    r.MargemLucro,
                    CustoTotal = r.Itens.Sum(i => i.Quantidade * i.Insumo!.PrecoCompra),
                    QuantidadeItens = r.Itens.Count,
                    ItemSemPreco = r.Itens.Any(i => i.Insumo!.PrecoCompra == 0),
                    ItemSemSaldo = r.Itens.Any(i => i.Insumo!.QuantidadeEstoque < i.Quantidade),
                })
                .ToListAsync();

            var margemPadrao = await ObterMargemPadrao();

            // Último snapshot de cada receita: o que não tem outro mais novo da mesma receita.
            var ultimos = (await _context.Precificacao
                .AsNoTracking()
                .Where(p => !_context.Precificacao.Any(o => o.IdReceita == p.IdReceita
                    && (o.DataCalculo > p.DataCalculo
                        || (o.DataCalculo == p.DataCalculo && o.IdPrecificacao > p.IdPrecificacao))))
                .ToListAsync())
                .GroupBy(p => p.IdReceita)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.IdPrecificacao).First());

            var resumo = new List<PrecificacaoResumoRespostaDto>();

            foreach (var r in receitas)
            {
                var margem = r.MargemLucro ?? margemPadrao;
                var custoTotal = Arredondar(r.CustoTotal);
                var (precoUnidade, precoTotal) = CalcularPreco(r.CustoTotal, r.RendimentoReceita, margem);

                var linha = new PrecificacaoResumoRespostaDto
                {
                    IdReceita = r.IdReceita,
                    Nome = r.Nome,
                    RendimentoReceita = r.RendimentoReceita,
                    UnidadeRendimento = r.UnidadeRendimento,
                    QuantidadeItens = r.QuantidadeItens,
                    CustoProducao = custoTotal,
                    CustoPorUnidade = r.RendimentoReceita > 0 ? Arredondar(r.CustoTotal / r.RendimentoReceita) : 0,
                    MargemLucro = margem,
                    OrigemMargem = r.MargemLucro != null ? OrigemMargem.Receita : OrigemMargem.Padrao,
                    MargemReceita = r.MargemLucro,
                    PrecoSugerido = precoUnidade,
                    PrecoSugeridoTotal = precoTotal,
                    PossuiAlertas = r.QuantidadeItens == 0 || r.ItemSemPreco || r.ItemSemSaldo,
                };

                if (ultimos.TryGetValue(r.IdReceita, out var ultimo))
                {
                    linha.UltimoPreco = new UltimoPrecoDto
                    {
                        IdPrecificacao = ultimo.IdPrecificacao,
                        MargemLucro = ultimo.MargemLucro,
                        CustoProducao = ultimo.CustoProducao,
                        PrecoSugerido = ultimo.PrecoSugerido,
                        PrecoSugeridoTotal = ultimo.PrecoSugeridoTotal,
                        DataCalculo = ultimo.DataCalculo,
                    };
                    linha.Desatualizado = custoTotal != ultimo.CustoProducao;
                    linha.VariacaoCustoPercentual = CalcularVariacao(custoTotal, ultimo.CustoProducao);
                    linha.MargemAlterada = margem != ultimo.MargemLucro;
                }

                resumo.Add(linha);
            }

            return resumo;
        }

        /* ------------------------- Contas ------------------------- */

        // Preço por unidade de rendimento e da receita inteira, a partir do custo EXATO.
        private static (decimal PrecoUnidade, decimal PrecoTotal) CalcularPreco(decimal custoExato, decimal rendimento, decimal margem)
        {
            var fator = 1 + margem / 100m;

            return (
                rendimento > 0 ? Arredondar(custoExato / rendimento * fator) : 0,
                Arredondar(custoExato * fator));
        }

        // Lucro sobre o preço: margem / (100 + margem). Sem preço (custo zerado) não há margem real.
        private static decimal? CalcularMargemReal(decimal margem, decimal precoTotal)
        {
            return precoTotal > 0 ? Arredondar(margem / (100m + margem) * 100m) : null;
        }

        // Variação % do custo atual sobre o anterior. Sem custo anterior (> 0) não há base de comparação.
        private static decimal? CalcularVariacao(decimal custoAtual, decimal custoAnterior)
        {
            return custoAnterior > 0 ? Arredondar((custoAtual - custoAnterior) / custoAnterior * 100m) : null;
        }

        private static AlertaCustoDto? CriarAlertaDeVariacao(decimal? variacao, DateTime dataUltimoCalculo)
        {
            if (variacao == null || Math.Abs(variacao.Value) < LimiteVariacaoCusto)
            {
                return null;
            }

            var sentido = variacao.Value > 0 ? "subiu" : "caiu";
            var percentual = Math.Abs(variacao.Value).ToString("0.##", CulturaBR);
            var data = dataUltimoCalculo.ToString("dd/MM/yyyy", CulturaBR);

            return new AlertaCustoDto
            {
                Tipo = TipoAlertaPrecificacao.VariacaoCusto,
                Mensagem = $"O custo {sentido} {percentual}% desde o último cálculo ({data}) — reavalie o preço.",
            };
        }

        private static decimal Arredondar(decimal valor)
        {
            return Math.Round(valor, CasasDecimais, MidpointRounding.AwayFromZero);
        }
    }
}
