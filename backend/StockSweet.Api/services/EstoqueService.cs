using Microsoft.EntityFrameworkCore;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.EstoqueDto;
using StockSweet.Api.entidades;

namespace StockSweet.Api.services
{
    public enum ErroEstoque
    {
        Nenhum,
        InsumoNaoEncontrado,
        EstoqueInsuficiente
    }

    public class EstoqueService
    {
        private readonly StockDbContext _context;

        public EstoqueService(StockDbContext context)
        {
            _context = context;
        }

        public async Task<(int? IdMovimentacao, ErroEstoque Erro)> RegistrarEntrada(int idUsuario, EntradaDto dto)
        {
            var idInsumo = dto.IdInsumo!.Value;
            var quantidade = Math.Round(dto.Quantidade, 3);
            var valorUnitario = Math.Round(dto.ValorUnitario, 2);

            await using var transacao = await _context.Database.BeginTransactionAsync();

            // Soma direto no banco (e não "lê, soma e salva") pra duas entradas
            // simultâneas não se sobrescreverem.
            var atualizados = await _context.Insumo
                .Where(i => i.IdInsumo == idInsumo)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.QuantidadeEstoque, i => i.QuantidadeEstoque + quantidade)
                    .SetProperty(i => i.PrecoCompra, valorUnitario));

            if (atualizados == 0)
            {
                return (null, ErroEstoque.InsumoNaoEncontrado);
            }

            var movimentacao = new MovimentacaoEstoque
            {
                IdInsumo = idInsumo,
                IdUsuario = idUsuario,
                Tipo = TipoMovimentacao.Entrada,
                Quantidade = quantidade,
                ValorUnitario = valorUnitario,
                Observacao = LimparObservacao(dto.Observacao),
            };

            _context.MovimentacaoEstoque.Add(movimentacao);
            await _context.SaveChangesAsync();
            await transacao.CommitAsync();

            return (movimentacao.IdMovimentacao, ErroEstoque.Nenhum);
        }

        public async Task<(int? IdMovimentacao, ErroEstoque Erro)> RegistrarSaida(int idUsuario, SaidaDto dto)
        {
            var idInsumo = dto.IdInsumo!.Value;
            var quantidade = Math.Round(dto.Quantidade, 3);

            var precoCompra = await _context.Insumo
                .Where(i => i.IdInsumo == idInsumo)
                .Select(i => (decimal?)i.PrecoCompra)
                .FirstOrDefaultAsync();

            if (precoCompra is null)
            {
                return (null, ErroEstoque.InsumoNaoEncontrado);
            }

            await using var transacao = await _context.Database.BeginTransactionAsync();

            // A condição "saldo >= quantidade" fica no próprio UPDATE: assim duas
            // saídas simultâneas não deixam o estoque negativo.
            var atualizados = await _context.Insumo
                .Where(i => i.IdInsumo == idInsumo && i.QuantidadeEstoque >= quantidade)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.QuantidadeEstoque, i => i.QuantidadeEstoque - quantidade));

            if (atualizados == 0)
            {
                return (null, ErroEstoque.EstoqueInsuficiente);
            }

            var movimentacao = new MovimentacaoEstoque
            {
                IdInsumo = idInsumo,
                IdUsuario = idUsuario,
                Tipo = TipoMovimentacao.Saida,
                Motivo = dto.Motivo,
                Quantidade = quantidade,
                ValorUnitario = precoCompra.Value,
                Observacao = LimparObservacao(dto.Observacao),
            };

            _context.MovimentacaoEstoque.Add(movimentacao);
            await _context.SaveChangesAsync();
            await transacao.CommitAsync();

            return (movimentacao.IdMovimentacao, ErroEstoque.Nenhum);
        }

        private static string? LimparObservacao(string? observacao)
        {
            return string.IsNullOrWhiteSpace(observacao) ? null : observacao.Trim();
        }
    }
}
