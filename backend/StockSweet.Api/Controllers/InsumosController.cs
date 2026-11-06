using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.EstoqueDto;

namespace StockSweet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/insumos")]
    public class InsumosController : Controller
    {
        private const int LimiteConsultaSaldo = 20;
        private readonly StockDbContext _context;

        public InsumosController(StockDbContext context)
        {
            _context = context;
        }

        // Alimenta o <select> de insumos das telas de entrada e saída.
        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var insumos = await _context.Insumo
                .AsNoTracking()
                .OrderBy(i => i.Nome)
                .Select(i => new InsumoRespostaDto
                {
                    IdInsumo = i.IdInsumo,
                    Nome = i.Nome,
                    UnidadeMedida = i.UnidadeMedida,
                    QuantidadeEstoque = i.QuantidadeEstoque,
                    PrecoCompra = i.PrecoCompra,
                    EstoqueMinimo = i.EstoqueMinimo,
                })
                .ToListAsync();

            return Ok(insumos);
        }

        // Alertas calculados do saldo atual; são atualizados automaticamente após movimentações.
        [HttpGet("alertas")]
        public async Task<IActionResult> ListarAlertas()
        {
            var alertas = await _context.Insumo
                .AsNoTracking()
                .Where(i => i.QuantidadeEstoque <= i.EstoqueMinimo)
                .OrderBy(i => i.QuantidadeEstoque <= i.EstoqueMinimo / 2m ? 0 : 1)
                .ThenBy(i => i.QuantidadeEstoque / (i.EstoqueMinimo == 0 ? 1m : i.EstoqueMinimo))
                .ThenBy(i => i.Nome)
                .Select(i => new InsumoAlertaRespostaDto
                {
                    IdInsumo = i.IdInsumo,
                    Nome = i.Nome,
                    UnidadeMedida = i.UnidadeMedida,
                    QuantidadeEstoque = i.QuantidadeEstoque,
                    EstoqueMinimo = i.EstoqueMinimo,
                    QuantidadeParaRepor = i.EstoqueMinimo * 2m - i.QuantidadeEstoque,
                    Nivel = i.QuantidadeEstoque <= i.EstoqueMinimo / 2m ? "critico" : "baixo",
                })
                .ToListAsync();

            return Ok(alertas);
        }

        // Consulta rápida por nome (opcional: se não informar termo, lista primeiros com paginação)
        // GET /api/insumos/saldo?termo=farinha
        [HttpGet("saldo")]
        public async Task<IActionResult> ConsultarSaldo([FromQuery] string? termo)
        {
            var query = _context.Insumo.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(termo))
            {
                termo = termo.Trim();
                if (termo.Length > 100)
                {
                    return BadRequest(new { message = "O termo de busca deve ter no máximo 100 caracteres." });
                }
                query = query.Where(i => EF.Functions.Like(i.Nome, $"%{termo}%"));
            }

            var insumos = await query
                .OrderBy(i => i.Nome)
                .Take(LimiteConsultaSaldo)
                .Select(i => new InsumoSaldoRespostaDto
                {
                    IdInsumo = i.IdInsumo,
                    Nome = i.Nome,
                    UnidadeMedida = i.UnidadeMedida,
                    QuantidadeEstoque = i.QuantidadeEstoque,
                    EstoqueMinimo = i.EstoqueMinimo,
                    Nivel = i.QuantidadeEstoque <= i.EstoqueMinimo / 2m
                        ? "critico"
                        : i.QuantidadeEstoque <= i.EstoqueMinimo ? "baixo" : "ok",
                })
                .ToListAsync();

            return Ok(insumos);
        }

        // Endpoint dedicado de análise e visualização consolidada do saldo (Dashboard de Saldo)
        // GET /api/insumos/dashboard-saldo
        [HttpGet("dashboard-saldo")]
        public async Task<IActionResult> ObterDashboardSaldo()
        {
            var insumosBase = await _context.Insumo
                .AsNoTracking()
                .ToListAsync();

            var totalInsumos = insumosBase.Count;
            var criticos = insumosBase.Count(i => i.QuantidadeEstoque <= i.EstoqueMinimo / 2m);
            var baixos = insumosBase.Count(i => i.QuantidadeEstoque > i.EstoqueMinimo / 2m && i.QuantidadeEstoque <= i.EstoqueMinimo);
            var adequados = totalInsumos - criticos - baixos;
            var valorTotal = insumosBase.Sum(i => i.QuantidadeEstoque * i.PrecoCompra);
            var saude = totalInsumos > 0 ? Math.Round((decimal)adequados / totalInsumos * 100m, 2) : 100m;

            var insumosDashboard = insumosBase
                .OrderBy(i => i.QuantidadeEstoque <= i.EstoqueMinimo / 2m ? 0 : (i.QuantidadeEstoque <= i.EstoqueMinimo ? 1 : 2))
                .ThenBy(i => i.EstoqueMinimo == 0 ? 1m : (i.QuantidadeEstoque / i.EstoqueMinimo))
                .ThenBy(i => i.Nome)
                .Select(i =>
                {
                    var situacao = i.QuantidadeEstoque <= i.EstoqueMinimo / 2m
                        ? "critico"
                        : (i.QuantidadeEstoque <= i.EstoqueMinimo ? "baixo" : "ok");
                    var perc = i.EstoqueMinimo > 0 ? Math.Round((i.QuantidadeEstoque / i.EstoqueMinimo) * 100m, 1) : 100m;
                    var repor = i.QuantidadeEstoque < i.EstoqueMinimo ? (i.EstoqueMinimo * 2m) - i.QuantidadeEstoque : 0m;

                    return new InsumoDashboardDto
                    {
                        IdInsumo = i.IdInsumo,
                        Nome = i.Nome,
                        UnidadeMedida = i.UnidadeMedida,
                        QuantidadeEstoque = i.QuantidadeEstoque,
                        EstoqueMinimo = i.EstoqueMinimo,
                        PrecoCompra = i.PrecoCompra,
                        ValorTotalItem = Math.Round(i.QuantidadeEstoque * i.PrecoCompra, 2),
                        PercentualEstoqueMinimo = perc,
                        QuantidadeParaRepor = repor,
                        Situacao = situacao
                    };
                })
                .ToList();

            var ultimasMovs = await _context.MovimentacaoEstoque
                .AsNoTracking()
                .Include(m => m.Insumo)
                .Include(m => m.Usuario)
                .OrderByDescending(m => m.Data)
                .Take(10)
                .Select(m => new MovimentacaoRecenteDto
                {
                    IdMovimentacao = m.IdMovimentacao,
                    Data = m.Data,
                    Tipo = m.Tipo.ToString(),
                    Motivo = m.Motivo.HasValue ? m.Motivo.ToString() : null,
                    IdInsumo = m.IdInsumo,
                    NomeInsumo = m.Insumo!.Nome,
                    UnidadeMedida = m.Insumo.UnidadeMedida,
                    Quantidade = m.Quantidade,
                    ValorUnitario = m.ValorUnitario,
                    ValorTotal = Math.Round(m.Quantidade * m.ValorUnitario, 2),
                    UsuarioNome = m.Usuario!.Nome
                })
                .ToListAsync();

            var dataCorte30Dias = DateTime.UtcNow.AddDays(-30);
            var topConsumo = await _context.MovimentacaoEstoque
                .AsNoTracking()
                .Where(m => m.Tipo == entidades.TipoMovimentacao.Saida && m.Data >= dataCorte30Dias)
                .GroupBy(m => new { m.IdInsumo, m.Insumo!.Nome, m.Insumo.UnidadeMedida })
                .Select(g => new ConsumoInsumoDto
                {
                    IdInsumo = g.Key.IdInsumo,
                    Nome = g.Key.Nome,
                    UnidadeMedida = g.Key.UnidadeMedida,
                    QuantidadeConsumida = g.Sum(x => x.Quantidade),
                    ValorTotalConsumido = Math.Round(g.Sum(x => x.Quantidade * x.ValorUnitario), 2)
                })
                .OrderByDescending(c => c.QuantidadeConsumida)
                .Take(5)
                .ToListAsync();

            var resposta = new DashboardSaldoRespostaDto
            {
                Resumo = new ResumoEstoqueDto
                {
                    TotalInsumos = totalInsumos,
                    InsumosEmAlerta = criticos + baixos,
                    InsumosCriticos = criticos,
                    InsumosAdequados = adequados,
                    ValorTotalEstoque = Math.Round(valorTotal, 2),
                    IndiceSaudeEstoque = saude
                },
                Insumos = insumosDashboard,
                UltimasMovimentacoes = ultimasMovs,
                TopConsumo = topConsumo
            };

            return Ok(resposta);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var insumo = await _context.Insumo
                .AsNoTracking()
                .Where(i => i.IdInsumo == id)
                .Select(i => new InsumoRespostaDto
                {
                    IdInsumo = i.IdInsumo,
                    Nome = i.Nome,
                    UnidadeMedida = i.UnidadeMedida,
                    QuantidadeEstoque = i.QuantidadeEstoque,
                    PrecoCompra = i.PrecoCompra,
                    EstoqueMinimo = i.EstoqueMinimo,
                })
                .FirstOrDefaultAsync();

            if (insumo == null)
            {
                return NotFound(new
                {
                    message = "Insumo não encontrado."
                });
            }

            return Ok(insumo);
        }
    }
}
