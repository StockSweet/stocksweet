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
