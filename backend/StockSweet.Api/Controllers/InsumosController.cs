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

        // Consulta rápida por nome: GET /api/insumos/saldo?termo=farinha
        [HttpGet("saldo")]
        public async Task<IActionResult> ConsultarSaldo([FromQuery] string? termo)
        {
            if (string.IsNullOrWhiteSpace(termo))
            {
                return BadRequest(new { message = "Informe um termo para consultar o saldo." });
            }

            termo = termo.Trim();
            if (termo.Length > 100)
            {
                return BadRequest(new { message = "O termo de busca deve ter no máximo 100 caracteres." });
            }

            var insumos = await _context.Insumo
                .AsNoTracking()
                .Where(i => EF.Functions.Like(i.Nome, $"%{termo}%"))
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
