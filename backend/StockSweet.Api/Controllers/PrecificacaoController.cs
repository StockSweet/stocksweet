using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockSweet.Api.DTOs.PrecificacaoDto;
using StockSweet.Api.services;

namespace StockSweet.Api.Controllers
{
    // Margem de lucro (RF08) e sugestão de preço (RF05). RNF01: só o Gestor acessa.
    // O perfil vem do claim "perfil" do JWT (RoleClaimType configurado no Program.cs),
    // com o valor "Gestor"; um Usuário comum recebe 403 e quem não manda token, 401.
    [ApiController]
    [Authorize(Roles = "Gestor")]
    [Route("api")]
    public class PrecificacaoController : Controller
    {
        private const int LimiteMaximoHistorico = 100;
        private const string MensagemMargemInvalida = "A margem deve estar entre 0 e 999,99%, com no máximo 2 casas decimais.";

        private readonly PrecificacaoService _precificacaoService;

        public PrecificacaoController(PrecificacaoService precificacaoService)
        {
            _precificacaoService = precificacaoService;
        }

        // Visão geral: todas as receitas com custo atual, margem, preço sugerido, último preço salvo e se está desatualizado.
        [HttpGet("precificacao")]
        public async Task<IActionResult> Resumir()
        {
            return Ok(await _precificacaoService.ResumirPrecificacao());
        }

        [HttpGet("precificacao/margem")]
        public async Task<IActionResult> ObterMargemPadrao()
        {
            return Ok(new MargemPadraoDto
            {
                MargemPadrao = await _precificacaoService.ObterMargemPadrao()
            });
        }

        [HttpPut("precificacao/margem")]
        public async Task<IActionResult> DefinirMargemPadrao(MargemPadraoDto dto)
        {
            // O [Required] garante o valor; o resto é a checagem das casas decimais.
            if (!PrecificacaoService.MargemValida(dto.MargemPadrao!.Value))
            {
                return BadRequest(new
                {
                    message = MensagemMargemInvalida
                });
            }

            await _precificacaoService.DefinirMargemPadrao(dto.MargemPadrao.Value);

            return Ok(new
            {
                message = "Margem padrão atualizada com sucesso!",
                margemPadrao = dto.MargemPadrao.Value
            });
        }

        // Define a margem própria da receita; { "margemLucro": null } volta a usar a padrão.
        [HttpPut("receitas/{id:int}/margem")]
        public async Task<IActionResult> DefinirMargemReceita(int id, MargemReceitaDto dto)
        {
            if (dto.MargemLucro != null && !PrecificacaoService.MargemValida(dto.MargemLucro.Value))
            {
                return BadRequest(new
                {
                    message = MensagemMargemInvalida
                });
            }

            if (!await _precificacaoService.DefinirMargemReceita(id, dto.MargemLucro))
            {
                return ReceitaNaoEncontrada();
            }

            return Ok(new
            {
                message = dto.MargemLucro == null
                    ? "Margem própria removida: a receita volta a usar a margem padrão."
                    : "Margem da receita atualizada com sucesso!",
                idReceita = id,
                margemLucro = dto.MargemLucro
            });
        }

        // Calcula na hora, sem salvar.
        [HttpGet("receitas/{id:int}/preco-sugerido")]
        public async Task<IActionResult> CalcularPrecoSugerido(int id)
        {
            var (resultado, erro) = await _precificacaoService.CalcularPrecoSugerido(id);

            if (resultado == null)
            {
                return RespostaErro(erro);
            }

            return Ok(resultado);
        }

        // Calcula e salva o snapshot no histórico.
        [HttpPost("receitas/{id:int}/precificacao")]
        public async Task<IActionResult> SalvarPrecificacao(int id)
        {
            var idUsuario = ObterIdUsuario();

            if (idUsuario == null)
            {
                return Unauthorized(new
                {
                    message = "Usuário não identificado."
                });
            }

            var (snapshot, calculo, erro) = await _precificacaoService.SalvarPrecificacao(id, idUsuario.Value);

            if (snapshot == null)
            {
                return RespostaErro(erro);
            }

            return Created($"/api/receitas/{id}/precificacao/historico", new
            {
                message = "Preço calculado e salvo com sucesso!",
                idPrecificacao = snapshot.IdPrecificacao,
                dataCalculo = snapshot.DataCalculo,
                calculo
            });
        }

        [HttpGet("receitas/{id:int}/precificacao/historico")]
        public async Task<IActionResult> ListarHistorico(int id, [FromQuery] int limite = 20)
        {
            if (limite < 1 || limite > LimiteMaximoHistorico)
            {
                return BadRequest(new
                {
                    message = $"O limite deve estar entre 1 e {LimiteMaximoHistorico}."
                });
            }

            var historico = await _precificacaoService.ListarHistorico(id, limite);

            if (historico == null)
            {
                return ReceitaNaoEncontrada();
            }

            return Ok(historico);
        }

        private int? ObterIdUsuario()
        {
            var id = User.FindFirst("id")?.Value;

            return int.TryParse(id, out var idUsuario) ? idUsuario : null;
        }

        private IActionResult RespostaErro(ErroPrecificacao erro)
        {
            return erro switch
            {
                ErroPrecificacao.ReceitaNaoEncontrada => ReceitaNaoEncontrada(),
                ErroPrecificacao.ReceitaSemItens => BadRequest(new
                {
                    message = "A receita não tem insumos na ficha técnica: não há custo real para sugerir um preço."
                }),
                ErroPrecificacao.CustoZerado => BadRequest(new
                {
                    message = "O custo da receita está zerado (os insumos não têm preço de compra): registre as entradas de estoque antes de salvar o preço."
                }),
                ErroPrecificacao.UsuarioNaoEncontrado => Unauthorized(new
                {
                    message = "Usuário não identificado."
                }),
                _ => StatusCode(500, new { message = "Não foi possível concluir a operação." })
            };
        }

        private IActionResult ReceitaNaoEncontrada()
        {
            return NotFound(new
            {
                message = "Receita não encontrada."
            });
        }
    }
}
