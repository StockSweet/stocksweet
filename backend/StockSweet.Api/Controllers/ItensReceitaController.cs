using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.ReceitaDto;
using StockSweet.Api.entidades;

namespace StockSweet.Api.Controllers
{
    // Ficha técnica: os insumos (e as quantidades) que cada receita usa.
    [ApiController]
    [Authorize]
    [Route("api/receitas/{idReceita:int}/itens")]
    public class ItensReceitaController : Controller
    {
        private readonly StockDbContext _context;

        public ItensReceitaController(StockDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Listar(int idReceita)
        {
            if (!await ReceitaExiste(idReceita))
            {
                return ReceitaNaoEncontrada();
            }

            var itens = await _context.ItemReceita
                .AsNoTracking()
                .Where(i => i.IdReceita == idReceita)
                .OrderBy(i => i.Insumo!.Nome)
                .Select(ParaResposta)
                .ToListAsync();

            return Ok(itens);
        }

        [HttpGet("{idItem:int}")]
        public async Task<IActionResult> Obter(int idReceita, int idItem)
        {
            var item = await ObterResposta(idReceita, idItem);

            if (item == null)
            {
                return ItemNaoEncontrado();
            }

            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Adicionar(int idReceita, ItemReceitaDto dto)
        {
            if (!await ReceitaExiste(idReceita))
            {
                return ReceitaNaoEncontrada();
            }

            var idInsumo = dto.IdInsumo!.Value;

            if (!await _context.Insumo.AsNoTracking().AnyAsync(i => i.IdInsumo == idInsumo))
            {
                return NotFound(new
                {
                    message = "Insumo não encontrado."
                });
            }

            var quantidade = NormalizarQuantidade(dto.Quantidade);

            if (quantidade <= 0)
            {
                return QuantidadeInvalida();
            }

            if (await _context.ItemReceita.AsNoTracking()
                    .AnyAsync(i => i.IdReceita == idReceita && i.IdInsumo == idInsumo))
            {
                return InsumoRepetido();
            }

            var item = new ItemReceita
            {
                IdReceita = idReceita,
                IdInsumo = idInsumo,
                Quantidade = quantidade,
            };

            _context.ItemReceita.Add(item);

            if (!await SalvarSemDuplicar())
            {
                return InsumoRepetido();
            }

            return CreatedAtAction(nameof(Obter), new { idReceita, idItem = item.IdItem }, new
            {
                message = "Insumo adicionado à receita com sucesso!",
                item = await ObterResposta(idReceita, item.IdItem)
            });
        }

        [HttpPut("{idItem:int}")]
        public async Task<IActionResult> Atualizar(int idReceita, int idItem, AtualizarItemReceitaDto dto)
        {
            var item = await _context.ItemReceita
                .FirstOrDefaultAsync(i => i.IdItem == idItem && i.IdReceita == idReceita);

            if (item == null)
            {
                return ItemNaoEncontrado();
            }

            var quantidade = NormalizarQuantidade(dto.Quantidade);

            if (quantidade <= 0)
            {
                return QuantidadeInvalida();
            }

            item.Quantidade = quantidade;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Quantidade atualizada com sucesso!",
                item = await ObterResposta(idReceita, idItem)
            });
        }

        [HttpDelete("{idItem:int}")]
        public async Task<IActionResult> Remover(int idReceita, int idItem)
        {
            var item = await _context.ItemReceita
                .FirstOrDefaultAsync(i => i.IdItem == idItem && i.IdReceita == idReceita);

            if (item == null)
            {
                return ItemNaoEncontrado();
            }

            _context.ItemReceita.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private Task<ItemReceitaRespostaDto?> ObterResposta(int idReceita, int idItem)
        {
            return _context.ItemReceita
                .AsNoTracking()
                .Where(i => i.IdItem == idItem && i.IdReceita == idReceita)
                .Select(ParaResposta)
                .FirstOrDefaultAsync();
        }

        private Task<bool> ReceitaExiste(int idReceita)
        {
            return _context.Receita.AsNoTracking().AnyAsync(r => r.IdReceita == idReceita);
        }

        // A coluna guarda 3 casas decimais; arredonda antes pra validar o que de fato seria gravado.
        private static decimal NormalizarQuantidade(decimal quantidade)
        {
            return Math.Round(quantidade, 3, MidpointRounding.AwayFromZero);
        }

        // Cobre a corrida entre a checagem e o INSERT: o índice único (IdReceita, IdInsumo) é a garantia final.
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

        private IActionResult ReceitaNaoEncontrada()
        {
            return NotFound(new
            {
                message = "Receita não encontrada."
            });
        }

        private IActionResult ItemNaoEncontrado()
        {
            return NotFound(new
            {
                message = "Item da receita não encontrado."
            });
        }

        private IActionResult InsumoRepetido()
        {
            return Conflict(new
            {
                message = "Esse insumo já faz parte da receita."
            });
        }

        private IActionResult QuantidadeInvalida()
        {
            return BadRequest(new
            {
                message = "A quantidade deve ser maior que zero."
            });
        }

        private static readonly System.Linq.Expressions.Expression<Func<ItemReceita, ItemReceitaRespostaDto>> ParaResposta =
            i => new ItemReceitaRespostaDto
            {
                IdItem = i.IdItem,
                IdInsumo = i.IdInsumo,
                NomeInsumo = i.Insumo!.Nome,
                UnidadeMedida = i.Insumo.UnidadeMedida,
                Quantidade = i.Quantidade,
                PrecoCompraAtual = i.Insumo.PrecoCompra,
            };
    }
}
