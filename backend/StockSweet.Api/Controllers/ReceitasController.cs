using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.ReceitaDto;
using StockSweet.Api.entidades;

namespace StockSweet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/receitas")]
    public class ReceitasController : Controller
    {
        private readonly StockDbContext _context;
        private readonly services.PrecificacaoService _precificacaoService;

        public ReceitasController(StockDbContext context, services.PrecificacaoService precificacaoService)
        {
            _context = context;
            _precificacaoService = precificacaoService;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var receitas = await _context.Receita
                .AsNoTracking()
                .OrderBy(r => r.Nome)
                .Select(ParaResposta)
                .ToListAsync();

            return Ok(receitas);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var receita = await ObterResposta(id);

            if (receita == null)
            {
                return NotFound(new
                {
                    message = "Receita não encontrada."
                });
            }

            return Ok(receita);
        }

        [HttpPost]
        public async Task<IActionResult> Criar(ReceitaDto dto)
        {
            var nome = dto.Nome.Trim();

            if (await NomeEmUso(nome, null))
            {
                return NomeDuplicado();
            }

            var receita = new Receita
            {
                Nome = nome,
                Descricao = LimparDescricao(dto.Descricao),
                RendimentoReceita = dto.RendimentoReceita,
                UnidadeRendimento = dto.UnidadeRendimento.Trim(),
                MargemLucro = dto.MargemLucro ?? 50.00m,
                MargemLucroMinima = dto.MargemLucroMinima ?? 20.00m,
            };

            _context.Receita.Add(receita);

            if (!await SalvarSemDuplicar())
            {
                return NomeDuplicado();
            }

            return CreatedAtAction(nameof(Obter), new { id = receita.IdReceita }, new
            {
                message = "Receita cadastrada com sucesso!",
                receita = await ObterResposta(receita.IdReceita)
            });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(int id, ReceitaDto dto)
        {
            var receita = await _context.Receita.FirstOrDefaultAsync(r => r.IdReceita == id);

            if (receita == null)
            {
                return NotFound(new
                {
                    message = "Receita não encontrada."
                });
            }

            var nome = dto.Nome.Trim();

            if (await NomeEmUso(nome, id))
            {
                return NomeDuplicado();
            }

            receita.Nome = nome;
            receita.Descricao = LimparDescricao(dto.Descricao);
            receita.RendimentoReceita = dto.RendimentoReceita;
            receita.UnidadeRendimento = dto.UnidadeRendimento.Trim();
            if (dto.MargemLucro.HasValue)
            {
                receita.MargemLucro = dto.MargemLucro.Value;
            }
            if (dto.MargemLucroMinima.HasValue)
            {
                receita.MargemLucroMinima = dto.MargemLucroMinima.Value;
            }

            if (!await SalvarSemDuplicar())
            {
                return NomeDuplicado();
            }

            return Ok(new
            {
                message = "Receita atualizada com sucesso!",
                receita = await ObterResposta(id)
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Excluir(int id)
        {
            var receita = await _context.Receita.FirstOrDefaultAsync(r => r.IdReceita == id);

            if (receita == null)
            {
                return NotFound(new
                {
                    message = "Receita não encontrada."
                });
            }

            _context.Receita.Remove(receita);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Aplicação para Definição rápida da Margem de Lucro e Margem Mínima de Segurança
        // PATCH /api/receitas/{id:int}/margem-lucro
        [HttpPatch("{id:int}/margem-lucro")]
        public async Task<IActionResult> DefinirMargemLucro(int id, [FromBody] DefinirMargemLucroDto dto)
        {
            var receita = await _context.Receita.FirstOrDefaultAsync(r => r.IdReceita == id);

            if (receita == null)
            {
                return NotFound(new { message = "Receita não encontrada." });
            }

            if (dto.MargemLucroMinima.HasValue && dto.MargemLucro < dto.MargemLucroMinima.Value)
            {
                return BadRequest(new
                {
                    message = "A margem de lucro definida não pode ser inferior à margem de lucro mínima de segurança."
                });
            }

            receita.MargemLucro = dto.MargemLucro;
            if (dto.MargemLucroMinima.HasValue)
            {
                receita.MargemLucroMinima = dto.MargemLucroMinima.Value;
            }

            await _context.SaveChangesAsync();

            var precificacao = await _precificacaoService.CalcularPrecificacaoReceita(id);

            return Ok(new
            {
                message = "Margem de lucro atualizada com sucesso!",
                precificacao
            });
        }

        // Consulta de Custos de Produção e Precificação Sugerida (com integração ao estoque e simulação opcional)
        // GET /api/receitas/{id:int}/precificacao?margemSimulada=70
        [HttpGet("{id:int}/precificacao")]
        public async Task<IActionResult> ObterPrecificacao(int id, [FromQuery] decimal? margemSimulada)
        {
            if (margemSimulada.HasValue && (margemSimulada < 0 || margemSimulada > 500))
            {
                return BadRequest(new { message = "A margem simulada deve estar entre 0% e 500%." });
            }

            var precificacao = await _precificacaoService.CalcularPrecificacaoReceita(id, margemSimulada);

            if (precificacao == null)
            {
                return NotFound(new { message = "Receita não encontrada." });
            }

            return Ok(precificacao);
        }

        // Relatório geral de precificação de todas as receitas
        // GET /api/receitas/precificacao
        [HttpGet("precificacao")]
        public async Task<IActionResult> ListarTodasPrecificacoes()
        {
            var lista = await _precificacaoService.ListarPrecificacaoTodas();
            return Ok(lista);
        }

        // Receita com a ficha técnica, numa única consulta.
        private Task<ReceitaDetalheRespostaDto?> ObterResposta(int id)
        {
            return _context.Receita
                .AsNoTracking()
                .Where(r => r.IdReceita == id)
                .Select(r => new ReceitaDetalheRespostaDto
                {
                    IdReceita = r.IdReceita,
                    Nome = r.Nome,
                    Descricao = r.Descricao,
                    RendimentoReceita = r.RendimentoReceita,
                    UnidadeRendimento = r.UnidadeRendimento,
                    DataCadastro = r.DataCadastro,
                    MargemLucro = r.MargemLucro,
                    MargemLucroMinima = r.MargemLucroMinima,
                    QuantidadeItens = r.Itens.Count,
                    Itens = r.Itens
                        .OrderBy(i => i.Insumo!.Nome)
                        .Select(i => new ItemReceitaRespostaDto
                        {
                            IdItem = i.IdItem,
                            IdInsumo = i.IdInsumo,
                            NomeInsumo = i.Insumo!.Nome,
                            UnidadeMedida = i.Insumo.UnidadeMedida,
                            Quantidade = i.Quantidade,
                            PrecoCompraAtual = i.Insumo.PrecoCompra,
                        })
                        .ToList(),
                })
                .FirstOrDefaultAsync();
        }

        // O MySQL compara nomes sem diferenciar maiúsculas de minúsculas (collation padrão).
        private Task<bool> NomeEmUso(string nome, int? idIgnorado)
        {
            return _context.Receita
                .AsNoTracking()
                .AnyAsync(r => r.Nome == nome && r.IdReceita != idIgnorado);
        }

        // Cobre a corrida entre a checagem e o INSERT/UPDATE: o índice único é a garantia final.
        private async Task<bool> SalvarSemDuplicar()
        {
            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate entry") == true)
            {
                return false;
            }
        }

        private IActionResult NomeDuplicado()
        {
            return Conflict(new
            {
                message = "Já existe uma receita com esse nome."
            });
        }

        private static string? LimparDescricao(string? descricao)
        {
            return string.IsNullOrWhiteSpace(descricao) ? null : descricao.Trim();
        }

        private static readonly System.Linq.Expressions.Expression<Func<Receita, ReceitaRespostaDto>> ParaResposta =
            r => new ReceitaRespostaDto
            {
                IdReceita = r.IdReceita,
                Nome = r.Nome,
                Descricao = r.Descricao,
                RendimentoReceita = r.RendimentoReceita,
                UnidadeRendimento = r.UnidadeRendimento,
                DataCadastro = r.DataCadastro,
                MargemLucro = r.MargemLucro,
                MargemLucroMinima = r.MargemLucroMinima,
                QuantidadeItens = r.Itens.Count,
            };
    }
}
