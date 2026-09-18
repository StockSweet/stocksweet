using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockSweet.Api.banco;
using StockSweet.Api.DTOs.AuthDto;
using StockSweet.Api.entidades;
using StockSweet.Api.services;

namespace StockSweet.Api.Controllers
{
    [ApiController] 
    [Route("api/auth")]
    public class AuthController : Controller
    {

        private readonly StockDbContext _context;
        private readonly JwtService _jwtService;
        private readonly EmailValidacao _emailvalidacao;

        public AuthController(StockDbContext context, JwtService jwtService, EmailValidacao emailValidacao)
        {
            _context = context;
            _jwtService = jwtService;
            _emailvalidacao = emailValidacao;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            
            var emailExiste = await _context.Usuario
            .AnyAsync(u => u.Email == dto.Email);

            var email = dto.Email;

            if (!_emailvalidacao.ValidarEmail(email))
            {
                return BadRequest(new
                {
                    message ="Formato inválido"
                });
            }
           
            if(emailExiste)
            {
            return BadRequest(new
                {
                    message = "Email já cadastrado."
                });
            }


            var senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha); 

            var usuario = new Usuario
            {
                Nome = dto.Nome,
                Email = dto.Email,
                Senha = senhaHash,            };

            _context.Usuario.Add(usuario);

            await _context.SaveChangesAsync();

            var resposta = new UsuarioRespostaDto
            {
                Id = usuario.IdUsuario,
                Nome = usuario.Nome,
                Email = usuario.Email,
                Nivel = usuario.Nivel,
            };

            return Created(
                $"/api/auth/register",
                resposta
            );

            
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var usuario = await _context.Usuario
            .FirstOrDefaultAsync(u => u.Email == dto.Email);


            if(usuario == null)
            {
                return Unauthorized(new
                {
                    message = "Email ou senha inválidos."
                });
            }

            var senhaCorreta = BCrypt.Net.BCrypt.Verify(dto.Senha, usuario.Senha);

            if(!senhaCorreta)
            {
                return Unauthorized(new
                {
                    message = "Email ou senha inválidos."
                });
            }

            var usuarioResposta = new UsuarioRespostaDto
            {
               Id = usuario.IdUsuario,
               Nome = usuario.Nome,
               Email = usuario.Email,
               Nivel = usuario.Nivel,
            };

            var token = _jwtService.GenerateToken(usuario);

            var resposta = new AuthRespostaDto
            {
                Token = token,
                Usuario = usuarioResposta
            };

            return Ok(new
            {
                message = "Login realizado com sucesso.",
                resposta

            });
        }
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {

            var id = User.FindFirst("id")?.Value;

            if (id == null)
            {
                return NotFound(new
                {
                    message = "Usuário não encontrado."
                });
            }

            var usuario = await _context.Usuario.FindAsync(int.Parse(id));


            if (usuario == null )
            {
                return NotFound(new
                {
                    message = "Usuário não encontrado."
                });
            }

            var nome = usuario.Nome;
            var email = usuario.Email;

            var resposta = new UsuarioRespostaDto
            {
                Id = usuario.IdUsuario,
                Nome = usuario.Nome,
                Email = usuario.Email,
                Nivel = usuario.Nivel,
            };

            return Ok(new
            {
                resposta
            });
            
        }
        }
}