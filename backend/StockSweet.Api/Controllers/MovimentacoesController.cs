using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.EstoqueDto;
using StockSweet.Api.entidades;
using StockSweet.Api.services;

namespace StockSweet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/movimentacoes")]
    public class MovimentacoesController : Controller
    {
        private const int LimiteMaximo = 200;

        private readonly StockDbContext _context;
        private readonly EstoqueService _estoqueService;

        public MovimentacoesController(StockDbContext context, EstoqueService estoqueService)
        {
            _context = context;
            _estoqueService = estoqueService;
        }

        [HttpPost("entrada")]
        public async Task<IActionResult> RegistrarEntrada(EntradaDto dto)
        {
            var idUsuario = ObterIdUsuario();

            if (idUsuario == null)
            {
                return Unauthorized(new
                {
                    message = "Usuário não identificado."
                });
            }

            var (idMovimentacao, erro) = await _estoqueService.RegistrarEntrada(idUsuario.Value, dto);

            if (erro != ErroEstoque.Nenhum)
            {
                return RespostaErro(erro);
            }

            var movimentacao = await ObterResposta(idMovimentacao!.Value);

            return Created($"/api/movimentacoes/{idMovimentacao}", new
            {
                message = "Entrada de mercadoria registrada com sucesso!",
                movimentacao
            });
        }

        [HttpPost("saida")]
        public async Task<IActionResult> RegistrarSaida(SaidaDto dto)
        {
            var idUsuario = ObterIdUsuario();

            if (idUsuario == null)
            {
                return Unauthorized(new
                {
                    message = "Usuário não identificado."
                });
            }

            var (idMovimentacao, erro) = await _estoqueService.RegistrarSaida(idUsuario.Value, dto);

            if (erro != ErroEstoque.Nenhum)
            {
                return RespostaErro(erro);
            }

            var movimentacao = await ObterResposta(idMovimentacao!.Value);

            return Created($"/api/movimentacoes/{idMovimentacao}", new
            {
                message = "Saída de mercadoria registrada com sucesso!",
                movimentacao
            });
        }

        // Histórico, mais recentes primeiro. Todos os filtros são opcionais.
        [HttpGet]
        public async Task<IActionResult> Listar(
            [FromQuery] TipoMovimentacao? tipo,
            [FromQuery] int? idInsumo,
            [FromQuery] DateOnly? de,
            [FromQuery] DateOnly? ate,
            [FromQuery] int limite = 50)
        {
            if (limite < 1 || limite > LimiteMaximo)
            {
                return BadRequest(new
                {
                    message = $"O limite deve estar entre 1 e {LimiteMaximo}."
                });
            }

            var consulta = _context.MovimentacaoEstoque.AsNoTracking();

            if (tipo != null)
            {
                consulta = consulta.Where(m => m.Tipo == tipo);
            }

            if (idInsumo != null)
            {
                consulta = consulta.Where(m => m.IdInsumo == idInsumo);
            }

            if (de != null)
            {
                var inicio = de.Value.ToDateTime(TimeOnly.MinValue);
                consulta = consulta.Where(m => m.Data >= inicio);
            }

            if (ate != null)
            {
                // "ate" inclui o dia inteiro.
                var fim = ate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
                consulta = consulta.Where(m => m.Data < fim);
            }

            var movimentacoes = await consulta
                .OrderByDescending(m => m.Data)
                .ThenByDescending(m => m.IdMovimentacao)
                .Take(limite)
                .Select(ParaResposta)
                .ToListAsync();

            return Ok(movimentacoes);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var movimentacao = await ObterResposta(id);

            if (movimentacao == null)
            {
                return NotFound(new
                {
                    message = "Movimentação não encontrada."
                });
            }

            return Ok(movimentacao);
        }

        private int? ObterIdUsuario()
        {
            var id = User.FindFirst("id")?.Value;

            return int.TryParse(id, out var idUsuario) ? idUsuario : null;
        }

        private Task<MovimentacaoRespostaDto?> ObterResposta(int id)
        {
            return _context.MovimentacaoEstoque
                .AsNoTracking()
                .Where(m => m.IdMovimentacao == id)
                .Select(ParaResposta)
                .FirstOrDefaultAsync();
        }

        private IActionResult RespostaErro(ErroEstoque erro)
        {
            return erro switch
            {
                ErroEstoque.InsumoNaoEncontrado => NotFound(new
                {
                    message = "Insumo não encontrado."
                }),
                ErroEstoque.EstoqueInsuficiente => BadRequest(new
                {
                    message = "Estoque insuficiente para essa saída."
                }),
                _ => StatusCode(500)
            };
        }

        private static readonly System.Linq.Expressions.Expression<Func<MovimentacaoEstoque, MovimentacaoRespostaDto>> ParaResposta =
            m => new MovimentacaoRespostaDto
            {
                Id = m.IdMovimentacao,
                IdInsumo = m.IdInsumo,
                InsumoNome = m.Insumo!.Nome,
                UnidadeMedida = m.Insumo.UnidadeMedida,
                Tipo = m.Tipo,
                Motivo = m.Motivo,
                Quantidade = m.Quantidade,
                ValorUnitario = m.ValorUnitario,
                Data = m.Data,
                Observacao = m.Observacao,
                UsuarioNome = m.Usuario!.Nome,
            };
    }
}
