using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.FornecedorDto;
using StockSweet.Api.entidades;

namespace StockSweet.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/fornecedores")]
    public class FornecedoresController : Controller
    {
        private readonly StockDbContext _context;

        public FornecedoresController(StockDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var fornecedores = await _context.Fornecedor
                .AsNoTracking()
                .OrderBy(f => f.Nome)
                .Select(f => new FornecedorRespostaDto
                {
                    IdFornecedor = f.IdFornecedor,
                    Nome = f.Nome,
                    Telefone = f.Telefone,
                    Email = f.Email,
                    Endereco = f.Endereco,
                    Observacao = f.Observacao,
                    QuantidadeInsumos = _context.Insumo.Count(i => i.IdFornecedor == f.IdFornecedor),
                })
                .ToListAsync();

            return Ok(fornecedores);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Obter(int id)
        {
            var fornecedor = await _context.Fornecedor
                .AsNoTracking()
                .Where(f => f.IdFornecedor == id)
                .Select(f => new FornecedorRespostaDto
                {
                    IdFornecedor = f.IdFornecedor,
                    Nome = f.Nome,
                    Telefone = f.Telefone,
                    Email = f.Email,
                    Endereco = f.Endereco,
                    Observacao = f.Observacao,
                    QuantidadeInsumos = _context.Insumo.Count(i => i.IdFornecedor == f.IdFornecedor),
                })
                .FirstOrDefaultAsync();

            if (fornecedor == null)
            {
                return NotFound(new { message = "Fornecedor não encontrado." });
            }

            return Ok(fornecedor);
        }

        [HttpPost]
        public async Task<IActionResult> Criar(FornecedorDto dto)
        {
            var nome = dto.Nome.Trim();

            if (nome.Length == 0)
            {
                return BadRequest(new { message = "O nome é obrigatório." });
            }

            if (await NomeEmUso(nome, null))
            {
                return NomeDuplicado();
            }

            var fornecedor = new Fornecedor { Nome = nome };
            Preencher(fornecedor, dto);

            _context.Fornecedor.Add(fornecedor);

            if (!await SalvarSemDuplicar())
            {
                return NomeDuplicado();
            }

            return CreatedAtAction(nameof(Obter), new { id = fornecedor.IdFornecedor }, ParaResposta(fornecedor, 0));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(int id, FornecedorDto dto)
        {
            var fornecedor = await _context.Fornecedor.FirstOrDefaultAsync(f => f.IdFornecedor == id);

            if (fornecedor == null)
            {
                return NotFound(new { message = "Fornecedor não encontrado." });
            }

            var nome = dto.Nome.Trim();

            if (nome.Length == 0)
            {
                return BadRequest(new { message = "O nome é obrigatório." });
            }

            if (await NomeEmUso(nome, id))
            {
                return NomeDuplicado();
            }

            fornecedor.Nome = nome;
            Preencher(fornecedor, dto);

            if (!await SalvarSemDuplicar())
            {
                return NomeDuplicado();
            }

            var insumos = await _context.Insumo.CountAsync(i => i.IdFornecedor == id);
            return Ok(ParaResposta(fornecedor, insumos));
        }

        // Os insumos do fornecedor permanecem, só ficam sem fornecedor (ON DELETE SET NULL).
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Excluir(int id)
        {
            var fornecedor = await _context.Fornecedor.FirstOrDefaultAsync(f => f.IdFornecedor == id);

            if (fornecedor == null)
            {
                return NotFound(new { message = "Fornecedor não encontrado." });
            }

            var insumos = await _context.Insumo.Where(i => i.IdFornecedor == id).ToListAsync();
            foreach (var insumo in insumos)
            {
                insumo.IdFornecedor = null;
            }

            _context.Fornecedor.Remove(fornecedor);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private Task<bool> NomeEmUso(string nome, int? ignorarId)
        {
            return _context.Fornecedor.AnyAsync(f => f.Nome == nome && f.IdFornecedor != ignorarId);
        }

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
            return Conflict(new { message = "Já existe um fornecedor com esse nome." });
        }

        private static void Preencher(Fornecedor fornecedor, FornecedorDto dto)
        {
            fornecedor.Telefone = Limpar(dto.Telefone);
            fornecedor.Email = Limpar(dto.Email);
            fornecedor.Endereco = Limpar(dto.Endereco);
            fornecedor.Observacao = Limpar(dto.Observacao);
        }

        private static string? Limpar(string? texto)
        {
            return string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
        }

        private static FornecedorRespostaDto ParaResposta(Fornecedor f, int quantidadeInsumos) => new()
        {
            IdFornecedor = f.IdFornecedor,
            Nome = f.Nome,
            Telefone = f.Telefone,
            Email = f.Email,
            Endereco = f.Endereco,
            Observacao = f.Observacao,
            QuantidadeInsumos = quantidadeInsumos,
        };
    }
}
