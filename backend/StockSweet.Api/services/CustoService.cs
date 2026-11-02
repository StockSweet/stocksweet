using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.CustoDto;

namespace StockSweet.Api.services
{
    // Custo de produção das receitas, calculado ao vivo a partir do PrecoCompra ATUAL dos insumos.
    // Nada é gravado: cada entrada de estoque que muda o preço (EstoqueService.RegistrarEntrada)
    // já aparece no próximo cálculo, sem job nem gatilho.
    //
    //   custoItem       = Quantidade x PrecoCompra
    //   custoTotal      = soma dos custoItem
    //   custoPorUnidade = custoTotal / RendimentoReceita
    //
    // Tudo em decimal e sem arredondar no meio do caminho: o arredondamento (2 casas) só
    // acontece nos valores devolvidos.
    public class CustoService
    {
        private const int CasasDecimais = 2;

        // Mensagens de alerta sempre em português, independente da cultura do servidor.
        private static readonly System.Globalization.CultureInfo CulturaBR = new("pt-BR");

        private readonly StockDbContext _context;

        public CustoService(StockDbContext context)
        {
            _context = context;
        }

        // Calcula o custo de uma receita. Devolve null se ela não existir.
        // Uma única consulta traz a receita com os itens e os insumos.
        public async Task<CustoReceitaRespostaDto?> CalcularCustoReceita(int idReceita)
        {
            var receita = await _context.Receita
                .AsNoTracking()
                .Where(r => r.IdReceita == idReceita)
                .Select(r => new
                {
                    r.IdReceita,
                    r.Nome,
                    r.RendimentoReceita,
                    r.UnidadeRendimento,
                    Itens = r.Itens
                        .OrderBy(i => i.Insumo!.Nome)
                        .Select(i => new
                        {
                            i.IdItem,
                            i.IdInsumo,
                            NomeInsumo = i.Insumo!.Nome,
                            i.Insumo.UnidadeMedida,
                            i.Quantidade,
                            i.Insumo.PrecoCompra,
                            i.Insumo.QuantidadeEstoque,
                        })
                        .ToList(),
                })
                .FirstOrDefaultAsync();

            if (receita == null)
            {
                return null;
            }

            var custosExatos = receita.Itens.Select(i => i.Quantidade * i.PrecoCompra).ToList();
            var custoTotalExato = custosExatos.Sum();

            var resultado = new CustoReceitaRespostaDto
            {
                IdReceita = receita.IdReceita,
                NomeReceita = receita.Nome,
                RendimentoReceita = receita.RendimentoReceita,
                UnidadeRendimento = receita.UnidadeRendimento,
                CustoTotal = Arredondar(custoTotalExato),
                CustoPorUnidade = DividirPeloRendimento(custoTotalExato, receita.RendimentoReceita),
                CalculadoEm = DateTimeOffset.Now,
            };

            if (receita.Itens.Count == 0)
            {
                resultado.Alertas.Add(new AlertaCustoDto
                {
                    Tipo = TipoAlertaCusto.ReceitaSemItens,
                    Mensagem = "A receita não tem insumos: o custo zerado não é um custo real.",
                });
            }

            for (var indice = 0; indice < receita.Itens.Count; indice++)
            {
                var item = receita.Itens[indice];

                resultado.Itens.Add(new ItemCustoRespostaDto
                {
                    IdItem = item.IdItem,
                    IdInsumo = item.IdInsumo,
                    NomeInsumo = item.NomeInsumo,
                    UnidadeMedida = item.UnidadeMedida,
                    Quantidade = item.Quantidade,
                    PrecoCompraAtual = item.PrecoCompra,
                    CustoItem = Arredondar(custosExatos[indice]),
                    PercentualDoCusto = custoTotalExato > 0
                        ? Math.Round(custosExatos[indice] / custoTotalExato * 100, CasasDecimais, MidpointRounding.AwayFromZero)
                        : 0,
                });

                if (item.PrecoCompra == 0)
                {
                    resultado.Alertas.Add(new AlertaCustoDto
                    {
                        Tipo = TipoAlertaCusto.PrecoZerado,
                        Mensagem = $"O insumo \"{item.NomeInsumo}\" não tem preço de compra (nunca teve entrada de estoque): o custo está subestimado.",
                        IdInsumo = item.IdInsumo,
                        NomeInsumo = item.NomeInsumo,
                        UnidadeMedida = item.UnidadeMedida,
                    });
                }

                if (item.QuantidadeEstoque < item.Quantidade)
                {
                    var faltante = item.Quantidade - item.QuantidadeEstoque;

                    resultado.Alertas.Add(new AlertaCustoDto
                    {
                        Tipo = TipoAlertaCusto.EstoqueInsuficiente,
                        Mensagem = $"Estoque insuficiente de \"{item.NomeInsumo}\" para produzir a receita uma vez: faltam {faltante.ToString("0.###", CulturaBR)} {item.UnidadeMedida}.",
                        IdInsumo = item.IdInsumo,
                        NomeInsumo = item.NomeInsumo,
                        UnidadeMedida = item.UnidadeMedida,
                        QuantidadeFaltante = faltante,
                    });
                }
            }

            return resultado;
        }

        // Resumo de todas as receitas (ordenado por nome) numa única consulta agregada,
        // sem buscar a receita item a item.
        public async Task<List<CustoResumoRespostaDto>> ResumirCustos()
        {
            var linhas = await _context.Receita
                .AsNoTracking()
                .OrderBy(r => r.Nome)
                .Select(r => new
                {
                    r.IdReceita,
                    r.Nome,
                    r.RendimentoReceita,
                    CustoTotal = r.Itens.Sum(i => i.Quantidade * i.Insumo!.PrecoCompra),
                    QuantidadeItens = r.Itens.Count,
                    ItemSemPreco = r.Itens.Any(i => i.Insumo!.PrecoCompra == 0),
                    ItemSemSaldo = r.Itens.Any(i => i.Insumo!.QuantidadeEstoque < i.Quantidade),
                })
                .ToListAsync();

            return linhas
                .Select(l => new CustoResumoRespostaDto
                {
                    IdReceita = l.IdReceita,
                    Nome = l.Nome,
                    CustoTotal = Arredondar(l.CustoTotal),
                    CustoPorUnidade = DividirPeloRendimento(l.CustoTotal, l.RendimentoReceita),
                    QuantidadeItens = l.QuantidadeItens,
                    PossuiAlertas = l.QuantidadeItens == 0 || l.ItemSemPreco || l.ItemSemSaldo,
                })
                .ToList();
        }

        private static decimal DividirPeloRendimento(decimal custoTotalExato, decimal rendimento)
        {
            // O cadastro exige rendimento > 0; a guarda só evita uma divisão por zero.
            return rendimento > 0 ? Arredondar(custoTotalExato / rendimento) : 0;
        }

        private static decimal Arredondar(decimal valor)
        {
            return Math.Round(valor, CasasDecimais, MidpointRounding.AwayFromZero);
        }
    }
}
