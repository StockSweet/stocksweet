using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockSweet.Api.services;

namespace StockSweet.Api.Controllers
{
    // Custo de produção das receitas (RF04). Usuário e Gestor podem consultar.
    [ApiController]
    [Authorize]
    [Route("api/receitas")]
    public class CustosController : Controller
    {
        private readonly CustoService _custoService;

        public CustosController(CustoService custoService)
        {
            _custoService = custoService;
        }

        [HttpGet("custos")]
        public async Task<IActionResult> Resumir()
        {
            return Ok(await _custoService.ResumirCustos());
        }

        [HttpGet("{id:int}/custo")]
        public async Task<IActionResult> Obter(int id)
        {
            var custo = await _custoService.CalcularCustoReceita(id);

            if (custo == null)
            {
                return NotFound(new
                {
                    message = "Receita não encontrada."
                });
            }

            return Ok(custo);
        }
    }
}
